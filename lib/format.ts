// Formatting helpers shared across the UI.

export function formatCurrency(
  value: number,
  currency = "USD",
  opts: { compact?: boolean } = {},
): string {
  const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency,
      notation: opts.compact ? "compact" : "standard",
      maximumFractionDigits: opts.compact ? 1 : 2,
      minimumFractionDigits: opts.compact ? 0 : 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${safeCurrency}`;
  }
}

export function formatNumber(value: number, maxFractionDigits = 4): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

/** Shares / crypto qty — enough precision, no float junk. */
export function formatQuantity(value: number): string {
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 2 : abs >= 1 ? 4 : 8;
  return formatNumber(value, digits);
}

export function formatPercent(value: number, withSign = true): string {
  const sign = withSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatSignedCurrency(value: number, currency = "USD"): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatCurrency(Math.abs(value), currency)}`;
}
