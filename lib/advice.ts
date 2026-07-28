import type { Advice, Candle, Recommendation, Signal } from "./types";
import { highLow, macd, momentum, rsi, sma } from "./indicators";

/**
 * Turn a price history into an explainable buy / hold / sell recommendation.
 *
 * The engine is a transparent weighted rule set: each rule inspects a classic
 * indicator and contributes a signed weight (positive = bullish). The weights
 * are summed and clamped to [-100, 100], then mapped to a recommendation. Every
 * rule also emits a human-readable reason so the UI can show *why*.
 *
 * This is a heuristic built from standard technical-analysis conventions — it is
 * NOT financial advice. See the disclaimer in the UI.
 */
export function analyze(candles: Candle[]): Advice {
  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1] ?? 0;

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const rsi14 = rsi(closes, 14);
  const { macd: macdVal, signal: macdSignal } = macd(closes);
  const momentum20 = momentum(closes, 20);
  const hl = highLow(closes);

  const signals: Signal[] = [];
  const push = (
    label: string,
    weight: number,
    detail: string,
  ) => {
    const tone: Signal["tone"] =
      weight > 0 ? "bullish" : weight < 0 ? "bearish" : "neutral";
    signals.push({ label, weight, detail, tone });
  };

  // 1. Price vs long-term trend (SMA200): the dominant regime filter.
  if (sma200 !== null) {
    if (price > sma200) {
      push(
        "Tendance long terme",
        18,
        "Le prix est au-dessus de sa moyenne 200 jours — la tendance de fond est haussière.",
      );
    } else {
      push(
        "Tendance long terme",
        -18,
        "Le prix est en-dessous de sa moyenne 200 jours — la tendance de fond est baissière.",
      );
    }
  }

  // 2. Price vs medium-term trend (SMA50).
  if (sma50 !== null) {
    if (price > sma50) {
      push(
        "Tendance moyen terme",
        12,
        "Cours au-dessus de la moyenne 50 jours — momentum moyen terme positif.",
      );
    } else {
      push(
        "Tendance moyen terme",
        -12,
        "Cours en-dessous de la moyenne 50 jours — momentum moyen terme négatif.",
      );
    }
  }

  // 3. Moving-average crossover (SMA20 vs SMA50): golden / death cross.
  if (sma20 !== null && sma50 !== null) {
    if (sma20 > sma50) {
      push(
        "Croisement MM",
        14,
        "La moyenne 20 jours est au-dessus de la 50 jours (alignement haussier « golden cross »).",
      );
    } else {
      push(
        "Croisement MM",
        -14,
        "La moyenne 20 jours est en-dessous de la 50 jours (alignement baissier « death cross »).",
      );
    }
  }

  // 4. RSI(14): momentum oscillator. Extremes flag over-extension.
  if (rsi14 !== null) {
    if (rsi14 >= 70) {
      push(
        "RSI (surachat)",
        -16,
        `RSI à ${rsi14.toFixed(0)} — zone de surachat. Le mouvement peut être tendu.`,
      );
    } else if (rsi14 <= 30) {
      push(
        "RSI (survente)",
        16,
        `RSI à ${rsi14.toFixed(0)} — zone de survente. Un rebond est possible.`,
      );
    } else if (rsi14 > 55) {
      push(
        "RSI (ferme)",
        6,
        `RSI à ${rsi14.toFixed(0)} — momentum haussier sain, sans excès.`,
      );
    } else if (rsi14 < 45) {
      push(
        "RSI (mou)",
        -6,
        `RSI à ${rsi14.toFixed(0)} — le momentum s’essouffle.`,
      );
    } else {
      push(
        "RSI (neutre)",
        0,
        `RSI à ${rsi14.toFixed(0)} — neutre, pas d’avantage de momentum.`,
      );
    }
  }

  // 5. MACD vs signal line: trend-following momentum.
  if (macdVal !== null && macdSignal !== null) {
    if (macdVal > macdSignal) {
      push(
        "MACD",
        10,
        "Le MACD est au-dessus de sa ligne de signal — le momentum se retourne à la hausse.",
      );
    } else {
      push(
        "MACD",
        -10,
        "Le MACD est en-dessous de sa ligne de signal — le momentum se retourne à la baisse.",
      );
    }
  }

  // 6. 20-day momentum (rate of change).
  if (momentum20 !== null) {
    if (momentum20 > 8) {
      push(
        "Momentum",
        8,
        `+${momentum20.toFixed(1)} % sur les 20 dernières séances — momentum fort.`,
      );
    } else if (momentum20 < -8) {
      push(
        "Momentum",
        -8,
        `−${Math.abs(momentum20).toFixed(1)} % sur les 20 dernières séances — momentum faible.`,
      );
    } else {
      push(
        "Momentum",
        Math.round(momentum20),
        `${momentum20 >= 0 ? "+" : "−"}${Math.abs(momentum20).toFixed(1)} % sur les 20 dernières séances.`,
      );
    }
  }

  // 7. Position within the 52-week range (proxy: available window).
  if (hl && hl.high > hl.low) {
    const pct = ((price - hl.low) / (hl.high - hl.low)) * 100;
    if (pct >= 95) {
      push(
        "Position dans la fourchette",
        -6,
        `Proche du haut de sa fourchette sur ${candles.length} jours (${pct.toFixed(0)} %) — marge limitée.`,
      );
    } else if (pct <= 10) {
      push(
        "Position dans la fourchette",
        6,
        `Proche du bas de sa fourchette sur ${candles.length} jours (${pct.toFixed(0)} %) — potentiel de valeur.`,
      );
    }
  }

  const rawScore = signals.reduce((acc, s) => acc + s.weight, 0);
  const score = Math.max(-100, Math.min(100, rawScore));

  const recommendation = toRecommendation(score);

  // Confidence blends the strength of the score with how much the signals agree.
  const bullish = signals.filter((s) => s.weight > 0).length;
  const bearish = signals.filter((s) => s.weight < 0).length;
  const decisive = bullish + bearish;
  const agreement =
    decisive === 0 ? 0 : Math.abs(bullish - bearish) / decisive;
  const confidence = Math.round(
    Math.min(100, (Math.abs(score) / 100) * 60 + agreement * 40),
  );

  return {
    recommendation,
    score,
    confidence,
    signals: signals.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)),
    indicators: {
      price,
      sma20,
      sma50,
      sma200,
      rsi14,
      macd: macdVal,
      macdSignal,
      momentum20,
      high52w: hl?.high ?? null,
      low52w: hl?.low ?? null,
    },
  };
}

function toRecommendation(score: number): Recommendation {
  if (score >= 55) return "STRONG_BUY";
  if (score >= 20) return "BUY";
  if (score <= -55) return "STRONG_SELL";
  if (score <= -20) return "SELL";
  return "HOLD";
}

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  STRONG_BUY: "Fort achat",
  BUY: "Acheter",
  HOLD: "Neutre",
  SELL: "Vendre",
  STRONG_SELL: "Fort vendre",
};
