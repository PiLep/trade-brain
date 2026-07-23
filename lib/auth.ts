import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { APIError } from "better-auth/api";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { sendOtpEmail } from "@/lib/email";
import {
  ensureInviteTable,
  isEmailInvited,
  markInviteAccepted,
} from "@/lib/invites";

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
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
