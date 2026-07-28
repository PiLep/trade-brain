"use client";

import type { PortfolioRegime } from "@/lib/regime";
import { formatPercent } from "@/lib/format";

export function RegimeCard({ regime }: { regime: PortfolioRegime }) {
  if (regime.sampleSize === 0) return null;

  const zoneTone =
    regime.zone === "risk_on"
      ? "text-pos bg-[color-mix(in_srgb,var(--tb-pos)_12%,transparent)]"
      : regime.zone === "risk_off"
        ? "text-neg bg-[color-mix(in_srgb,var(--tb-neg)_12%,transparent)]"
        : "text-ink2 bg-chip";

  const barTone =
    regime.zone === "risk_on"
      ? "bg-pos"
      : regime.zone === "risk_off"
        ? "bg-neg"
        : "bg-accent";

  const tilt =
    regime.breakdown.cryptoTilt === 0
      ? "0"
      : regime.breakdown.cryptoTilt > 0
        ? `+${regime.breakdown.cryptoTilt}`
        : String(regime.breakdown.cryptoTilt);

  return (
    <div className="flex h-full flex-col gap-3 rounded-card border border-line bg-card p-4 shadow-soft sm:p-5 lg:p-[22px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-ink3">
          Régime portefeuille
        </span>
        <span
          className={`rounded-pill px-2.5 py-1 text-xs font-bold ${zoneTone}`}
        >
          {regime.label}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[36px] font-semibold leading-none tracking-tight text-ink sm:text-[42px]">
          {Math.round(regime.score)}
        </span>
        <span className="text-[15px] font-medium text-ink3">/ 100</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-pill bg-chip">
        <div
          className={`h-full rounded-pill ${barTone}`}
          style={{ width: `${Math.min(100, Math.max(0, regime.score))}%` }}
        />
      </div>
      <p className="m-0 text-[13px] leading-relaxed text-ink2">
        {regime.guidance}
      </p>

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <p className="m-0 text-[11px] font-medium text-ink3">
          Décomposition du score
        </p>
        <BreakdownRow
          label="Prix &gt; MM200"
          detail={formatPercent(regime.aboveSma200Pct, false)}
          points={`+${regime.breakdown.sma200}`}
        />
        <BreakdownRow
          label="Biais haussier"
          detail={formatPercent(regime.bullishPct, false)}
          points={`+${regime.breakdown.bullish}`}
        />
        <BreakdownRow
          label="Biais crypto"
          detail={formatPercent(regime.cryptoPct, false)}
          points={tilt}
        />
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  detail,
  points,
}: {
  label: string;
  detail: string;
  points: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[13px]">
      <span className="min-w-0 text-ink2">
        {label}
        <span className="ml-1.5 tabular text-ink3">{detail}</span>
      </span>
      <span className="shrink-0 font-semibold tabular text-ink">{points}</span>
    </div>
  );
}
