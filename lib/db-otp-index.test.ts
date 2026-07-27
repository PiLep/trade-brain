import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { ensureOtpVerificationSingleton } from "@/lib/db";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("ensureOtpVerificationSingleton", () => {
  it("dedupes OTP rows and creates a partial unique index", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tb-otp-"));
    tempDirs.push(dir);
    const db = new Database(path.join(dir, "test.sqlite"));
    db.exec(`
      CREATE TABLE verification (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        createdAt TEXT
      );
    `);
    db.prepare(
      `INSERT INTO verification (id, identifier, value, expiresAt, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
    ).run("1", "sign-in-otp-a@example.com", "111111:0", "2099-01-01", "2020-01-01");
    db.prepare(
      `INSERT INTO verification (id, identifier, value, expiresAt, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
    ).run("2", "sign-in-otp-a@example.com", "222222:0", "2099-01-01", "2020-01-02");
    db.prepare(
      `INSERT INTO verification (id, identifier, value, expiresAt, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
    ).run("3", "magic-link-token", "abc", "2099-01-01", "2020-01-01");

    ensureOtpVerificationSingleton(db);

    const otpRows = db
      .prepare(
        `SELECT id, value FROM verification WHERE identifier = ? ORDER BY id`,
      )
      .all("sign-in-otp-a@example.com") as Array<{ id: string; value: string }>;
    expect(otpRows).toEqual([{ id: "2", value: "222222:0" }]);

    const magic = db
      .prepare(`SELECT id FROM verification WHERE identifier = ?`)
      .get("magic-link-token") as { id: string };
    expect(magic.id).toBe("3");

    expect(() => {
      db.prepare(
        `INSERT INTO verification (id, identifier, value, expiresAt, createdAt)
         VALUES (?, ?, ?, ?, ?)`,
      ).run("4", "sign-in-otp-a@example.com", "333333:0", "2099-01-01", "2020-01-03");
    }).toThrow(/UNIQUE/i);

    db.close();
  });

  it("is a no-op when verification table is missing", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tb-otp-"));
    tempDirs.push(dir);
    const db = new Database(path.join(dir, "test.sqlite"));
    expect(() => ensureOtpVerificationSingleton(db)).not.toThrow();
    db.close();
  });
});
