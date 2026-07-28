import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatQuantity,
  formatShares,
  formatSignedCurrency,
} from "@/lib/format";

describe("formatCurrency", () => {
  it("formats a EUR amount in fr-FR", () => {
    const out = formatCurrency(30378.27, "EUR");
    expect(out.replace(/\u202f|\u00a0/g, " ")).toBe("30 378,27 €");
  });

  it("falls back to EUR for invalid currency codes", () => {
    const out = formatCurrency(10, "EURO");
    expect(out.replace(/\u202f|\u00a0/g, " ")).toBe("10,00 €");
  });
});

describe("formatNumber", () => {
  it("trims trailing zeros with French decimal comma", () => {
    expect(formatNumber(12.5)).toBe("12,5");
  });
});

describe("formatQuantity", () => {
  it("uses more precision for small quantities", () => {
    expect(formatQuantity(0.00012345)).toBe("0,00012345");
  });

  it("uses two decimals for large quantities", () => {
    expect(formatQuantity(250.1234)).toBe("250,12");
  });
});

describe("formatShares", () => {
  it("rounds to whole shares with approximate prefix", () => {
    expect(formatShares(111.18)).toBe("≈ 111 parts");
  });

  it("uses singular for one share", () => {
    expect(formatShares(0.6)).toBe("≈ 1 part");
  });
});

describe("formatPercent", () => {
  it("adds a plus sign for positive values by default", () => {
    expect(formatPercent(1.5)).toBe("+1,50 %");
  });

  it("keeps the minus sign for negative values", () => {
    expect(formatPercent(-2.25)).toBe("-2,25 %");
  });
});

describe("formatSignedCurrency", () => {
  it("prefixes positive amounts with +", () => {
    const out = formatSignedCurrency(12, "EUR");
    expect(out.replace(/\u202f|\u00a0/g, " ")).toBe("+12,00 €");
  });

  it("prefixes negative amounts with −", () => {
    const out = formatSignedCurrency(-12, "EUR");
    expect(out.replace(/\u202f|\u00a0/g, " ")).toBe("−12,00 €");
  });
});

describe("formatDate", () => {
  it("formats an ISO date in French", () => {
    expect(formatDate("2026-07-15")).toMatch(/15/);
    expect(formatDate("2026-07-15")).toMatch(/2026/);
  });
});

describe("formatDateTime", () => {
  it("includes day and time", () => {
    const out = formatDateTime(new Date(2026, 6, 15, 14, 30));
    expect(out).toMatch(/15/);
    expect(out).toMatch(/14/);
  });
});
