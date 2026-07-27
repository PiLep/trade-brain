import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/requireAuth";
import { missingOrgTablesMessage } from "@/lib/tenantBootstrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ensure the signed-in user has an active organization.
 * Prefer this over client-side organization.create — server helpers use
 * unique slugs and share the app SQLite connection (see requireTenant).
 */
export async function POST() {
  try {
    const gate = await requireTenant();
    if (gate.error) return gate.error;
    return NextResponse.json({
      organizationId: gate.organizationId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "bootstrap failed";
    const migrateHint = missingOrgTablesMessage(message);
    return NextResponse.json(
      { error: migrateHint ?? message },
      { status: migrateHint ? 503 : 500 },
    );
  }
}
