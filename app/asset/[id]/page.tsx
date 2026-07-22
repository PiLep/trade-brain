"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMarketPortfolio } from "@/lib/useMarketPortfolio";
import { AssetDetail } from "@/components/AssetDetail";
import { Skeleton } from "@/components/Skeleton";

export default function AssetPage() {
  const params = useParams();
  const router = useRouter();
  const id = decodeURIComponent(String(params.id ?? ""));
  const {
    loaded,
    rows,
    fetching,
    removeHolding,
    totalValue,
    sizeFor,
    circuitBreaker,
  } = useMarketPortfolio();

  if (!loaded) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Chargement">
        <Skeleton className="h-4 w-24" />
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-xl border border-hairline bg-surface p-4 lg:col-span-3">
            <Skeleton className="mb-4 h-6 w-48" />
            <Skeleton className="h-[300px] w-full" />
          </div>
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border border-hairline bg-surface p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[75%]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const row = rows.find((r) => r.holding.id === id);

  if (!row) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-ink-secondary">Position introuvable.</p>
        <Link href="/" className="text-sm font-medium text-s-1 hover:underline">
          ← Retour portfolio
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/" className="text-sm text-ink-muted hover:text-ink">
          ← Portfolio
        </Link>
        <button
          onClick={() => {
            removeHolding(row.holding.id);
            router.push("/");
          }}
          className="text-xs text-ink-muted hover:text-critical"
        >
          Supprimer la position
        </button>
      </div>
      <AssetDetail
        row={row}
        fetching={fetching}
        size={sizeFor(row)}
        circuitBlocked={circuitBreaker.active}
        weightPct={
          totalValue > 0 ? (row.marketValue / totalValue) * 100 : 0
        }
      />
    </div>
  );
}
