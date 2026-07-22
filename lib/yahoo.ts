// Server-side helpers that talk to Yahoo Finance's public chart & search
// endpoints. These run only in API routes (never in the browser) to avoid CORS
// and to keep a single, cacheable data path.

import type { Candle, ChartData } from "./types";

const CHART_BASE = "https://query2.finance.yahoo.com/v8/finance/chart";
const SEARCH_BASE = "https://query2.finance.yahoo.com/v1/finance/search";

// Minimal browser-like headers. Extra Origin/Referer headers tend to trigger
// Yahoo's edge 429 more aggressively from Node's fetch.
const HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "*/*",
};

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

async function yahooFetch(url: string, attempts = 3): Promise<Response> {
  let last: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
    last = res;
    if (res.status !== 429) return res;
    // Back off on rate-limit: 0.8s, 1.6s, …
    await new Promise((r) => setTimeout(r, 800 * 2 ** i));
  }
  return last!;
}

/** Fetch and normalize one symbol's daily history + latest quote. */
export async function fetchChart(
  symbol: string,
  range = "1y",
  interval = "1d",
): Promise<ChartData> {
  const url = `${CHART_BASE}/${encodeURIComponent(
    symbol,
  )}?range=${range}&interval=${interval}&includePrePost=false`;

  const res = await yahooFetch(url);
  if (!res.ok) {
    throw new Error(`Yahoo chart request failed (${res.status}) for ${symbol}`);
  }
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) {
    const desc = json?.chart?.error?.description ?? "no data";
    throw new Error(`No data for ${symbol}: ${desc}`);
  }

  const meta = result.meta ?? {};
  const timestamps: number[] = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  const closes: (number | null)[] = quote.close ?? [];

  const candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (c == null || Number.isNaN(c)) continue;
    candles.push({ t: timestamps[i] * 1000, close: c });
  }

  const price =
    meta.regularMarketPrice ??
    candles[candles.length - 1]?.close ??
    0;
  // IMPORTANT: never use meta.chartPreviousClose — that is the first close of
  // the selected range (e.g. ~1y ago), not yesterday. It inflated "today" P&L.
  const previousClose =
    meta.previousClose ??
    meta.regularMarketPreviousClose ??
    candles[candles.length - 2]?.close ??
    price;

  return {
    symbol: meta.symbol ?? symbol,
    shortName: meta.shortName || meta.longName || symbol,
    currency: meta.currency ?? "USD",
    price,
    previousClose,
    candles,
  };
}

/** Fetch multiple symbols sequentially (avoids Yahoo 429 bursts). */
export async function fetchCharts(
  symbols: string[],
  range = "1y",
): Promise<{ data: Record<string, ChartData>; errors: Record<string, string> }> {
  const data: Record<string, ChartData> = {};
  const errors: Record<string, string> = {};
  for (const s of symbols) {
    try {
      data[s] = await fetchChart(s, range);
    } catch (err) {
      errors[s] = err instanceof Error ? err.message : "unknown error";
    }
    // Small gap between symbols to stay under Yahoo's burst limit.
    if (symbols.length > 1) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  return { data, errors };
}

/** Symbol search / autocomplete. */
export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const url = `${SEARCH_BASE}?q=${encodeURIComponent(
    query,
  )}&quotesCount=8&newsCount=0`;
  const res = await yahooFetch(url);
  if (!res.ok) throw new Error(`Yahoo search failed (${res.status})`);
  const json = await res.json();
  const quotes: any[] = json?.quotes ?? [];
  return quotes
    .filter((q) => q.symbol)
    .map((q) => ({
      symbol: q.symbol,
      name: q.shortname || q.longname || q.symbol,
      exchange: q.exchDisp || q.exchange || "",
      type: q.quoteType || "",
    }));
}
