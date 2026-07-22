"use client";

import { formatCurrency, formatPercent } from "@/lib/format";

const SERIES = [
  "var(--tb-accent)",
  "#D97B4F",
  "#4CA88C",
  "#CDA23F",
  "#C25E93",
  "#9085e9",
  "#e66767",
];
const OTHER = "var(--tb-ink3)";

export interface AllocationSlice {
  symbol: string;
  value: number;
  /** Optional P&L % for list rows (envelopes). */
  pnlPct?: number | null;
  unmanaged?: boolean;
}

export function AllocationChart({
  slices,
  currency,
}: {
  slices: AllocationSlice[];
  currency: string;
}) {
  const sorted = [...slices]
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  const MAX = 7;
  const head = sorted.slice(0, MAX);
  const tail = sorted.slice(MAX);
  const data = [...head];
  if (tail.length) {
    data.push({
      symbol: `Other (${tail.length})`,
      value: tail.reduce((a, s) => a + s.value, 0),
      unmanaged: true,
    });
  }

  const total = data.reduce((a, s) => a + s.value, 0) || 1;
  const colorFor = (i: number) => (i < head.length ? SERIES[i] : OTHER);

  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink3">
        No positions yet.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex h-3 gap-0.5 overflow-hidden rounded-pill">
        {data.map((s, i) => (
          <div
            key={s.symbol}
            style={{
              width: `${(s.value / total) * 100}%`,
              background: colorFor(i),
            }}
            title={`${s.symbol}: ${formatPercent((s.value / total) * 100, false)}`}
          />
        ))}
      </div>

      <ul>
        {data.map((s, i) => {
          const pct = (s.value / total) * 100;
          const perf =
            s.unmanaged || s.pnlPct == null
              ? null
              : s.pnlPct;
          return (
            <li
              key={s.symbol}
              className="flex items-center gap-2.5 border-b border-line py-3 last:border-0"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ background: colorFor(i) }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink">{s.symbol}</div>
                <div
                  className={`mt-0.5 text-xs ${
                    perf == null
                      ? "text-ink3"
                      : perf > 0
                        ? "text-pos"
                        : perf < 0
                          ? "text-neg"
                          : "text-ink3"
                  }`}
                >
                  {perf == null
                    ? s.unmanaged
                      ? "Non géré"
                      : "—"
                    : `${formatPercent(perf)} depuis l'achat`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[14.5px] font-semibold text-ink tabular">
                  {formatCurrency(s.value, currency)}
                </div>
                <div className="mt-0.5 text-xs text-ink3 tabular">
                  {formatPercent(pct, false)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
