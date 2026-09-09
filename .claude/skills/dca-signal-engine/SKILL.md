---
name: dca-signal-engine
description: Use when adding or changing a technical indicator, the advice/scoring engine, DCA orientation or projection math, portfolio risk/regime rules, tenant-scoped data paths, or writing Vitest tests for any financial logic in lib/.
---

# Trade Brain: indicators → advice → DCA orientation

Read `AGENTS.md` first for architecture and commands. This skill covers what
that file does not: the exact contracts, units, thresholds and traps of the
math layer. Everything here is verified against the source — do not restate
generic TA knowledge, follow *these* conventions.

## The pipeline

```
ChartData.candles (oldest first)
  → lib/indicators.ts   pure primitives, no I/O
  → lib/advice.ts       analyze() → Advice { recommendation, score, confidence, signals, indicators }
  → lib/dcaOrientation.ts orientDca() → DcaStance
  → lib/regime.ts / lib/risk.ts   portfolio-level posture
  → UI (RecommendationBadge, AssetDetail, DcaPlans, RegimeCard)
```

`analyze()` is called in exactly one place: `lib/useMarketPortfolio.ts`, client
side, gated on `chart.candles.length >= 30`. Nothing server-side computes advice.

## lib/indicators.ts — exact contracts

| Function | Signature | Insufficient data | Units / notes |
|---|---|---|---|
| `sma` | `(values: number[], period) => number \| null` | `null` when `length < period` | mean of the **last** `period` values |
| `emaSeries` | `(values, period) => number[]` | `[]` only when input empty | **same length as input**, no warm-up guard |
| `ema` | `(values, period) => number \| null` | `null` when `length < period` | latest value of `emaSeries` |
| `rsi` | `(values, period = 14) => number \| null` | `null` when `length < period + 1` | **0–100**, not 0–1. Wilder smoothing. Returns exactly `100` when `avgLoss === 0` |
| `macd` | `(values, fast=12, slow=26, signalPeriod=9) => { macd, signal }` | `{ macd: null, signal: null }` when `length < slow + signalPeriod` (35 by default) | never returns a bare `null` — always the object |
| `momentum` | `(values, period) => number \| null` | `null` when `length < period + 1`, and `null` when the past close is `0` | **percent** (already ×100), not a ratio |
| `highLow` | `(values) => { high, low } \| null` | `null` on empty array | scans the **whole array passed**, no window slicing |

Rules when touching this file:
- **Chronological, oldest first.** Every function treats `values[length-1]` as
  "now". `ChartData.candles` is documented as "Daily closes, oldest first" — do
  not reverse, and do not add a function that assumes reverse-chronological input.
- **Insufficient data returns `null`, never `NaN` and never a short array.**
  Keep that: `advice.ts` and the UI both branch on `!== null` / `!= null`.
- `emaSeries` seeds with `values[0]`, **not** an SMA seed, so early values are
  biased toward the first close. `ema()` hides this behind a length guard;
  `macd()` deliberately consumes the un-warmed series. Do not "fix" the seed
  without re-checking `macd`'s threshold and the advice weights.
- New primitives go here as **pure functions with no I/O, no `Date`, no fetch**.

## lib/advice.ts — the weighted rule set

Seven rules, each pushing one signed `Signal` (positive = bullish). Weights are
literal constants in the source; keep them there, not in a config object:

| # | Rule | Weight |
|---|---|---|
| 1 | `price > sma200` | `+18` / `-18` |
| 2 | `price > sma50` | `+12` / `-12` |
| 3 | `sma20 > sma50` (golden/death cross) | `+14` / `-14` |
| 4 | RSI14 `>= 70` / `<= 30` / `> 55` / `< 45` / else | `-16` / `+16` / `+6` / `-6` / `0` |
| 5 | `macd > signal` | `+10` / `-10` |
| 6 | 20d momentum `> 8%` / `< -8%` / else | `+8` / `-8` / `Math.round(momentum20)` |
| 7 | position in range `>= 95%` / `<= 10%` | `-6` / `+6` (no signal in between) |

Then:

```ts
const rawScore = signals.reduce((acc, s) => acc + s.weight, 0);
const score = Math.max(-100, Math.min(100, rawScore));
```

Thresholds in `toRecommendation` — memorise these, they are the product:

```
score >=  55 → "STRONG_BUY"
score >=  20 → "BUY"
score <= -55 → "STRONG_SELL"
score <= -20 → "SELL"
otherwise    → "HOLD"
```

`Recommendation` is exactly `"STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL"`
(`lib/types.ts`). French display labels live in `RECOMMENDATION_LABEL` in
`advice.ts` — the enum itself stays English.

Confidence:

```ts
agreement  = decisive === 0 ? 0 : Math.abs(bullish - bearish) / decisive
confidence = Math.round(Math.min(100, (Math.abs(score) / 100) * 60 + agreement * 40))
```

`bullish` / `bearish` count only signals with a **non-zero** weight, so a
zero-weight signal (neutral RSI, flat momentum) is emitted for the UI but is
invisible to confidence. Signals are returned sorted by descending `|weight|`.

Invariants to preserve:
- `analyze()` **never returns null**. On an empty or tiny series it returns
  `price = 0`, every indicator `null`, `score = 0`, `HOLD`, `confidence = 0`.
  Callers must gate on candle count themselves (see the `>= 30` gate above).
- The current weights sum to at most ±84, so the `[-100, 100]` clamp never
  actually binds. If you add or raise a weight past that, the clamp starts
  silently saturating scores — re-check the 55/20 thresholds if you do.
- `indicators.high52w` / `low52w` are **misnamed**: `highLow(closes)` scans the
  whole fetched window, which is whatever `range` the caller asked for
  (`"1y"` by default in `lib/market.ts` and `/api/chart`). It is not a rolling
  52-week high. The signal detail string correctly says
  "sur ${candles.length} jours" — keep that honest phrasing.

## lib/dcaOrientation.ts — advice → stance

`DcaStance = "renforcer" | "maintenir" | "alleger" | "inconnu"`.
Mapping (`orientDca(recommendation, { circuitActive, planActive })`):

- no recommendation → `inconnu`
- `circuitActive && (BUY | STRONG_BUY)` → **`maintenir`** — the monthly circuit
  breaker overrides buys before the per-rec mapping runs. Any new caller must
  pass `circuitActive` or it will recommend reinforcing into a drawdown.
- `STRONG_BUY` / `BUY` → `renforcer`; `HOLD` → `maintenir`; `SELL` /
  `STRONG_SELL` → `alleger`.

`planActive` is accepted but not currently read by `orientDca` — callers filter
on `plan.active` themselves. Trade Brain **orients sparplans**; it never emits a
discretionary trade instruction. Keep new copy in that register.

`adviceForPlan(plan, rows)` matches on uppercased `symbol`, then uppercased
`externalKey` (ISIN or crypto ticker). Always uppercase both sides.

## lib/dcaProjection.ts — calendar only, no market return

`projectDcaMonth(plans, now = new Date()) => DcaProjection`:

- Filters `p.active && p.monthlyEur > 0`; sums `monthlyEur`.
- `daysInMonth()` uses **local** time (`new Date(y, m+1, 0).getDate()`), not UTC.
- `day = clamp(now.getDate(), 1, daysInMonth)`; `dailyEur = monthlyEur / dim`;
  `mtdProjectedEur = dailyEur * day` (**day is inclusive**, so day 1 already
  accrues one day); `remainingEur = max(0, monthly - mtd)`; `progress = day / dim`.
- All amounts are **EUR** — the type field is literally `monthlyEur`. There is no
  currency parameter and no FX here.

`projectDcaInvested(monthlyEur, years, alreadyInvestedEur = 0)` is a **linear**
capital-effort projection: `already + monthlyEur * 12 * years`. It returns
`alreadyInvestedEur` unchanged when `monthlyEur <= 0` or `years <= 0`.
It deliberately models **no compounding, no market return, no fees, no taxes**
and ignores plan start/end dates. Do not "improve" it into a growth model
without an explicit request — the UI labels it "projection linéaire".

Both functions take an injectable `now` / explicit inputs. Keep that: it is what
makes them testable without faking timers.

## Multi-tenancy and the storage split

This trips people up: **holdings, DCA plans and import metadata are not in
SQLite.** They live in browser `localStorage`, keyed by tenant, in
`lib/storage.tsx`:

| Data | localStorage key |
|---|---|
| Holdings | `trade-brain.portfolio.v1:${tenantId}` |
| DCA plans | `trade-brain.dca.v1:${tenantId}` |
| Import metadata | `trade-brain.import-meta.v1:${tenantId}` |

Only the **signal journal** is server-side (SQLite).

For anything server-side:
- Every `signal_journal` row carries `organization_id`; the table has
  `UNIQUE(organization_id, holding_id, date)` and row ids are tenant-scoped
  (`sig_${organizationId}_${holdingId}_${date}`). Never build an id or a query
  without the org.
- Every function in `lib/signalJournalDb.ts` takes `organizationId` as its first
  argument. Follow that shape for new persistence helpers.
- Route gates: `requireTenant()` (session + active org, auto-provisions a
  personal space) for anything touching tenant data — see `app/api/journal/route.ts`.
  `requireSession()` only for org-agnostic routes (`/api/chart`, `/api/search`).
- `upsertTodaySnapshots` intentionally **skips `HOLD` and non-positive prices** —
  the journal only tracks actionable calls.
- New tables/columns go through `migrate()` in `lib/db.ts`, guarded by
  `columnExists` / `tableExists` / `CREATE ... IF NOT EXISTS` so old installs
  upgrade in place.

## Testing idiom (Vitest)

`npm run test` (`vitest run`), `npm run test:watch`. Config: node environment,
`@` aliased to the repo root, tests colocated as `lib/<module>.test.ts`.

The house style, taken from the existing suite:

```ts
import { describe, expect, it } from "vitest";
import { momentum, sma } from "@/lib/indicators";

describe("sma", () => {
  it("returns null when there is not enough data", () => {
    expect(sma([1, 2], 3)).toBeNull();
  });

  it("averages the last period values", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toBe(4);
  });
});
```

- `describe` per exported function, `it` sentences describing behaviour, not
  implementation ("returns null when there is not enough data").
- Import through the `@/lib/...` alias, never a relative path.
- Floats: `toBeCloseTo(20)` (default 2-digit precision). Exact integers and
  clean averages use `toBe`. Missing data uses `toBeNull()`.
- Determinism: pass an explicit `now` (`new Date(2026, 6, 27)`) or fixed ISO
  strings. No fake timers anywhere in the suite.
- Synthetic series: `Array.from({ length: 20 }, (_, i) => 100 + i)`, or a local
  `candles()` factory (`lib/portfolioHistory.test.ts`) — no fixture files, no
  network, no mocks in math tests.
- French output is asserted literally; normalise the thin/nbsp before comparing:
  `out.replace(/\u202f|\u00a0/g, " ")` (`lib/format.test.ts`).
- DB-touching tests use a real `better-sqlite3` file in `fs.mkdtempSync(...)`
  with an `afterEach` cleanup (`lib/db-otp-index.test.ts`) — never the app's
  `data/trade-brain.sqlite`.

**Project rule: new or changed math in `lib/` ships with tests in the same
change.** Note the current gap — `advice.ts`, `dcaProjection.ts`,
`dcaOrientation.ts`, `regime.ts` and `risk.ts` have **no test files yet**. If you
touch one of them, add `lib/<name>.test.ts` rather than following the gap.

## Portfolio-level rules worth knowing

- `lib/risk.ts` exports an `as const` `RISK` constants object: `maxSinglePct 15`,
  `maxSingleHardPct 20`, `maxTop3Pct 50`, `riskPerTradePct 1`,
  `maxNewPositionPct 10`, `monthLossBreakerPct -6`, `periodLossBreakerPct -8`,
  `periodSessions 20`. Read thresholds from `RISK`, never inline a number.
  Half-threshold breaches map to `level: "caution"`; full breaches to `"halt"`,
  and only `"halt"` sets `active: true`.
- `suggestPositionSize` stops at SMA50 when it sits below `price * 0.995`, else
  3% below price, with a minimum 1.5% risk distance.
- `lib/regime.ts` score = `aboveSma200Pct * 0.7 + bullishPct * 0.2 + 5 +
  cryptoTilt`, clamped 0–100; zone `>= 62` `risk_on`, `< 42` `risk_off`, else
  `neutral`. `aboveSma200Pct` falls back to `50` when there is no managed value.

## Common mistakes

- Assuming `rsi()` returns 0–1, or that insufficient data yields `NaN`/`[]`.
  It is 0–100 and `null`.
- Treating `macd()`'s failure case as `null`; it returns `{ macd: null, signal: null }`.
- Reading `indicators.high52w` as a true 52-week extreme.
- Adding a signal weight without re-checking the ±84 headroom under the clamp.
- Calling `orientDca()` without `circuitActive`, re-enabling buys during a
  drawdown halt.
- Putting a fetch, a `Date.now()` or a DB call inside `lib/indicators.ts` /
  `advice.ts` / `dcaProjection.ts`. Inject the value instead.
- Writing a server query against `signal_journal` without `organization_id`, or
  minting a journal id that is not tenant-prefixed.
- Looking for holdings or DCA plans in SQLite — they are tenant-keyed localStorage.
- Hardcoding French strings with `toLocaleString`. Use `lib/format.ts`
  (`formatCurrency`, `formatPercent`, `formatShares`, …); the whole UI is `fr-FR`.
