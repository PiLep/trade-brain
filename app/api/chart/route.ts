import { NextRequest, NextResponse } from "next/server";
import { fetchCharts } from "@/lib/market";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/chart?symbols=AAPL,BTC-USD&range=1y
 * Yahoo first, EODHD fallback. Server memory cache ~5 min / symbol.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get("symbols") ?? searchParams.get("symbol");
  const range = searchParams.get("range") ?? "1y";

  if (!symbolsParam) {
    return NextResponse.json(
      { error: "Missing ?symbols= parameter" },
      { status: 400 },
    );
  }

  const symbols = Array.from(
    new Set(
      symbolsParam
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  ).slice(0, 50);

  try {
    const { data, errors } = await fetchCharts(symbols, range);
    return NextResponse.json(
      { data, errors, cachedAt: Date.now() },
      {
        headers: {
          // Browser / CDN: short fresh window, longer SWR.
          "Cache-Control": "private, max-age=60, stale-while-revalidate=600",
        },
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch data" },
      { status: 502 },
    );
  }
}
