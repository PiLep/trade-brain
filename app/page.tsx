"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatCurrency,
  formatPercent,
  formatQuantity,
  formatSignedCurrency,
} from "@/lib/format";
import { assetTitle } from "@/lib/labels";
import type { Recommendation } from "@/lib/types";
import { useMarketPortfolio } from "@/lib/useMarketPortfolio";
import { AllocationChart } from "@/components/AllocationChart";
import { envelopeBadge } from "@/components/AssetLabel";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import {
  AllocationSkeleton,
  PortfolioSkeleton,
  SignalsListSkeleton,
  Skeleton,
} from "@/components/Skeleton";
import { RegimeCard } from "@/components/RegimeCard";
import { RiskBanner } from "@/components/RiskBanner";
import { SizeHint } from "@/components/SizeHint";
import { Sparkline } from "@/components/Sparkline";
import { projectDcaMonth } from "@/lib/dcaProjection";
import { isBuyRec } from "@/lib/risk";

type SortKey = "asset" | "price" | "month" | "value" | "pnl" | "signal";
type SortDir = "asc" | "desc";

const SIGNAL_RANK: Record<Recommendation, number> = {
  STRONG_BUY: 2,
  BUY: 1,
  HOLD: 0,
  SELL: -1,
  STRONG_SELL: -2,
};

function PnlChip({
  amount,
  pct,
  currency,
  suffix,
}: {
  amount: number;
  pct: number;
  currency: string;
  suffix: string;
}) {
  const up = amount > 0;
  const down = amount < 0;
  const tone = up
    ? "text-pos bg-[color-mix(in_srgb,var(--tb-pos)_10%,transparent)]"
    : down
      ? "text-neg bg-[color-mix(in_srgb,var(--tb-neg)_10%,transparent)]"
      : "text-ink2 bg-chip";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[13px] font-semibold ${tone}`}
    >
      {up ? "▲" : down ? "▼" : "◆"}{" "}
      {formatSignedCurrency(amount, currency)} · {formatPercent(pct)} {suffix}
    </span>
  );
}

export default function PortfolioPage() {
  const {
    holdings,
    dcaPlans,
    loaded,
    removeHolding,
    resetToSeed,
    rows,
    fetching,
    refreshedAt,
    refresh,
    displayCurrency,
    totalValue,
    totalPnl,
    totalPnlPct,
    monthPnl,
    monthPnlPct,
    reviewMonthLabel,
    envelopes,
    hasTradeRepublic,
    actionable,
    circuitBreaker,
    concentration,
    regime,
    sizeFor,
  } = useMarketPortfolio();

  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "asset":
          cmp = assetTitle(a.holding.name, a.holding.symbol).localeCompare(
            assetTitle(b.holding.name, b.holding.symbol),
            "fr",
          );
          break;
        case "price":
          cmp = a.price - b.price;
          break;
        case "month":
          cmp = a.monthChangePct - b.monthChangePct;
          break;
        case "value":
          cmp = a.marketValue - b.marketValue;
          break;
        case "pnl":
          cmp = a.pnlPct - b.pnlPct;
          break;
        case "signal":
          cmp =
            (a.advice ? SIGNAL_RANK[a.advice.recommendation] : -99) -
            (b.advice ? SIGNAL_RANK[b.advice.recommendation] : -99);
          break;
      }
      if (cmp === 0) cmp = b.marketValue - a.marketValue;
      return cmp * dir;
    });
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const dcaProj = projectDcaMonth(dcaPlans);

  const chartsLoading = fetching && !refreshedAt;

  const allocSlices = (hasTradeRepublic && envelopes.length
    ? envelopes.map((e) => ({
        symbol: e.label,
        value: e.value,
        pnlPct: e.unmanaged ? null : e.pnlPct,
        unmanaged: e.unmanaged,
      }))
    : rows.map((r) => ({
        symbol: assetTitle(r.holding.name, r.holding.symbol),
        value: r.marketValue,
        pnlPct: r.unmanaged ? null : r.pnlPct,
        unmanaged: r.unmanaged,
      }))
  ).filter((s) => s.value > 0);

  if (!loaded) {
    return <PortfolioSkeleton />;
  }

  const majLabel = refreshedAt
    ? fetching
      ? "rafraîchissement…"
      : `maj ${refreshedAt.toLocaleString("fr-FR", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}`
    : chartsLoading
      ? "chargement des cours…"
      : "—";

  return (
    <div className="animate-rise space-y-7" aria-busy={fetching}>
      <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col justify-center gap-4 py-1.5">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.09em] text-ink3 sm:text-[11px]">
            <span className="min-w-0 leading-relaxed">
              Orientation DCA · {reviewMonthLabel} · {holdings.length}{" "}
              position{holdings.length === 1 ? "" : "s"}
              {majLabel !== "—" ? ` · ${majLabel}` : ""}
            </span>
            <button
              type="button"
              onClick={refresh}
              disabled={fetching}
              className="rounded-pill border border-line bg-card px-2.5 py-1 text-[10px] font-semibold normal-case tracking-normal text-ink2 hover:border-ink3 hover:text-ink disabled:opacity-50"
            >
              {fetching ? "…" : "Actualiser"}
            </button>
          </div>
          {chartsLoading ? (
            <Skeleton className="h-14 w-64 max-w-full" />
          ) : (
            <div className="text-[40px] font-semibold leading-none tracking-[-0.03em] text-ink tabular sm:text-[50px] lg:text-[58px] lg:tracking-[-0.035em]">
              {formatCurrency(totalValue, displayCurrency)}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {chartsLoading ? (
              <>
                <Skeleton className="h-8 w-48 rounded-pill" />
                <Skeleton className="h-8 w-44 rounded-pill" />
                <Skeleton className="h-8 w-40 rounded-pill" />
              </>
            ) : (
              <>
                <PnlChip
                  amount={monthPnl}
                  pct={monthPnlPct}
                  currency={displayCurrency}
                  suffix="ce mois"
                />
                <PnlChip
                  amount={totalPnl}
                  pct={totalPnlPct}
                  currency={displayCurrency}
                  suffix="depuis l'achat"
                />
                <Link
                  href="/dca"
                  className="inline-flex items-center gap-1.5 rounded-pill bg-chip px-3 py-1.5 text-[13px] font-semibold text-ink2 hover:text-ink"
                  title={
                    dcaProj.monthlyEur
                      ? `Projection linéaire · J${dcaProj.day}/${dcaProj.daysInMonth} · ${formatCurrency(dcaProj.mtdProjectedEur, "EUR")} projetés ce mois`
                      : undefined
                  }
                >
                  {dcaProj.monthlyEur
                    ? `DCA ≈ ${formatCurrency(dcaProj.dailyEur, "EUR")} / jour · orienter →`
                    : "Orienter mes DCA →"}
                </Link>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2.5">
            {chartsLoading ? (
              <Skeleton className="h-11 w-full max-w-[660px] rounded-xl" />
            ) : (
              <RiskBanner
                circuit={circuitBreaker}
                concentration={concentration}
              />
            )}
          </div>
        </div>
        {chartsLoading ? (
          <div className="flex h-full min-h-[220px] flex-col gap-3 rounded-card border border-line bg-card p-[22px] shadow-soft">
            <div className="flex items-center justify-between">
              <Skeleton className="h-2.5 w-28" />
              <Skeleton className="h-6 w-16 rounded-pill" />
            </div>
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-1.5 w-full rounded-pill" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[85%]" />
          </div>
        ) : (
          <RegimeCard regime={regime} />
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[5fr_4fr]">
        <section className="rounded-card border border-line bg-card p-4 shadow-soft sm:p-5 lg:p-[22px]">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="text-[15px] font-bold tracking-tight text-ink">
              Répartition
            </span>
            <span className="text-xs text-ink3">
              {hasTradeRepublic ? "par enveloppe" : "par actif"}
            </span>
          </div>
          {chartsLoading ? (
            <AllocationSkeleton />
          ) : (
            <AllocationChart
              slices={allocSlices}
              currency={displayCurrency}
            />
          )}
        </section>

        <section className="rounded-card border border-line bg-card p-4 shadow-soft sm:p-5 lg:p-[22px]">
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <span className="text-[15px] font-bold tracking-tight text-ink">
              Pour tes DCA
            </span>
            <Link
              href="/dca"
              className="text-[12.5px] font-semibold text-accent hover:underline"
            >
              Orientation →
            </Link>
          </div>
          {chartsLoading ? (
            <SignalsListSkeleton count={3} />
          ) : actionable.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink3">
              {circuitBreaker.active
                ? "Frein mensuel — pas de renforcement DCA pour l’instant."
                : "Rien de fort — maintenir les sparplans en place."}
            </p>
          ) : (
            <ul>
              {actionable.slice(0, 4).map((r) => (
                <li
                  key={r.holding.id}
                  className="flex flex-col gap-2 border-b border-line py-3.5 last:border-0"
                >
                  <Link
                    href={`/asset/${encodeURIComponent(r.holding.id)}`}
                    className="flex items-center gap-2"
                  >
                    <RecommendationBadge
                      recommendation={r.advice!.recommendation}
                      size="sm"
                    />
                    <span className="text-sm font-semibold text-ink">
                      {assetTitle(r.holding.name, r.holding.symbol)}
                    </span>
                    {envelopeBadge(r.holding) && (
                      <span className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.05em] text-ink2">
                        {envelopeBadge(r.holding)}
                      </span>
                    )}
                    <span className="ml-auto text-[13.5px] font-semibold tabular text-ink">
                      {formatCurrency(r.price, displayCurrency)}
                    </span>
                  </Link>
                  <p className="text-[12.5px] leading-snug text-ink2">
                    {r.advice!.signals[0]?.detail ?? r.holding.symbol}
                  </p>
                  {isBuyRec(r.advice?.recommendation) && (
                    <SizeHint
                      size={sizeFor(r)}
                      currency={displayCurrency}
                      blocked={circuitBreaker.active}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-card border border-line bg-card shadow-soft">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 pb-3 pt-4 sm:px-5 lg:px-[22px] lg:pb-3.5 lg:pt-5">
          <span className="text-[15px] font-bold tracking-tight text-ink">
            Positions
          </span>
          <span className="text-xs text-ink3">
            {holdings.length} lignes · valorisation au dernier cours
          </span>
          <button
            type="button"
            onClick={resetToSeed}
            className="ml-auto text-[12.5px] font-semibold text-ink3 hover:text-ink2"
          >
            Réinitialiser l&apos;exemple
          </button>
        </div>

        {holdings.length === 0 ? (
          <div className="px-4 py-14 text-center text-ink2 sm:px-[22px] lg:py-16">
            Aucune position — Importer CSV ou + Ajouter un actif.
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="flex flex-col gap-0 border-t border-line lg:hidden">
              {sortedRows.map((r) => {
                const spark = (r.chart?.candles ?? [])
                  .slice(-30)
                  .map((c) => c.close);
                const currency =
                  r.holding.source === "trade-republic"
                    ? "EUR"
                    : (r.chart?.currency ?? displayCurrency);
                const hasValue = r.price > 0 || r.marketValue > 0;
                const rowLoading =
                  chartsLoading && !r.unmanaged && !r.chart;
                const badge = envelopeBadge(r.holding);
                const pnlTone = r.unmanaged
                  ? "text-ink3"
                  : r.pnl > 0
                    ? "text-pos"
                    : r.pnl < 0
                      ? "text-neg"
                      : "text-ink3";

                return (
                  <div
                    key={r.holding.id}
                    className="border-t border-line px-4 py-3.5 first:border-t-0"
                  >
                    <div className="flex items-start gap-3">
                      <Link
                        href={`/asset/${encodeURIComponent(r.holding.id)}`}
                        className="min-w-0 flex-1"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-ink">
                            {assetTitle(r.holding.name, r.holding.symbol)}
                          </span>
                          {badge && (
                            <span className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.05em] text-ink2">
                              {badge}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 font-mono text-[10.5px] text-ink3">
                          {r.holding.symbol}
                          {" · "}
                          {formatQuantity(r.holding.quantity)}×
                        </div>
                      </Link>
                      <RecommendationBadge
                        recommendation={r.advice?.recommendation}
                        size="sm"
                        unmanaged={r.unmanaged}
                      />
                      <button
                        type="button"
                        onClick={() => removeHolding(r.holding.id)}
                        className="text-xs text-ink3 hover:text-neg"
                        aria-label="Retirer"
                      >
                        ×
                      </button>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <div className="text-[13.5px] font-semibold tabular text-ink">
                          {rowLoading ? (
                            <Skeleton className="h-4 w-16" />
                          ) : hasValue ? (
                            formatCurrency(r.marketValue, currency)
                          ) : (
                            "—"
                          )}
                        </div>
                        <div className={`mt-0.5 text-[12.5px] font-semibold tabular ${pnlTone}`}>
                          {r.unmanaged ? (
                            "—"
                          ) : rowLoading ? (
                            <Skeleton className="h-3.5 w-20" />
                          ) : hasValue ? (
                            <>
                              {formatSignedCurrency(r.pnl, currency)}{" "}
                              <span className="font-medium opacity-70">
                                {formatPercent(r.pnlPct)}
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {rowLoading ? (
                          <Skeleton className="h-6 w-20" />
                        ) : (
                          <Sparkline values={spark} width={72} height={24} />
                        )}
                        <div className="text-[11.5px] tabular text-ink3">
                          {rowLoading
                            ? "…"
                            : hasValue
                              ? formatCurrency(r.price, currency)
                              : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <div className="grid min-w-[860px] grid-cols-[1.7fr_.8fr_.9fr_1fr_1.1fr_1.5fr_1fr_auto] gap-3 px-[22px] py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink3">
                {(
                  [
                    { key: "asset" as const, label: "Actif", align: "" },
                    { key: null, label: "Env.", align: "" },
                    { key: "price" as const, label: "Prix", align: "text-right" },
                    {
                      key: "month" as const,
                      label: "30 j",
                      align: "text-center",
                    },
                    {
                      key: "value" as const,
                      label: "Valeur",
                      align: "text-right",
                    },
                    { key: "pnl" as const, label: "P&L", align: "text-right" },
                    {
                      key: "signal" as const,
                      label: "Signal",
                      align: "text-right",
                    },
                  ] as const
                ).map((col) =>
                  col.key ? (
                    <button
                      key={col.label}
                      type="button"
                      onClick={() => toggleSort(col.key!)}
                      className={`${col.align} text-left hover:text-ink2 ${
                        sortKey === col.key ? "text-ink2" : ""
                      }`}
                    >
                      {col.label}
                      {sortKey === col.key
                        ? sortDir === "asc"
                          ? " ↑"
                          : " ↓"
                        : ""}
                    </button>
                  ) : (
                    <span key={col.label} className={col.align}>
                      {col.label}
                    </span>
                  ),
                )}
                <span />
              </div>

              {sortedRows.map((r) => {
                const spark = (r.chart?.candles ?? [])
                  .slice(-30)
                  .map((c) => c.close);
                const currency =
                  r.holding.source === "trade-republic"
                    ? "EUR"
                    : (r.chart?.currency ?? displayCurrency);
                const hasValue = r.price > 0 || r.marketValue > 0;
                const rowLoading =
                  chartsLoading && !r.unmanaged && !r.chart;
                const badge = envelopeBadge(r.holding);

                return (
                  <div
                    key={r.holding.id}
                    className="grid min-w-[860px] grid-cols-[1.7fr_.8fr_.9fr_1fr_1.1fr_1.5fr_1fr_auto] items-center gap-3 border-t border-line px-[22px] py-2.5 hover:bg-[color-mix(in_srgb,var(--tb-chip)_50%,transparent)]"
                  >
                    <Link
                      href={`/asset/${encodeURIComponent(r.holding.id)}`}
                      className="min-w-0"
                    >
                      <div className="truncate text-sm font-semibold text-ink">
                        {assetTitle(r.holding.name, r.holding.symbol)}
                      </div>
                      <div className="mt-0.5 font-mono text-[10.5px] text-ink3">
                        {r.holding.symbol}
                        {" · "}
                        {formatQuantity(r.holding.quantity)}×
                      </div>
                    </Link>
                    <span className="justify-self-start rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.05em] text-ink2">
                      {badge ?? "—"}
                    </span>
                    <div className="text-right text-[13.5px] tabular text-ink">
                      {rowLoading ? (
                        <Skeleton className="ml-auto h-4 w-14" />
                      ) : hasValue ? (
                        formatCurrency(r.price, currency)
                      ) : (
                        "—"
                      )}
                    </div>
                    <div className="flex justify-center">
                      {rowLoading ? (
                        <Skeleton className="h-6 w-20" />
                      ) : (
                        <Sparkline values={spark} width={80} height={26} />
                      )}
                    </div>
                    <div className="text-right text-[13.5px] font-semibold tabular text-ink">
                      {rowLoading ? (
                        <Skeleton className="ml-auto h-4 w-16" />
                      ) : hasValue ? (
                        formatCurrency(r.marketValue, currency)
                      ) : (
                        "—"
                      )}
                    </div>
                    <div
                      className={`text-right text-[13px] font-semibold tabular ${
                        r.unmanaged
                          ? "text-ink3"
                          : r.pnl > 0
                            ? "text-pos"
                            : r.pnl < 0
                              ? "text-neg"
                              : "text-ink3"
                      }`}
                    >
                      {r.unmanaged ? (
                        "—"
                      ) : rowLoading ? (
                        <Skeleton className="ml-auto h-4 w-20" />
                      ) : hasValue ? (
                        <>
                          {formatSignedCurrency(r.pnl, currency)}{" "}
                          <span className="font-medium opacity-70">
                            {formatPercent(r.pnlPct)}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                    <div className="justify-self-end">
                      <RecommendationBadge
                        recommendation={r.advice?.recommendation}
                        size="sm"
                        unmanaged={r.unmanaged}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeHolding(r.holding.id)}
                      className="text-xs text-ink3 hover:text-neg"
                      aria-label="Retirer"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <p className="pb-2 text-center text-[11px] text-ink3">
        Signaux techniques heuristiques — pas un conseil financier.
      </p>
    </div>
  );
}
