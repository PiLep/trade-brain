/**
 * Approximate portfolio value series from current quantities × historical closes.
 * Directional only — ignores past quantity / DCA changes (no full ledger).
 */

import type { Candle } from "@/lib/types";

type SeriesRow = {
  holding: { quantity: number };
  chart: { candles: Candle[] } | null;
  unmanaged: boolean;
};

export type PortfolioPoint = {
  t: number;
  value: number;
};

/**
 * Build a daily portfolio value series for the last `days` sessions.
 * Only managed lines with candles contribute; TR mark-only lines are skipped.
 */
export function portfolioValueSeries(
  rows: SeriesRow[],
  days = 90,
): PortfolioPoint[] {
  const series = rows
    .filter((r) => !r.unmanaged && r.chart?.candles?.length && r.holding.quantity > 0)
    .map((r) => ({
      qty: r.holding.quantity,
      candles: r.chart!.candles,
    }));

  if (!series.length) return [];

  // Index each series by day key (UTC date) for alignment.
  const byDay = new Map<string, { t: number; sum: number; n: number }>();

  for (const s of series) {
    const slice = s.candles.slice(-Math.max(days, 1));
    for (const c of slice) {
      const key = new Date(c.t).toISOString().slice(0, 10);
      const prev = byDay.get(key);
      const contrib = c.close * s.qty;
      if (prev) {
        prev.sum += contrib;
        prev.n += 1;
      } else {
        byDay.set(key, { t: c.t, sum: contrib, n: 1 });
      }
    }
  }

  // Prefer days where most holdings have a print (avoid sparse early days).
  const minCoverage = Math.max(1, Math.ceil(series.length * 0.6));
  return [...byDay.values()]
    .filter((d) => d.n >= minCoverage)
    .sort((a, b) => a.t - b.t)
    .map((d) => ({ t: d.t, value: d.sum }));
}
