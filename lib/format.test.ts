import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatQuantity,
  formatSignedCurrency,
} from "@/lib/format";

describe("formatCurrency", () => {
  it("formats a USD amount", () => {
    expect(formatCurrency(1234.5, "USD")).toBe("$1,234.50");
  });

  it("falls back to USD for invalid currency codes", () => {
    expect(formatCurrency(10, "EURO")).toBe("$10.00");
  });
});

describe("formatNumber", () => {
  it("trims trailing zeros", () => {
    expect(formatNumber(12.5)).toBe("12.5");
  });
});

describe("formatQuantity", () => {
  it("uses more precision for small quantities", () => {
    expect(formatQuantity(0.00012345)).toBe("0.00012345");
  });

  it("uses two decimals for large quantities", () => {
    expect(formatQuantity(250.1234)).toBe("250.12");
  });
});

describe("formatPercent", () => {
  it("adds a plus sign for positive values by default", () => {
    expect(formatPercent(1.5)).toBe("+1.50%");
  });

  it("keeps the minus sign for negative values", () => {
    expect(formatPercent(-2.25)).toBe("-2.25%");
  });
});

describe("formatSignedCurrency", () => {
  it("prefixes positive amounts with +", () => {
    expect(formatSignedCurrency(12, "USD")).toBe("+$12.00");
  });

  it("prefixes negative amounts with -", () => {
    expect(formatSignedCurrency(-12, "USD")).toBe("-$12.00");
  });
});
