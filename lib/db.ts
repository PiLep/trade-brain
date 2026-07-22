import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "trade-brain.sqlite");

let db: Database.Database | null = null;

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS signal_journal (
      id TEXT PRIMARY KEY,
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
      return20_pct REAL,
      UNIQUE (holding_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_signal_journal_date
      ON signal_journal (date DESC);
  `);
}

/** Singleton SQLite connection (Node runtime only). */
export function getDb(): Database.Database {
  if (db) return db;
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
