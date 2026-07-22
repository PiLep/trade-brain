// A single KPI / stat tile. The hero value uses proportional figures; deltas
// pair color with an arrow glyph so direction is never color-alone.

import { Skeleton } from "@/components/Skeleton";

export function StatTile({
  label,
  value,
  delta,
  deltaTone,
  hint,
  loading,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "up" | "down" | "flat";
  hint?: string;
  loading?: boolean;
}) {
  const toneClass =
    deltaTone === "up"
      ? "text-good"
      : deltaTone === "down"
        ? "text-critical"
        : "text-ink-muted";
  const arrow =
    deltaTone === "up" ? "▲" : deltaTone === "down" ? "▼" : "◆";

  return (
    <div className="rounded-xl border border-hairline bg-surface p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-2 h-8 w-28" />
          <Skeleton className="mt-2 h-4 w-20" />
        </>
      ) : (
        <>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight text-ink tabular">
            {value}
          </div>
          {delta !== undefined && (
            <div className={`mt-1 flex items-center gap-1 text-sm ${toneClass}`}>
              <span aria-hidden className="text-[0.7em]">
                {arrow}
              </span>
              <span className="tabular font-medium">{delta}</span>
              {hint && <span className="text-ink-muted"> · {hint}</span>}
            </div>
          )}
          {delta === undefined && hint && (
            <div className="mt-1 text-sm text-ink-muted">{hint}</div>
          )}
        </>
      )}
    </div>
  );
}
