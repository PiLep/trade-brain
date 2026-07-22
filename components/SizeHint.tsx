"use client";

import type { PositionSize } from "@/lib/risk";
import { formatCurrency, formatPercent, formatQuantity } from "@/lib/format";

/** Compact “how much to add” card for Buy signals. */
export function SizeHint({
  size,
  currency,
  blocked,
}: {
  size: PositionSize | null;
  currency: string;
  /** Circuit breaker active — show note instead of size. */
  blocked?: boolean;
}) {
  if (blocked) {
    return (
      <div className="rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-xs text-ink-muted">
        Circuit breaker actif — pas de taille d’achat suggérée.
      </div>
    );
  }
  if (!size) return null;

  if (size.notional <= 0) {
    return (
      <div className="rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-xs text-ink-muted">
        {size.note}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-xs">
      <div className="font-medium text-ink">
        Ajout suggéré{" "}
        <span className="tabular">
          {formatCurrency(size.notional, currency)}
        </span>
        <span className="text-ink-muted">
          {" "}
          · {formatQuantity(size.units)} u
        </span>
      </div>
      <div className="mt-0.5 text-ink-muted">
        Stop ~{formatCurrency(size.stop, currency)} · risque{" "}
        {formatCurrency(size.riskAmount, currency)} (
        {formatPercent(size.riskPct, false)}) · poids actuel{" "}
        {formatPercent(size.currentWeightPct, false)}
        {size.capped ? " · plafonné" : ""}
      </div>
    </div>
  );
}
