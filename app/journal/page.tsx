"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { assetTitle } from "@/lib/labels";
import { journalStats } from "@/lib/signalJournal";
import { useMarketPortfolio } from "@/lib/useMarketPortfolio";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import { JournalSkeleton } from "@/components/Skeleton";
import { StatTile } from "@/components/StatTile";

export default function JournalPage() {
  const { loaded, fetching, refreshedAt, journal, displayCurrency } =
    useMarketPortfolio();

  const chartsLoading = fetching && !refreshedAt;
  const stats = useMemo(() => journalStats(journal), [journal]);

  if (!loaded) {
    return <JournalSkeleton />;
  }

  return (
    <div className="animate-rise space-y-6" aria-busy={fetching}>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-ink sm:text-[26px]">
          Journal
        </h1>
        <p className="mt-1 max-w-[40rem] text-[13px] leading-snug text-ink2 sm:text-[13.5px]">
          Mémoire des orientations — J+5 / J+20 pour calibrer si « renforcer »
          / « alléger » avait du sens
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          label="Entrées"
          value={String(stats.count)}
          hint="signaux journalisés"
          loading={chartsLoading && stats.count === 0}
        />
        <StatTile
          label="Hit rate J+5"
          value={
            stats.hitRate5 != null
              ? formatPercent(stats.hitRate5, false)
              : "—"
          }
          hint={
            stats.with5
              ? `${stats.with5} évalués`
              : "besoin de 5 jours d’historique"
          }
        />
        <StatTile
          label="Achat moy. J+5"
          value={
            stats.avgReturn5Buy != null
              ? formatPercent(stats.avgReturn5Buy)
              : "—"
          }
          hint="après un signal d’achat"
        />
        <StatTile
          label="Vente moy. J+5"
          value={
            stats.avgReturn5Sell != null
              ? formatPercent(stats.avgReturn5Sell)
              : "—"
          }
          hint="après un signal de vente"
        />
      </section>

      <section className="overflow-hidden rounded-card border border-line bg-card shadow-soft">
        {journal.length === 0 ? (
          <div className="px-4 py-14 text-center sm:px-[22px]">
            <p className="text-sm font-semibold text-ink">
              Journal encore vide
            </p>
            <p className="mx-auto mt-1.5 max-w-[22rem] text-[13px] leading-relaxed text-ink3">
              Les signaux d’achat / vente se journalisent automatiquement à
              chaque refresh des cours.
            </p>
          </div>
        ) : (
          journal.map((e) => {
            const metaParts = [
              `Prix ${formatCurrency(e.price, displayCurrency)}`,
              e.return5Pct != null
                ? `J+5 ${formatPercent(e.return5Pct)}`
                : "J+5 …",
              e.return20Pct != null
                ? `J+20 ${formatPercent(e.return20Pct)}`
                : "J+20 …",
            ];
            return (
              <div
                key={e.id}
                className="grid grid-cols-1 items-baseline gap-2 border-t border-line px-4 py-3.5 first:border-t-0 hover:bg-[color-mix(in_srgb,var(--tb-chip)_50%,transparent)] sm:grid-cols-[84px_auto_1fr] sm:gap-4 sm:px-[22px]"
              >
                <div className="flex flex-wrap items-center gap-2 sm:contents">
                  <span className="font-mono text-[11.5px] text-ink3">
                    {formatDate(e.date, { day: "numeric", month: "short" })}
                  </span>
                  <RecommendationBadge
                    recommendation={e.recommendation}
                    size="sm"
                  />
                </div>
                <div className="min-w-0 sm:col-auto">
                  <div className="text-[13.5px] leading-relaxed text-ink">
                    <Link
                      href={`/asset/${encodeURIComponent(e.holdingId)}`}
                      className="font-semibold hover:underline"
                    >
                      {assetTitle(e.name, e.symbol)}
                    </Link>
                    <span className="text-ink2">
                      {" "}
                      · score {e.score > 0 ? "+" : ""}
                      {e.score}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-ink3">
                    {metaParts.join(" · ")}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
