"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  formatCurrency,
  formatPercent,
} from "@/lib/format";
import { assetTitle } from "@/lib/labels";
import { journalStats } from "@/lib/signalJournal";
import { useMarketPortfolio } from "@/lib/useMarketPortfolio";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import { Skeleton } from "@/components/Skeleton";
import { StatTile } from "@/components/StatTile";

export default function JournalPage() {
  const { loaded, fetching, refreshedAt, journal, displayCurrency } =
    useMarketPortfolio();

  const chartsLoading = fetching && !refreshedAt;
  const stats = useMemo(() => journalStats(journal), [journal]);

  if (!loaded) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-7 w-36" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" aria-busy={fetching}>
      <div>
        <h1 className="text-xl font-semibold text-ink">Journal signaux</h1>
        <p className="text-sm text-ink-muted">
          Snapshots Buy/Sell en SQLite — scoring auto à J+5 et J+20 au prochain
          refresh.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          label="Buy moy. J+5"
          value={
            stats.avgReturn5Buy != null
              ? formatPercent(stats.avgReturn5Buy)
              : "—"
          }
          hint="après un Buy"
        />
        <StatTile
          label="Sell moy. J+5"
          value={
            stats.avgReturn5Sell != null
              ? formatPercent(stats.avgReturn5Sell)
              : "—"
          }
          hint="après un Sell"
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
        <div className="border-b border-hairline px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Historique</h2>
        </div>
        {journal.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-ink-muted">
            Aucun signal journalisé pour l’instant. Reviens quand des Buy/Sell
            apparaissent — ils seront enregistrés automatiquement.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-muted">
                <tr className="border-b border-hairline">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Asset</th>
                  <th className="px-4 py-2.5 font-medium">Signal</th>
                  <th className="px-4 py-2.5 font-medium">Prix</th>
                  <th className="px-4 py-2.5 font-medium">J+5</th>
                  <th className="px-4 py-2.5 font-medium">J+20</th>
                </tr>
              </thead>
              <tbody>
                {journal.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-hairline/60 last:border-0"
                  >
                    <td className="px-4 py-3 tabular text-ink-muted">
                      {e.date}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/asset/${encodeURIComponent(e.holdingId)}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {assetTitle(e.name, e.symbol)}
                      </Link>
                      <div className="text-xs text-ink-muted">{e.symbol}</div>
                    </td>
                    <td className="px-4 py-3">
                      <RecommendationBadge
                        recommendation={e.recommendation}
                        size="sm"
                      />
                      <span className="ml-2 tabular text-xs text-ink-muted">
                        {e.score > 0 ? "+" : ""}
                        {e.score}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular text-ink">
                      {formatCurrency(e.price, displayCurrency)}
                    </td>
                    <td
                      className={`px-4 py-3 tabular ${
                        e.return5Pct == null
                          ? "text-ink-muted"
                          : e.return5Pct > 0
                            ? "text-good"
                            : e.return5Pct < 0
                              ? "text-critical"
                              : "text-ink-muted"
                      }`}
                    >
                      {e.return5Pct == null
                        ? "…"
                        : formatPercent(e.return5Pct)}
                    </td>
                    <td
                      className={`px-4 py-3 tabular ${
                        e.return20Pct == null
                          ? "text-ink-muted"
                          : e.return20Pct > 0
                            ? "text-good"
                            : e.return20Pct < 0
                              ? "text-critical"
                              : "text-ink-muted"
                      }`}
                    >
                      {e.return20Pct == null
                        ? "…"
                        : formatPercent(e.return20Pct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
