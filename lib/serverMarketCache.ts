/**
 * In-memory TTL cache for chart fetches (Node process).
 * Survives across API requests during `next dev` / `next start`.
 */

import type { ChartData } from "@/lib/types";

type Entry = {
  at: number;
  data: ChartData;
};

const store = new Map<string, Entry>();

/** Fresh enough to skip Yahoo/EODHD. */
export const SERVER_TTL_MS = 5 * 60 * 1000;

function key(symbol: string, range: string) {
  return `${range}:${symbol.toUpperCase()}`;
}

export function getCachedChart(
  symbol: string,
  range: string,
): ChartData | null {
  const e = store.get(key(symbol, range));
  if (!e) return null;
  if (Date.now() - e.at > SERVER_TTL_MS) {
    store.delete(key(symbol, range));
    return null;
  }
  return e.data;
}

export function setCachedChart(
  symbol: string,
  range: string,
  data: ChartData,
) {
  store.set(key(symbol, range), { at: Date.now(), data });
}
