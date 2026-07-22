/**
 * Monthly-review helpers — Trade Brain is a month-cadence analysis tool.
 */

import type { Candle } from "@/lib/types";

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthStart(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0);
}

export function monthLabel(d = new Date(), locale = "fr-FR"): string {
  return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

/** YYYY-MM-DD → comparable month key. */
export function dateMonthKey(iso: string): string | null {
  if (!iso || iso.length < 7) return null;
  return iso.slice(0, 7);
}

/**
 * Close on/just before month start, vs latest close.
 * Returns % move over the month-to-date window.
 */
export function monthToDateReturnPct(
  candles: Candle[],
  now = new Date(),
): number | null {
  if (!candles.length) return null;
  const startMs = monthStart(now).getTime();
  let startClose: number | null = null;
  for (const c of candles) {
    if (c.t <= startMs) startClose = c.close;
    else break;
  }
  // If no candle before month start, use first candle in month.
  if (startClose == null) {
    const inMonth = candles.find((c) => c.t >= startMs);
    if (!inMonth) return null;
    startClose = inMonth.close;
  }
  const endClose = candles[candles.length - 1]?.close;
  if (!(startClose > 0) || !(endClose > 0)) return null;
  return ((endClose - startClose) / startClose) * 100;
}

export type ImportMeta = {
  /** When the user imported the CSV. */
  importedAt: string;
  /** Earliest trade date in the CSV (YYYY-MM-DD). */
  csvFirstDate: string | null;
  /** Latest trade date in the CSV (YYYY-MM-DD). */
  csvLastDate: string | null;
};

/**
 * Optional end-of-month nudge: CSV doesn't cover the current calendar month.
 * Only surfaces late in the month — DCA-first portfolios don't need a fresh
 * export for day-to-day review (projection covers the cash flow).
 * Seed-only portfolios are never flagged.
 */
export function missingCurrentMonthCsv(
  meta: ImportMeta | null,
  hasTradeRepublic: boolean,
  now = new Date(),
  /** Fallback when importMeta wasn't stored (legacy imports). */
  fallbackLastDate?: string | null,
  /** Day-of-month from which the soft nudge may appear. */
  fromDay = 25,
): boolean {
  if (!hasTradeRepublic) return false;
  if (daysIntoMonth(now) < fromDay) return false;
  const last = meta?.csvLastDate || fallbackLastDate || null;
  if (!last) return true;
  const lastKey = dateMonthKey(last);
  const curKey = monthKey(now);
  if (!lastKey) return true;
  return lastKey < curKey;
}

export function daysIntoMonth(now = new Date()): number {
  return now.getDate();
}
