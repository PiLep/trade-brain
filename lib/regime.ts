/**
 * Portfolio-level regime (exposure posture), inspired by exposure-coach /
 * market-regime skills — computed from holdings we already have, no US breadth APIs.
 */

import type { Advice } from "@/lib/types";

export type RegimeZone = "risk_on" | "neutral" | "risk_off";

export type RegimeBreakdown = {
  /** Contribution of SMA200 participation (0–70). */
  sma200: number;
  /** Contribution of bullish advice share (0–20). */
  bullish: number;
  /** Crypto tilt adjustment (can be negative). */
  cryptoTilt: number;
};

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
  /** Visible score decomposition for the UI. */
  breakdown: RegimeBreakdown;
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
  const sma200Part = aboveSma200Pct * 0.7;
  const bullishPart = bullishPct * 0.2;
  const basePart = 50 * 0.1;
  let cryptoTilt = 0;
  // Heavy crypto in a weak trend pulls score down; in a strong trend it's fine.
  if (cryptoPct >= 8 && aboveSma200Pct < 45) {
    cryptoTilt = -Math.min(12, cryptoPct);
  } else if (cryptoPct >= 8 && aboveSma200Pct >= 60) {
    cryptoTilt = Math.min(5, cryptoPct / 4);
  }
  const score = Math.max(
    0,
    Math.min(100, sma200Part + bullishPart + basePart + cryptoTilt),
  );

  let zone: RegimeZone = "neutral";
  if (score >= 62) zone = "risk_on";
  else if (score < 42) zone = "risk_off";

  const label =
    zone === "risk_on"
      ? "Risque ouvert"
      : zone === "risk_off"
        ? "Risque fermé"
        : "Neutre";

  const guidance =
    zone === "risk_on"
      ? "Tendance saine (prix > MM200 en majorité) — renforcer les DCA dans les limites de sizing."
      : zone === "risk_off"
        ? "Portefeuille sous pression — privilégier maintenir / alléger, éviter d’augmenter l’exposition."
        : "Régime mixte — rester sélectif, respecter concentration et frein mensuel.";

  return {
    zone,
    score: Math.round(score),
    label,
    guidance,
    aboveSma200Pct,
    cryptoPct,
    bullishPct,
    sampleSize: managed.length,
    breakdown: {
      sma200: Math.round(sma200Part),
      bullish: Math.round(bullishPart),
      cryptoTilt: Math.round(cryptoTilt),
    },
  };
}
