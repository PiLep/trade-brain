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
        "Long-term trend",
        18,
        `Price is above its 200-day average — the long-term trend is up.`,
      );
    } else {
      push(
        "Long-term trend",
        -18,
        `Price is below its 200-day average — the long-term trend is down.`,
      );
    }
  }

  // 2. Price vs medium-term trend (SMA50).
  if (sma50 !== null) {
    if (price > sma50) {
      push(
        "Medium-term trend",
        12,
        `Trading above the 50-day average — medium-term momentum is positive.`,
      );
    } else {
      push(
        "Medium-term trend",
        -12,
        `Trading below the 50-day average — medium-term momentum is negative.`,
      );
    }
  }

  // 3. Moving-average crossover (SMA20 vs SMA50): golden / death cross.
  if (sma20 !== null && sma50 !== null) {
    if (sma20 > sma50) {
      push(
        "MA crossover",
        14,
        `The 20-day average is above the 50-day (bullish "golden cross" alignment).`,
      );
    } else {
      push(
        "MA crossover",
        -14,
        `The 20-day average is below the 50-day (bearish "death cross" alignment).`,
      );
    }
  }

  // 4. RSI(14): momentum oscillator. Extremes flag over-extension.
  if (rsi14 !== null) {
    if (rsi14 >= 70) {
      push(
        "RSI (overbought)",
        -16,
        `RSI is ${rsi14.toFixed(0)} — overbought. The move may be stretched and due for a pullback.`,
      );
    } else if (rsi14 <= 30) {
      push(
        "RSI (oversold)",
        16,
        `RSI is ${rsi14.toFixed(0)} — oversold. Selling may be exhausted, a bounce is possible.`,
      );
    } else if (rsi14 > 55) {
      push(
        "RSI (firm)",
        6,
        `RSI is ${rsi14.toFixed(0)} — healthy upside momentum without being overbought.`,
      );
    } else if (rsi14 < 45) {
      push(
        "RSI (soft)",
        -6,
        `RSI is ${rsi14.toFixed(0)} — momentum is fading.`,
      );
    } else {
      push(
        "RSI (neutral)",
        0,
        `RSI is ${rsi14.toFixed(0)} — neutral, no momentum edge.`,
      );
    }
  }

  // 5. MACD vs signal line: trend-following momentum.
  if (macdVal !== null && macdSignal !== null) {
    if (macdVal > macdSignal) {
      push(
        "MACD",
        10,
        `MACD is above its signal line — momentum is turning up.`,
      );
    } else {
      push(
        "MACD",
        -10,
        `MACD is below its signal line — momentum is turning down.`,
      );
    }
  }

  // 6. 20-day momentum (rate of change).
  if (momentum20 !== null) {
    if (momentum20 > 8) {
      push(
        "Momentum",
        8,
        `Up ${momentum20.toFixed(1)}% over the last 20 sessions — strong momentum.`,
      );
    } else if (momentum20 < -8) {
      push(
        "Momentum",
        -8,
        `Down ${Math.abs(momentum20).toFixed(1)}% over the last 20 sessions — weak momentum.`,
      );
    } else {
      push(
        "Momentum",
        Math.round(momentum20),
        `${momentum20 >= 0 ? "Up" : "Down"} ${Math.abs(momentum20).toFixed(1)}% over the last 20 sessions.`,
      );
    }
  }

  // 7. Position within the 52-week range (proxy: available window).
  if (hl && hl.high > hl.low) {
    const pct = ((price - hl.low) / (hl.high - hl.low)) * 100;
    if (pct >= 95) {
      push(
        "Range position",
        -6,
        `Near the top of its ${candles.length}-day range (${pct.toFixed(0)}%) — limited headroom.`,
      );
    } else if (pct <= 10) {
      push(
        "Range position",
        6,
        `Near the bottom of its ${candles.length}-day range (${pct.toFixed(0)}%) — potential value.`,
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
  STRONG_BUY: "Strong Buy",
  BUY: "Buy",
  HOLD: "Hold",
  SELL: "Sell",
  STRONG_SELL: "Strong Sell",
};
