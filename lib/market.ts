// Unified market-data façade: Yahoo first, EODHD fallback.

import {
  eodhdConfigured,
  fetchChartViaEodhd,
  resolveIsinEodhd,
  searchEodhd,
} from "./eodhd";
import type { ChartData } from "./types";
import {
  fetchChart as fetchChartYahoo,
  searchSymbols as searchYahoo,
  type SearchResult,
} from "./yahoo";
import { isIsin, pickBestYahooResult } from "./tradeRepublicCsv";

/** One symbol: Yahoo → EODHD. */
export async function fetchChart(
  symbol: string,
  range = "1y",
): Promise<ChartData> {
  // Raw ISINs almost never work on Yahoo chart — go straight to EODHD.
  if (isIsin(symbol) && eodhdConfigured()) {
    return fetchChartViaEodhd(symbol, range);
  }

  try {
    return await fetchChartYahoo(symbol, range);
  } catch (yahooErr) {
    if (!eodhdConfigured()) throw yahooErr;
    try {
      return await fetchChartViaEodhd(symbol, range);
    } catch (eodhdErr) {
      const y =
        yahooErr instanceof Error ? yahooErr.message : "Yahoo failed";
      const e =
        eodhdErr instanceof Error ? eodhdErr.message : "EODHD failed";
      throw new Error(`${y}; ${e}`);
    }
  }
}

export async function fetchCharts(
  symbols: string[],
  range = "1y",
): Promise<{ data: Record<string, ChartData>; errors: Record<string, string> }> {
  const data: Record<string, ChartData> = {};
  const errors: Record<string, string> = {};
  for (const s of symbols) {
    // Skip FX helpers that EODHD won't map cleanly from Yahoo form.
    try {
      data[s] = await fetchChart(s, range);
    } catch (err) {
      errors[s] = err instanceof Error ? err.message : "unknown error";
    }
    if (symbols.length > 1) {
      await new Promise((r) => setTimeout(r, 80));
    }
  }
  return { data, errors };
}

export async function resolveSymbol(
  query: string,
  assetClass = "",
): Promise<{
  symbol: string | null;
  name: string | null;
  exchange?: string;
  type?: string;
  source?: "map" | "yahoo" | "eodhd";
}> {
  const q = query.trim();
  if (q.length < 2) return { symbol: null, name: null };

  // 1) EODHD ISIN resolve (best for TR exports).
  if (isIsin(q) && eodhdConfigured()) {
    try {
      const hit = await resolveIsinEodhd(q);
      if (hit) {
        // Prefer a Yahoo-friendly suffix when we can, else keep EODHD symbol
        // (chart route will fetch via EODHD for CODE.EXCHANGE / ISIN).
        const yahooish = eodhdToYahooish(hit.symbol);
        return {
          symbol: yahooish,
          name: hit.name,
          exchange: hit.exchange,
          type: hit.type,
          source: "eodhd",
        };
      }
    } catch {
      /* fall through */
    }
  }

  // 2) Yahoo search.
  try {
    const results = await searchYahoo(q);
    const best = pickBestYahooResult(results);
    if (best) {
      return {
        symbol: best.symbol,
        name: best.name,
        exchange: best.exchange,
        type: best.type,
        source: "yahoo",
      };
    }
  } catch {
    /* fall through */
  }

  // 3) EODHD text search.
  if (eodhdConfigured()) {
    try {
      const hits = await searchEodhd(q);
      if (hits[0]) {
        return {
          symbol: eodhdToYahooish(hits[0].symbol),
          name: hits[0].name,
          exchange: hits[0].exchange,
          type: hits[0].type,
          source: "eodhd",
        };
      }
    } catch {
      /* ignore */
    }
  }

  void assetClass;
  return { symbol: null, name: null };
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  try {
    return await searchYahoo(query);
  } catch {
    if (!eodhdConfigured()) return [];
    const hits = await searchEodhd(query);
    return hits.slice(0, 8).map((h) => ({
      symbol: eodhdToYahooish(h.symbol),
      name: h.name,
      exchange: h.exchange,
      type: h.type,
    }));
  }
}

/** PPFB.XETRA → PPFB.DE ; AAPL.US → AAPL */
function eodhdToYahooish(eodhdSymbol: string): string {
  const [code, ex] = eodhdSymbol.split(".");
  if (!ex || ex === "US") return code;
  if (ex === "CC") return code; // BTC-USD.CC → BTC-USD
  if (ex === "XETRA") return `${code}.DE`;
  if (ex === "LSE") return `${code}.L`;
  if (ex === "TSE") return `${code}.T`;
  if (["PA", "AS", "MI", "BR", "SW", "MC"].includes(ex)) return `${code}.${ex}`;
  // Keep full EODHD symbol — fetchChart will still resolve it via EODHD.
  return eodhdSymbol;
}
