import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "trade-brain.sqlite");

let db: Database.Database | null = null;

function columnExists(
  database: Database.Database,
  table: string,
  column: string,
): boolean {
  const cols = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  return cols.some((c) => c.name === column);
}

function hasLegacyHoldingDateUnique(database: Database.Database): boolean {
  const indexes = database
    .prepare(`PRAGMA index_list(signal_journal)`)
    .all() as Array<{ name: string; unique: number; origin: string }>;
  for (const idx of indexes) {
    if (!idx.unique) continue;
    const info = database
      .prepare(`PRAGMA index_info(${idx.name})`)
      .all() as Array<{ name: string }>;
    const cols = info.map((i) => i.name);
    if (
      cols.length === 2 &&
      cols.includes("holding_id") &&
      cols.includes("date") &&
      !cols.includes("organization_id")
    ) {
      return true;
    }
  }
  return false;
}

function rebuildJournalForTenants(database: Database.Database) {
  database.exec(`
    CREATE TABLE signal_journal_new (
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
    INSERT INTO signal_journal_new (
      id, organization_id, holding_id, symbol, name, date,
      recommendation, score, price, price5, return5_pct, price20, return20_pct
    )
    SELECT
      id,
      COALESCE(organization_id, ''),
      holding_id, symbol, name, date,
      recommendation, score, price, price5, return5_pct, price20, return20_pct
    FROM signal_journal;
    DROP TABLE signal_journal;
    ALTER TABLE signal_journal_new RENAME TO signal_journal;
  `);
}

function tableExists(database: Database.Database, table: string): boolean {
  const row = database
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(table) as { name: string } | undefined;
  return !!row;
}

/**
 * Keep at most one Better Auth email-OTP row per identifier.
 * Upstream email-otp only dedupes on unique-constraint failure, but the stock
 * verification schema does not declare identifier unique (better-auth#10437).
 */
export function ensureOtpVerificationSingleton(database: Database.Database) {
  if (!tableExists(database, "verification")) return;

  const index = database
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'index' AND name = 'verification_otp_identifier_uidx'`,
    )
    .get() as { name: string } | undefined;

  if (!index) {
    // Drop stale duplicates, keep newest row per OTP identifier.
    database.exec(`
      DELETE FROM verification
      WHERE (
        identifier LIKE 'sign-in-otp-%'
        OR identifier LIKE 'email-verification-otp-%'
        OR identifier LIKE 'forget-password-otp-%'
        OR identifier LIKE 'change-email-otp-%'
      )
      AND rowid NOT IN (
        SELECT MAX(rowid) FROM verification
        WHERE
          identifier LIKE 'sign-in-otp-%'
          OR identifier LIKE 'email-verification-otp-%'
          OR identifier LIKE 'forget-password-otp-%'
          OR identifier LIKE 'change-email-otp-%'
        GROUP BY identifier
      );
    `);

    database.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS verification_otp_identifier_uidx
        ON verification (identifier)
        WHERE identifier LIKE 'sign-in-otp-%'
           OR identifier LIKE 'email-verification-otp-%'
           OR identifier LIKE 'forget-password-otp-%'
           OR identifier LIKE 'change-email-otp-%';
    `);
  }
}

/**
 * Create Better Auth organization + passkey tables (and session.activeOrganizationId)
 * so Docker deploys do not require a manual `auth:migrate` against the volume.
 * Schema matches `better-auth` getMigrations output for sqlite.
 *
 * No-op until core Better Auth tables (`user`) exist — those still come from the
 * initial `auth:migrate` / first install.
 */
export function ensureAuthPluginSchema(database: Database.Database) {
  if (!tableExists(database, "user")) return;

  if (tableExists(database, "session")) {
    if (!columnExists(database, "session", "activeOrganizationId")) {
      database.exec(
        `ALTER TABLE session ADD COLUMN activeOrganizationId TEXT`,
      );
    }
  }

  database.exec(`
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

    CREATE INDEX IF NOT EXISTS member_organizationId_idx
      ON member (organizationId);
    CREATE INDEX IF NOT EXISTS member_userId_idx
      ON member (userId);
    CREATE INDEX IF NOT EXISTS invitation_organizationId_idx
      ON invitation (organizationId);
    CREATE INDEX IF NOT EXISTS invitation_email_idx
      ON invitation (email);
    CREATE INDEX IF NOT EXISTS passkey_userId_idx
      ON passkey (userId);
    CREATE INDEX IF NOT EXISTS passkey_credentialID_idx
      ON passkey (credentialID);
  `);
}

function migrate(database: Database.Database) {
  database.exec(`
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

  if (!columnExists(database, "signal_journal", "organization_id")) {
    // Old installs: add column, then rebuild to drop table-level UNIQUE(holding_id, date).
    database.exec(`
      ALTER TABLE signal_journal
        ADD COLUMN organization_id TEXT NOT NULL DEFAULT '';
    `);
    rebuildJournalForTenants(database);
  } else if (hasLegacyHoldingDateUnique(database)) {
    rebuildJournalForTenants(database);
  }

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_signal_journal_date
      ON signal_journal (date DESC);
    CREATE INDEX IF NOT EXISTS idx_signal_journal_org_date
      ON signal_journal (organization_id, date DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_signal_journal_org_holding_date
      ON signal_journal (organization_id, holding_id, date);
  `);

  ensureAuthPluginSchema(database);
  ensureOtpVerificationSingleton(database);
}

/** Singleton SQLite connection (Node runtime only). */
export function getDb(): Database.Database {
  if (db) {
    // Plugin tables / OTP index may appear after an image upgrade while the
    // process is still up — keep schema warm on every getDb() call.
    ensureAuthPluginSchema(db);
    ensureOtpVerificationSingleton(db);
    return db;
  }
  fs.mkdirSync(DB_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

export function dbPath(): string {
  return DB_PATH;
}
