"use client";

import type { DcaPlan } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { AssetLabel } from "@/components/AssetLabel";

const CADENCE_LABEL: Record<DcaPlan["cadence"], string> = {
  weekly: "hebdo",
  biweekly: "bi-mensuel",
  monthly: "mensuel",
  irregular: "irrégulier",
};

export function DcaPlans({ plans }: { plans: DcaPlan[] }) {
  if (!plans.length) {
    return (
      <div className="rounded-xl border border-hairline bg-surface p-4">
        <h2 className="mb-1 text-sm font-semibold text-ink">DCA / Sparplans</h2>
        <p className="text-sm text-ink-muted">
          Aucun sparplan détecté. Réimporte ton CSV Trade Republic pour les
          matérialiser automatiquement.
        </p>
      </div>
    );
  }

  const active = plans.filter((p) => p.active);
  const paused = plans.filter((p) => !p.active);
  const monthlyActive = active.reduce((a, p) => a + p.monthlyEur, 0);

  return (
    <div className="rounded-xl border border-hairline bg-surface overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-hairline px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">DCA / Sparplans</h2>
          <p className="text-xs text-ink-muted">
            Déduits des exécutions « Savings plan » du CSV — réimport = remplacement.
          </p>
        </div>
        <div className="text-right tabular">
          <div className="text-xs uppercase tracking-wide text-ink-muted">
            Rythme actif
          </div>
          <div className="text-lg font-semibold text-ink">
            {formatCurrency(monthlyActive, "EUR", { compact: true })}
            <span className="text-sm font-normal text-ink-muted"> / mois</span>
          </div>
        </div>
      </div>

      <ul className="divide-y divide-hairline">
        {[...active, ...paused].map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
          >
            <div className="min-w-[10rem] flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <AssetLabel name={p.name} symbol={p.symbol} />
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
                    p.active
                      ? "bg-good/10 text-good ring-good/30"
                      : "bg-surface-2 text-ink-muted ring-hairline"
                  }`}
                >
                  {p.active ? "Actif" : "Pause / arrêté"}
                </span>
              </div>
            </div>

            <div className="tabular text-right">
              <div className="font-medium text-ink">
                {formatCurrency(p.amountEur, "EUR")}
                <span className="text-ink-muted">
                  {" "}
                  · {CADENCE_LABEL[p.cadence]}
                </span>
              </div>
              <div className="text-xs text-ink-muted">
                ≈ {formatCurrency(p.monthlyEur, "EUR")} / mois
              </div>
            </div>

            <div className="w-full tabular text-xs text-ink-muted sm:w-auto sm:text-right">
              {p.executionCount}× · total{" "}
              {formatCurrency(p.totalInvestedEur, "EUR")} · dernier{" "}
              {p.lastDate}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
