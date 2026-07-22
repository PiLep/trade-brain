/**
 * Browser cache for /api/chart payloads — instant paint on reload / navigation.
 */

import type { ChartData } from "@/lib/types";

const STORAGE_KEY = "trade-brain.charts.v1";

/** Show cached data without network wait. */
export const CLIENT_SOFT_TTL_MS = 2 * 60 * 1000;
/** Keep serving stale while revalidating in background. */
export const CLIENT_HARD_TTL_MS = 20 * 60 * 1000;

export type ChartCachePayload = {
  at: number;
  range: string;
  symbolsKey: string;
  data: Record<string, ChartData>;
  errors: Record<string, string>;
};

export function readChartCache(
  symbolsKey: string,
  range: string,
): ChartCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChartCachePayload;
    if (
      !parsed?.at ||
      parsed.range !== range ||
      parsed.symbolsKey !== symbolsKey ||
      !parsed.data
    ) {
      return null;
    }
    if (Date.now() - parsed.at > CLIENT_HARD_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeChartCache(payload: ChartCachePayload) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function isChartCacheFresh(at: number): boolean {
  return Date.now() - at < CLIENT_SOFT_TTL_MS;
}
