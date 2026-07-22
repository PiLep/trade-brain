"use client";

import { formatCurrency } from "@/lib/format";
import { usePortfolio } from "@/lib/storage";
import { DcaPlans } from "@/components/DcaPlans";
import { Skeleton, SkeletonStatTile } from "@/components/Skeleton";
import { StatTile } from "@/components/StatTile";

export default function DcaPage() {
  const { dcaPlans, loaded } = usePortfolio();

  if (!loaded) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Chargement">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <SkeletonStatTile label="Rythme actif" />
          <SkeletonStatTile label="Plans" />
          <SkeletonStatTile label="Investi via DCA" />
        </section>
        <div className="rounded-xl border border-hairline bg-surface p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const active = dcaPlans.filter((d) => d.active);
  const monthly = active.reduce((a, d) => a + d.monthlyEur, 0);
  const totalInvested = dcaPlans.reduce((a, d) => a + d.totalInvestedEur, 0);
  const execs = dcaPlans.reduce((a, d) => a + d.executionCount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">DCA / Sparplans</h1>
        <p className="text-sm text-ink-muted">
          Déduits automatiquement du CSV Trade Republic (Savings plan
          execution).
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile
          label="Rythme actif"
          value={
            monthly
              ? formatCurrency(monthly, "EUR", { compact: true })
              : "—"
          }
          hint="/ mois estimé"
        />
        <StatTile
          label="Plans"
          value={`${active.length} / ${dcaPlans.length || 0}`}
          hint="actifs / détectés"
        />
        <StatTile
          label="Investi via DCA"
          value={formatCurrency(totalInvested, "EUR", { compact: true })}
          hint={`${execs} exécutions`}
        />
      </section>

      <DcaPlans plans={dcaPlans} />

      {!dcaPlans.length && (
        <p className="text-center text-sm text-ink-muted">
          Importe ton Transaktionsexport via <strong>Import CSV</strong> pour
          détecter les sparplans.
        </p>
      )}
    </div>
  );
}
