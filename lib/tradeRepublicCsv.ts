/**
 * Parse Trade Republic's official "Transaktionsexport" CSV and rebuild open
 * positions. Re-importing the same file always yields the same positions
 * (idempotent reconstruction — never cumulative).
 */

export interface TrPosition {
  /** Stable key: accountType:ISIN (or ticker) — PEA and CT stay separate. */
  externalKey: string;
  name: string;
  assetClass: string;
  accountType: "DEFAULT" | "PEA";
  /** Raw symbol from CSV (ISIN or crypto ticker). */
  symbolRaw: string;
  quantity: number;
  /** Average cost per unit (EUR), average-cost method. */
  avgCost: number;
  /** Last TRADE buy/sell price in EUR (useful when Yahoo unit ≠ TR unit). */
  lastPriceEur: number;
  currency: string;
  /** Prepaid private-market cash not yet settled into shares. */
  pendingCashEur: number;
  /** Skip Yahoo / use last TR trade (unit mismatch). */
  preferTrMark: boolean;
}

/** TR envelopes, matching the Épargne screen. */
export type TrEnvelope =
  | "compte-titres"
  | "pea"
  | "non-cote"
  | "obligataire"
  | "crypto";

export const ENVELOPE_LABELS: Record<TrEnvelope, string> = {
  "compte-titres": "Compte-Titres",
  pea: "PEA",
  "non-cote": "Non Coté",
  obligataire: "Obligataire",
  crypto: "Wallet Crypto",
};

export function positionEnvelope(
  p: Pick<TrPosition, "accountType" | "assetClass">,
): TrEnvelope {
  if (p.assetClass === "CRYPTO") return "crypto";
  if (p.assetClass === "BOND") return "obligataire";
  if (p.assetClass === "PRIVATE_FUND") return "non-cote";
  if (p.accountType === "PEA") return "pea";
  return "compte-titres";
}

/**
 * ISINs where Yahoo/EODHD quote a different unit than Trade Republic
 * (keep the last TR EUR trade as mark).
 */
const ISIN_TR_MARK_ONLY = new Set([
  "JP3756600007", // Nintendo — TR EUR fractional ≠ Tokyo yen share
]);

/** Human names when TR's `name` column is just a maturity (Apr. 2055). */
const ISIN_DISPLAY_NAME: Record<string, string> = {
  FR0010171975: "OAT France 4% · avr. 2055",
  EU000A3K4DV0: "Obligation UE · nov. 2042",
  XS2800678224: "Air Baltic · août 2029",
};

/** Pull issuer text from "Buy trade ISIN FRTR 4 04/25/55, quantity: …". */
function nameFromDescription(
  description: string,
  symbolRaw: string,
): string | null {
  if (!description || !symbolRaw) return null;
  const re = new RegExp(
    `${symbolRaw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(.+?),\\s*quantity`,
    "i",
  );
  const m = description.match(re);
  return m?.[1]?.trim() || null;
}

export interface TrDcaPlan {
  externalKey: string;
  name: string;
  assetClass: string;
  symbolRaw: string;
  amountEur: number;
  cadence: "weekly" | "biweekly" | "monthly" | "irregular";
  active: boolean;
  executionCount: number;
  totalInvestedEur: number;
  firstDate: string;
  lastDate: string;
  monthlyEur: number;
}

export interface TrParseResult {
  positions: TrPosition[];
  dcaPlans: TrDcaPlan[];
  tradeCount: number;
  skippedRows: number;
  /** Approximate cash left on the brokerage account (EUR). */
  cashEur: number;
  /** Earliest transaction date in the CSV (YYYY-MM-DD). */
  csvFirstDate: string | null;
  /** Latest transaction date in the CSV (YYYY-MM-DD). */
  csvLastDate: string | null;
}

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/** Known ISIN → Yahoo tickers that quote in EUR (Trade Republic PEA / EU listings). */
const ISIN_YAHOO_EUR: Record<string, string> = {
  IE00BGV5VN51: "XAIX.DE", // AI & Big Data
  FR0013380607: "CACC.PA", // Amundi CAC 40
  IE00B5BMR087: "SXR8.DE", // iShares Core S&P 500
  LU0908500753: "MEUD.PA", // Amundi Stoxx Europe 600
  IE00BMDKNW35: "DAGB.L", // VanEck Crypto (GBP — converted later)
  LU3047998896: "GUARD.PA", // BNP Easy Europe Defense
  IE0002Y8CX98: "EUDF.DE", // WisdomTree Europe Defence
  LU1781541252: "CJ1.PA", // Amundi Japan
  IE0002XZSHO1: "WPEA.PA", // iShares MSCI World Swap PEA
  IE00BJ0KDQ92: "XWLD.DE", // Xtrackers MSCI World
  LU1829221024: "ANX.PA", // Amundi Nasdaq-100
  // iShares Physical Gold (EUR on Xetra) — matches TR ~€60–80 unit.
  IE00B4ND3602: "PPFB.DE",
  IE00BM67HW99: "XDPE.DE",
  LU1681048804: "500.PA",
  FR0011550185: "ESE.PA",
  US0378331005: "AAPL",
  US67066G1040: "NVDA",
  US88160R1014: "TSLA",
  US23804L1035: "DDOG",
  // Nintendo: deliberately omitted — see ISIN_TR_MARK_ONLY.
};

/** Minimal RFC4180-ish CSV parser (quoted fields, commas, newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

function num(v: string | undefined): number {
  if (v == null || v.trim() === "") return 0;
  const n = Number(v.trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * Rebuild open lots from a Trade Republic Transaktionsexport CSV string.
 * Handles TRADING BUY/SELL, DELIVERY free receipts/deliveries, and SPLITs.
 */
export function positionsFromTradeRepublicCsv(csvText: string): TrParseResult {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    throw new Error("CSV vide ou invalide");
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const idx = {
    category: col("category"),
    type: col("type"),
    assetClass: col("asset_class"),
    accountType: col("account_type"),
    name: col("name"),
    symbol: col("symbol"),
    shares: col("shares"),
    price: col("price"),
    amount: col("amount"),
    fee: col("fee"),
    tax: col("tax"),
    currency: col("currency"),
    datetime: col("datetime"),
    transactionId: col("transaction_id"),
    description: col("description"),
  };

  if (idx.category < 0 || idx.transactionId < 0 || idx.symbol < 0) {
    throw new Error(
      "Pas un export Trade Republic : colonnes category / symbol / transaction_id manquantes",
    );
  }

  const seen = new Set<string>();
  type Trade = {
    t: string;
    key: string;
    name: string;
    assetClass: string;
    accountType: "DEFAULT" | "PEA";
    symbolRaw: string;
    side: "buy" | "sell";
    shares: number;
    price: number;
    currency: string;
  };
  const trades: Trade[] = [];
  type CashPrepay = { t: string; isin: string; amount: number };
  const prepays: CashPrepay[] = [];
  let skippedRows = 0;
  let cashEur = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (i: number) => (i >= 0 && i < row.length ? row[i].trim() : "");

    const txId = get(idx.transactionId);
    if (txId) {
      if (seen.has(txId)) {
        skippedRows++;
        continue;
      }
      seen.add(txId);
    }

    const category = get(idx.category);
    const type = get(idx.type);
    const symbolRaw = get(idx.symbol);
    const assetClass = get(idx.assetClass) || "";
    const description = get(idx.description);
    const fromDesc = nameFromDescription(description, symbolRaw);
    const name =
      ISIN_DISPLAY_NAME[symbolRaw.toUpperCase()] ||
      (assetClass === "BOND" && fromDesc
        ? fromDesc
        : get(idx.name) || symbolRaw);
    const accountType =
      get(idx.accountType).toUpperCase() === "PEA" ? "PEA" : "DEFAULT";
    const signedShares = num(get(idx.shares));
    const price = Math.abs(num(get(idx.price)));
    const currency = get(idx.currency) || "EUR";
    const t = get(idx.datetime) || get(col("date"));
    const amount = num(get(idx.amount));
    const fee = num(get(idx.fee));
    const tax = num(get(idx.tax));

    // Cash ledger — exclude card spend (not investable cash).
    if (category === "CASH" || category === "TRADING") {
      cashEur += amount + fee + tax;
    }

    // Private-market prepays: cash leaves before shares settle.
    if (category === "CASH" && type === "PRIVATE_MARKET_BUY" && symbolRaw) {
      prepays.push({
        t,
        isin: symbolRaw.toUpperCase(),
        amount: Math.abs(amount),
      });
      skippedRows++;
      continue;
    }

    let side: "buy" | "sell" | null = null;
    let shares = 0;

    if (category === "TRADING" && type === "BUY") {
      side = "buy";
      shares = Math.abs(signedShares);
    } else if (category === "TRADING" && type === "SELL") {
      side = "sell";
      shares = Math.abs(signedShares);
    } else if (category === "CORPORATE_ACTION" && type === "SPLIT") {
      // TR records the *additional* shares credited on a split (cost 0).
      if (signedShares > 0) {
        side = "buy";
        shares = signedShares;
      }
    } else {
      // Ignore DELIVERY free transfers: they usually come in canceling
      // +/- pairs and would wipe cost basis if applied naively.
      skippedRows++;
      continue;
    }

    if (!symbolRaw || shares <= 0) {
      skippedRows++;
      continue;
    }

    // Keep PEA and Compte-Titres as separate books (same ISIN can exist in both).
    const key = `${accountType}:${symbolRaw.toUpperCase()}`;

    trades.push({
      t,
      key,
      name,
      assetClass,
      accountType,
      symbolRaw,
      side: side!,
      shares,
      // Splits / free transfers often have empty price → 0 cost impact on buys.
      price: price > 0 ? price : 0,
      currency,
    });
  }

  type Chrono =
    | { kind: "prepay"; t: string; isin: string; amount: number }
    | { kind: "trade"; t: string; trade: Trade };
  const chrono: Chrono[] = [
    ...prepays.map((p) => ({ kind: "prepay" as const, ...p })),
    ...trades.map((trade) => ({ kind: "trade" as const, t: trade.t, trade })),
  ];
  chrono.sort((a, b) => a.t.localeCompare(b.t));

  const privatePending = new Map<string, number>();
  const books = new Map<
    string,
    {
      name: string;
      assetClass: string;
      accountType: "DEFAULT" | "PEA";
      symbolRaw: string;
      qty: number;
      cost: number;
      lastPriceEur: number;
      currency: string;
    }
  >();

  for (const ev of chrono) {
    if (ev.kind === "prepay") {
      privatePending.set(
        ev.isin,
        (privatePending.get(ev.isin) ?? 0) + ev.amount,
      );
      continue;
    }
    const tr = ev.trade;
    let book = books.get(tr.key);
    if (!book) {
      book = {
        name: tr.name,
        assetClass: tr.assetClass,
        accountType: tr.accountType,
        symbolRaw: tr.symbolRaw,
        qty: 0,
        cost: 0,
        lastPriceEur: 0,
        currency: tr.currency,
      };
      books.set(tr.key, book);
    }
    if (tr.side === "buy") {
      book.cost += tr.shares * tr.price;
      book.qty += tr.shares;
      if (tr.name) book.name = tr.name;
      if (tr.price > 0) book.lastPriceEur = tr.price;
      if (tr.assetClass === "PRIVATE_FUND") {
        const isin = tr.symbolRaw.toUpperCase();
        const pending = privatePending.get(isin) ?? 0;
        if (pending > 0) {
          const settle = Math.min(pending, tr.shares * tr.price);
          privatePending.set(isin, Math.max(0, pending - settle));
        }
      }
    } else {
      if (book.qty <= 0) continue;
      const sellQty = Math.min(tr.shares, book.qty);
      const avg = book.cost / book.qty;
      book.qty -= sellQty;
      book.cost -= avg * sellQty;
      if (tr.price > 0) book.lastPriceEur = tr.price;
      if (book.qty < 1e-12) {
        book.qty = 0;
        book.cost = 0;
      }
    }
  }

  const positions: TrPosition[] = [];
  for (const [externalKey, book] of books) {
    if (book.qty <= 1e-10) continue;
    const avgCost = book.qty > 0 ? book.cost / book.qty : 0;
    const isin = book.symbolRaw.toUpperCase();
    const pendingCashEur =
      book.assetClass === "PRIVATE_FUND" ? (privatePending.get(isin) ?? 0) : 0;
    if (pendingCashEur > 0) privatePending.delete(isin);
    positions.push({
      externalKey,
      name: book.name,
      assetClass: book.assetClass,
      accountType: book.accountType,
      symbolRaw: book.symbolRaw,
      quantity: book.qty,
      avgCost,
      lastPriceEur: book.lastPriceEur || avgCost,
      currency: book.currency,
      pendingCashEur,
      preferTrMark:
        ISIN_TR_MARK_ONLY.has(isin) ||
        book.assetClass === "BOND" ||
        book.assetClass === "PRIVATE_FUND",
    });
  }

  positions.sort((a, b) => a.name.localeCompare(b.name));

  const dcaPlans = detectDcaPlans(rows, header);

  const tradeDates = trades
    .map((tr) => (tr.t || "").slice(0, 10))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  const dcaDates = dcaPlans.flatMap((d) => [d.firstDate, d.lastDate]);
  const allDates = [...tradeDates, ...dcaDates]
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();

  return {
    positions,
    dcaPlans,
    tradeCount: trades.length,
    skippedRows,
    cashEur,
    csvFirstDate: allDates[0] ?? null,
    csvLastDate: allDates[allDates.length - 1] ?? null,
  };
}

type DcaExec = {
  date: string;
  t: number;
  externalKey: string;
  name: string;
  assetClass: string;
  symbolRaw: string;
  amount: number;
};

function detectDcaPlans(
  rows: string[][],
  header: string[],
): TrDcaPlan[] {
  const col = (name: string) => header.indexOf(name);
  const idx = {
    category: col("category"),
    type: col("type"),
    assetClass: col("asset_class"),
    name: col("name"),
    symbol: col("symbol"),
    amount: col("amount"),
    date: col("date"),
    datetime: col("datetime"),
    description: col("description"),
    transactionId: col("transaction_id"),
  };
  if (idx.description < 0 || idx.symbol < 0) return [];

  const seen = new Set<string>();
  const execs: DcaExec[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (i: number) => (i >= 0 && i < row.length ? row[i].trim() : "");
    const txId = get(idx.transactionId);
    if (txId) {
      if (seen.has(txId)) continue;
      seen.add(txId);
    }
    if (get(idx.category) !== "TRADING" || get(idx.type) !== "BUY") continue;
    const desc = get(idx.description).toLowerCase();
    if (!desc.includes("savings plan")) continue;

    const symbolRaw = get(idx.symbol);
    if (!symbolRaw) continue;
    const amount = Math.abs(num(get(idx.amount)));
    if (amount <= 0) continue;
    const date = get(idx.date) || get(idx.datetime).slice(0, 10);
    const t = Date.parse(get(idx.datetime) || date);
    execs.push({
      date,
      t: Number.isFinite(t) ? t : Date.parse(date),
      externalKey: symbolRaw.toUpperCase(),
      name: get(idx.name) || symbolRaw,
      assetClass: get(idx.assetClass) || "",
      symbolRaw,
      amount,
    });
  }

  if (!execs.length) return [];

  const byKey = new Map<string, DcaExec[]>();
  for (const e of execs) {
    const list = byKey.get(e.externalKey) ?? [];
    list.push(e);
    byKey.set(e.externalKey, list);
  }

  const csvMaxT = Math.max(...execs.map((e) => e.t));
  const ACTIVE_MS = 21 * 86400000;

  const plans: TrDcaPlan[] = [];
  for (const [externalKey, list] of byKey) {
    list.sort((a, b) => a.t - b.t);
    // Ignore tiny saveback top-ups when inferring the plan size.
    const material = list.filter((e) => e.amount >= 15);
    const sample = (material.length ? material : list).slice(-12);
    const amountEur = inferPlanAmount(sample.map((e) => e.amount));

    const gaps: number[] = [];
    for (let i = 1; i < list.length; i++) {
      const d = (list[i].t - list[i - 1].t) / 86400000;
      if (d > 0 && d < 45) gaps.push(d);
    }
    const cadence = inferCadence(gaps);
    const last = list[list.length - 1];
    const first = list[0];
    const active = csvMaxT - last.t <= ACTIVE_MS;
    const totalInvestedEur = list.reduce((a, e) => a + e.amount, 0);
    const monthlyEur = monthlyFromCadence(amountEur, cadence);

    plans.push({
      externalKey,
      name: last.name,
      assetClass: last.assetClass,
      symbolRaw: last.symbolRaw,
      amountEur,
      cadence,
      active,
      executionCount: list.length,
      totalInvestedEur,
      firstDate: first.date,
      lastDate: last.date,
      monthlyEur,
    });
  }

  plans.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return b.monthlyEur - a.monthlyEur;
  });
  return plans;
}

function inferPlanAmount(amounts: number[]): number {
  if (!amounts.length) return 0;
  const NICE = [25, 50, 75, 100, 150, 200, 250, 300, 500];
  const counts = new Map<number, number>();
  for (const a of amounts) {
    // Snap to a nice TR sparplan step when close.
    let key = Math.round(a);
    for (const n of NICE) {
      if (Math.abs(a - n) <= 2.5) {
        key = n;
        break;
      }
    }
    // Whole-share buys often land ~€85–99 for a ~€100 plan.
    if (key >= 85 && key <= 99) key = 100;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = amounts[amounts.length - 1];
  let bestN = -1;
  for (const [k, n] of counts) {
    if (n > bestN || (n === bestN && k > best)) {
      best = k;
      bestN = n;
    }
  }
  return best;
}

function inferCadence(
  gaps: number[],
): "weekly" | "biweekly" | "monthly" | "irregular" {
  if (gaps.length < 2) return "irregular";
  const sorted = [...gaps].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  if (med >= 5 && med <= 9) return "weekly";
  if (med >= 12 && med <= 18) return "biweekly";
  if (med >= 25 && med <= 36) return "monthly";
  return "irregular";
}

function monthlyFromCadence(
  amount: number,
  cadence: TrDcaPlan["cadence"],
): number {
  switch (cadence) {
    case "weekly":
      return amount * (52 / 12);
    case "biweekly":
      return amount * (26 / 12);
    case "monthly":
      return amount;
    default:
      return amount; // best-effort
  }
}

/** True when live Yahoo/EODHD quotes must not override the TR EUR trade. */
export function preferTrMarkOnly(
  symbolRaw: string,
  assetClass: string,
): boolean {
  const s = symbolRaw.trim().toUpperCase();
  return (
    ISIN_TR_MARK_ONLY.has(s) ||
    assetClass === "BOND" ||
    assetClass === "PRIVATE_FUND"
  );
}

/** Map a TR symbol/ISIN + asset class to a likely Yahoo Finance ticker. */
export function guessYahooSymbol(
  symbolRaw: string,
  assetClass: string,
): string {
  const s = symbolRaw.trim().toUpperCase();
  // Keep ISIN as symbol so we never fetch a wrong-unit Tokyo/ADR quote.
  if (ISIN_TR_MARK_ONLY.has(s)) return s;
  if (ISIN_YAHOO_EUR[s]) return ISIN_YAHOO_EUR[s];
  if (
    assetClass === "CRYPTO" ||
    (!ISIN_RE.test(s) && /^[A-Z0-9]{2,10}$/.test(s))
  ) {
    if (
      ["BTC", "ETH", "SOL", "XRP", "ADA", "DOT", "AVAX", "DOGE", "LINK", "LTC"].includes(
        s,
      )
    ) {
      return `${s}-USD`;
    }
    if (!ISIN_RE.test(s)) return `${s}-USD`;
  }
  return s;
}

export function isIsin(symbol: string): boolean {
  return ISIN_RE.test(symbol.trim().toUpperCase());
}

export type FxRates = { eurusd: number; eurgbp: number; eurjpy: number };

/** Convert a quote to EUR. Returns null when the currency can't be mapped. */
export function toEur(
  price: number | null | undefined,
  currency: string | null | undefined,
  fx: FxRates,
): number | null {
  if (price == null || !(price > 0)) return null;
  const ccy = (currency || "EUR").toUpperCase();
  if (ccy === "EUR") return price;
  if (ccy === "USD") return price / (fx.eurusd || 1.1);
  if (ccy === "GBP") return price / (fx.eurgbp || 0.85);
  if (ccy === "GBp") return price / 100 / (fx.eurgbp || 0.85);
  // JPY equities on TR are EUR-fractional — don't convert Tokyo units.
  if (ccy === "JPY") return null;
  return null;
}

/**
 * Pick a EUR mark for a TR position. Yahoo sometimes quotes a different share
 * unit than Trade Republic (e.g. Physical Gold) — if the live quote is wildly
 * far from the last TR trade, fall back to that TR price.
 */
export function markPriceEur(
  livePrice: number | null | undefined,
  liveCurrency: string | null | undefined,
  position: Pick<TrPosition, "avgCost" | "lastPriceEur">,
  fx: FxRates,
): number {
  const ref = position.lastPriceEur || position.avgCost;
  const eur = toEur(livePrice, liveCurrency, fx);
  if (eur == null) return ref;

  if (ref > 0) {
    const ratio = eur / ref;
    if (ratio > 2.5 || ratio < 0.4) return ref;
  }
  return eur;
}

/** Prefer EU / EUR-quoted search hits for Trade Republic holdings. */
export function pickBestYahooResult(
  results: { symbol: string; name: string; exchange: string; type: string }[],
): { symbol: string; name: string; exchange: string; type: string } | null {
  if (!results.length) return null;
  const score = (r: (typeof results)[0]) => {
    let s = 0;
    const sym = r.symbol.toUpperCase();
    const ex = (r.exchange || "").toUpperCase();
    if (/\.(PA|DE|AS|MI|BR|MC|LS|SW)$/.test(sym)) s += 50;
    if (/PARIS|XETRA|AMSTERDAM|MILAN|BRUSSELS|MADRID/.test(ex)) s += 40;
    if (/EURONEXT|GERMANY|FRA/.test(ex)) s += 30;
    if (["ETF", "EQUITY", "MUTUALFUND"].includes(r.type.toUpperCase())) s += 10;
    if (/\.(L|T|HK|SS)$/.test(sym)) s -= 20; // London/Tokyo often wrong ccy
    return s;
  };
  return [...results].sort((a, b) => score(b) - score(a))[0];
}
