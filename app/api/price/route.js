import { NextResponse } from "next/server";
import { getHistory } from "../../../lib/dataSources";
import { withMovingAverages } from "../../../lib/technicals";
import { SYMBOLS } from "../../../lib/gex";

export const revalidate = 0;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "").toUpperCase();

  if (!SYMBOLS.includes(symbol)) {
    return NextResponse.json({ error: "Unsupported symbol" }, { status: 400 });
  }

  try {
    const { bars, source, cached } = await getHistory(symbol);
    const withMa = withMovingAverages(bars);
    return NextResponse.json({ symbol, bars: withMa, source, cached });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Fetch failed" },
      { status: 502 }
    );
  }
}
