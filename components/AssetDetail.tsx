"use client";

import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatQuantity,
} from "@/lib/format";
import { isBuyRec, type PositionSize } from "@/lib/risk";
import type { HoldingRow } from "@/lib/useMarketPortfolio";
import { AssetLabel, envelopeBadge } from "@/components/AssetLabel";
import { PriceChart } from "@/components/PriceChart";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import { SizeHint } from "@/components/SizeHint";
import { Skeleton } from "@/components/Skeleton";

export function AssetDetail({
  row,
  fetching,
  size,
  circuitBlocked,
  weightPct,
}: {
  row: HoldingRow;
  fetching?: boolean;
  size?: PositionSize | null;
  circuitBlocked?: boolean;
  weightPct?: number;
}) {
  const currency =
    row.holding.source === "trade-republic"
      ? "EUR"
      : (row.chart?.currency ?? "EUR");

  return (
    <div className="animate-rise grid gap-4 sm:gap-5 lg:grid-cols-5">
      <div className="rounded-card border border-line bg-card p-4 shadow-soft sm:p-5 lg:col-span-3">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <AssetLabel
                name={row.holding.name}
                symbol={row.holding.symbol}
                badge={envelopeBadge(row.holding)}
                size="lg"
              />
              {row.advice && (
                <RecommendationBadge
                  recommendation={row.advice.recommendation}
                />
              )}
            </div>
          </div>
          <div className="text-right tabular">
            {fetching && !row.chart && !row.unmanaged ? (
              <div className="flex flex-col items-end gap-1.5">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-semibold text-ink">
                  {formatCurrency(row.price || 0, currency)}
                </div>
                <div
                  className={`text-sm ${
                    row.monthChangePct > 0
                      ? "text-pos"
                      : row.monthChangePct < 0
                        ? "text-neg"
                        : "text-ink3"
                  }`}
                >
                  {row.chart
                    ? `${formatPercent(row.monthChangePct)} ce mois`
                    : "mark TR / EOD"}
                </div>
              </>
            )}
          </div>
        </div>
        {row.chart && row.chart.candles.length > 0 ? (
          <>
            <PriceChart
              candles={row.chart.candles}
              currency={row.chart.currency}
            />
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-muted">
              <LegendDot color="#3987e5" label="Price" />
              <LegendDot color="#199e70" label="SMA 20" />
              <LegendDot color="#d95926" label="SMA 50" />
            </div>
          </>
        ) : fetching && !row.unmanaged ? (
          <Skeleton className="mt-2 h-[280px] w-full rounded-xl" />
        ) : (
          <div className="flex h-[300px] items-center justify-center text-sm text-ink-muted">
            {row.error ?? "No chart data"}
          </div>
        )}
      </div>

      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-card border border-line bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-semibold text-ink">Position</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            <Indicator
              label="Quantité"
              value={formatQuantity(row.holding.quantity)}
            />
            <Indicator
              label="PRU"
              value={formatCurrency(row.holding.avgCost, currency)}
            />
            <Indicator
              label="Valeur"
              value={formatCurrency(row.marketValue, currency)}
            />
            <Indicator
              label="P&L"
              value={
                row.unmanaged ? "Non géré" : formatPercent(row.pnlPct)
              }
            />
            {weightPct != null && (
              <Indicator
                label="Poids"
                value={formatPercent(weightPct, false)}
              />
            )}
          </dl>
          {row.unmanaged && (
            <p className="mt-3 text-xs text-ink-muted">
              Pas de cotation live — valeur au dernier prix Trade Republic.
              Signaux et P&L non suivis.
            </p>
          )}
          {isBuyRec(row.advice?.recommendation) && (
            <div className="mt-3">
              <SizeHint
                size={size ?? null}
                currency={currency}
                blocked={circuitBlocked}
              />
            </div>
          )}
        </div>

        <div className="rounded-card border border-line bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-semibold text-ink">Indicators</h2>
          {row.unmanaged ? (
            <p className="text-sm text-ink-muted">Non géré</p>
          ) : row.advice ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <Indicator
                label="RSI 14"
                value={row.advice.indicators.rsi14?.toFixed(1) ?? "—"}
              />
              <Indicator
                label="Momentum 20d"
                value={
                  row.advice.indicators.momentum20 != null
                    ? formatPercent(row.advice.indicators.momentum20)
                    : "—"
                }
              />
              <Indicator
                label="SMA 20"
                value={
                  row.advice.indicators.sma20 != null
                    ? formatCurrency(row.advice.indicators.sma20, currency)
                    : "—"
                }
              />
              <Indicator
                label="SMA 50"
                value={
                  row.advice.indicators.sma50 != null
                    ? formatCurrency(row.advice.indicators.sma50, currency)
                    : "—"
                }
              />
              <Indicator
                label="SMA 200"
                value={
                  row.advice.indicators.sma200 != null
                    ? formatCurrency(row.advice.indicators.sma200, currency)
                    : "—"
                }
              />
              <Indicator
                label="MACD"
                value={
                  row.advice.indicators.macd != null
                    ? formatNumber(row.advice.indicators.macd, 2)
                    : "—"
                }
              />
              <Indicator
                label="Score"
                value={`${row.advice.score > 0 ? "+" : ""}${row.advice.score}`}
              />
              <Indicator
                label="Confidence"
                value={`${row.advice.confidence}%`}
              />
            </dl>
          ) : (
            <p className="text-sm text-ink-muted">
              Need ~30 daily bars to compute signals.
            </p>
          )}
        </div>

        <div className="rounded-card border border-line bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-semibold text-ink">
            Why this signal
          </h2>
          {row.advice && row.advice.signals.length > 0 ? (
            <ul className="space-y-2.5">
              {row.advice.signals.map((s) => (
                <li key={s.label} className="flex gap-2.5 text-sm">
                  <span
                    className={`mt-0.5 shrink-0 text-[10px] font-bold ${
                      s.tone === "bullish"
                        ? "text-pos"
                        : s.tone === "bearish"
                          ? "text-neg"
                          : "text-ink-muted"
                    }`}
                    aria-hidden
                  >
                    {s.tone === "bullish"
                      ? "▲"
                      : s.tone === "bearish"
                        ? "▼"
                        : "◆"}
                  </span>
                  <div>
                    <div className="font-medium text-ink-secondary">
                      {s.label}
                      <span className="ml-1.5 tabular text-xs text-ink-muted">
                        ({s.weight > 0 ? "+" : ""}
                        {s.weight})
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-ink-muted">
                      {s.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">
              Signals will appear once price history loads.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2 w-2 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function Indicator({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd className="mt-0.5 tabular font-medium text-ink">{value}</dd>
    </div>
  );
}
