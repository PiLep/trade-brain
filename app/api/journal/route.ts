import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/requireAuth";
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
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  try {
    return NextResponse.json({
      entries: listJournalEntries(gate.organizationId!),
    });
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
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const organizationId = gate.organizationId!;
  try {
    const body = (await req.json()) as SyncBody;
    if (body.migrate?.length) {
      importJournalEntries(organizationId, body.migrate);
    }
    if (body.snapshots?.length) {
      upsertTodaySnapshots(organizationId, body.snapshots);
    }
    if (body.prices && Object.keys(body.prices).length) {
      resolveJournalOutcomes(organizationId, body.prices);
    }
    trimJournal(organizationId);
    return NextResponse.json({
      entries: listJournalEntries(organizationId),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "db error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
