/**
 * Signal journal types, stats, and client API (SQLite via /api/journal).
 */

import type { Recommendation } from "@/lib/types";

const LEGACY_KEY = "trade-brain.signal-journal.v1";

export type SignalJournalEntry = {
  id: string;
  holdingId: string;
  symbol: string;
  name: string;
  /** ISO date YYYY-MM-DD. */
  date: string;
  recommendation: Recommendation;
  score: number;
  price: number;
  price5?: number;
  return5Pct?: number;
  price20?: number;
  return20Pct?: number;
};

export type SnapshotInput = {
  holdingId: string;
  symbol: string;
  name: string;
  recommendation: Recommendation;
  score: number;
  price: number;
};

export type JournalStats = {
  count: number;
  with5: number;
  with20: number;
  hitRate5: number | null;
  avgReturn5Buy: number | null;
  avgReturn5Sell: number | null;
};

export function journalStats(entries: SignalJournalEntry[]): JournalStats {
  const with5 = entries.filter((e) => e.return5Pct != null);
  const buys = with5.filter(
    (e) => e.recommendation === "BUY" || e.recommendation === "STRONG_BUY",
  );
  const sells = with5.filter(
    (e) => e.recommendation === "SELL" || e.recommendation === "STRONG_SELL",
  );
  const hits = [
    ...buys.filter((e) => (e.return5Pct ?? 0) > 0),
    ...sells.filter((e) => (e.return5Pct ?? 0) < 0),
  ];
  const decided = buys.length + sells.length;
  const avg = (arr: SignalJournalEntry[]) =>
    arr.length
      ? arr.reduce((a, e) => a + (e.return5Pct ?? 0), 0) / arr.length
      : null;

  return {
    count: entries.length,
    with5: with5.length,
    with20: entries.filter((e) => e.return20Pct != null).length,
    hitRate5: decided ? (hits.length / decided) * 100 : null,
    avgReturn5Buy: avg(buys),
    avgReturn5Sell: avg(sells),
  };
}

/** One-shot read of pre-SQLite localStorage journal (then cleared after migrate). */
export function takeLegacyLocalJournal(): SignalJournalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SignalJournalEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearLegacyLocalJournal() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

export async function fetchJournal(): Promise<SignalJournalEntry[]> {
  const res = await fetch("/api/journal", { cache: "no-store" });
  if (!res.ok) throw new Error(`journal ${res.status}`);
  const data = (await res.json()) as { entries: SignalJournalEntry[] };
  return data.entries ?? [];
}

export async function syncJournal(opts: {
  snapshots: SnapshotInput[];
  prices: Record<string, number>;
  migrate?: SignalJournalEntry[];
}): Promise<SignalJournalEntry[]> {
  const res = await fetch("/api/journal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error(`journal sync ${res.status}`);
  const data = (await res.json()) as { entries: SignalJournalEntry[] };
  return data.entries ?? [];
}
