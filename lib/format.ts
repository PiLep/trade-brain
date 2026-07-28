// Formatting helpers — locale française unique pour toute l’UI.

const LOCALE = "fr-FR";

export function formatCurrency(
  value: number,
  currency = "EUR",
  opts: { compact?: boolean } = {},
): string {
  const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : "EUR";
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: safeCurrency,
      notation: opts.compact ? "compact" : "standard",
      maximumFractionDigits: opts.compact ? 1 : 2,
      minimumFractionDigits: opts.compact ? 0 : 2,
    }).format(value);
  } catch {
    return `${formatNumber(value, 2)} ${safeCurrency}`;
  }
}

export function formatNumber(value: number, maxFractionDigits = 4): string {
  return new Intl.NumberFormat(LOCALE, {
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

/**
 * Parts arrondies pour les suggestions de taille (« ≈ 111 parts »).
 * Évite les décimales peu actionnables en DCA.
 */
export function formatShares(value: number): string {
  const n = Math.round(Math.abs(value));
  const label = n <= 1 ? "part" : "parts";
  return `≈ ${formatNumber(n, 0)} ${label}`;
}

export function formatPercent(value: number, withSign = true): string {
  const sign = withSign && value > 0 ? "+" : "";
  const n = new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
  return `${sign}${n} %`;
}

export function formatSignedCurrency(value: number, currency = "EUR"): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatCurrency(Math.abs(value), currency)}`;
}

export function formatDate(
  value: Date | string | number,
  opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
): string {
  const d =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(value + "T12:00:00")
      : value instanceof Date
        ? value
        : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE, opts).format(d);
}

export function formatDateTime(value: Date | string | number): string {
  return formatDate(value, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
