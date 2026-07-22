// EODHD market data — used as fallback when Yahoo misses EU ISINs / listings.
// Requires EODHD_API_TOKEN in the server environment.

import type { Candle, ChartData } from "./types";

const BASE = "https://eodhd.com/api";

export interface EodhdSearchHit {
  symbol: string; // CODE.EXCHANGE
  code: string;
  exchange: string;
  name: string;
  type: string;
  currency: string;
  isin: string;
  previousClose: number;
}

function token(): string | null {
  const t = process.env.EODHD_API_TOKEN?.trim();
  return t || null;
}

export function eodhdConfigured(): boolean {
  return Boolean(token());
}

async function eodhdGet<T>(path: string): Promise<T> {
  const apiToken = token();
  if (!apiToken) throw new Error("EODHD_API_TOKEN not configured");
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}api_token=${encodeURIComponent(apiToken)}&fmt=json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`EODHD ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

/** Map a Yahoo-style ticker (AAPL, SXR8.DE) to an EODHD CODE.EXCHANGE guess. */
export function yahooToEodhdSymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (s.includes(".")) {
    const [code, suff] = s.split(".");
    const ex =
      (
        {
          DE: "XETRA",
          PA: "PA",
          AS: "AS",
          MI: "MI",
          L: "LSE",
          BR: "BR",
          SW: "SW",
          MC: "MC",
          T: "TSE",
          HK: "HK",
        } as Record<string, string>
      )[suff] ?? suff;
    return `${code}.${ex}`;
  }
  if (s.endsWith("-USD") && s.length <= 10) {
    // BTC-USD → BTC-USD.CC
    return `${s}.CC`;
  }
  if (s.includes("=")) return `${s}.FOREX`; // EURUSD=X won't match; skip
  return `${s}.US`;
}

/** Prefer EUR-quoted EU listings when resolving an ISIN. */
export async function searchEodhd(query: string): Promise<EodhdSearchHit[]> {
  const raw = await eodhdGet<
    Array<{
      Code: string;
      Exchange: string;
      Name: string;
      Type: string;
      Currency: string;
      ISIN?: string;
      previousClose?: number;
      isPrimary?: boolean;
    }>
  >(`/search/${encodeURIComponent(query)}?limit=12`);

  if (!Array.isArray(raw)) return [];

  const hits: EodhdSearchHit[] = raw
    .filter((r) => r.Code && r.Exchange)
    .map((r) => ({
      symbol: `${r.Code}.${r.Exchange}`,
      code: r.Code,
      exchange: r.Exchange,
      name: r.Name || r.Code,
      type: r.Type || "",
      currency: (r.Currency || "").toUpperCase(),
      isin: (r.ISIN || "").toUpperCase(),
      previousClose: r.previousClose ?? 0,
    }));

  const score = (h: EodhdSearchHit) => {
    let s = 0;
    if (h.currency === "EUR") s += 50;
    if (["XETRA", "PA", "AS", "MI", "BR", "EUFUND"].includes(h.exchange)) s += 40;
    if (["ETF", "FUND", "Common Stock", "STOCK"].some((t) =>
      h.type.toUpperCase().includes(t.toUpperCase()),
    ))
      s += 10;
    if (h.currency === "GBX" || h.currency === "GBP") s -= 15;
    if (h.exchange === "LSE" && h.currency !== "EUR") s -= 10;
    return s;
  };

  return hits.sort((a, b) => score(b) - score(a));
}

export async function resolveIsinEodhd(
  isin: string,
): Promise<EodhdSearchHit | null> {
  const hits = await searchEodhd(isin);
  return hits[0] ?? null;
}

function rangeToFromDate(range: string): string {
  const days =
    range === "5d"
      ? 10
      : range === "1mo"
        ? 40
        : range === "3mo"
          ? 100
          : range === "6mo"
            ? 200
            : 400; // 1y default
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Fetch daily history from EODHD for a CODE.EXCHANGE ticker. */
export async function fetchChartEodhd(
  eodhdSymbol: string,
  range = "1y",
  displaySymbol?: string,
): Promise<ChartData> {
  const from = rangeToFromDate(range);
  type Row = {
    date: string;
    close: number;
    adjusted_close?: number;
  };

  let rows: Row[] = [];
  try {
    rows = await eodhdGet<Row[]>(
      `/eod/${encodeURIComponent(eodhdSymbol)}?period=d&order=a&from=${from}`,
    );
  } catch {
    rows = [];
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`EODHD no EOD data for ${eodhdSymbol}`);
  }

  const candles: Candle[] = rows
    .filter((r) => r.close != null && !Number.isNaN(r.close))
    .map((r) => ({
      t: Date.parse(r.date + "T00:00:00Z"),
      close: r.adjusted_close ?? r.close,
    }))
    .filter((c) => Number.isFinite(c.t));

  let price = candles[candles.length - 1]?.close ?? 0;
  let previousClose =
    candles[candles.length - 2]?.close ?? price;

  // Live quote when available (free tier may delay).
  try {
    const live = await eodhdGet<{
      close?: number;
      previousClose?: number;
    }>(`/real-time/${encodeURIComponent(eodhdSymbol)}`);
    if (live?.close != null && live.close > 0) {
      price = live.close;
      if (live.previousClose != null) previousClose = live.previousClose;
    }
  } catch {
    /* keep EOD last */
  }

  const ex = eodhdSymbol.split(".")[1] ?? "";
  const currency =
    ex === "US" || ex === "CC"
      ? "USD"
      : ex === "LSE"
        ? "GBP"
        : ex === "TSE"
          ? "JPY"
          : "EUR";

  return {
    symbol: displaySymbol ?? eodhdSymbol,
    shortName: eodhdSymbol,
    currency,
    price,
    previousClose,
    candles,
  };
}

/**
 * Try to load a chart for an arbitrary request symbol (Yahoo ticker or ISIN)
 * via EODHD.
 */
export async function fetchChartViaEodhd(
  requestSymbol: string,
  range = "1y",
): Promise<ChartData> {
  const s = requestSymbol.trim().toUpperCase();

  // Direct ISIN → search.
  if (/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(s)) {
    const hit = await resolveIsinEodhd(s);
    if (!hit) throw new Error(`EODHD: no listing for ISIN ${s}`);
    return fetchChartEodhd(hit.symbol, range, s);
  }

  // Yahoo-style → EODHD symbol guess, then search fallback.
  const guessed = yahooToEodhdSymbol(s);
  try {
    return await fetchChartEodhd(guessed, range, s);
  } catch {
    const hits = await searchEodhd(s.replace(/\.[A-Z]+$/, "").replace("-USD", ""));
    if (!hits[0]) throw new Error(`EODHD: no listing for ${s}`);
    return fetchChartEodhd(hits[0].symbol, range, s);
  }
}
