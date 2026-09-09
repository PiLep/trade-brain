import { describe, expect, it } from "vitest";
import { portfolioValueSeries } from "@/lib/portfolioHistory";

function candles(prices: number[], start = Date.UTC(2026, 0, 1)) {
  return prices.map((close, i) => ({
    t: start + i * 86_400_000,
    open: close,
    high: close,
    low: close,
    close,
    volume: 0,
  }));
}

describe("portfolioValueSeries", () => {
  it("sums quantity × close across holdings", () => {
    const points = portfolioValueSeries(
      [
        {
          holding: { quantity: 2 },
          chart: { candles: candles([10, 11, 12]) },
          unmanaged: false,
          price: 1,
          priceEur: 1,
        },
        {
          holding: { quantity: 1 },
          chart: { candles: candles([100, 100, 100]) },
          unmanaged: false,
          price: 1,
          priceEur: 1,
        },
      ],
      90,
    );
    expect(points.at(-1)?.value).toBe(2 * 12 + 100);
  });

  it("converts each line to EUR before summing", () => {
    // A dollar line at 1.10 EURUSD alongside a euro line: summing the raw
    // closes would have produced 2*12 + 100 = 124 instead of 121.82.
    const points = portfolioValueSeries(
      [
        {
          holding: { quantity: 2 },
          chart: { candles: candles([10, 11, 12]) },
          unmanaged: false,
          price: 12,
          priceEur: 12 / 1.1,
        },
        {
          holding: { quantity: 1 },
          chart: { candles: candles([100, 100, 100]) },
          unmanaged: false,
          price: 100,
          priceEur: 100,
        },
      ],
      90,
    );
    expect(points.at(-1)!.value).toBeCloseTo((2 * 12) / 1.1 + 100, 6);
  });

  it("leaves a line alone when no conversion applies", () => {
    const points = portfolioValueSeries(
      [
        {
          holding: { quantity: 3 },
          chart: { candles: candles([50, 60]) },
          unmanaged: false,
          price: 60,
          priceEur: 60,
        },
      ],
      90,
    );
    expect(points.at(-1)!.value).toBeCloseTo(180, 6);
  });

  it("skips unmanaged lines", () => {
    const points = portfolioValueSeries(
      [
        {
          holding: { quantity: 5 },
          chart: { candles: candles([10, 20]) },
          unmanaged: true,
          price: 1,
          priceEur: 1,
        },
      ],
      90,
    );
    expect(points).toEqual([]);
  });
});
