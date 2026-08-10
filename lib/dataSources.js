import yahooFinance from "yahoo-finance2";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Simple in-memory cache. Lives as long as the serverless function instance
// stays warm -- not guaranteed across cold starts, but on Vercel's Hobby
// tier a instance often serves several requests in a row, so this cuts a
// meaningful chunk of duplicate Yahoo calls (e.g. multiple people loading
// the same symbol within the same minute).
const cache = new Map();
function cacheGet(key, ttlMs) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.time > ttlMs) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}
function cacheSet(key, value) {
  cache.set(key, { value, time: Date.now() });
}

const EXPIRATIONS_TTL = 5 * 60 * 1000; // 5 min -- expiry lists barely change
const CHAIN_TTL = 45 * 1000; // 45s -- balance freshness vs hammering Yahoo
const HISTORY_TTL = 60 * 1000; // 60s

// Free Yahoo endpoints rate-limit under load, especially from shared hosts
// like Vercel. Most failures are transient, so retry harder with longer
// backoff before giving up, and cache short-term so repeat loads of the
// same symbol don't re-trigger a fresh call at all.
const RETRIES = 6;
const BASE_DELAY_MS = 600;
const MAX_DELAY_MS = 8000;

async function withRetry(fn) {
  let lastErr;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < RETRIES - 1) {
        const delay = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
        await sleep(delay);
      }
    }
  }
  throw lastErr;
}

export async function getExpirations(symbol) {
  const cacheKey = `exp:${symbol}`;
  const cached = cacheGet(cacheKey, EXPIRATIONS_TTL);
  if (cached) return { expirationDates: cached, source: "yahoo", cached: true };

  const dates = await withRetry(async () => {
    const result = await yahooFinance.options(symbol);
    return (result.expirationDates || []).map((d) => new Date(d).toISOString());
  });
  cacheSet(cacheKey, dates);
  return { expirationDates: dates, source: "yahoo", cached: false };
}

export async function getChain(symbol, expiry) {
  const cacheKey = `chain:${symbol}:${expiry || "default"}`;
  const cached = cacheGet(cacheKey, CHAIN_TTL);
  if (cached) return { ...cached, cached: true };

  const result = await withRetry(async () => {
    const opts = expiry ? { date: new Date(expiry) } : {};
    const r = await yahooFinance.options(symbol, opts);
    const spot = r.quote?.regularMarketPrice;
    const chain = r.options?.[0];
    if (!spot || !chain) throw new Error("Empty chain from Yahoo");
    return {
      source: "yahoo",
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
    };
  });
  cacheSet(cacheKey, result);
  return { ...result, cached: false };
}

export async function getHistory(symbol) {
  const cacheKey = `hist:${symbol}`;
  const cached = cacheGet(cacheKey, HISTORY_TTL);
  if (cached) return { bars: cached, source: "yahoo", cached: true };

  const days = 320;
  const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const bars = await withRetry(async () => {
    const result = await yahooFinance.chart(symbol, { period1, interval: "1d" });
    const quotes = (result.quotes || []).filter((q) => q.close != null);
    return quotes.map((q) => ({
      date: q.date,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
    }));
  });
  cacheSet(cacheKey, bars);
  return { bars, source: "yahoo", cached: false };
}
