// Shared domain types for Trade Brain.

/** A single daily price point. */
export interface Candle {
  /** Timestamp in milliseconds (UTC). */
  t: number;
  close: number;
}

/** Normalized market data for one symbol, returned by /api/chart. */
export interface ChartData {
  symbol: string;
  shortName: string;
  currency: string;
  /** Most recent price (may be intraday). */
  price: number;
  /** Previous session close, for the day change. */
  previousClose: number;
  /** Daily closes, oldest first. */
  candles: Candle[];
}

/** A single asset the user holds, persisted locally. */
export interface Holding {
  id: string;
  /** Market symbol, e.g. "AAPL", "BTC-USD", "MC.PA". */
  symbol: string;
  /** Friendly name, e.g. "Apple Inc.". */
  name: string;
  /** Units held. */
  quantity: number;
  /** Average purchase price per unit, in the asset's currency. */
  avgCost: number;
  /** ISO date the position was added. */
  addedAt: string;
  /** Origin of the position. Trade Republic imports are replaced on re-import. */
  source?: "manual" | "trade-republic" | "seed";
  /** Stable external key (ISIN or crypto ticker) used for idempotent import. */
  externalKey?: string;
  /**
   * Last Trade Republic trade price in EUR. Used as a mark when Yahoo quotes a
   * different share unit (e.g. some gold ETCs).
   */
  lastPriceEur?: number;
  /** Trade Republic account envelope: PEA vs standard brokerage. */
  accountType?: "DEFAULT" | "PEA";
  /** Trade Republic asset_class (FUND, STOCK, CRYPTO, BOND, PRIVATE_FUND…). */
  assetClass?: string;
  /**
   * Unsettled private-market cash (PRIVATE_MARKET_BUY without matching shares).
   * Counted in market value for Non Coté.
   */
  pendingCashEur?: number;
  /** Prefer lastPriceEur over live quotes (wrong Yahoo unit, e.g. Nintendo). */
  preferTrMark?: boolean;
}

/** A recurring savings-plan (DCA) inferred from Trade Republic executions. */
export interface DcaPlan {
  id: string;
  /** Yahoo / display symbol when resolved. */
  symbol: string;
  name: string;
  /** ISIN or crypto ticker from the CSV. */
  externalKey: string;
  /** Typical contribution per execution (EUR). */
  amountEur: number;
  cadence: "weekly" | "biweekly" | "monthly" | "irregular";
  /** true if last execution is recent enough to look active. */
  active: boolean;
  executionCount: number;
  /** Sum of all savings-plan buys (EUR). */
  totalInvestedEur: number;
  firstDate: string;
  lastDate: string;
  /** Estimated monthly run-rate from cadence × amount. */
  monthlyEur: number;
}

export type Recommendation =
  | "STRONG_BUY"
  | "BUY"
  | "HOLD"
  | "SELL"
  | "STRONG_SELL";

/** One reasoned factor that fed into a recommendation. */
export interface Signal {
  label: string;
  /** Signed contribution to the score. Positive = bullish. */
  weight: number;
  detail: string;
  tone: "bullish" | "bearish" | "neutral";
}

/** The full output of the advice engine for one symbol. */
export interface Advice {
  recommendation: Recommendation;
  /** Composite score, clamped to [-100, 100]. */
  score: number;
  /** 0–100 confidence based on signal agreement and strength. */
  confidence: number;
  signals: Signal[];
  indicators: {
    price: number;
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    rsi14: number | null;
    macd: number | null;
    macdSignal: number | null;
    momentum20: number | null;
    high52w: number | null;
    low52w: number | null;
  };
}
