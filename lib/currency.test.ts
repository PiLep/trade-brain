import { describe, expect, it } from "vitest";
import { markPriceEur, toEur, type FxRates } from "@/lib/tradeRepublicCsv";

const FX: FxRates = { eurusd: 1.1, eurgbp: 0.85, eurjpy: 160 };

describe("toEur", () => {
  it("passes EUR through untouched", () => {
    expect(toEur(100, "EUR", FX)).toBe(100);
  });

  it("defaults a missing currency to EUR rather than guessing", () => {
    expect(toEur(100, null, FX)).toBe(100);
    expect(toEur(100, undefined, FX)).toBe(100);
    expect(toEur(100, "", FX)).toBe(100);
  });

  it("divides USD by the EURUSD rate", () => {
    expect(toEur(110, "USD", FX)).toBeCloseTo(100, 6);
  });

  it("is case-insensitive on the currency code", () => {
    expect(toEur(110, "usd", FX)).toBeCloseTo(100, 6);
  });

  it("divides GBP by the EURGBP rate", () => {
    expect(toEur(85, "GBP", FX)).toBeCloseTo(100, 6);
  });

  // Regression: the pence test ran against an already-uppercased code, so it
  // could never match and London quotes came out 100x too high.
  it("treats GBp as pence, not pounds", () => {
    expect(toEur(8500, "GBp", FX)).toBeCloseTo(100, 6);
  });

  it("treats GBX as pence too", () => {
    expect(toEur(8500, "GBX", FX)).toBeCloseTo(100, 6);
  });

  it("keeps pence and pounds a factor of 100 apart", () => {
    const pounds = toEur(8500, "GBP", FX)!;
    const pence = toEur(8500, "GBp", FX)!;
    expect(pounds / pence).toBeCloseTo(100, 6);
  });

  it("returns null for currencies it cannot map, rather than a wrong number", () => {
    expect(toEur(100, "JPY", FX)).toBeNull();
    expect(toEur(100, "CHF", FX)).toBeNull();
  });

  it("returns null for non-positive prices", () => {
    expect(toEur(0, "USD", FX)).toBeNull();
    expect(toEur(-5, "USD", FX)).toBeNull();
    expect(toEur(null, "USD", FX)).toBeNull();
  });

  it("falls back to a sane rate when one is missing", () => {
    const noRate = { eurusd: 0, eurgbp: 0, eurjpy: 0 } as FxRates;
    expect(toEur(110, "USD", noRate)).toBeCloseTo(100, 6);
  });
});

describe("markPriceEur", () => {
  const position = { avgCost: 90, lastPriceEur: 100 };

  it("converts a live quote to EUR", () => {
    expect(markPriceEur(110, "USD", position, FX)).toBeCloseTo(100, 6);
  });

  it("falls back to the reference price when there is no live quote", () => {
    expect(markPriceEur(null, null, position, FX)).toBe(100);
  });

  it("falls back when the live quote is implausibly far from the reference", () => {
    // Yahoo sometimes quotes a different share unit than Trade Republic.
    expect(markPriceEur(10000, "EUR", position, FX)).toBe(100);
    expect(markPriceEur(1, "EUR", position, FX)).toBe(100);
  });

  it("accepts a quote inside the plausible band", () => {
    expect(markPriceEur(120, "EUR", position, FX)).toBe(120);
  });

  it("uses avgCost as the reference when lastPriceEur is absent", () => {
    expect(
      markPriceEur(null, null, { avgCost: 42, lastPriceEur: 0 }, FX),
    ).toBe(42);
  });
});
