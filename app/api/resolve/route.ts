import { NextRequest, NextResponse } from "next/server";
import { resolveSymbol } from "@/lib/market";
import { requireSession } from "@/lib/requireAuth";
import { guessYahooSymbol, isIsin } from "@/lib/tradeRepublicCsv";

export const dynamic = "force-dynamic";

/**
 * GET /api/resolve?q=IE00B4ND3602&assetClass=FUND
 * Map / Yahoo / EODHD (ISIN-aware).
 */
export async function GET(req: NextRequest) {
  const gate = await requireSession();
  if (gate.error) return gate.error;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const assetClass = url.searchParams.get("assetClass") ?? "";
  if (q.length < 2) {
    return NextResponse.json({ symbol: null, name: null });
  }

  const mapped = guessYahooSymbol(q, assetClass);
  if (!isIsin(mapped)) {
    return NextResponse.json({
      symbol: mapped,
      name: null,
      mapped: true,
      source: "map",
    });
  }

  try {
    const resolved = await resolveSymbol(q, assetClass);
    return NextResponse.json(resolved);
  } catch (err) {
    return NextResponse.json(
      {
        symbol: null,
        name: null,
        error: err instanceof Error ? err.message : "Resolve failed",
      },
      { status: 502 },
    );
  }
}
