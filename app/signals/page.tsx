"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { assetTitle } from "@/lib/labels";
import { isBuyRec, type PositionSize } from "@/lib/risk";
import type { Recommendation } from "@/lib/types";
import { useMarketPortfolio, type HoldingRow } from "@/lib/useMarketPortfolio";
import { envelopeBadge } from "@/components/AssetLabel";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import { SizeHint } from "@/components/SizeHint";
import { SignalsCardsSkeleton, SignalsSkeleton } from "@/components/Skeleton";

type Filter = "Tous" | "Acheter" | "Vendre" | "Neutre";

function isBuy(r: Recommendation) {
  return r === "BUY" || r === "STRONG_BUY";
}
function isSell(r: Recommendation) {
  return r === "SELL" || r === "STRONG_SELL";
}

export default function SignalsPage() {
  const {
    loaded,
    fetching,
    refreshedAt,
    rows,
    actionable,
    mutedBuys,
    displayCurrency,
    circuitBreaker,
    sizeFor,
    reviewMonthLabel,
  } = useMarketPortfolio();

  const [filter, setFilter] = useState<Filter>("Tous");
  const chartsLoading = fetching && !refreshedAt;

  const list = useMemo(() => {
    const managed = rows.filter((r) => !r.unmanaged && r.advice);
    const buys = [
      ...actionable.filter((r) => isBuyRec(r.advice?.recommendation)),
      ...mutedBuys,
    ];
    const sells = actionable.filter(
      (r) =>
        r.advice &&
        (r.advice.recommendation === "SELL" ||
          r.advice.recommendation === "STRONG_SELL"),
    );
    const holds = managed.filter(
      (r) => r.advice!.recommendation === "HOLD",
    );

    if (filter === "Acheter") return buys;
    if (filter === "Vendre") return sells;
    if (filter === "Neutre") return holds;
    // Tous: actionable first, then holds, skip unmanaged on this page list
    const rest = managed.filter(
      (r) =>
        !actionable.some((a) => a.holding.id === r.holding.id) &&
        !mutedBuys.some((a) => a.holding.id === r.holding.id),
    );
    return [...actionable, ...mutedBuys, ...rest];
  }, [rows, actionable, mutedBuys, filter]);

  const counts = useMemo(() => {
    const managed = rows.filter((r) => !r.unmanaged && r.advice);
    return {
      Tous: managed.length,
      Acheter:
        actionable.filter((r) => isBuyRec(r.advice?.recommendation)).length +
        mutedBuys.length,
      Vendre: actionable.filter(
        (r) =>
          r.advice &&
          (r.advice.recommendation === "SELL" ||
            r.advice.recommendation === "STRONG_SELL"),
      ).length,
      Neutre: managed.filter((r) => r.advice!.recommendation === "HOLD").length,
    };
  }, [rows, actionable, mutedBuys]);

  if (!loaded) {
    return <SignalsSkeleton />;
  }

  const filters: Filter[] = ["Tous", "Acheter", "Vendre", "Neutre"];

  return (
    <div className="animate-rise space-y-5" aria-busy={fetching}>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-ink sm:text-[26px]">
          Signaux
        </h1>
        <p className="mt-1 max-w-[40rem] text-[13px] leading-snug text-ink2 sm:text-[13.5px]">
          {reviewMonthLabel} · heuristiques prix + MM200 pour orienter le rythme
          DCA (renforcer / maintenir / alléger) — pas du trading
        </p>
      </div>

      <div
        className="touch-gap -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Filtrer les signaux"
      >
        {filters.map((id) => {
          const active = filter === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(id)}
              className={`touch-target shrink-0 rounded-pill border px-4 text-[13px] font-semibold transition ${
                active
                  ? "border-ink bg-ink text-bg"
                  : "border-line bg-card text-ink2 hover:border-ink3"
              }`}
            >
              {id} · {counts[id]}
            </button>
          );
        })}
      </div>

      {chartsLoading ? (
        <SignalsCardsSkeleton />
      ) : list.length === 0 ? (
        <div className="rounded-card border border-dashed border-line px-4 py-14 text-center">
          <p className="text-sm font-semibold text-ink">
            Aucun signal dans ce filtre
          </p>
          <p className="mx-auto mt-1.5 max-w-[22rem] text-[13px] leading-relaxed text-ink3">
            {rows.some((r) => !r.unmanaged && r.advice)
              ? "Essaie un autre filtre, ou reviens après le prochain refresh des cours."
              : "Ajoute des positions cotées — les signaux apparaissent dès que l’historique de prix est chargé."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((r) => (
            <SignalCard
              key={r.holding.id}
              row={r}
              currency={displayCurrency}
              size={sizeFor(r)}
              blocked={
                circuitBreaker.active &&
                isBuy(r.advice!.recommendation)
              }
              muted={mutedBuys.some((m) => m.holding.id === r.holding.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SignalCard({
  row,
  currency,
  size,
  blocked,
  muted,
}: {
  row: HoldingRow;
  currency: string;
  size: PositionSize | null;
  blocked?: boolean;
  muted?: boolean;
}) {
  const rec = row.advice!.recommendation;
  const badge = envelopeBadge(row.holding);
  const reason =
    row.advice!.signals[0]?.detail ??
    "Pas de facteur dominant.";

  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border border-line bg-card px-4 py-4 shadow-soft sm:px-[22px] sm:py-[18px] ${
        muted ? "opacity-70" : ""
      }`}
    >
      <Link
        href={`/asset/${encodeURIComponent(row.holding.id)}`}
        className="flex min-h-11 flex-wrap items-center gap-2 sm:gap-2.5"
      >
        <RecommendationBadge recommendation={rec} size="sm" />
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink sm:flex-none">
          {assetTitle(row.holding.name, row.holding.symbol)}
        </span>
        {badge && (
          <span className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.05em] text-ink2">
            {badge}
          </span>
        )}
        <span className="font-mono text-[11px] text-ink3">
          {row.holding.symbol}
        </span>
        <span className="w-full text-sm font-semibold tabular text-ink sm:ml-auto sm:w-auto">
          {formatCurrency(row.price, currency)}
        </span>
      </Link>
      <p className="text-[13px] leading-relaxed text-ink2">{reason}</p>
      {muted && (
        <div className="rounded-[10px] bg-chip px-3 py-2 text-[12.5px] text-ink2">
          Achat en retrait — frein mensuel actif.
        </div>
      )}
      {(isBuy(rec) || isSell(rec)) && (
        <SizeHint size={size} currency={currency} blocked={blocked && !muted} />
      )}
    </div>
  );
}
