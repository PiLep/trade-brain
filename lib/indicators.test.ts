import { describe, expect, it } from "vitest";
import {
  ema,
  highLow,
  macd,
  momentum,
  rsi,
  sma,
} from "@/lib/indicators";

describe("sma", () => {
  it("returns null when there is not enough data", () => {
    expect(sma([1, 2], 3)).toBeNull();
  });

  it("averages the last period values", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toBe(4);
  });
});

describe("ema", () => {
  it("returns null when there is not enough data", () => {
    expect(ema([1, 2, 3], 5)).toBeNull();
  });

  it("returns a finite latest value with enough data", () => {
    const values = Array.from({ length: 20 }, (_, i) => 100 + i);
    const value = ema(values, 10);
    expect(value).not.toBeNull();
    expect(value!).toBeGreaterThan(100);
  });
});

describe("rsi", () => {
  it("returns null when there is not enough data", () => {
    expect(rsi([1, 2, 3], 14)).toBeNull();
  });

  it("returns 100 on a strictly rising series", () => {
    const values = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(rsi(values, 14)).toBe(100);
  });
});

describe("macd", () => {
  it("returns nulls when there is not enough data", () => {
    expect(macd([1, 2, 3])).toEqual({ macd: null, signal: null });
  });

  it("returns values with enough history", () => {
    const values = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 5);
    const result = macd(values);
    expect(result.macd).not.toBeNull();
    expect(result.signal).not.toBeNull();
  });
});

describe("momentum", () => {
  it("returns the percentage change over the period", () => {
    expect(momentum([100, 110, 120], 2)).toBeCloseTo(20);
  });

  it("returns null when past close is zero", () => {
    expect(momentum([0, 1, 2], 2)).toBeNull();
  });
});

describe("highLow", () => {
  it("returns null for an empty series", () => {
    expect(highLow([])).toBeNull();
  });

  it("returns the highest and lowest closes", () => {
    expect(highLow([3, 1, 4, 2])).toEqual({ high: 4, low: 1 });
  });
});
