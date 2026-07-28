/**
 * Calendar projection of DCA cash flow — keeps a daily pulse without
 * pretending market P&L is daily. Uses active plans' monthlyEur run-rate.
 */

import type { DcaPlan } from "@/lib/types";

export type DcaProjection = {
  /** Sum of active monthlyEur. */
  monthlyEur: number;
  /** monthlyEur / days in month. */
  dailyEur: number;
  /** Pro-rata accrued through today (inclusive). */
  mtdProjectedEur: number;
  /** Remaining to reach full monthly run-rate. */
  remainingEur: number;
  /** Progress 0–1 through the calendar month. */
  progress: number;
  day: number;
  daysInMonth: number;
  activeCount: number;
};

export function daysInMonth(d = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function projectDcaMonth(
  plans: DcaPlan[],
  now = new Date(),
): DcaProjection {
  const active = plans.filter((p) => p.active && p.monthlyEur > 0);
  const monthlyEur = active.reduce((a, p) => a + p.monthlyEur, 0);
  const dim = daysInMonth(now);
  const day = Math.min(Math.max(now.getDate(), 1), dim);
  const dailyEur = dim > 0 ? monthlyEur / dim : 0;
  const mtdProjectedEur = dailyEur * day;
  const remainingEur = Math.max(0, monthlyEur - mtdProjectedEur);
  return {
    monthlyEur,
    dailyEur,
    mtdProjectedEur,
    remainingEur,
    progress: dim > 0 ? day / dim : 0,
    day,
    daysInMonth: dim,
    activeCount: active.length,
  };
}

/**
 * Capital investi projeté (linéaire) — pas de rendement marché.
 * Utile pour visualiser l’effort DCA à 5 / 10 ans.
 */
export function projectDcaInvested(
  monthlyEur: number,
  years: number,
  alreadyInvestedEur = 0,
): number {
  if (!(monthlyEur > 0) || !(years > 0)) return alreadyInvestedEur;
  return alreadyInvestedEur + monthlyEur * 12 * years;
}
