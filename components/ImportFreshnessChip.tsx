"use client";

import {
  importFreshnessLabel,
  importFreshnessTone,
} from "@/lib/importFreshness";
import { useImportCsvUi } from "@/lib/importCsvUi";

export function ImportFreshnessChip({
  importedAt,
}: {
  importedAt: string | null | undefined;
}) {
  const { openImportCsv } = useImportCsvUi();
  const label = importFreshnessLabel(importedAt);
  const tone = importFreshnessTone(importedAt);

  if (!label || !tone) return null;

  const toneCls =
    tone === "stale"
      ? "border-[color-mix(in_srgb,var(--tb-warn)_35%,transparent)] bg-warnbg text-warn"
      : tone === "fresh"
        ? "border-line bg-card text-ink2"
        : "border-line bg-chip text-ink2";

  return (
    <button
      type="button"
      onClick={openImportCsv}
      title="Réimporter un CSV Trade Republic"
      className={`touch-target inline-flex items-center rounded-pill border px-2.5 text-[12px] font-medium ${toneCls}`}
    >
      {label}
    </button>
  );
}
