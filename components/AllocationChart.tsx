"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, formatPercent } from "@/lib/format";

// Fixed categorical order from the reference palette (dark steps). Never cycled:
// a 9th slice folds into "Other".
const SERIES = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];
const OTHER = "#898781";

export interface AllocationSlice {
  symbol: string;
  value: number;
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

  // Cap categorical hues at 7 distinct + a folded "Other".
  const MAX = 7;
  const head = sorted.slice(0, MAX);
  const tail = sorted.slice(MAX);
  const data = [...head];
  if (tail.length) {
    data.push({
      symbol: `Other (${tail.length})`,
      value: tail.reduce((a, s) => a + s.value, 0),
    });
  }

  const total = data.reduce((a, s) => a + s.value, 0) || 1;
  const colorFor = (i: number) =>
    i < head.length ? SERIES[i] : OTHER;

  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-muted">
        No positions yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="symbol"
              innerRadius={54}
              outerRadius={82}
              paddingAngle={2}
              stroke="#1a1a19"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colorFor(i)} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as AllocationSlice;
                const pct = (p.value / total) * 100;
                return (
                  <div className="rounded-lg border border-hairline bg-surface-2/95 px-3 py-2 text-xs shadow-xl">
                    <div className="font-medium text-ink">{p.symbol}</div>
                    <div className="tabular text-ink-secondary">
                      {formatCurrency(p.value, currency)} ·{" "}
                      {formatPercent(pct, false)}
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend — identity is never color-alone. */}
      <ul className="flex-1 space-y-1.5">
        {data.map((s, i) => {
          const pct = (s.value / total) * 100;
          return (
            <li key={s.symbol} className="flex items-center gap-2 text-sm">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: colorFor(i) }}
              />
              <span className="truncate text-ink-secondary">{s.symbol}</span>
              <span className="ml-auto tabular text-ink-muted">
                {formatPercent(pct, false)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
