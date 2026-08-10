import { NextResponse } from "next/server";
import { getExpirations } from "../../../lib/dataSources";
import { SYMBOLS } from "../../../lib/gex";

export const revalidate = 0;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "").toUpperCase();

  if (!SYMBOLS.includes(symbol)) {
    return NextResponse.json({ error: "Unsupported symbol" }, { status: 400 });
  }

  try {
    const { expirationDates, source, cached } = await getExpirations(symbol);
    return NextResponse.json({ symbol, expirationDates, source, cached });
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
