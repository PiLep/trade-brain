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
import { AssetLabel, envelopeBadge } from "@/components/AssetLabel";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import { PortfolioSkeleton, Skeleton } from "@/components/Skeleton";
import { RegimeCard } from "@/components/RegimeCard";
import { RiskBanner } from "@/components/RiskBanner";
import { SizeHint } from "@/components/SizeHint";
import { Sparkline } from "@/components/Sparkline";
import { StatTile } from "@/components/StatTile";
import { isBuyRec } from "@/lib/risk";

type SortKey = "asset" | "price" | "day" | "value" | "pnl" | "signal";
type SortDir = "asc" | "desc";

const SIGNAL_RANK: Record<Recommendation, number> = {
  STRONG_BUY: 2,
  BUY: 1,
  HOLD: 0,
  SELL: -1,
  STRONG_SELL: -2,
};

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
    displayCurrency,
    totalValue,
    totalPnl,
    totalPnlPct,
    dayPnl,
    dayPnlPct,
    allocation,
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
        case "day": {
          const ret = (r: (typeof rows)[0]) => {
            const c = r.chart?.candles ?? [];
            if (c.length < 2) return 0;
            const slice = c.slice(-90);
            const first = slice[0]?.close ?? 0;
            const last = slice[slice.length - 1]?.close ?? 0;
            return first ? (last - first) / first : 0;
          };
          cmp = ret(a) - ret(b);
          break;
        }
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
      if (cmp === 0) {
        cmp = b.marketValue - a.marketValue;
      }
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

  const dcaMonthly = dcaPlans
    .filter((d) => d.active)
    .reduce((a, d) => a + d.monthlyEur, 0);

  /** First market fetch — show skeletons instead of "…" / 0€. */
  const chartsLoading = fetching && !refreshedAt;

  if (!loaded) {
    return <PortfolioSkeleton />;
  }

  return (
    <div className="space-y-6" aria-busy={fetching}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-ink">Portfolio</h1>
          <p className="text-sm text-ink-muted">
            Vue d’ensemble ·{" "}
            {refreshedAt
              ? fetching
                ? "rafraîchissement…"
                : `maj ${refreshedAt.toLocaleTimeString()}`
              : chartsLoading
                ? "chargement des cours…"
                : "—"}
          </p>
        </div>
      </div>

      {!chartsLoading && (
        <>
          <RegimeCard regime={regime} />
          <RiskBanner
            circuit={circuitBreaker}
            concentration={concentration}
          />
        </>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Valeur"
          value={formatCurrency(totalValue, displayCurrency)}
          hint={`${holdings.length} position${holdings.length === 1 ? "" : "s"}`}
          loading={chartsLoading}
        />
        <StatTile
          label="P&L total"
          value={formatSignedCurrency(totalPnl, displayCurrency)}
          delta={formatPercent(totalPnlPct)}
          deltaTone={totalPnl > 0 ? "up" : totalPnl < 0 ? "down" : "flat"}
          hint="vs coût"
          loading={chartsLoading}
        />
        <StatTile
          label="Aujourd’hui"
          value={formatSignedCurrency(dayPnl, displayCurrency)}
          delta={formatPercent(dayPnlPct)}
          deltaTone={dayPnl > 0 ? "up" : dayPnl < 0 ? "down" : "flat"}
          hint="vs clôture veille"
          loading={chartsLoading}
        />
        <Link href="/dca" className="block rounded-xl transition hover:brightness-110">
          <StatTile
            label="DCA actifs"
            value={
              dcaMonthly
                ? formatCurrency(dcaMonthly, "EUR", { compact: true })
                : "—"
            }
            hint={
              dcaPlans.length
                ? `${dcaPlans.filter((d) => d.active).length} actifs · / mois`
                : "Voir les sparplans →"
            }
          />
        </Link>
      </section>

      {hasTradeRepublic && envelopes.length > 0 && (
        <section className="rounded-xl border border-hairline bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink">
            Investissements
          </h2>
          <ul className="divide-y divide-hairline">
            {envelopes.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="font-medium text-ink">{e.label}</div>
                  <div
                    className={`text-xs tabular ${
                      e.unmanaged
                        ? "text-ink-muted"
                        : e.pnl > 0
                          ? "text-good"
                          : e.pnl < 0
                            ? "text-critical"
                            : "text-ink-muted"
                    }`}
                  >
                    {e.unmanaged
                      ? "Non géré"
                      : `${formatPercent(e.pnlPct)} depuis l’achat`}
                  </div>
                </div>
                <div className="tabular text-sm font-semibold text-ink">
                  {formatCurrency(e.value, "EUR")}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-hairline bg-surface p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-ink">Allocation</h2>
          {chartsLoading ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <Skeleton className="h-40 w-40 rounded-full" />
              <div className="flex w-full flex-col gap-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[80%]" />
                <Skeleton className="h-3 w-[60%]" />
              </div>
            </div>
          ) : (
            <AllocationChart slices={allocation} currency={displayCurrency} />
          )}
        </div>
        <div className="rounded-xl border border-hairline bg-surface p-4 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Signaux forts</h2>
            <Link
              href="/signals"
              className="text-xs font-medium text-s-1 hover:underline"
            >
              Tout voir →
            </Link>
          </div>
          {chartsLoading ? (
            <ul className="space-y-3 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-4 w-14" />
                </li>
              ))}
            </ul>
          ) : actionable.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">
              {circuitBreaker.active
                ? "Circuit breaker actif — achats mis en retrait."
                : "Aucun buy/sell fort — plutôt hold pour l’instant."}
            </p>
          ) : (
            <ul className="divide-y divide-hairline">
              {actionable.slice(0, 4).map((r) => (
                <li key={r.holding.id} className="py-3">
                  <Link
                    href={`/asset/${encodeURIComponent(r.holding.id)}`}
                    className="flex w-full items-center gap-3 rounded-lg px-1 hover:bg-surface-2/60"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <AssetLabel
                          name={r.holding.name}
                          symbol={r.holding.symbol}
                          badge={envelopeBadge(r.holding)}
                          size="sm"
                        />
                        <RecommendationBadge
                          recommendation={r.advice!.recommendation}
                          size="sm"
                        />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        {r.advice!.signals[0]?.detail ?? r.holding.symbol}
                      </p>
                    </div>
                    <div className="text-right tabular text-sm font-medium text-ink">
                      {formatCurrency(r.price, displayCurrency)}
                    </div>
                  </Link>
                  {isBuyRec(r.advice?.recommendation) && (
                    <div className="mt-2 px-1">
                      <SizeHint
                        size={sizeFor(r)}
                        currency={displayCurrency}
                        blocked={circuitBreaker.active}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Positions</h2>
          <button
            onClick={resetToSeed}
            className="text-xs text-ink-muted hover:text-ink"
          >
            Reset sample
          </button>
        </div>
        {holdings.length === 0 ? (
          <div className="px-4 py-16 text-center text-ink-secondary">
            Aucune position — Import CSV ou + Add asset.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-muted">
                <tr className="border-b border-hairline">
                  {(
                    [
                      { key: "asset", label: "Asset", className: "" },
                      { key: "price", label: "Price", className: "" },
                      {
                        key: "day",
                        label: "90d",
                        className: "hidden md:table-cell",
                      },
                      { key: "value", label: "Value", className: "" },
                      { key: "pnl", label: "P&L", className: "" },
                      { key: "signal", label: "Signal", className: "" },
                    ] as const
                  ).map((col) => {
                    const active = sortKey === col.key;
                    return (
                      <th
                        key={col.key}
                        className={`px-4 py-2.5 font-medium ${col.className}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className={`inline-flex items-center gap-1 transition hover:text-ink ${
                            active ? "text-ink" : ""
                          }`}
                        >
                          {col.label}
                          <span
                            className={`text-[10px] ${
                              active ? "opacity-100" : "opacity-30"
                            }`}
                            aria-hidden
                          >
                            {active && sortDir === "asc" ? "↑" : "↓"}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => {
                  const spark = (r.chart?.candles ?? [])
                    .slice(-90)
                    .map((c) => c.close);
                  const currency =
                    r.holding.source === "trade-republic"
                      ? "EUR"
                      : (r.chart?.currency ?? displayCurrency);
                  const hasValue = r.price > 0 || r.marketValue > 0;
                  const rowLoading =
                    chartsLoading && !r.unmanaged && !r.chart;
                  return (
                    <tr
                      key={r.holding.id}
                      className="border-b border-hairline/60 transition last:border-0 hover:bg-surface-2/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/asset/${encodeURIComponent(r.holding.id)}`}
                          className="block max-w-[220px]"
                        >
                          <AssetLabel
                            name={r.holding.name}
                            symbol={r.holding.symbol}
                            badge={envelopeBadge(r.holding)}
                            hint={`${formatQuantity(r.holding.quantity)} × ${formatCurrency(r.holding.avgCost, currency)}${
                              r.holding.pendingCashEur
                                ? ` · +${formatCurrency(r.holding.pendingCashEur, "EUR")} en attente`
                                : ""
                            }`}
                          />
                        </Link>
                      </td>
                      <td className="px-4 py-3 tabular">
                        {rowLoading ? (
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-3 w-12" />
                          </div>
                        ) : (
                          <Link
                            href={`/asset/${encodeURIComponent(r.holding.id)}`}
                          >
                            {hasValue ? (
                              <>
                                <div className="font-medium text-ink">
                                  {formatCurrency(r.price, currency)}
                                </div>
                                {r.chart && (
                                  <div
                                    className={`text-xs ${
                                      r.dayChangePct > 0
                                        ? "text-good"
                                        : r.dayChangePct < 0
                                          ? "text-critical"
                                          : "text-ink-muted"
                                    }`}
                                  >
                                    {formatPercent(r.dayChangePct)}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-ink-muted">—</span>
                            )}
                          </Link>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {rowLoading ? (
                          <Skeleton className="h-8 w-20" />
                        ) : (
                          <Sparkline values={spark} />
                        )}
                      </td>
                      <td className="px-4 py-3 tabular font-medium text-ink">
                        {rowLoading ? (
                          <Skeleton className="h-4 w-16" />
                        ) : hasValue ? (
                          formatCurrency(r.marketValue, currency)
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 tabular">
                        {r.unmanaged ? (
                          <span className="text-xs text-ink-muted">Non géré</span>
                        ) : rowLoading ? (
                          <Skeleton className="h-4 w-20" />
                        ) : hasValue ? (
                          <span
                            className={
                              r.pnl > 0
                                ? "text-good"
                                : r.pnl < 0
                                  ? "text-critical"
                                  : "text-ink-muted"
                            }
                          >
                            {formatSignedCurrency(r.pnl, currency)}
                            <span className="ml-1 text-xs opacity-80">
                              ({formatPercent(r.pnlPct)})
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.unmanaged ? (
                          <span className="text-xs text-ink-muted">Non géré</span>
                        ) : rowLoading ? (
                          <Skeleton className="h-5 w-14" />
                        ) : r.advice ? (
                          <RecommendationBadge
                            recommendation={r.advice.recommendation}
                            size="sm"
                          />
                        ) : (
                          <span className="text-xs text-ink-muted">n/a</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => removeHolding(r.holding.id)}
                          className="text-xs text-ink-muted hover:text-critical"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="pb-4 text-center text-[11px] text-ink-muted">
        Signaux techniques heuristiques — pas un conseil financier. Données
        Yahoo / EODHD · stockage local.
      </p>
    </div>
  );
}
