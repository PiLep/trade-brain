"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { isBuyRec } from "@/lib/risk";
import { useMarketPortfolio } from "@/lib/useMarketPortfolio";
import { AssetLabel, envelopeBadge } from "@/components/AssetLabel";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import { RegimeCard } from "@/components/RegimeCard";
import { RiskBanner } from "@/components/RiskBanner";
import { SizeHint } from "@/components/SizeHint";
import { Skeleton } from "@/components/Skeleton";

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
    concentration,
    regime,
    sizeFor,
  } = useMarketPortfolio();

  const chartsLoading = fetching && !refreshedAt;

  if (!loaded) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Chargement">
        <div>
          <Skeleton className="h-7 w-28" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <section className="rounded-xl border border-hairline bg-surface p-4">
          <ul className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[80%]" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  const holds = rows.filter(
    (r) =>
      !r.unmanaged && r.advice && r.advice.recommendation === "HOLD",
  );
  const unmanaged = rows.filter((r) => r.unmanaged);

  return (
    <div className="space-y-6" aria-busy={fetching}>
      <div>
        <h1 className="text-xl font-semibold text-ink">Signaux</h1>
        <p className="text-sm text-ink-muted">
          Buy / sell techniques — sizing à 1 % de risque, stop sous SMA50.
        </p>
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

      <section className="rounded-xl border border-hairline bg-surface overflow-hidden">
        <div className="border-b border-hairline px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">
            Actionnables {chartsLoading ? "" : `(${actionable.length})`}
          </h2>
        </div>
        {chartsLoading ? (
          <ul className="space-y-4 px-4 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[75%]" />
              </li>
            ))}
          </ul>
        ) : actionable.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-ink-muted">
            {circuitBreaker.active
              ? "Circuit breaker actif — aucun sell fort non plus pour l’instant."
              : "Aucun signal buy/sell fort pour le moment."}
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {actionable.map((r) => (
              <li key={r.holding.id} className="px-4 py-4">
                <Link
                  href={`/asset/${encodeURIComponent(r.holding.id)}`}
                  className="flex flex-wrap items-start gap-3 hover:opacity-90"
                >
                  <div className="min-w-[8rem] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
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
                      <span className="tabular text-xs text-ink-muted">
                        score {r.advice!.score > 0 ? "+" : ""}
                        {r.advice!.score} · conf. {r.advice!.confidence}%
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {r.advice!.signals.slice(0, 3).map((s) => (
                        <li
                          key={s.label}
                          className="text-xs text-ink-muted"
                        >
                          <span
                            className={
                              s.tone === "bullish"
                                ? "text-good"
                                : s.tone === "bearish"
                                  ? "text-critical"
                                  : ""
                            }
                          >
                            {s.tone === "bullish"
                              ? "▲"
                              : s.tone === "bearish"
                                ? "▼"
                                : "◆"}{" "}
                            {s.label}
                          </span>
                          {" — "}
                          {s.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="tabular text-right text-sm font-medium text-ink">
                    {formatCurrency(r.price, displayCurrency)}
                  </div>
                </Link>
                {isBuyRec(r.advice?.recommendation) && (
                  <div className="mt-3">
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
      </section>

      {mutedBuys.length > 0 && (
        <section className="rounded-xl border border-hairline bg-surface overflow-hidden opacity-70">
          <div className="border-b border-hairline px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">
              Achats en retrait ({mutedBuys.length})
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Signaux buy ignorés tant que le circuit breaker est actif.
            </p>
          </div>
          <ul className="divide-y divide-hairline">
            {mutedBuys.map((r) => (
              <li key={r.holding.id}>
                <Link
                  href={`/asset/${encodeURIComponent(r.holding.id)}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2/50"
                >
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
                  <span className="text-xs text-ink-muted">Retiré</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {holds.length > 0 && (
        <section className="rounded-xl border border-hairline bg-surface overflow-hidden">
          <div className="border-b border-hairline px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">
              Hold ({holds.length})
            </h2>
          </div>
          <ul className="divide-y divide-hairline">
            {holds.map((r) => (
              <li key={r.holding.id}>
                <Link
                  href={`/asset/${encodeURIComponent(r.holding.id)}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2/50"
                >
                  <div className="flex items-center gap-2">
                    <AssetLabel
                      name={r.holding.name}
                      symbol={r.holding.symbol}
                      badge={envelopeBadge(r.holding)}
                      size="sm"
                    />
                    <RecommendationBadge
                      recommendation="HOLD"
                      size="sm"
                    />
                  </div>
                  <span className="tabular text-sm text-ink-muted">
                    score {r.advice!.score}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {unmanaged.length > 0 && (
        <section className="rounded-xl border border-hairline bg-surface overflow-hidden">
          <div className="border-b border-hairline px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">
              Non géré ({unmanaged.length})
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Obligations / private equity — pas de cotation ni de signal.
            </p>
          </div>
          <ul className="divide-y divide-hairline">
            {unmanaged.map((r) => (
              <li key={r.holding.id}>
                <Link
                  href={`/asset/${encodeURIComponent(r.holding.id)}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2/50"
                >
                  <AssetLabel
                    name={r.holding.name}
                    symbol={r.holding.symbol}
                    badge={envelopeBadge(r.holding)}
                    size="sm"
                  />
                  <span className="text-xs text-ink-muted">Non géré</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
