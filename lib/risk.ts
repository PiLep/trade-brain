/**
 * Portfolio risk helpers inspired by claude-trading-skills
 * (concentration, position-sizer, drawdown-circuit-breaker).
 * Pure functions — no I/O.
 */

import { assetTitle } from "@/lib/labels";
import type { Advice, Candle } from "@/lib/types";

export const RISK = {
  /** Soft warning: single name above this % of portfolio. */
  maxSinglePct: 15,
  /** Hard flag: single name above this %. */
  maxSingleHardPct: 20,
  /** Soft warning: top 3 names above this %. */
  maxTop3Pct: 50,
  /** Default risk budget per new buy (fixed fractional). */
  riskPerTradePct: 1,
  /** Cap on suggested new position as % of portfolio. */
  maxNewPositionPct: 10,
  /** Trip circuit breaker on daily portfolio move. */
  dayLossBreakerPct: -3,
  /** Trip on ~20-session weighted portfolio move. */
  periodLossBreakerPct: -8,
  periodSessions: 20,
} as const;

export type ConcentrationAlert = {
  id: string;
  name: string;
  weightPct: number;
  severity: "warn" | "hard";
};

export type ConcentrationReport = {
  alerts: ConcentrationAlert[];
  top3Pct: number;
  top3Warn: boolean;
};

export type CircuitBreaker = {
  active: boolean;
  level: "ok" | "caution" | "halt";
  reasons: string[];
  dayPnlPct: number;
  periodPnlPct: number | null;
};

export type PositionSize = {
  /** Suggested notional to add (EUR / portfolio ccy). */
  notional: number;
  /** Suggested units to add. */
  units: number;
  /** Stop price used for risk distance. */
  stop: number;
  /** € at risk if stop is hit. */
  riskAmount: number;
  riskPct: number;
  /** Current weight of this holding. */
  currentWeightPct: number;
  /** Why this size (or why none). */
  note: string;
  capped: boolean;
};

type RowLike = {
  holding: { id: string; name: string; symbol: string; quantity: number };
  marketValue: number;
  price: number;
  unmanaged: boolean;
  chart: { candles: Candle[] } | null;
  advice: Advice | null;
  dayPnl: number;
};

export function concentrationReport(
  rows: RowLike[],
  totalValue: number,
): ConcentrationReport {
  if (totalValue <= 0) {
    return { alerts: [], top3Pct: 0, top3Warn: false };
  }
  const ranked = [...rows]
    .filter((r) => r.marketValue > 0)
    .map((r) => ({
      id: r.holding.id,
      name: assetTitle(r.holding.name, r.holding.symbol),
      weightPct: (r.marketValue / totalValue) * 100,
    }))
    .sort((a, b) => b.weightPct - a.weightPct);

  const alerts: ConcentrationAlert[] = ranked
    .filter((r) => r.weightPct >= RISK.maxSinglePct)
    .map((r) => ({
      ...r,
      severity:
        r.weightPct >= RISK.maxSingleHardPct
          ? ("hard" as const)
          : ("warn" as const),
    }));

  const top3Pct = ranked
    .slice(0, 3)
    .reduce((a, r) => a + r.weightPct, 0);

  return {
    alerts,
    top3Pct,
    top3Warn: top3Pct >= RISK.maxTop3Pct,
  };
}

/** Weighted ~N-session return across managed positions with charts. */
export function portfolioPeriodReturnPct(
  rows: RowLike[],
  sessions = RISK.periodSessions,
): number | null {
  let weighted = 0;
  let weightSum = 0;
  for (const r of rows) {
    if (r.unmanaged || r.marketValue <= 0 || !r.chart) continue;
    const closes = r.chart.candles.map((c) => c.close);
    if (closes.length < sessions + 1) continue;
    const now = closes[closes.length - 1];
    const then = closes[closes.length - 1 - sessions];
    if (!(then > 0) || !(now > 0)) continue;
    weighted += ((now - then) / then) * r.marketValue;
    weightSum += r.marketValue;
  }
  if (weightSum <= 0) return null;
  return (weighted / weightSum) * 100;
}

export function evaluateCircuitBreaker(
  dayPnlPct: number,
  periodPnlPct: number | null,
): CircuitBreaker {
  const reasons: string[] = [];
  let level: CircuitBreaker["level"] = "ok";

  if (dayPnlPct <= RISK.dayLossBreakerPct) {
    reasons.push(
      `Perte du jour ${dayPnlPct.toFixed(1)} % (seuil ${RISK.dayLossBreakerPct} %)`,
    );
    level = "halt";
  } else if (dayPnlPct <= RISK.dayLossBreakerPct / 2) {
    reasons.push(`Journée fragile (${dayPnlPct.toFixed(1)} %)`);
    level = "caution";
  }

  if (periodPnlPct != null && periodPnlPct <= RISK.periodLossBreakerPct) {
    reasons.push(
      `Portefeuille ~${RISK.periodSessions}j : ${periodPnlPct.toFixed(1)} % (seuil ${RISK.periodLossBreakerPct} %)`,
    );
    level = "halt";
  } else if (
    periodPnlPct != null &&
    periodPnlPct <= RISK.periodLossBreakerPct / 2 &&
    level !== "halt"
  ) {
    reasons.push(
      `Faiblesse ~${RISK.periodSessions}j (${periodPnlPct.toFixed(1)} %)`,
    );
    if (level === "ok") level = "caution";
  }

  return {
    active: level === "halt",
    level,
    reasons,
    dayPnlPct,
    periodPnlPct,
  };
}

/**
 * Fixed-fractional size for adding to a position.
 * Stop = SMA50 if below price, else ~3% below price.
 */
export function suggestPositionSize(
  row: RowLike,
  totalValue: number,
  opts: {
    riskPct?: number;
    maxPositionPct?: number;
    /** Sum of all lots sharing the same market symbol (PEA + CT). */
    combinedMarketValue?: number;
  } = {},
): PositionSize | null {
  if (totalValue <= 0 || row.price <= 0 || row.unmanaged) return null;

  const riskPct = opts.riskPct ?? RISK.riskPerTradePct;
  const maxPosPct = opts.maxPositionPct ?? RISK.maxNewPositionPct;
  const exposureValue = opts.combinedMarketValue ?? row.marketValue;
  const combined =
    opts.combinedMarketValue != null &&
    opts.combinedMarketValue > row.marketValue + 0.01;
  const currentWeightPct =
    totalValue > 0 ? (exposureValue / totalValue) * 100 : 0;

  if (currentWeightPct >= maxPosPct) {
    return {
      notional: 0,
      units: 0,
      stop: row.price,
      riskAmount: 0,
      riskPct,
      currentWeightPct,
      note: combined
        ? `Déjà ${currentWeightPct.toFixed(1)} % au total sur ce titre (toutes enveloppes, plafond ${maxPosPct} %).`
        : `Déjà ${currentWeightPct.toFixed(1)} % du portefeuille (plafond ${maxPosPct} %).`,
      capped: true,
    };
  }

  const sma50 = row.advice?.indicators.sma50 ?? null;
  let stop =
    sma50 != null && sma50 < row.price * 0.995
      ? sma50
      : row.price * 0.97;

  // Ensure a minimum meaningful risk distance (~1.5%).
  if (row.price - stop < row.price * 0.015) {
    stop = row.price * 0.985;
  }

  const riskPerUnit = row.price - stop;
  if (!(riskPerUnit > 0)) return null;

  const riskAmount = totalValue * (riskPct / 100);
  let units = riskAmount / riskPerUnit;
  let notional = units * row.price;

  const maxNotional = totalValue * (maxPosPct / 100) - exposureValue;
  let capped = false;
  if (maxNotional <= 0) {
    return {
      notional: 0,
      units: 0,
      stop,
      riskAmount: 0,
      riskPct,
      currentWeightPct,
      note: combined
        ? `Plafond ${maxPosPct} % atteint sur ce titre (PEA + CT).`
        : `Déjà au plafond de concentration (${maxPosPct} %).`,
      capped: true,
    };
  }
  if (notional > maxNotional) {
    notional = maxNotional;
    units = notional / row.price;
    capped = true;
  }

  return {
    notional,
    units,
    stop,
    riskAmount: units * riskPerUnit,
    riskPct,
    currentWeightPct,
    note: capped
      ? combined
        ? `Plafond ${maxPosPct} % (toutes enveloppes) — taille réduite.`
        : `Plafond ${maxPosPct} % — taille réduite.`
      : `Risque ${riskPct} % si stop touché.`,
    capped,
  };
}

export function isBuyRec(rec: string | undefined): boolean {
  return rec === "BUY" || rec === "STRONG_BUY";
}
