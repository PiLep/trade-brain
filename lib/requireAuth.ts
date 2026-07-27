import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isEmailInvited } from "@/lib/invites";
import {
  ensurePersonalOrganization,
  isUserMemberOfOrganization,
} from "@/lib/tenants";

export async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return {
      session: null as null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!isEmailInvited(session.user.email)) {
    return {
      session: null as null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session, error: null };
}

/** Session + active tenant (organization). Auto-provisions a personal space. */
export async function requireTenant() {
  const gate = await requireSession();
  if (gate.error || !gate.session) {
    return {
      session: null as null,
      organizationId: null as null,
      error: gate.error!,
    };
  }

  const { session } = gate;
  let organizationId =
    (session.session as { activeOrganizationId?: string | null })
      .activeOrganizationId ?? null;

  if (
    organizationId &&
    !isUserMemberOfOrganization(session.user.id, organizationId)
  ) {
    organizationId = null;
  }

  if (!organizationId) {
    organizationId = ensurePersonalOrganization({
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });
    try {
      await auth.api.setActiveOrganization({
        headers: await headers(),
        body: { organizationId },
      });
    } catch {
      /* session cookie update best-effort */
    }
  }

  return { session, organizationId, error: null };
}
