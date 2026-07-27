import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, organization } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { APIError } from "better-auth/api";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
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

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "trade-brain.sqlite");

fs.mkdirSync(DB_DIR, { recursive: true });
ensureInviteTable();

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
  const row = getDb()
    .prepare(`SELECT id, email, name FROM user WHERE id = ?`)
    .get(userId) as { id: string; email: string; name: string } | undefined;
  return row ?? null;
}

export const auth = betterAuth({
  database: new Database(DB_PATH),
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
          ensurePersonalOrganization({
            userId: user.id,
            email: user.email,
            name: user.name,
          });
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = lookupUser(session.userId);
          if (!user) return { data: session };
          const organizationId = ensurePersonalOrganization({
            userId: user.id,
            email: user.email,
            name: user.name,
          });
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
