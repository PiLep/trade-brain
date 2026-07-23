/**
 * Invite an email (stores row in SQLite auth_invite).
 *
 * Usage:
 *   npm run invite
 *   npm run invite -- autre@email.com
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dbPath = path.join(root, "data", "trade-brain.sqlite");
const email = (process.argv[2] || "pierrelepetit91@gmail.com")
  .trim()
  .toLowerCase();

if (!email.includes("@")) {
  console.error("Email invalide");
  process.exit(1);
}

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS auth_invite (
    email TEXT PRIMARY KEY COLLATE NOCASE,
    created_at TEXT NOT NULL,
    accepted_at TEXT
  );
`);
db.prepare(
  `INSERT OR IGNORE INTO auth_invite (email, created_at) VALUES (?, ?)`,
).run(email, new Date().toISOString());

console.log(`Invité : ${email}`);
console.log(`DB     : ${dbPath}`);
console.log("Ajoute aussi l’email à AUTH_ALLOWED_EMAILS si tu redéploies.");
db.close();
