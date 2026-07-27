/**
 * Tenant (organization) helpers on top of Better Auth organization tables.
 */

import { getDb } from "@/lib/db";

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
}

export function slugifyTenant(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "espace";
}

export function uniqueTenantSlug(base: string): string {
  const db = getDb();
  let slug = slugifyTenant(base);
  let n = 0;
  while (
    db.prepare(`SELECT id FROM organization WHERE slug = ?`).get(slug)
  ) {
    n += 1;
    slug = `${slugifyTenant(base)}-${n}`;
  }
  return slug;
}

/** First organization membership for a user, if any. */
export function getFirstOrganizationId(userId: string): string | null {
  const row = getDb()
    .prepare(
      `SELECT organizationId FROM member
       WHERE userId = ?
       ORDER BY createdAt ASC
       LIMIT 1`,
    )
    .get(userId) as { organizationId: string } | undefined;
  return row?.organizationId ?? null;
}

export function isUserMemberOfOrganization(
  userId: string,
  organizationId: string,
): boolean {
  const row = getDb()
    .prepare(
      `SELECT id FROM member WHERE userId = ? AND organizationId = ? LIMIT 1`,
    )
    .get(userId, organizationId) as { id: string } | undefined;
  return !!row;
}

/**
 * Ensure the user owns at least one personal tenant and return an org id
 * suitable as activeOrganizationId.
 */
export function ensurePersonalOrganization(opts: {
  userId: string;
  email: string;
  name?: string | null;
}): string {
  const existing = getFirstOrganizationId(opts.userId);
  if (existing) return existing;

  const db = getDb();
  const now = new Date().toISOString();
  const orgId = makeId("org");
  const memberId = makeId("mem");
  const local = opts.email.split("@")[0] || "espace";
  const display =
    (opts.name && opts.name.trim()) ||
    local.charAt(0).toUpperCase() + local.slice(1);
  const name = `${display}`;
  const slug = uniqueTenantSlug(local);

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO organization (id, name, slug, logo, metadata, createdAt)
       VALUES (?, ?, ?, NULL, NULL, ?)`,
    ).run(orgId, name, slug, now);
    db.prepare(
      `INSERT INTO member (id, organizationId, userId, role, createdAt)
       VALUES (?, ?, ?, 'owner', ?)`,
    ).run(memberId, orgId, opts.userId, now);
  });
  tx();
  return orgId;
}
