/**
 * Human-readable CSV import freshness for occasional TR re-imports.
 */

export function importAgeDays(
  importedAt: string,
  now = new Date(),
): number | null {
  const t = new Date(importedAt).getTime();
  if (Number.isNaN(t)) return null;
  const ms = now.getTime() - t;
  if (ms < 0) return 0;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

/** Short chip label, e.g. « Importé il y a 12 j ». */
export function importFreshnessLabel(
  importedAt: string | null | undefined,
  now = new Date(),
): string | null {
  if (!importedAt) return null;
  const days = importAgeDays(importedAt, now);
  if (days == null) return null;
  if (days <= 0) return "Importé aujourd’hui";
  if (days === 1) return "Importé hier";
  return `Importé il y a ${days} j`;
}

/** Soft urgency for styling — stale after ~2 weeks for a monthly CSV rhythm. */
export function importFreshnessTone(
  importedAt: string | null | undefined,
  now = new Date(),
): "fresh" | "ok" | "stale" | null {
  if (!importedAt) return null;
  const days = importAgeDays(importedAt, now);
  if (days == null) return null;
  if (days <= 7) return "fresh";
  if (days <= 21) return "ok";
  return "stale";
}
