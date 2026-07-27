import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, organization } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { APIError } from "better-auth/api";
import Database from "better-sqlite3";
import {
  sendOrganizationInvitationEmail,
  sendOtpEmail,
} from "@/lib/email";
import {
  addInvite,
  ensureInviteTable,
  isEmailInvited,
  markInviteAccepted,
} from "@/lib/invites";
import { getDb } from "@/lib/db";
import { ensurePersonalOrganization } from "@/lib/tenants";

// Share one SQLite connection with the rest of the app (tenants, invites).
// A second better-sqlite3 handle on the same file can make post-OTP org
// provisioning fail after the code was already consumed → "Invalid OTP" on retry.
//
// Skip opening the on-disk DB during `next build` / edge: the build fans out
// workers that all import this module → SQLITE_BUSY on data/trade-brain.sqlite.
const isBuildOrEdge =
  process.env.NEXT_RUNTIME === "edge" ||
  process.env.NEXT_PHASE === "phase-production-build";

const sqlite = (() => {
  if (isBuildOrEdge) {
    return new Database(":memory:");
  }
  ensureInviteTable();
  return getDb();
})();

const appUrl =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

const hostname = (() => {
  try {
    return new URL(appUrl).hostname;
  } catch {
    return "localhost";
  }
})();

function lookupUser(userId: string): {
  id: string;
  email: string;
  name: string;
} | null {
  const row = sqlite
    .prepare(`SELECT id, email, name FROM user WHERE id = ?`)
    .get(userId) as { id: string; email: string; name: string } | undefined;
  return row ?? null;
}

function tryProvisionPersonalOrganization(user: {
  id: string;
  email: string;
  name?: string | null;
}): string | null {
  try {
    return ensurePersonalOrganization({
      userId: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (err) {
    // Never fail sign-in after a valid OTP was consumed.
    console.error(
      "[auth] ensurePersonalOrganization failed; login continues without active org",
      err,
    );
    return null;
  }
}

export const auth = betterAuth({
  database: sqlite,
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [appUrl],
  emailAndPassword: {
    enabled: false,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isEmailInvited(user.email)) {
            throw new APIError("FORBIDDEN", {
              message: "Invitation requise",
            });
          }
          return { data: user };
        },
        after: async (user) => {
          markInviteAccepted(user.email);
          tryProvisionPersonalOrganization(user);
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = lookupUser(session.userId);
          if (!user) return { data: session };
          const organizationId = tryProvisionPersonalOrganization(user);
          if (!organizationId) return { data: session };
          return {
            data: {
              ...session,
              activeOrganizationId: organizationId,
            },
          };
        },
      },
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      // Avoid rotating the code while a previous email is still in flight
      // (common cause of "I typed the code from my mail and it's invalid").
      resendStrategy: "reuse",
      // Sign-up only happens for invited emails (hook + send gate).
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "sign-in" || type === "email-verification") {
          if (!isEmailInvited(email)) {
            throw new APIError("FORBIDDEN", {
              message: "Invitation requise",
            });
          }
        }
        await sendOtpEmail(email, otp);
      },
    }),
    passkey({
      rpID: process.env.PASSKEY_RP_ID || hostname,
      rpName: "Trade Brain",
      origin: appUrl,
    }),
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 20,
      membershipLimit: 50,
      creatorRole: "owner",
      async sendInvitationEmail(data) {
        // Org invite also unlocks app sign-in (invite-only gate).
        addInvite(data.email);
        const inviteLink = `${appUrl}/accept-invitation/${data.id}`;
        await sendOrganizationInvitationEmail({
          to: data.email,
          inviterName:
            data.inviter.user.name || data.inviter.user.email || "Un membre",
          organizationName: data.organization.name,
          inviteLink,
        });
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
