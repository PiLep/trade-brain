/**
 * Server-side signal journal persistence (SQLite), scoped by tenant.
 */

import { getDb } from "@/lib/db";
import type { Recommendation } from "@/lib/types";
import type {
  SignalJournalEntry,
  SnapshotInput,
} from "@/lib/signalJournal";

const MAX_ENTRIES = 5_000;

type Row = {
  id: string;
  organization_id: string;
  holding_id: string;
  symbol: string;
  name: string;
  date: string;
  recommendation: string;
  score: number;
  price: number;
  price5: number | null;
  return5_pct: number | null;
  price20: number | null;
  return20_pct: number | null;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms =
    Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z");
  return Math.floor(ms / 86_400_000);
}

function rowToEntry(r: Row): SignalJournalEntry {
  return {
    id: r.id,
    holdingId: r.holding_id,
    symbol: r.symbol,
    name: r.name,
    date: r.date,
    recommendation: r.recommendation as Recommendation,
    score: r.score,
    price: r.price,
    price5: r.price5 ?? undefined,
    return5Pct: r.return5_pct ?? undefined,
    price20: r.price20 ?? undefined,
    return20Pct: r.return20_pct ?? undefined,
  };
}

export function listJournalEntries(
  organizationId: string,
): SignalJournalEntry[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM signal_journal
       WHERE organization_id = ?
       ORDER BY date DESC, symbol ASC
       LIMIT ?`,
    )
    .all(organizationId, MAX_ENTRIES) as Row[];
  return rows.map(rowToEntry);
}

const UPSERT = `
  INSERT INTO signal_journal (
    id, organization_id, holding_id, symbol, name, date, recommendation, score, price,
    price5, return5_pct, price20, return20_pct
  ) VALUES (
    @id, @organization_id, @holding_id, @symbol, @name, @date, @recommendation, @score, @price,
    @price5, @return5_pct, @price20, @return20_pct
  )
  ON CONFLICT(organization_id, holding_id, date) DO UPDATE SET
    symbol = excluded.symbol,
    name = excluded.name,
    recommendation = excluded.recommendation,
    score = excluded.score,
    price = excluded.price
`;

function upsertEntry(organizationId: string, entry: SignalJournalEntry) {
  getDb()
    .prepare(UPSERT)
    .run({
      id: entry.id,
      organization_id: organizationId,
      holding_id: entry.holdingId,
      symbol: entry.symbol,
      name: entry.name,
      date: entry.date,
      recommendation: entry.recommendation,
      score: entry.score,
      price: entry.price,
      price5: entry.price5 ?? null,
      return5_pct: entry.return5Pct ?? null,
      price20: entry.price20 ?? null,
      return20_pct: entry.return20Pct ?? null,
    });
}

/** Import legacy / client-migrated rows without overwriting outcome fields blindly. */
export function importJournalEntries(
  organizationId: string,
  entries: SignalJournalEntry[],
) {
  const db = getDb();
  const select = db.prepare(
    `SELECT * FROM signal_journal
     WHERE organization_id = ? AND holding_id = ? AND date = ?`,
  );
  const tx = db.transaction((list: SignalJournalEntry[]) => {
    for (const e of list) {
      if (!(e.price > 0) || !e.holdingId || !e.date) continue;
      const existing = select.get(
        organizationId,
        e.holdingId,
        e.date,
      ) as Row | undefined;
      if (!existing) {
        upsertEntry(organizationId, {
          ...e,
          // Always tenant-scope primary keys to avoid cross-tenant collisions.
          id: `sig_${organizationId}_${e.holdingId}_${e.date}`,
        });
        continue;
      }
      // Prefer already-resolved outcomes; refresh live fields from migrate payload.
      upsertEntry(organizationId, {
        id: existing.id,
        holdingId: e.holdingId,
        symbol: e.symbol || existing.symbol,
        name: e.name || existing.name,
        date: e.date,
        recommendation:
          e.recommendation || (existing.recommendation as Recommendation),
        score: e.score ?? existing.score,
        price: e.price || existing.price,
        price5: existing.price5 ?? e.price5,
        return5Pct: existing.return5_pct ?? e.return5Pct,
        price20: existing.price20 ?? e.price20,
        return20Pct: existing.return20_pct ?? e.return20Pct,
      });
    }
  });
  tx(entries);
}

export function upsertTodaySnapshots(
  organizationId: string,
  inputs: SnapshotInput[],
): number {
  const date = todayIso();
  const db = getDb();
  const select = db.prepare(
    `SELECT * FROM signal_journal
     WHERE organization_id = ? AND holding_id = ? AND date = ?`,
  );
  let n = 0;
  const tx = db.transaction((list: SnapshotInput[]) => {
    for (const input of list) {
      if (!(input.price > 0)) continue;
      if (input.recommendation === "HOLD" || !input.recommendation) {
        continue;
      }
      const existing = select.get(
        organizationId,
        input.holdingId,
        date,
      ) as Row | undefined;
      upsertEntry(organizationId, {
        id: existing?.id ?? `sig_${organizationId}_${input.holdingId}_${date}`,
        holdingId: input.holdingId,
        symbol: input.symbol,
        name: input.name,
        date,
        recommendation: input.recommendation,
        score: input.score,
        price: input.price,
        price5: existing?.price5 ?? undefined,
        return5Pct: existing?.return5_pct ?? undefined,
        price20: existing?.price20 ?? undefined,
        return20Pct: existing?.return20_pct ?? undefined,
      });
      n += 1;
    }
  });
  tx(inputs);
  return n;
}

export function resolveJournalOutcomes(
  organizationId: string,
  pricesByHoldingId: Record<string, number>,
): number {
  const today = todayIso();
  const db = getDb();
  const pending = db
    .prepare(
      `SELECT * FROM signal_journal
       WHERE organization_id = ?
         AND (return5_pct IS NULL OR return20_pct IS NULL)`,
    )
    .all(organizationId) as Row[];

  const update = db.prepare(`
    UPDATE signal_journal SET
      price5 = @price5,
      return5_pct = @return5_pct,
      price20 = @price20,
      return20_pct = @return20_pct
    WHERE id = @id AND organization_id = @organization_id
  `);

  let changed = 0;
  const tx = db.transaction(() => {
    for (const e of pending) {
      const px = pricesByHoldingId[e.holding_id];
      if (!(px > 0) || !(e.price > 0)) continue;
      const age = daysBetween(e.date, today);
      let price5 = e.price5;
      let return5 = e.return5_pct;
      let price20 = e.price20;
      let return20 = e.return20_pct;
      let dirty = false;
      if (age >= 5 && return5 == null) {
        price5 = px;
        return5 = ((px - e.price) / e.price) * 100;
        dirty = true;
      }
      if (age >= 20 && return20 == null) {
        price20 = px;
        return20 = ((px - e.price) / e.price) * 100;
        dirty = true;
      }
      if (!dirty) continue;
      update.run({
        id: e.id,
        organization_id: organizationId,
        price5,
        return5_pct: return5,
        price20,
        return20_pct: return20,
      });
      changed += 1;
    }
  });
  tx();
  return changed;
}

/** Drop oldest rows beyond MAX_ENTRIES for one tenant. */
export function trimJournal(organizationId: string) {
  getDb()
    .prepare(
      `DELETE FROM signal_journal
       WHERE organization_id = ?
         AND id NOT IN (
           SELECT id FROM signal_journal
           WHERE organization_id = ?
           ORDER BY date DESC, id DESC
           LIMIT ?
         )`,
    )
    .run(organizationId, organizationId, MAX_ENTRIES);
}
