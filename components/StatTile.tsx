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
      ? "text-pos"
      : deltaTone === "down"
        ? "text-neg"
        : "text-ink3";
  const arrow =
    deltaTone === "up" ? "▲" : deltaTone === "down" ? "▼" : "";

  return (
    <div className="rounded-2xl border border-line bg-card px-3.5 py-3.5 shadow-soft sm:px-5 sm:py-[18px]">
      <div className="font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-ink3">
        {label}
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-7 w-28" />
          <Skeleton className="mt-2.5 h-3 w-20" />
        </>
      ) : (
        <>
          <div className="mt-2 text-[22px] font-semibold tracking-tight text-ink tabular sm:text-[26px]">
            {value}
          </div>
          {delta !== undefined && (
            <div className={`mt-1 flex items-center gap-1 text-xs ${toneClass}`}>
              {arrow && <span aria-hidden>{arrow}</span>}
              <span className="tabular font-medium">{delta}</span>
              {hint && <span className="text-ink3"> · {hint}</span>}
            </div>
          )}
          {delta === undefined && hint && (
            <div className="mt-1 text-xs text-ink3">{hint}</div>
          )}
        </>
      )}
    </div>
  );
}
