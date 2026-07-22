import { NextRequest, NextResponse } from "next/server";
import {
  importJournalEntries,
  listJournalEntries,
  resolveJournalOutcomes,
  trimJournal,
  upsertTodaySnapshots,
} from "@/lib/signalJournalDb";
import type {
  SignalJournalEntry,
  SnapshotInput,
} from "@/lib/signalJournal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ entries: listJournalEntries() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "db error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type SyncBody = {
  snapshots?: SnapshotInput[];
  prices?: Record<string, number>;
  migrate?: SignalJournalEntry[];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SyncBody;
    if (body.migrate?.length) {
      importJournalEntries(body.migrate);
    }
    if (body.snapshots?.length) {
      upsertTodaySnapshots(body.snapshots);
    }
    if (body.prices && Object.keys(body.prices).length) {
      resolveJournalOutcomes(body.prices);
    }
    trimJournal();
    return NextResponse.json({ entries: listJournalEntries() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "db error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
