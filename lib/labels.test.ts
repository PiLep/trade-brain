import { describe, expect, it } from "vitest";
import {
  assetSubtitle,
  assetTitle,
  isIsinLike,
  tidyAssetName,
} from "@/lib/labels";

describe("isIsinLike", () => {
  it("accepts a valid ISIN shape", () => {
    expect(isIsinLike("IE00B5BMR087")).toBe(true);
  });

  it("rejects tickers and short codes", () => {
    expect(isIsinLike("AAPL")).toBe(false);
    expect(isIsinLike("CW8")).toBe(false);
  });
});

describe("tidyAssetName", () => {
  it("applies known aliases", () => {
    expect(tidyAssetName("Core S&P 500 USD (Acc)")).toBe("S&P 500 (Core)");
  });

  it("strips common issuer prefixes", () => {
    expect(
      tidyAssetName("Amundi Index Solutions - MSCI World UCITS ETF"),
    ).toBe("MSCI World UCITS ETF");
  });
});

describe("assetTitle", () => {
  it("prefers the human name over the ticker", () => {
    expect(assetTitle("Core S&P 500 USD (Acc)", "CSPX")).toBe("S&P 500 (Core)");
  });

  it("falls back to the symbol when the name is an ISIN", () => {
    expect(assetTitle("IE00B5BMR087", "CSPX")).toBe("CSPX");
  });
});

describe("assetSubtitle", () => {
  it("returns the ticker when it differs from the title", () => {
    expect(assetSubtitle("Core S&P 500 USD (Acc)", "CSPX")).toBe("CSPX");
  });

  it("hides ISINs and identical titles", () => {
    expect(assetSubtitle("Apple", "IE00B5BMR087")).toBeNull();
    expect(assetSubtitle("AAPL", "AAPL")).toBeNull();
  });
});
