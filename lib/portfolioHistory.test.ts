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
        },
        {
          holding: { quantity: 1 },
          chart: { candles: candles([100, 100, 100]) },
          unmanaged: false,
        },
      ],
      90,
    );
    expect(points.at(-1)?.value).toBe(2 * 12 + 100);
  });

  it("skips unmanaged lines", () => {
    const points = portfolioValueSeries(
      [
        {
          holding: { quantity: 5 },
          chart: { candles: candles([10, 20]) },
          unmanaged: true,
        },
      ],
      90,
    );
    expect(points).toEqual([]);
  });
});
