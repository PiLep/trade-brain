import { assetSubtitle, assetTitle } from "@/lib/labels";

/** Short envelope tag — disambiguates PEA vs Compte-Titres for the same ticker. */
export function envelopeBadge(holding: {
  accountType?: string;
  assetClass?: string;
  source?: string;
}): string | null {
  if (holding.assetClass === "CRYPTO") return "Crypto";
  if (holding.assetClass === "BOND") return "Oblig.";
  if (holding.assetClass === "PRIVATE_FUND") return "Non coté";
  if (holding.accountType === "PEA") return "PEA";
  if (
    holding.accountType === "DEFAULT" ||
    holding.source === "trade-republic"
  ) {
    return "CT";
  }
  return null;
}

/** Consistent asset identity: readable name first, ticker second. */
export function AssetLabel({
  name,
  symbol,
  hint,
  badge,
  size = "md",
}: {
  name?: string;
  symbol: string;
  /** Extra muted text after the ticker (qty, etc.). */
  hint?: string;
  /** Envelope tag e.g. PEA / CT */
  badge?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const title = assetTitle(name, symbol);
  const sub = assetSubtitle(name, symbol);
  const titleClass =
    size === "lg"
      ? "text-lg font-semibold text-ink"
      : size === "sm"
        ? "text-sm font-semibold text-ink"
        : "font-semibold text-ink";

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-1.5">
        <div className={`truncate ${titleClass}`}>{title}</div>
        {badge && (
          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted ring-1 ring-hairline">
            {badge}
          </span>
        )}
      </div>
      {(sub || hint) && (
        <div className="truncate text-xs text-ink-muted">
          {sub}
          {sub && hint ? " · " : ""}
          {hint}
        </div>
      )}
    </div>
  );
}
