// Pure technical-analysis primitives. No I/O, no framework — easy to test and
// shared by the advice engine and the UI.

/** Simple moving average of the last `period` values. Null if not enough data. */
export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) sum += values[i];
  return sum / period;
}

/** Exponential moving average series (same length as input). */
export function emaSeries(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

/** Latest EMA value, or null if not enough data. */
export function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const series = emaSeries(values, period);
  return series[series.length - 1];
}

/**
 * Wilder's RSI over `period` (default 14). Returns the latest value in [0, 100],
 * or null if there is not enough data.
 */
export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  // Seed with the first `period` deltas.
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  // Smooth across the remaining deltas (Wilder's smoothing).
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const up = diff > 0 ? diff : 0;
    const down = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + up) / period;
    avgLoss = (avgLoss * (period - 1) + down) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * MACD (12/26) with a 9-period signal line. Returns the latest MACD and signal
 * values, or nulls if there is not enough data.
 */
export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): { macd: number | null; signal: number | null } {
  if (values.length < slow + signalPeriod) {
    return { macd: null, signal: null };
  }
  const fastSeries = emaSeries(values, fast);
  const slowSeries = emaSeries(values, slow);
  const macdLine = values.map((_, i) => fastSeries[i] - slowSeries[i]);
  const signalSeries = emaSeries(macdLine, signalPeriod);
  return {
    macd: macdLine[macdLine.length - 1],
    signal: signalSeries[signalSeries.length - 1],
  };
}

/** Percentage return over the last `period` closes (e.g. 20-day momentum). */
export function momentum(values: number[], period: number): number | null {
  if (values.length < period + 1) return null;
  const past = values[values.length - 1 - period];
  const now = values[values.length - 1];
  if (past === 0) return null;
  return ((now - past) / past) * 100;
}

/** Highest and lowest close over the provided window. */
export function highLow(values: number[]): { high: number; low: number } | null {
  if (values.length === 0) return null;
  let high = values[0];
  let low = values[0];
  for (const v of values) {
    if (v > high) high = v;
    if (v < low) low = v;
  }
  return { high, low };
}
