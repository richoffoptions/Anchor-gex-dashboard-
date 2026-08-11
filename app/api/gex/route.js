import { NextResponse } from "next/server";
import { SYMBOLS } from "../../../lib/gex";

export const revalidate = 0;

const RAW_BASE =
  "https://raw.githubusercontent.com/richoffoptions/Anchor-gex-dashboard-/main/data";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "").toUpperCase();
  const expiryParam = searchParams.get("expiry");

  if (!SYMBOLS.includes(symbol)) {
    return NextResponse.json(
      { error: `Unsupported symbol. Choose one of ${SYMBOLS.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${RAW_BASE}/${symbol}.json`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`No data file yet for ${symbol} (status ${res.status})`);
    }
    const data = await res.json();

    const profile = expiryParam
      ? data.expirations.find((e) => e.expirationDate === expiryParam)
      : data.expirations[0];

    if (!profile) {
      throw new Error("No matching expiration in the latest data snapshot");
    }

    return NextResponse.json({
      ...profile,
      quoteTime: data.quoteTime,
      dataSource: data.dataSource,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Data hasn't synced yet -- the background refresh runs every 15 minutes. Try again shortly.",
        detail: err.message || "Fetch failed",
      },
      { status: 502 }
    );
  }
}
