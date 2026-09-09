"use client";

import { useEffect, useMemo, useState } from "react";
import { analyze } from "@/lib/advice";
import { assetTitle } from "@/lib/labels";
import { useMarketData } from "@/lib/marketData";
import {
  missingCurrentMonthCsv,
  monthLabel,
  monthToDateReturnPct,
} from "@/lib/month";
import { adviceForPlan, orientDca, type DcaOrientation } from "@/lib/dcaOrientation";
import { evaluatePortfolioRegime, type PortfolioRegime } from "@/lib/regime";
import {
  clearLegacyLocalJournal,
  fetchJournal,
  syncJournal,
  takeLegacyLocalJournal,
  type SignalJournalEntry,
} from "@/lib/signalJournal";
import { usePortfolio } from "@/lib/storage";
import {
  concentrationReport,
  evaluateCircuitBreaker,
  isBuyRec,
  portfolioPeriodReturnPct,
  suggestPositionSize,
  type CircuitBreaker,
  type ConcentrationReport,
  type PositionSize,
} from "@/lib/risk";
import {
  ENVELOPE_LABELS,
  markPriceEur,
  positionEnvelope,
  toEur,
  type TrEnvelope,
} from "@/lib/tradeRepublicCsv";
import type { Advice, ChartData, Holding } from "@/lib/types";

export interface HoldingRow {
  holding: Holding;
  chart: ChartData | null;
  advice: Advice | null;
  error?: string;
  /** Quote in the asset's own currency - for display next to nativeCurrency. */
  price: number;
  /** Currency `price` is quoted in. */
  nativeCurrency: string;
  /** Same quote converted to EUR - use this for any arithmetic. */
  priceEur: number;
  /**
   * All money below is EUR. Positions are normalised on the way in so totals,
   * weights and sizing can be summed across currencies; only `price` stays
   * native, because a share price in dollars is the honest figure to show.
   */
  marketValue: number;
  costBasis: number;
  pnl: number;
  pnlPct: number;
  /** Quote currency could not be mapped to EUR - value is unconverted. */
  fxUnavailable: boolean;
  /** Month-to-date % move from market candles. */
  monthChangePct: number;
  /** Month-to-date P&L in portfolio currency. */
  monthPnl: number;
  envelope: TrEnvelope;
  /** No live quote / signals — TR last trade mark only (bonds, PE, …). */
  unmanaged: boolean;
}

export interface EnvelopeSlice {
  id: TrEnvelope;
  label: string;
  value: number;
  cost: number;
  pnl: number;
  pnlPct: number;
  /** True when every position in the envelope lacks a live mark. */
  unmanaged: boolean;
}

/** Shared portfolio + live market enrichment for all pages. */
export function useMarketPortfolio() {
  const portfolio = usePortfolio();
  const { holdings, loaded, importMeta, dcaPlans } = portfolio;
  const { charts, errors, fetching, refreshedAt, refresh } = useMarketData();
  const [journal, setJournal] = useState<SignalJournalEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const migrate = takeLegacyLocalJournal();
        if (migrate.length) {
          const entries = await syncJournal({
            snapshots: [],
            prices: {},
            migrate,
          });
          clearLegacyLocalJournal();
          if (!cancelled) setJournal(entries);
          return;
        }
        const entries = await fetchJournal();
        if (!cancelled) setJournal(entries);
      } catch {
        /* API / SQLite unavailable — empty until next refresh */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasTradeRepublic = holdings.some((h) => h.source === "trade-republic");

  const fx = useMemo(
    () => ({
      eurusd: charts["EURUSD=X"]?.price ?? 1.14,
      eurgbp: charts["EURGBP=X"]?.price ?? 0.86,
      eurjpy: charts["EURJPY=X"]?.price ?? 160,
    }),
    [charts],
  );

  const rows: HoldingRow[] = useMemo(() => {
    return holdings.map((holding) => {
      const chart = holding.preferTrMark
        ? null
        : (charts[holding.symbol] ?? null);
      const error = holding.preferTrMark
        ? undefined
        : errors[holding.symbol];
      const advice =
        chart && chart.candles.length >= 30 ? analyze(chart.candles) : null;
      const pending = holding.pendingCashEur ?? 0;

      // Trade Republic positions are already denominated in EUR: avgCost and
      // lastPriceEur come from EUR statements, and markPriceEur() converts the
      // live quote itself. Everything else is quoted in the asset's own
      // currency and has to be converted before it can be summed.
      const isTrPriced =
        holding.source === "trade-republic" || Boolean(holding.lastPriceEur);

      let price: number;
      let nativeCurrency: string;
      let priceEur: number;
      let fxUnavailable = false;

      if (isTrPriced) {
        priceEur = markPriceEur(
          holding.preferTrMark ? null : chart?.price,
          holding.preferTrMark ? null : chart?.currency,
          {
            avgCost: holding.avgCost,
            lastPriceEur: holding.lastPriceEur ?? holding.avgCost,
          },
          fx,
        );
        price = priceEur;
        nativeCurrency = "EUR";
      } else {
        price = chart?.price ?? 0;
        nativeCurrency = chart?.currency ?? "EUR";
        const converted = toEur(price, nativeCurrency, fx);
        if (converted == null && price > 0 && nativeCurrency !== "EUR") {
          // Unmappable currency (e.g. JPY). Better to show the raw number and
          // say so than to silently fold a wrong figure into the total.
          fxUnavailable = true;
        }
        priceEur = converted ?? price;
      }

      const marketValue = priceEur * holding.quantity + pending;

      // avgCost follows the same rule as price: EUR for TR, native otherwise.
      const avgCostEur = isTrPriced
        ? holding.avgCost
        : (toEur(holding.avgCost, nativeCurrency, fx) ?? holding.avgCost);
      const costBasis = avgCostEur * holding.quantity + pending;

      const pnl = marketValue - costBasis;
      const pnlPct = costBasis === 0 ? 0 : (pnl / costBasis) * 100;
      const unmanaged =
        Boolean(holding.preferTrMark) ||
        holding.assetClass === "BOND" ||
        holding.assetClass === "PRIVATE_FUND";

      // Month-to-date from candles (monthly review cadence).
      let monthChangePct = 0;
      let monthPnl = 0;
      if (!unmanaged && chart?.candles?.length) {
        const mtd = monthToDateReturnPct(chart.candles);
        if (mtd != null) {
          monthChangePct = mtd;
          const startValue = marketValue / (1 + mtd / 100);
          monthPnl = marketValue - startValue;
        }
      }

      const envelope = positionEnvelope({
        accountType: holding.accountType ?? "DEFAULT",
        assetClass: holding.assetClass ?? "",
      });
      return {
        holding,
        chart,
        advice,
        error,
        price,
        nativeCurrency,
        priceEur,
        fxUnavailable,
        marketValue,
        costBasis,
        pnl,
        pnlPct,
        monthChangePct,
        monthPnl,
        envelope,
        unmanaged,
      };
    });
  }, [holdings, charts, errors, fx]);

  // Every aggregate below is EUR by construction. This used to be the currency
  // of whichever holding happened to sort first, which meant the total was
  // labelled with one currency while summing several.
  const displayCurrency = "EUR";
  const fxIncomplete = rows.some((r) => r.fxUnavailable);

  const totalValue = rows.reduce((a, r) => a + r.marketValue, 0);
  const totalCost = rows.reduce((a, r) => a + r.costBasis, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost === 0 ? 0 : (totalPnl / totalCost) * 100;
  const monthPnl = rows.reduce((a, r) => a + r.monthPnl, 0);
  const monthStartValue = totalValue - monthPnl;
  const monthPnlPct =
    monthStartValue > 0 ? (monthPnl / monthStartValue) * 100 : 0;
  const reviewMonthLabel = monthLabel();
  const dcaLastDate =
    dcaPlans
      .map((d) => d.lastDate)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;
  const needsMonthCsv = missingCurrentMonthCsv(
    importMeta,
    hasTradeRepublic,
    new Date(),
    dcaLastDate,
  );

  const envelopeOrder: TrEnvelope[] = [
    "compte-titres",
    "pea",
    "non-cote",
    "obligataire",
    "crypto",
  ];
  const envelopes: EnvelopeSlice[] = envelopeOrder
    .map((id) => {
      const subset = rows.filter((r) => r.envelope === id);
      const value = subset.reduce((a, r) => a + r.marketValue, 0);
      const cost = subset.reduce((a, r) => a + r.costBasis, 0);
      const pnl = value - cost;
      return {
        id,
        label: ENVELOPE_LABELS[id],
        value,
        cost,
        pnl,
        pnlPct: cost === 0 ? 0 : (pnl / cost) * 100,
        unmanaged:
          subset.length > 0 && subset.every((r) => r.unmanaged),
      };
    })
    .filter((e) => e.value > 0.01 || e.cost > 0.01);

  /** Pie by TR envelope when imported; otherwise per asset. */
  const allocation =
    hasTradeRepublic && envelopes.length > 0
      ? envelopes.map((e) => ({ symbol: e.label, value: e.value }))
      : rows.map((r) => ({
          symbol: assetTitle(r.holding.name, r.holding.symbol),
          value: r.marketValue,
        }));

  const periodPnlPct = portfolioPeriodReturnPct(rows);
  const circuitBreaker: CircuitBreaker = evaluateCircuitBreaker(
    monthPnlPct,
    periodPnlPct,
  );
  const concentration: ConcentrationReport = concentrationReport(
    rows,
    totalValue,
  );

  const allActionable = rows
    .filter(
      (r) =>
        r.advice &&
        (r.advice.recommendation === "BUY" ||
          r.advice.recommendation === "STRONG_BUY" ||
          r.advice.recommendation === "SELL" ||
          r.advice.recommendation === "STRONG_SELL"),
    )
    .sort((a, b) => Math.abs(b.advice!.score) - Math.abs(a.advice!.score));

  // When circuit breaker is active, demote buy signals from the actionable list.
  const actionable = circuitBreaker.active
    ? allActionable.filter(
        (r) => !isBuyRec(r.advice?.recommendation),
      )
    : allActionable;

  const mutedBuys = circuitBreaker.active
    ? allActionable.filter((r) => isBuyRec(r.advice?.recommendation))
    : [];

  const sizeFor = (row: HoldingRow): PositionSize | null => {
    const sym = row.holding.symbol.toUpperCase();
    const combinedMarketValue = rows
      .filter((r) => r.holding.symbol.toUpperCase() === sym)
      .reduce((a, r) => a + r.marketValue, 0);
    return suggestPositionSize(row, totalValue, { combinedMarketValue });
  };

  // The DCA verdict is the product's actual answer, so it lives here rather
  // than in one page: the home summary and the per-plan page must never be
  // able to disagree about it.
  const dcaOriented = rows.length || dcaPlans.length
    ? dcaPlans.map((plan) => ({
        plan,
        orientation: orientDca(adviceForPlan(plan, rows)?.recommendation, {
          circuitActive: circuitBreaker.active,
          planActive: plan.active,
        }),
      }))
    : [];

  const stanceCounts = dcaOriented
    .filter((r) => r.plan.active)
    .reduce(
      (acc, r) => {
        const s = r.orientation.stance;
        if (s in acc) acc[s as keyof typeof acc] += 1;
        return acc;
      },
      { renforcer: 0, maintenir: 0, alleger: 0, inconnu: 0 },
    );

  const regime: PortfolioRegime = evaluatePortfolioRegime(rows, totalValue);

  // Journal once per successful market refresh → SQLite via /api/journal.
  useEffect(() => {
    if (!refreshedAt) return;
    let cancelled = false;
    const snapshots = rows
      .filter((r) => r.advice && r.price > 0 && !r.unmanaged)
      .map((r) => ({
        holdingId: r.holding.id,
        symbol: r.holding.symbol,
        name: r.holding.name,
        recommendation: r.advice!.recommendation,
        score: r.advice!.score,
        price: r.price,
      }));
    const prices: Record<string, number> = {};
    for (const r of rows) {
      if (r.price > 0) prices[r.holding.id] = r.price;
    }
    (async () => {
      try {
        const migrate = takeLegacyLocalJournal();
        const next = await syncJournal({
          snapshots,
          prices,
          migrate: migrate.length ? migrate : undefined,
        });
        if (migrate.length) clearLegacyLocalJournal();
        if (!cancelled) setJournal(next);
      } catch {
        /* keep last journal state */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally tied to refresh tick
  }, [refreshedAt]);

  return {
    ...portfolio,
    rows,
    charts,
    errors,
    fetching,
    refreshedAt,
    refresh,
    displayCurrency,
    dcaOriented,
    stanceCounts,
    fxIncomplete,
    hasTradeRepublic,
    totalValue,
    totalCost,
    totalPnl,
    totalPnlPct,
    monthPnl,
    monthPnlPct,
    reviewMonthLabel,
    needsMonthCsv,
    csvCoverageLastDate: importMeta?.csvLastDate || dcaLastDate,
    importMeta,
    periodPnlPct,
    allocation,
    envelopes,
    actionable,
    mutedBuys,
    circuitBreaker,
    concentration,
    regime,
    journal,
    sizeFor,
  };
}
