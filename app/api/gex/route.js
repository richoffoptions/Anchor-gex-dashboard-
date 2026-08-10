import { NextResponse } from "next/server";
import { getChain } from "../../../lib/dataSources";
import { buildGexProfile, SYMBOLS } from "../../../lib/gex";

export const revalidate = 0;

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
    const chain = await getChain(symbol, expiryParam);

    const profile = buildGexProfile({
      symbol,
      spot: chain.spot,
      expirationDate: chain.expirationDate,
      calls: chain.calls,
      puts: chain.puts,
    });

    return NextResponse.json({
      ...profile,
      quoteTime: new Date().toISOString(),
      dataSource: "Yahoo Finance (free, delayed ~15min)",
      cached: chain.cached,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Yahoo is rate-limiting right now. Wait about a minute and refresh -- this usually clears on its own.",
        detail: err.message || "Fetch failed",
      },
      { status: 502 }
    );
  }
}
