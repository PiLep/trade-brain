"use client";

import type { DcaPlan } from "@/lib/types";
import {
  orientDca,
  type DcaOrientation,
  type DcaStance,
} from "@/lib/dcaOrientation";
import { formatCurrency } from "@/lib/format";
import { assetTitle } from "@/lib/labels";

const CADENCE_LABEL: Record<DcaPlan["cadence"], string> = {
  weekly: "Hebdo",
  biweekly: "Bi-mensuel",
  monthly: "Mensuel",
  irregular: "Irrégulier",
};

const STANCE_TONE: Record<DcaStance, string> = {
  renforcer:
    "bg-[color-mix(in_srgb,var(--tb-pos)_12%,transparent)] text-pos",
  maintenir: "bg-chip text-ink2",
  alleger:
    "bg-[color-mix(in_srgb,var(--tb-neg)_12%,transparent)] text-neg",
  inconnu: "bg-chip text-ink3",
};

export type DcaPlanRow = {
  plan: DcaPlan;
  orientation: DcaOrientation;
};

function StanceBadge({ o }: { o: DcaOrientation }) {
  return (
    <span
      className={`inline-flex rounded-pill px-2.5 py-1 text-[11.5px] font-bold ${STANCE_TONE[o.stance]}`}
      title={o.detail}
    >
      {o.label}
    </span>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-pill px-2.5 py-1 text-[11.5px] font-bold ${
        active
          ? "bg-[color-mix(in_srgb,var(--tb-pos)_12%,transparent)] text-pos"
          : "bg-chip text-ink3"
      }`}
    >
      {active ? "Actif" : "Pause"}
    </span>
  );
}

export function DcaPlans({
  rows,
  emptyHint,
  onImport,
}: {
  rows: DcaPlanRow[];
  emptyHint?: string;
  onImport?: () => void;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-card border border-dashed border-line px-4 py-10 text-center">
        <p className="text-sm font-semibold text-ink">Aucun sparplan détecté</p>
        <p className="mx-auto mt-1.5 max-w-[22rem] text-[13px] leading-relaxed text-ink2">
          {emptyHint ??
            "Importe ton CSV Trade Republic pour détecter les sparplans et les orienter."}
        </p>
        {onImport && (
          <button
            type="button"
            onClick={onImport}
            className="mt-3 text-[13px] font-semibold text-accent hover:underline"
          >
            Importer CSV →
          </button>
        )}
      </div>
    );
  }

  const ordered = [
    ...rows.filter((r) => r.plan.active),
    ...rows.filter((r) => !r.plan.active),
  ];

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-3 lg:hidden">
        {ordered.map(({ plan: p, orientation: o }) => (
          <article
            key={p.id}
            className="rounded-card border border-line bg-card px-4 py-3.5 shadow-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">
                  {assetTitle(p.name, p.symbol)}
                </div>
                <div className="mt-0.5 font-mono text-[10.5px] text-ink3">
                  {p.symbol} · {CADENCE_LABEL[p.cadence]}
                </div>
              </div>
              <StatusPill active={p.active} />
            </div>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink3">
                  / mois
                </div>
                <div className="text-sm font-semibold tabular text-ink">
                  {formatCurrency(p.monthlyEur, "EUR")}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink3">
                  Investi
                </div>
                <div className="text-[13.5px] tabular text-ink2">
                  {formatCurrency(p.totalInvestedEur, "EUR")}
                </div>
              </div>
            </div>
            <div className="mt-3 border-t border-line pt-3">
              <StanceBadge o={o} />
              <p className="mt-1.5 text-[12px] leading-snug text-ink3">
                {o.detail}
              </p>
            </div>
          </article>
        ))}
      </div>

      {/* Desktop: table (unchanged) */}
      <div className="hidden overflow-hidden rounded-card border border-line bg-card shadow-soft lg:block">
        <div className="grid grid-cols-[1.6fr_.7fr_.85fr_.9fr_1fr_.85fr] gap-3 px-[22px] pb-2 pt-4 font-mono text-[10px] uppercase tracking-[0.08em] text-ink3">
          <span>Sparplan</span>
          <span>Cadence</span>
          <span className="text-right">/ mois</span>
          <span className="text-right">Investi</span>
          <span>Orientation</span>
          <span className="text-right">Statut</span>
        </div>
        {ordered.map(({ plan: p, orientation: o }) => (
          <div
            key={p.id}
            className="grid grid-cols-[1.6fr_.7fr_.85fr_.9fr_1fr_.85fr] items-center gap-3 border-t border-line px-[22px] py-3 hover:bg-[color-mix(in_srgb,var(--tb-chip)_50%,transparent)]"
          >
            <div>
              <div className="text-sm font-semibold text-ink">
                {assetTitle(p.name, p.symbol)}
              </div>
              <div className="mt-0.5 font-mono text-[10.5px] text-ink3">
                {p.symbol}
              </div>
            </div>
            <span className="text-[13.5px] text-ink2">
              {CADENCE_LABEL[p.cadence]}
            </span>
            <span className="text-right text-sm font-semibold tabular text-ink">
              {formatCurrency(p.monthlyEur, "EUR")}
            </span>
            <span className="text-right text-[13.5px] tabular text-ink2">
              {formatCurrency(p.totalInvestedEur, "EUR")}
            </span>
            <div>
              <StanceBadge o={o} />
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-ink3">
                {o.detail}
              </p>
            </div>
            <span className="justify-self-end">
              <StatusPill active={p.active} />
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/** Convenience when only plans are known (no market yet). */
export function orientPlansFallback(plans: DcaPlan[]): DcaPlanRow[] {
  return plans.map((plan) => ({
    plan,
    orientation: orientDca(null, { planActive: plan.active }),
  }));
}
