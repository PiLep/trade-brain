import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { ensureAuthPluginSchema } from "@/lib/db";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function openTempDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tb-org-"));
  tempDirs.push(dir);
  const db = new Database(path.join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  return db;
}

describe("ensureAuthPluginSchema", () => {
  it("is a no-op before core user table exists", () => {
    const db = openTempDb();
    ensureAuthPluginSchema(db);
    const org = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='organization'`,
      )
      .get();
    expect(org).toBeUndefined();
  });

  it("adds org/passkey tables and session.activeOrganizationId", () => {
    const db = openTempDb();
    db.exec(`
      CREATE TABLE user (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        emailVerified INTEGER NOT NULL,
        image TEXT,
        createdAt DATE NOT NULL,
        updatedAt DATE NOT NULL
      );
      CREATE TABLE session (
        id TEXT PRIMARY KEY,
        expiresAt DATE NOT NULL,
        token TEXT NOT NULL UNIQUE,
        createdAt DATE NOT NULL,
        updatedAt DATE NOT NULL,
        ipAddress TEXT,
        userAgent TEXT,
        userId TEXT NOT NULL REFERENCES user(id)
      );
    `);

    ensureAuthPluginSchema(db);
    // Idempotent.
    ensureAuthPluginSchema(db);

    for (const name of ["organization", "member", "invitation", "passkey"]) {
      const row = db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        )
        .get(name) as { name: string } | undefined;
      expect(row?.name).toBe(name);
    }

    const cols = db.prepare(`PRAGMA table_info(session)`).all() as Array<{
      name: string;
    }>;
    expect(cols.map((c) => c.name)).toContain("activeOrganizationId");

    // Smoke: insert org + membership against the new schema.
    db.prepare(
      `INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt)
       VALUES ('u1', 'A', 'a@example.com', 1, '2026-01-01', '2026-01-01')`,
    ).run();
    db.prepare(
      `INSERT INTO organization (id, name, slug, createdAt)
       VALUES ('o1', 'Espace', 'espace', '2026-01-01')`,
    ).run();
    db.prepare(
      `INSERT INTO member (id, organizationId, userId, role, createdAt)
       VALUES ('m1', 'o1', 'u1', 'owner', '2026-01-01')`,
    ).run();
    const member = db
      .prepare(`SELECT role FROM member WHERE userId = ?`)
      .get("u1") as { role: string };
    expect(member.role).toBe("owner");
  });
});
