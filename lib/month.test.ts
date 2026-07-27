import { describe, expect, it } from "vitest";
import {
  dateMonthKey,
  daysIntoMonth,
  missingCurrentMonthCsv,
  monthKey,
  monthStart,
  monthToDateReturnPct,
} from "@/lib/month";
import type { Candle } from "@/lib/types";

describe("monthKey", () => {
  it("formats YYYY-MM with a padded month", () => {
    expect(monthKey(new Date(2026, 0, 15))).toBe("2026-01");
    expect(monthKey(new Date(2026, 11, 1))).toBe("2026-12");
  });
});

describe("monthStart", () => {
  it("returns noon on the first day of the month", () => {
    const start = monthStart(new Date(2026, 6, 27, 18, 30));
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(6);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(12);
  });
});

describe("dateMonthKey", () => {
  it("extracts YYYY-MM from an ISO date", () => {
    expect(dateMonthKey("2026-07-27")).toBe("2026-07");
  });

  it("returns null for short or empty values", () => {
    expect(dateMonthKey("")).toBeNull();
    expect(dateMonthKey("2026")).toBeNull();
  });
});

describe("monthToDateReturnPct", () => {
  it("returns null for an empty candle series", () => {
    expect(monthToDateReturnPct([])).toBeNull();
  });

  it("computes the month-to-date return from the prior close", () => {
    const now = new Date(2026, 6, 27);
    const candles: Candle[] = [
      { t: new Date(2026, 5, 30, 12).getTime(), close: 100 },
      { t: new Date(2026, 6, 2, 12).getTime(), close: 105 },
      { t: new Date(2026, 6, 15, 12).getTime(), close: 110 },
    ];
    // Prior close on/before month start (100) → latest close (110).
    expect(monthToDateReturnPct(candles, now)).toBeCloseTo(10);
  });
});

describe("missingCurrentMonthCsv", () => {
  it("stays quiet early in the month", () => {
    expect(
      missingCurrentMonthCsv(
        { importedAt: "2026-07-01", csvFirstDate: "2026-01-01", csvLastDate: "2026-06-30" },
        true,
        new Date(2026, 6, 10),
      ),
    ).toBe(false);
  });

  it("flags a stale CSV late in the month", () => {
    expect(
      missingCurrentMonthCsv(
        { importedAt: "2026-07-01", csvFirstDate: "2026-01-01", csvLastDate: "2026-06-30" },
        true,
        new Date(2026, 6, 26),
      ),
    ).toBe(true);
  });

  it("ignores portfolios without Trade Republic imports", () => {
    expect(
      missingCurrentMonthCsv(null, false, new Date(2026, 6, 26)),
    ).toBe(false);
  });
});

describe("daysIntoMonth", () => {
  it("returns the calendar day", () => {
    expect(daysIntoMonth(new Date(2026, 6, 27))).toBe(27);
  });
});
