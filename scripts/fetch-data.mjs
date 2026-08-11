// Runs on GitHub Actions (not Vercel), where Yahoo isn't IP-blocked.
// Fetches options + price data for each symbol, computes GEX/charm/MAs,
// and writes one JSON file per symbol to /data. The deployed app reads
// these files from raw.githubusercontent.com instead of calling Yahoo
// directly from Vercel's serverless functions.

import yahooFinance from "yahoo-finance2";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { buildGexProfile, SYMBOLS, DIVIDEND_YIELD } from "../lib/gex.js";
import { withMovingAverages } from "../lib/technicals.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const MAX_EXPIRATIONS = 4; // nearest N expirations per symbol, to keep runtime/file size sane

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, retries = 5) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries - 1) await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastErr;
}

async function fetchSymbol(symbol) {
  console.log(`Fetching ${symbol}...`);

  // 1. expirations + first chain
  const first = await withRetry(() => yahooFinance.options(symbol));
  const spot = first.quote?.regularMarketPrice;
  const allExpirations = (first.expirationDates || []).slice(0, MAX_EXPIRATIONS);

  const expirationProfiles = [];
  for (const expDate of allExpirations) {
    const result = await withRetry(() =>
      yahooFinance.options(symbol, { date: new Date(expDate) })
    );
    const chain = result.options?.[0];
    if (!chain) continue;
    const profile = buildGexProfile({
      symbol,
      spot,
      expirationDate: chain.expirationDate,
      calls: (chain.calls || []).map((c) => ({
        strike: c.strike,
        openInterest: c.openInterest || 0,
        impliedVolatility: c.impliedVolatility || 0,
      })),
      puts: (chain.puts || []).map((c) => ({
        strike: c.strike,
        openInterest: c.openInterest || 0,
        impliedVolatility: c.impliedVolatility || 0,
      })),
    });
    expirationProfiles.push(profile);
    await sleep(400); // be polite between calls
  }

  // 2. price history
  const period1 = new Date(Date.now() - 320 * 24 * 60 * 60 * 1000);
  const chartResult = await withRetry(() =>
    yahooFinance.chart(symbol, { period1, interval: "1d" })
  );
  const bars = (chartResult.quotes || [])
    .filter((q) => q.close != null)
    .map((q) => ({
      date: q.date,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
    }));
  const priceBars = withMovingAverages(bars);

  return {
    symbol,
    spot,
    quoteTime: new Date().toISOString(),
    dataSource: "Yahoo Finance (fetched via GitHub Actions, ~15min refresh)",
    expirations: expirationProfiles,
    priceBars,
  };
}

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const results = {};
  for (const symbol of SYMBOLS) {
    try {
      const data = await fetchSymbol(symbol);
      await fs.writeFile(
        path.join(DATA_DIR, `${symbol}.json`),
        JSON.stringify(data),
        "utf-8"
      );
      results[symbol] = "ok";
      console.log(`${symbol}: wrote ${data.expirations.length} expirations, ${data.priceBars.length} bars`);
    } catch (err) {
      results[symbol] = `error: ${err.message}`;
      console.error(`${symbol} failed:`, err.message);
    }
    await sleep(600);
  }
  await fs.writeFile(
    path.join(DATA_DIR, "status.json"),
    JSON.stringify({ lastRun: new Date().toISOString(), results }, null, 2),
    "utf-8"
  );
  console.log("Done:", results);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
