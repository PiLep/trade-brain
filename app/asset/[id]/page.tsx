"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMarketPortfolio } from "@/lib/useMarketPortfolio";
import { AssetDetail } from "@/components/AssetDetail";
import { AssetSkeleton } from "@/components/Skeleton";

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
    return <AssetSkeleton />;
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
        <Link
          href="/"
          className="touch-target inline-flex items-center rounded-pill border border-line bg-card px-3 text-[13px] font-semibold text-ink2 hover:text-ink"
        >
          ← Portefeuille
        </Link>
        <button
          type="button"
          onClick={() => {
            removeHolding(row.holding.id);
            router.push("/");
          }}
          className="touch-target inline-flex items-center rounded-pill border border-line bg-card px-3 text-[13px] font-semibold text-ink3 hover:border-neg hover:text-neg"
        >
          Retirer
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
