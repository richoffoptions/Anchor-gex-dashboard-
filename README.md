# ANCHOR — Gamma & Charm Exposure Dashboard

NVDA / GOOGL / AMZN / SPY / QQQ options GEX + charm exposure, built off free
Yahoo Finance chain data (same source `yfinance` pulls from). Deploys free on
Vercel, works on your phone as a normal website.

## What it shows

- **Daily price chart** — candlesticks with 10/20/50/200 moving averages and
  a volume panel underneath, professional terminal-style layout
- **GEX by strike** — dealer gamma exposure profile, gamma flip point, call
  wall / put wall
- **Charm Anchor** — a compass gauge blending the gamma regime (pinned vs
  amplified) with charm exposure near spot, to give a directional read on
  which way dealer delta-hedging is likely to lean price as the session decays
- **Key levels** — flip, call wall, put wall, max pain, net GEX

Read the disclaimer panel in the app itself — this infers dealer positioning
from public OI/IV using the standard retail-GEX convention, it isn't observed
positioning. Treat it as context for entries/exits, not a standalone signal.

## Deploy — Option A: Vercel CLI (fastest, no GitHub needed)

1. Install Node.js 18+ on your machine if you don't have it.
2. Unzip this project, open a terminal in the folder, run:
   ```
   npm install
   npx vercel
   ```
3. It'll ask you to log in (opens browser, free account) and a few setup
   questions — accept the defaults.
4. Run `npx vercel --prod` to push it live. You'll get a URL like
   `anchor-xyz.vercel.app`.
5. Open that URL on your phone. Optional: in Safari/Chrome, "Add to Home
   Screen" so it opens like an app.

## Deploy — Option B: GitHub + Vercel dashboard

1. Push this folder to a new GitHub repo.
2. Go to vercel.com → New Project → import that repo.
3. Leave all build settings as default (Next.js is auto-detected) → Deploy.
4. Every future `git push` auto-redeploys.

Both are on Vercel's free Hobby tier — no cost for this usage level.

## Local dev

```
npm install
npm run dev
```

Opens at `http://localhost:3000`.

## Reliability

- Retries automatically on rate-limits: up to 6 attempts with increasing
  backoff (capped at 8s between tries) before giving up.
- Caches each response briefly in memory (45s for option chains, 5 min for
  expiration lists, 60s for price history) so repeat loads of the same
  symbol within that window don't re-hit Yahoo at all.
- No external accounts or signups required -- Yahoo-only by design.
- Realistic expectation: this makes rate-limit errors uncommon, not
  impossible. Yahoo's endpoint is free and unofficial; if it ever does fail,
  the app tells you plainly, and waiting ~60s and refreshing almost always
  clears it.


## Notes / limitations

- Yahoo data is free but delayed (~15 min) and occasionally rate-limits or
  drops an expiry's chain — retries and caching handle most of this now.
- Risk-free rate and dividend yields used in the greeks are static
  approximations, not fetched live — fine for this purpose, not for pricing.
- No auto-trading, no order execution — this is a read-only levels/context
  tool, same spirit as the futures levels setup.

## Extending later

- Add a Discord webhook cron (Vercel Cron + `/api/gex`) to auto-post levels,
  same pattern as before.
- Add 0DTE-specific charm weighting for SPY/QQQ (charm effects are strongest
  same-day into the close).
- Add a historical snapshot store (Vercel KV or a simple DB) to chart how the
  flip/walls moved intraday.
