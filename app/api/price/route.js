import { NextResponse } from "next/server";
import { SYMBOLS } from "../../../lib/gex";

export const revalidate = 0;

const RAW_BASE =
  "https://raw.githubusercontent.com/richoffoptions/Anchor-gex-dashboard-/main/data";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "").toUpperCase();

  if (!SYMBOLS.includes(symbol)) {
    return NextResponse.json({ error: "Unsupported symbol" }, { status: 400 });
  }

  try {
    const res = await fetch(`${RAW_BASE}/${symbol}.json`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`No data file yet for ${symbol} (status ${res.status})`);
    }
    const data = await res.json();
    return NextResponse.json({ symbol, bars: data.priceBars || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Fetch failed" }, { status: 502 });
  }
}
