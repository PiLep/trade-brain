"use client";

import { useMemo } from "react";
import { adviceForPlan, orientDca } from "@/lib/dcaOrientation";
import { projectDcaMonth } from "@/lib/dcaProjection";
import { formatCurrency } from "@/lib/format";
import { useMarketPortfolio } from "@/lib/useMarketPortfolio";
import { DcaPlans } from "@/components/DcaPlans";
import { MonthDataBanner } from "@/components/MonthDataBanner";
import { DcaSkeleton } from "@/components/Skeleton";
import { StatTile } from "@/components/StatTile";

export default function DcaPage() {
  const {
    dcaPlans,
    loaded,
    fetching,
    refreshedAt,
    rows,
    circuitBreaker,
    needsMonthCsv,
    importMeta,
    csvCoverageLastDate,
    reviewMonthLabel,
  } = useMarketPortfolio();

  const chartsLoading = fetching && !refreshedAt;

  const oriented = useMemo(
    () =>
      dcaPlans.map((plan) => {
        const advice = adviceForPlan(plan, rows);
        return {
          plan,
          orientation: orientDca(advice?.recommendation, {
            circuitActive: circuitBreaker.active,
            planActive: plan.active,
          }),
        };
      }),
    [dcaPlans, rows, circuitBreaker.active],
  );

  const stanceCounts = useMemo(() => {
    const active = oriented.filter((r) => r.plan.active);
    return {
      renforcer: active.filter((r) => r.orientation.stance === "renforcer")
        .length,
      maintenir: active.filter((r) => r.orientation.stance === "maintenir")
        .length,
      alleger: active.filter((r) => r.orientation.stance === "alleger").length,
    };
  }, [oriented]);

  if (!loaded) {
    return <DcaSkeleton />;
  }

  const proj = projectDcaMonth(dcaPlans);
  const totalInvested = dcaPlans.reduce((a, d) => a + d.totalInvestedEur, 0);

  return (
    <div className="animate-rise space-y-6" aria-busy={fetching}>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-ink sm:text-[26px]">
          Orientation DCA
        </h1>
        <p className="mt-1 max-w-[40rem] text-[13px] leading-snug text-ink2 sm:text-[13.5px]">
          {reviewMonthLabel} · où renforcer, maintenir ou alléger tes sparplans
          — pas du trading
        </p>
      </div>

      <MonthDataBanner
        show={needsMonthCsv}
        importMeta={importMeta}
        fallbackLastDate={csvCoverageLastDate}
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          label="≈ / jour"
          value={
            proj.dailyEur
              ? formatCurrency(proj.dailyEur, "EUR", { compact: true })
              : "—"
          }
          hint={`${formatCurrency(proj.monthlyEur, "EUR")} / mois ÷ ${proj.daysInMonth} j`}
          loading={chartsLoading && !proj.dailyEur}
        />
        <StatTile
          label="Projeté ce mois"
          value={
            proj.mtdProjectedEur
              ? formatCurrency(proj.mtdProjectedEur, "EUR", { compact: true })
              : "—"
          }
          hint={`J${proj.day}/${proj.daysInMonth} · reste ${formatCurrency(proj.remainingEur, "EUR")}`}
        />
        <StatTile
          label="Renforcer"
          value={String(stanceCounts.renforcer)}
          hint={`${stanceCounts.maintenir} maintenir · ${stanceCounts.alleger} alléger`}
          loading={chartsLoading && oriented.some((r) => r.plan.active)}
        />
        <StatTile
          label="Investi via DCA"
          value={formatCurrency(totalInvested, "EUR", { compact: true })}
          hint={`${proj.activeCount} plans actifs`}
        />
      </section>

      <DcaPlans rows={oriented} />

      <div className="flex max-w-[720px] items-start gap-2.5 rounded-xl border border-dashed border-line px-4 py-3 text-[12.5px] leading-relaxed text-ink2">
        <InfoIcon />
        <span>
          Orientation = heuristique de prix pour ajuster le <em>rythme</em> DCA
          (montant / pause), pas un ordre de vente. Le frein mensuel bloque les
          « renforcer », jamais l’exécution des sparplans déjà en place.
        </span>
      </div>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
