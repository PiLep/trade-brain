/**
 * Local-only auth bypass (Better Auth plugin).
 *
 * Lets you open a real, fully-provisioned session on localhost without going
 * through the email OTP round-trip. Intended for `npm run dev` only.
 *
 * ⚠️  This endpoint mints a session for ANY email with no proof of identity.
 *     It must never be reachable from a deployed environment. Three
 *     independent gates enforce that:
 *
 *       1. Module load  — throws outright if NODE_ENV === "production".
 *       2. Registration — lib/auth.ts only adds the plugin when
 *                         DEV_AUTH_BYPASS=1 *and* NODE_ENV !== "production".
 *       3. Per request  — the endpoint re-checks both gates and additionally
 *                         refuses any request whose Host header is not a
 *                         loopback address.
 *
 *     Removing any one of them still leaves the bypass closed by default:
 *     it is opt-in via an env var that lives only in .env.local.
 */

import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { APIError } from "better-auth/api";
import * as z from "zod";

/** The single switch. Off unless explicitly turned on in .env.local. */
export function isDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_BYPASS === "1"
  );
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function isLoopbackHost(host: string | null): boolean {
  if (!host) return false;
  // Strip the port: "localhost:3000" → "localhost", "[::1]:3000" → "[::1]".
  const hostname = host.startsWith("[")
    ? host.slice(0, host.indexOf("]") + 1)
    : host.split(":")[0];
  return LOOPBACK.has(hostname.toLowerCase());
}

export const DEV_BYPASS_PATH = "/dev/sign-in";

/** Find-or-create the dev user, then open a real session and set the cookie. */
async function mintSession(ctx: any, email: string, name?: string) {
  // Gate 3: re-check at request time, not just at boot.
  if (!isDevBypassEnabled()) {
    throw new APIError("NOT_FOUND", { message: "Not found" });
  }
  if (!isLoopbackHost(ctx.headers?.get("host") ?? null)) {
    throw new APIError("FORBIDDEN", { message: "dev-bypass is loopback-only" });
  }

  const normalized = (email || "").trim().toLowerCase();
  const adapter = ctx.context.internalAdapter;

  const existing = await adapter.findUserByEmail(normalized);
  const user =
    existing?.user ??
    (await adapter.createUser({
      email: normalized,
      name: name || normalized.split("@")[0] || "Dev",
      emailVerified: true,
    }));

  if (!user) {
    throw new APIError("INTERNAL_SERVER_ERROR", {
      message: "dev-bypass: could not create user",
    });
  }

  // Goes through the normal session hooks in lib/auth.ts, so the personal
  // organization is provisioned and set active exactly as after a real OTP.
  const session = await adapter.createSession(user.id);
  if (!session) {
    throw new APIError("INTERNAL_SERVER_ERROR", {
      message: "dev-bypass: could not create session",
    });
  }

  await setSessionCookie(ctx, { session, user });
  console.warn(`[auth][dev-bypass] minted a session for ${normalized} — dev only`);
  return { user, session, email: normalized };
}

function defaultEmail(): string {
  return (process.env.DEV_AUTH_EMAIL || "dev@localhost").trim().toLowerCase();
}

export function devBypass() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "auth-dev-bypass: refusing to load in production. This plugin mints " +
        "sessions without authentication and must stay on localhost.",
    );
  }

  return {
    id: "dev-bypass",
    endpoints: {
      // Programmatic: POST /api/auth/dev/sign-in  {"email":"..."}
      devSignIn: createAuthEndpoint(
        DEV_BYPASS_PATH,
        {
          method: "POST",
          // Deliberately z.string(), not z.email(): the local default
          // "dev@localhost" has no TLD and z.email() rejects it.
          body: z.object({
            email: z.string().optional(),
            name: z.string().optional(),
          }),
        },
        async (ctx) => {
          const { email, user } = await mintSession(
            ctx,
            ctx.body?.email || defaultEmail(),
            ctx.body?.name,
          );
          return ctx.json({ ok: true, email, userId: user.id });
        },
      ),

      // Browser convenience: just open
      //   http://localhost:3000/api/auth/dev/sign-in
      // and you land on the app already signed in.
      devSignInRedirect: createAuthEndpoint(
        DEV_BYPASS_PATH,
        {
          method: "GET",
          query: z
            .object({
              email: z.string().optional(),
              redirect: z.string().optional(),
            })
            .optional(),
        },
        async (ctx) => {
          await mintSession(ctx, ctx.query?.email || defaultEmail());
          throw ctx.redirect(ctx.query?.redirect || "/");
        },
      ),
    },
  };
}
