"use client";

import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Candle } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

// CVD-safe leading slots from the reference palette: blue / orange / aqua.
const PRICE = "#3987e5";
const SMA50 = "#d95926";
const SMA20 = "#199e70";

function rollingSma(closes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i];
    if (i >= period) sum -= closes[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

interface Row {
  t: number;
  label: string;
  close: number;
  sma20: number | null;
  sma50: number | null;
}

function CrosshairTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: any[];
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const row: Row = payload[0].payload;
  const rows: { label: string; value: number | null; color: string }[] = [
    { label: "Price", value: row.close, color: PRICE },
    { label: "SMA 20", value: row.sma20, color: SMA20 },
    { label: "SMA 50", value: row.sma50, color: SMA50 },
  ];
  return (
    <div className="rounded-lg border border-hairline bg-surface-2/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="mb-1 font-medium text-ink-secondary">{row.label}</div>
      <div className="space-y-0.5 tabular">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: r.color }}
            />
            <span className="text-ink-muted">{r.label}</span>
            <span className="ml-auto pl-4 font-medium text-ink">
              {r.value == null ? "—" : formatCurrency(r.value, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PriceChart({
  candles,
  currency,
  height = 300,
}: {
  candles: Candle[];
  currency: string;
  height?: number;
}) {
  const closes = candles.map((c) => c.close);
  const sma20 = rollingSma(closes, 20);
  const sma50 = rollingSma(closes, 50);

  const data: Row[] = candles.map((c, i) => ({
    t: c.t,
    label: new Date(c.t).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    close: c.close,
    sma20: sma20[i],
    sma50: sma50[i],
  }));

  const up =
    closes.length > 1 ? closes[closes.length - 1] >= closes[0] : true;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRICE} stopOpacity={0.28} />
              <stop offset="100%" stopColor={PRICE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fill: "#898781", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#383835" }}
            minTickGap={48}
          />
          <YAxis
            orientation="right"
            domain={["auto", "auto"]}
            tick={{ fill: "#898781", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(v) =>
              formatCurrency(Number(v), currency, { compact: true })
            }
          />
          <Tooltip
            content={<CrosshairTooltip currency={currency} />}
            cursor={{ stroke: "#898781", strokeDasharray: "3 3" }}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={PRICE}
            strokeWidth={2}
            fill="url(#priceFill)"
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
            isAnimationActive={false}
            name="Price"
          />
          <Line
            type="monotone"
            dataKey="sma20"
            stroke={SMA20}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
            name="SMA 20"
          />
          <Line
            type="monotone"
            dataKey="sma50"
            stroke={SMA50}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
            name="SMA 50"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
