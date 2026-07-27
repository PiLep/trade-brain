import { describe, expect, it } from "vitest";
import { missingOrgTablesMessage } from "@/lib/tenantBootstrap";

describe("missingOrgTablesMessage", () => {
  it("detects sqlite missing-table errors", () => {
    expect(
      missingOrgTablesMessage("SqliteError: no such table: organization"),
    ).toMatch(/Redémarre/);
  });

  it("returns null for unrelated errors", () => {
    expect(missingOrgTablesMessage("UNIQUE constraint failed")).toBeNull();
  });
});
