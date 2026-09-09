#!/usr/bin/env node
/**
 * Seed a ready-to-use local account (no TS, no @/ aliases — mirrors migrate.mjs).
 *
 * Creates, idempotently: an auth_invite row, a user, a personal organization,
 * and the owner membership — i.e. the exact state a real OTP sign-in would
 * leave behind, so the app has an active tenant from the first page load.
 *
 * Usage:
 *   npm run dev:seed
 *   npm run dev:seed -- moi@exemple.com "Mon Nom"
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dbPath = path.join(root, "data", "trade-brain.sqlite");

const email = (process.argv[2] || process.env.DEV_AUTH_EMAIL || "dev@localhost")
  .trim()
  .toLowerCase();
const displayName =
  process.argv[3] || email.split("@")[0].replace(/^./, (c) => c.toUpperCase());

if (!email.includes("@")) {
  console.error(`Email invalide : ${email}`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

for (const t of ["user", "organization", "member", "auth_invite"]) {
  const exists = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(t);
  if (!exists) {
    console.error(
      `Table "${t}" absente. Lance d'abord : node scripts/migrate.mjs`,
    );
    process.exit(1);
  }
}

const now = new Date().toISOString();
const rid = (p) =>
  `${p}_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;

// Mirrors uniqueTenantSlug() in lib/tenants.ts.
function uniqueSlug(base) {
  const norm = (s) =>
    s
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "espace";
  let slug = norm(base);
  let n = 0;
  while (db.prepare(`SELECT id FROM organization WHERE slug = ?`).get(slug)) {
    n += 1;
    slug = `${norm(base)}-${n}`;
  }
  return slug;
}

const result = db.transaction(() => {
  db.prepare(
    `INSERT OR IGNORE INTO auth_invite (email, created_at, accepted_at)
     VALUES (?, ?, ?)`,
  ).run(email, now, now);

  let user = db.prepare(`SELECT id, name FROM user WHERE email = ?`).get(email);
  let createdUser = false;
  if (!user) {
    const id = rid("usr");
    db.prepare(
      `INSERT INTO user (id, name, email, emailVerified, image, createdAt, updatedAt)
       VALUES (?, ?, ?, 1, NULL, ?, ?)`,
    ).run(id, displayName, email, now, now);
    user = { id, name: displayName };
    createdUser = true;
  }

  let orgId = db
    .prepare(
      `SELECT organizationId AS id FROM member WHERE userId = ?
       ORDER BY createdAt ASC LIMIT 1`,
    )
    .get(user.id)?.id;
  let createdOrg = false;
  if (!orgId) {
    orgId = rid("org");
    const local = email.split("@")[0] || "espace";
    db.prepare(
      `INSERT INTO organization (id, name, slug, logo, metadata, createdAt)
       VALUES (?, ?, ?, NULL, NULL, ?)`,
    ).run(orgId, displayName, uniqueSlug(local), now);
    db.prepare(
      `INSERT INTO member (id, organizationId, userId, role, createdAt)
       VALUES (?, ?, ?, 'owner', ?)`,
    ).run(rid("mem"), orgId, user.id, now);
    createdOrg = true;
  }

  return { userId: user.id, orgId, createdUser, createdOrg };
})();

console.log(`Compte dev prêt`);
console.log(`  email  : ${email}`);
console.log(`  user   : ${result.userId} ${result.createdUser ? "(créé)" : "(déjà présent)"}`);
console.log(`  espace : ${result.orgId} ${result.createdOrg ? "(créé)" : "(déjà présent)"}`);
console.log(`  DB     : ${dbPath}`);
db.close();
