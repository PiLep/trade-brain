import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isEmailInvited } from "@/lib/invites";

export async function requireSession() {
  const session = await auth.api.getSession({
    headers: headers(),
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
