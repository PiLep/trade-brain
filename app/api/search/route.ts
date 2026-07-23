import { NextRequest, NextResponse } from "next/server";
import { searchSymbols } from "@/lib/market";
import { requireSession } from "@/lib/requireAuth";

export const dynamic = "force-dynamic";

/** GET /api/search?q=apple → SearchResult[] */
export async function GET(req: NextRequest) {
  const gate = await requireSession();
  if (gate.error) return gate.error;
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 1) {
    return NextResponse.json({ results: [] });
  }
  try {
    const results = await searchSymbols(q);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Search failed",
        results: [],
      },
      { status: 502 },
    );
  }
}
