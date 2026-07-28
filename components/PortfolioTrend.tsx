"use client";

import { useMemo } from "react";
import { formatCurrency, formatPercent } from "@/lib/format";
import { portfolioValueSeries } from "@/lib/portfolioHistory";
import type { HoldingRow } from "@/lib/useMarketPortfolio";
import { Sparkline } from "@/components/Sparkline";
import { Skeleton } from "@/components/Skeleton";

/** Compact ~90j portfolio evolution — directional, current quantities. */
export function PortfolioTrend({
  rows,
  currency,
  loading,
}: {
  rows: HoldingRow[];
  currency: string;
  loading?: boolean;
}) {
  const points = useMemo(() => portfolioValueSeries(rows, 90), [rows]);
  const values = points.map((p) => p.value);

  if (loading) {
    return (
      <div className="rounded-card border border-line bg-card p-4 shadow-soft sm:p-5">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mt-3 h-8 w-28" />
        <Skeleton className="mt-3 h-10 w-full" />
      </div>
    );
  }

  if (values.length < 5) return null;

  const first = values[0];
  const last = values[values.length - 1];
  const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
  const up = changePct > 0;
  const down = changePct < 0;
  const tone = up ? "text-pos" : down ? "text-neg" : "text-ink3";

  return (
    <section className="rounded-card border border-line bg-card p-4 shadow-soft sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-bold tracking-tight text-ink">
            Évolution ≈ 90 j
          </div>
          <p className="mt-0.5 text-[12px] text-ink3">
            Quantités actuelles × cours — indicateur de direction
          </p>
        </div>
        <div className={`text-right text-[13.5px] font-semibold tabular ${tone}`}>
          {formatPercent(changePct)}
          <div className="mt-0.5 text-[11.5px] font-medium text-ink3">
            {formatCurrency(last, currency, { compact: true })}
          </div>
        </div>
      </div>
      <div className="mt-3 w-full overflow-hidden">
        <Sparkline values={values} width={340} height={44} />
      </div>
    </section>
  );
}
