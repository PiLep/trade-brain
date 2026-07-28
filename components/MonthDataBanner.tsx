"use client";

import { formatDate } from "@/lib/format";
import { useImportCsvUi } from "@/lib/importCsvUi";
import type { ImportMeta } from "@/lib/month";
import { monthLabel } from "@/lib/month";

/**
 * Soft end-of-month nudge. DCA-first users can ignore this — projection
 * already covers sparplan cash flow; CSV only confirms real TR executions.
 */
export function MonthDataBanner({
  show,
  importMeta,
  fallbackLastDate,
}: {
  show: boolean;
  importMeta: ImportMeta | null;
  fallbackLastDate?: string | null;
}) {
  const { openImportCsv } = useImportCsvUi();
  if (!show) return null;

  const label = monthLabel();
  const lastIso = importMeta?.csvLastDate || fallbackLastDate || null;
  const last = lastIso
    ? formatDate(lastIso, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex max-w-[720px] flex-col gap-2 rounded-xl border border-line bg-chip px-3.5 py-2.5 text-[13px] text-ink2 sm:flex-row sm:items-start sm:gap-2.5">
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 shrink-0 text-ink3"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="min-w-0 flex-1">
          <strong className="text-ink">Clôture {label} (optionnel)</strong>
          {" — "}
          {last ? `Dernier CSV au ${last}.` : "Pas d’export récent."}{" "}
          Si tu n’as fait que du DCA, la projection suffit. Réimporte seulement
          pour coller aux exécutions TR ou après un trade hors sparplan.
        </div>
      </div>
      <button
        type="button"
        onClick={openImportCsv}
        className="self-start whitespace-nowrap text-[12.5px] font-semibold text-ink underline sm:self-auto"
      >
        Importer CSV
      </button>
    </div>
  );
}
