#!/usr/bin/env node
/**
 * Standalone SQLite migration for container startup (no TS, no @/ aliases).
 * Creates Better Auth + app tables idempotently, then seeds AUTH_ALLOWED_EMAILS.
 *
 * Usage: node scripts/migrate.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dbDir = path.join(root, "data");
const dbPath = path.join(dbDir, "trade-brain.sqlite");

fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function tableExists(name) {
  return !!db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    )
    .get(name);
}

function columnExists(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === column);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS user (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    emailVerified INTEGER NOT NULL,
    image TEXT,
    createdAt DATE NOT NULL,
    updatedAt DATE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS session (
    id TEXT NOT NULL PRIMARY KEY,
    expiresAt DATE NOT NULL,
    token TEXT NOT NULL UNIQUE,
    createdAt DATE NOT NULL,
    updatedAt DATE NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    userId TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
    activeOrganizationId TEXT
  );

  CREATE TABLE IF NOT EXISTS account (
    id TEXT NOT NULL PRIMARY KEY,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    userId TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
    accessToken TEXT,
    refreshToken TEXT,
    idToken TEXT,
    accessTokenExpiresAt DATE,
    refreshTokenExpiresAt DATE,
    scope TEXT,
    password TEXT,
    createdAt DATE NOT NULL,
    updatedAt DATE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS verification (
    id TEXT NOT NULL PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt DATE NOT NULL,
    createdAt DATE NOT NULL,
    updatedAt DATE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS organization (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo TEXT,
    createdAt DATE NOT NULL,
    metadata TEXT
  );

  CREATE TABLE IF NOT EXISTS member (
    id TEXT NOT NULL PRIMARY KEY,
    organizationId TEXT NOT NULL REFERENCES organization (id) ON DELETE CASCADE,
    userId TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    createdAt DATE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invitation (
    id TEXT NOT NULL PRIMARY KEY,
    organizationId TEXT NOT NULL REFERENCES organization (id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT,
    status TEXT NOT NULL,
    expiresAt DATE NOT NULL,
    createdAt DATE NOT NULL,
    inviterId TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS passkey (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT,
    publicKey TEXT NOT NULL,
    userId TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
    credentialID TEXT NOT NULL,
    counter INTEGER NOT NULL,
    deviceType TEXT NOT NULL,
    backedUp INTEGER NOT NULL,
    transports TEXT,
    createdAt DATE,
    aaguid TEXT
  );

  CREATE TABLE IF NOT EXISTS auth_invite (
    email TEXT PRIMARY KEY COLLATE NOCASE,
    created_at TEXT NOT NULL,
    accepted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS signal_journal (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT '',
    holding_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    score REAL NOT NULL,
    price REAL NOT NULL,
    price5 REAL,
    return5_pct REAL,
    price20 REAL,
    return20_pct REAL
  );
`);

// Legacy installs: session may exist without activeOrganizationId.
if (tableExists("session") && !columnExists("session", "activeOrganizationId")) {
  db.exec(`ALTER TABLE session ADD COLUMN activeOrganizationId TEXT`);
}

if (tableExists("signal_journal") && !columnExists("signal_journal", "organization_id")) {
  db.exec(
    `ALTER TABLE signal_journal ADD COLUMN organization_id TEXT NOT NULL DEFAULT ''`,
  );
}

db.exec(`
  CREATE INDEX IF NOT EXISTS session_userId_idx ON session (userId);
  CREATE INDEX IF NOT EXISTS account_userId_idx ON account (userId);
  CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier);
  CREATE INDEX IF NOT EXISTS member_organizationId_idx ON member (organizationId);
  CREATE INDEX IF NOT EXISTS member_userId_idx ON member (userId);
  CREATE INDEX IF NOT EXISTS invitation_organizationId_idx ON invitation (organizationId);
  CREATE INDEX IF NOT EXISTS invitation_email_idx ON invitation (email);
  CREATE INDEX IF NOT EXISTS passkey_userId_idx ON passkey (userId);
  CREATE INDEX IF NOT EXISTS passkey_credentialID_idx ON passkey (credentialID);

  CREATE INDEX IF NOT EXISTS idx_signal_journal_date
    ON signal_journal (date DESC);
  CREATE INDEX IF NOT EXISTS idx_signal_journal_org_date
    ON signal_journal (organization_id, date DESC);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_signal_journal_org_holding_date
    ON signal_journal (organization_id, holding_id, date);

  -- At most one Better Auth email-OTP row per identifier (better-auth#10437).
  CREATE UNIQUE INDEX IF NOT EXISTS verification_otp_identifier_uidx
    ON verification (identifier)
    WHERE identifier LIKE 'sign-in-otp-%'
       OR identifier LIKE 'email-verification-otp-%'
       OR identifier LIKE 'forget-password-otp-%'
       OR identifier LIKE 'change-email-otp-%';
`);

const raw = process.env.AUTH_ALLOWED_EMAILS ?? "pierrelepetit91@gmail.com";
const emails = raw
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
const now = new Date().toISOString();
const insertInvite = db.prepare(
  `INSERT OR IGNORE INTO auth_invite (email, created_at) VALUES (?, ?)`,
);
for (const email of emails) {
  insertInvite.run(email, now);
}

db.close();
console.log(`[migrate] OK — ${dbPath}`);
console.log(`[migrate] invites seeded: ${emails.join(", ") || "(none)"}`);
