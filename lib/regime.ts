/**
 * Portfolio-level regime (exposure posture), inspired by exposure-coach /
 * market-regime skills — computed from holdings we already have, no US breadth APIs.
 */

import type { Advice } from "@/lib/types";

export type RegimeZone = "risk_on" | "neutral" | "risk_off";

export type PortfolioRegime = {
  zone: RegimeZone;
  /** 0–100, higher = more risk-on. */
  score: number;
  label: string;
  guidance: string;
  /** % of managed value trading above SMA200. */
  aboveSma200Pct: number;
  /** % of portfolio in crypto. */
  cryptoPct: number;
  /** % of managed positions with Buy/Strong Buy advice. */
  bullishPct: number;
  sampleSize: number;
};

type RowLike = {
  marketValue: number;
  unmanaged: boolean;
  envelope: string;
  advice: Advice | null;
};

export function evaluatePortfolioRegime(
  rows: RowLike[],
  totalValue: number,
): PortfolioRegime {
  const managed = rows.filter((r) => !r.unmanaged && r.advice);
  const managedValue = managed.reduce((a, r) => a + r.marketValue, 0);

  let aboveValue = 0;
  let bullishValue = 0;
  for (const r of managed) {
    const sma200 = r.advice!.indicators.sma200;
    const price = r.advice!.indicators.price;
    if (sma200 != null && price > sma200) aboveValue += r.marketValue;
    const rec = r.advice!.recommendation;
    if (rec === "BUY" || rec === "STRONG_BUY") bullishValue += r.marketValue;
  }

  const aboveSma200Pct =
    managedValue > 0 ? (aboveValue / managedValue) * 100 : 50;
  const bullishPct =
    managedValue > 0 ? (bullishValue / managedValue) * 100 : 0;

  const cryptoValue = rows
    .filter((r) => r.envelope === "crypto")
    .reduce((a, r) => a + r.marketValue, 0);
  const cryptoPct = totalValue > 0 ? (cryptoValue / totalValue) * 100 : 0;

  // Score: SMA200 participation dominates, bullish share and crypto tilt adjust.
  let score = aboveSma200Pct * 0.7 + bullishPct * 0.2 + 50 * 0.1;
  // Heavy crypto in a weak trend pulls score down; in a strong trend it's fine.
  if (cryptoPct >= 8 && aboveSma200Pct < 45) {
    score -= Math.min(12, cryptoPct);
  } else if (cryptoPct >= 8 && aboveSma200Pct >= 60) {
    score += Math.min(5, cryptoPct / 4);
  }
  score = Math.max(0, Math.min(100, score));

  let zone: RegimeZone = "neutral";
  if (score >= 62) zone = "risk_on";
  else if (score < 42) zone = "risk_off";

  const label =
    zone === "risk_on"
      ? "Risk-on"
      : zone === "risk_off"
        ? "Risk-off"
        : "Neutre";

  const guidance =
    zone === "risk_on"
      ? "Tendance saine — les achats techniques sont autorisés dans les limites de sizing."
      : zone === "risk_off"
        ? "Portefeuille sous pression — privilégier hold / trim, éviter d’augmenter l’exposition."
        : "Régime mixte — rester sélectif, respecter concentration et circuit breaker.";

  return {
    zone,
    score: Math.round(score),
    label,
    guidance,
    aboveSma200Pct,
    cryptoPct,
    bullishPct,
    sampleSize: managed.length,
  };
}
