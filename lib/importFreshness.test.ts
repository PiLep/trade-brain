import { describe, expect, it } from "vitest";
import {
  importAgeDays,
  importFreshnessLabel,
  importFreshnessTone,
} from "@/lib/importFreshness";

describe("importAgeDays", () => {
  it("counts whole days since import", () => {
    const now = new Date("2026-07-28T12:00:00Z");
    expect(importAgeDays("2026-07-25T12:00:00Z", now)).toBe(3);
  });
});

describe("importFreshnessLabel", () => {
  it("labels today / yesterday / N days", () => {
    const now = new Date("2026-07-28T12:00:00Z");
    expect(importFreshnessLabel("2026-07-28T08:00:00Z", now)).toBe(
      "Importé aujourd’hui",
    );
    expect(importFreshnessLabel("2026-07-27T08:00:00Z", now)).toBe(
      "Importé hier",
    );
    expect(importFreshnessLabel("2026-07-15T08:00:00Z", now)).toBe(
      "Importé il y a 13 j",
    );
  });
});

describe("importFreshnessTone", () => {
  it("marks older imports as stale", () => {
    const now = new Date("2026-07-28T12:00:00Z");
    expect(importFreshnessTone("2026-07-26T08:00:00Z", now)).toBe("fresh");
    expect(importFreshnessTone("2026-07-10T08:00:00Z", now)).toBe("ok");
    expect(importFreshnessTone("2026-06-01T08:00:00Z", now)).toBe("stale");
  });
});
