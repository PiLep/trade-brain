import { getDb } from "@/lib/db";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Seed allowlist emails into the invite table (idempotent). */
export function seedInvitesFromEnv() {
  const raw =
    process.env.AUTH_ALLOWED_EMAILS ?? "pierrelepetit91@gmail.com";
  const emails = raw
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO auth_invite (email, created_at) VALUES (?, ?)`,
  );
  for (const email of emails) {
    stmt.run(email, now);
  }
}

export function ensureInviteTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_invite (
      email TEXT PRIMARY KEY COLLATE NOCASE,
      created_at TEXT NOT NULL,
      accepted_at TEXT
    );
  `);
  seedInvitesFromEnv();
}

export function isEmailInvited(email: string): boolean {
  ensureInviteTable();
  const row = getDb()
    .prepare(`SELECT email FROM auth_invite WHERE email = ?`)
    .get(normalizeEmail(email)) as { email: string } | undefined;
  return !!row;
}

export function addInvite(email: string): void {
  ensureInviteTable();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO auth_invite (email, created_at) VALUES (?, ?)`,
    )
    .run(normalizeEmail(email), new Date().toISOString());
}

export function markInviteAccepted(email: string): void {
  ensureInviteTable();
  getDb()
    .prepare(
      `UPDATE auth_invite SET accepted_at = COALESCE(accepted_at, ?) WHERE email = ?`,
    )
    .run(new Date().toISOString(), normalizeEmail(email));
}
