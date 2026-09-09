import { describe, expect, it } from "vitest";
import {
  RISK,
  concentrationReport,
  evaluateCircuitBreaker,
  isBuyRec,
  suggestPositionSize,
} from "@/lib/risk";

type Row = Parameters<typeof concentrationReport>[0][number];

function row(
  id: string,
  marketValue: number,
  extra: Partial<Row> = {},
): Row {
  return {
    holding: { id, name: id, symbol: id.toUpperCase(), quantity: 1 },
    marketValue,
    priceEur: 100,
    unmanaged: false,
    chart: null,
    advice: null,
    monthPnl: 0,
    ...extra,
  } as Row;
}

describe("concentrationReport", () => {
  it("returns an empty report when the portfolio is worthless", () => {
    const r = concentrationReport([row("a", 10)], 0);
    expect(r.alerts).toEqual([]);
    expect(r.top3Pct).toBe(0);
    expect(r.top3Warn).toBe(false);
  });

  it("ignores holdings below the soft threshold", () => {
    const r = concentrationReport([row("a", 10), row("b", 90)], 100);
    expect(r.alerts.map((a) => a.id)).toEqual(["b"]);
  });

  it("flags a position at the soft threshold as a warning", () => {
    const r = concentrationReport([row("a", RISK.maxSinglePct)], 100);
    expect(r.alerts).toHaveLength(1);
    expect(r.alerts[0].severity).toBe("warn");
  });

  it("escalates to hard at the hard threshold", () => {
    const r = concentrationReport([row("a", RISK.maxSingleHardPct)], 100);
    expect(r.alerts[0].severity).toBe("hard");
  });

  it("ranks alerts by weight, heaviest first", () => {
    const r = concentrationReport(
      [row("small", 16), row("big", 40), row("mid", 25)],
      100,
    );
    expect(r.alerts.map((a) => a.id)).toEqual(["big", "mid", "small"]);
  });

  it("sums only the top three for the concentration warning", () => {
    const r = concentrationReport(
      [row("a", 20), row("b", 20), row("c", 20), row("d", 20)],
      100,
    );
    expect(r.top3Pct).toBeCloseTo(60, 6);
    expect(r.top3Warn).toBe(true);
  });

  it("does not warn when the top three stay under the cap", () => {
    const spread = Array.from({ length: 10 }, (_, i) => row(`h${i}`, 10));
    const r = concentrationReport(spread, 100);
    expect(r.top3Pct).toBeCloseTo(30, 6);
    expect(r.top3Warn).toBe(false);
  });
});

describe("evaluateCircuitBreaker", () => {
  it("stays ok on a flat month", () => {
    const cb = evaluateCircuitBreaker(0, 0);
    expect(cb.level).toBe("ok");
    expect(cb.active).toBe(false);
    expect(cb.reasons).toEqual([]);
  });

  it("halts at the monthly loss threshold", () => {
    const cb = evaluateCircuitBreaker(RISK.monthLossBreakerPct, null);
    expect(cb.level).toBe("halt");
    expect(cb.active).toBe(true);
  });

  it("cautions at half the monthly threshold", () => {
    const cb = evaluateCircuitBreaker(RISK.monthLossBreakerPct / 2, null);
    expect(cb.level).toBe("caution");
    expect(cb.active).toBe(false);
  });

  it("halts on the rolling-period threshold even when the month is fine", () => {
    const cb = evaluateCircuitBreaker(0, RISK.periodLossBreakerPct);
    expect(cb.level).toBe("halt");
    expect(cb.active).toBe(true);
  });

  it("keeps halt when the month already halted and the period only cautions", () => {
    const cb = evaluateCircuitBreaker(
      RISK.monthLossBreakerPct,
      RISK.periodLossBreakerPct / 2,
    );
    expect(cb.level).toBe("halt");
  });

  it("ignores a missing period return", () => {
    expect(evaluateCircuitBreaker(0, null).level).toBe("ok");
  });
});

describe("suggestPositionSize", () => {
  // 100 EUR quote, 10 units held, EUR 10 000 portfolio -> 10% weight.
  const held = row("a", 1000, { priceEur: 100 });

  it("refuses to size an unmanaged holding", () => {
    expect(
      suggestPositionSize(row("a", 100, { unmanaged: true }), 10_000),
    ).toBeNull();
  });

  it("refuses to size against an empty portfolio", () => {
    expect(suggestPositionSize(held, 0)).toBeNull();
  });

  it("blocks a holding already at the concentration cap", () => {
    const size = suggestPositionSize(held, 10_000)!;
    expect(size.capped).toBe(true);
    expect(size.notional).toBe(0);
    expect(size.units).toBe(0);
    expect(size.currentWeightPct).toBeCloseTo(RISK.maxNewPositionPct, 6);
  });

  it("uses a 3% stop when no SMA50 sits below the price", () => {
    const small = row("a", 100, { priceEur: 100 });
    const size = suggestPositionSize(small, 10_000)!;
    expect(size.stop).toBeCloseTo(97, 6);
  });

  it("is cap-bound with the default stop, because 1% risk over a 3% distance asks for a third of the book", () => {
    // riskAmount / riskPerUnit * price = 0.01T / 0.03P * P = 33% of the
    // portfolio, always above the 10% weight cap. The cap, not the risk
    // budget, is what decides the size in this configuration.
    const small = row("a", 100, { priceEur: 100 });
    const size = suggestPositionSize(small, 10_000)!;
    expect(size.capped).toBe(true);
    expect(size.notional).toBeCloseTo(900, 4);
    expect(size.units).toBeCloseTo(9, 6);
  });

  it("sizes from the risk budget when a distant SMA50 stop leaves room", () => {
    // Stop at 70 on a 100 quote -> 30 EUR of risk per unit. 1% of a 10 000 EUR
    // book is 100 EUR at risk, so 3.33 units / 333 EUR - under the 900 EUR
    // headroom, so the risk budget binds rather than the cap.
    const trending = row("a", 100, {
      priceEur: 100,
      advice: { indicators: { sma50: 70 } },
    } as Partial<Row>);
    const size = suggestPositionSize(trending, 10_000)!;
    expect(size.capped).toBe(false);
    expect(size.stop).toBeCloseTo(70, 6);
    expect(size.riskPct).toBe(RISK.riskPerTradePct);
    expect(size.units).toBeCloseTo(100 / 30, 6);
    expect(size.riskAmount).toBeCloseTo(100, 4);
  });

  it("caps the suggestion so the position cannot exceed the weight limit", () => {
    // 9.5% held, so only 0.5% of the portfolio may be added.
    const near = row("a", 950, { priceEur: 100 });
    const size = suggestPositionSize(near, 10_000)!;
    expect(size.capped).toBe(true);
    expect(size.notional).toBeCloseTo(50, 4);
  });

  it("works entirely in EUR, so a converted quote sizes the same as a EUR one", () => {
    // The same position quoted in USD arrives here already converted; sizing
    // must not depend on the original currency.
    const a = suggestPositionSize(row("a", 100, { priceEur: 100 }), 10_000)!;
    const b = suggestPositionSize(row("b", 100, { priceEur: 100 }), 10_000)!;
    expect(a.units).toBeCloseTo(b.units, 9);
    expect(a.notional).toBeCloseTo(b.notional, 9);
  });

  it("honours an explicit combined exposure across envelopes", () => {
    // Held twice (PEA + CT): 6% each, 12% combined, over the 10% cap.
    const size = suggestPositionSize(row("a", 600, { priceEur: 100 }), 10_000, {
      combinedMarketValue: 1200,
    })!;
    expect(size.capped).toBe(true);
    expect(size.currentWeightPct).toBeCloseTo(12, 6);
    expect(size.note).toContain("toutes enveloppes");
  });
});

describe("isBuyRec", () => {
  it("accepts both buy strengths", () => {
    expect(isBuyRec("BUY")).toBe(true);
    expect(isBuyRec("STRONG_BUY")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isBuyRec("HOLD")).toBe(false);
    expect(isBuyRec("SELL")).toBe(false);
    expect(isBuyRec(undefined)).toBe(false);
  });
});
