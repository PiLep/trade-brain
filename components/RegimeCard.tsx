"use client";

import type { PortfolioRegime } from "@/lib/regime";
import { formatPercent } from "@/lib/format";

export function RegimeCard({ regime }: { regime: PortfolioRegime }) {
  if (regime.sampleSize === 0) return null;

  const tone =
    regime.zone === "risk_on"
      ? "border-good/40 bg-good/10"
      : regime.zone === "risk_off"
        ? "border-critical/40 bg-critical/10"
        : "border-hairline bg-surface";

  return (
    <div className={`rounded-xl border px-4 py-3 ${tone}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Régime portefeuille
          </div>
          <div className="mt-0.5 text-lg font-semibold text-ink">
            {regime.label}{" "}
            <span className="tabular text-base text-ink-secondary">
              {regime.score}/100
            </span>
          </div>
        </div>
        <div className="text-right text-xs text-ink-muted">
          <div>
            {formatPercent(regime.aboveSma200Pct, false)} au-dessus SMA200
          </div>
          {regime.cryptoPct >= 1 && (
            <div>Crypto {formatPercent(regime.cryptoPct, false)}</div>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-xs text-ink-secondary">{regime.guidance}</p>
    </div>
  );
}
