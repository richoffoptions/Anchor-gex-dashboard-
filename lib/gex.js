import { gamma, charm } from "./blackscholes.js";

// Rough trailing dividend yields, used only to keep the greeks honest.
// Not fetched live -- close enough for a directional read, not a valuation model.
export const DIVIDEND_YIELD = {
  NVDA: 0.0002,
  GOOGL: 0.004,
  AMZN: 0.0,
  SPY: 0.012,
  QQQ: 0.006,
};

export const SYMBOLS = ["NVDA", "GOOGL", "AMZN", "SPY", "QQQ"];

const CONTRACT_MULTIPLIER = 100;

function yearsToExpiry(expirationDate) {
  const ms = new Date(expirationDate).getTime() - Date.now();
  return Math.max(ms, 0) / (1000 * 60 * 60 * 24 * 365);
}

// r: risk-free rate assumption (annualized). Static rather than fetched --
// GEX/charm are not sensitive enough to a few bps for this to matter.
const RISK_FREE_RATE = 0.045;

export function buildGexProfile({ symbol, spot, expirationDate, calls, puts }) {
  const q = DIVIDEND_YIELD[symbol] ?? 0;
  const T = yearsToExpiry(expirationDate);

  const byStrike = new Map();

  const accumulate = (contracts, isCall) => {
    for (const c of contracts) {
      if (!c.strike || !c.openInterest) continue;
      const iv = c.impliedVolatility && c.impliedVolatility > 0 ? c.impliedVolatility : 0.3;
      const g = gamma(spot, c.strike, T, iv, RISK_FREE_RATE, q);
      const ch = charm(spot, c.strike, T, iv, RISK_FREE_RATE, q, isCall);

      // Standard retail-GEX convention: dealers are modeled as long gamma via
      // calls and short gamma via puts in aggregate. This is an assumption,
      // not observed positioning -- treat sign/magnitude as a heuristic.
      const gexContribution =
        (isCall ? 1 : -1) * g * c.openInterest * CONTRACT_MULTIPLIER * spot * spot * 0.01;
      const charmContribution =
        (isCall ? 1 : -1) * ch * c.openInterest * CONTRACT_MULTIPLIER * spot * spot * 0.01;

      const row = byStrike.get(c.strike) || {
        strike: c.strike,
        gex: 0,
        charmExposure: 0,
        callOI: 0,
        putOI: 0,
      };
      row.gex += gexContribution;
      row.charmExposure += charmContribution;
      if (isCall) row.callOI += c.openInterest;
      else row.putOI += c.openInterest;
      byStrike.set(c.strike, row);
    }
  };

  accumulate(calls, true);
  accumulate(puts, false);

  const rows = Array.from(byStrike.values()).sort((a, b) => a.strike - b.strike);

  // Cumulative GEX walking up strikes, used to find the gamma flip (zero-cross)
  let cumulative = 0;
  let flipStrike = null;
  for (let i = 0; i < rows.length; i++) {
    const prevCumulative = cumulative;
    cumulative += rows[i].gex;
    rows[i].cumulativeGex = cumulative;
    if (flipStrike === null && prevCumulative < 0 && cumulative >= 0) {
      flipStrike = rows[i].strike;
    }
  }
  // fallback: closest-to-zero cumulative point if no clean sign cross
  if (flipStrike === null && rows.length) {
    let best = rows[0];
    for (const r of rows) {
      if (Math.abs(r.cumulativeGex) < Math.abs(best.cumulativeGex)) best = r;
    }
    flipStrike = best.strike;
  }

  const callWall = rows.reduce(
    (best, r) => (r.gex > (best?.gex ?? -Infinity) ? r : best),
    null
  );
  const putWall = rows.reduce(
    (best, r) => (r.gex < (best?.gex ?? Infinity) ? r : best),
    null
  );

  // Max pain: strike that minimizes total option intrinsic value across all OI
  let maxPain = null;
  let maxPainLoss = Infinity;
  for (const target of rows) {
    let totalLoss = 0;
    for (const r of rows) {
      totalLoss += Math.max(target.strike - r.strike, 0) * r.putOI; // put ITM loss to writers... approx
      totalLoss += Math.max(r.strike - target.strike, 0) * r.callOI;
    }
    if (totalLoss < maxPainLoss) {
      maxPainLoss = totalLoss;
      maxPain = target.strike;
    }
  }

  const netGex = rows.reduce((sum, r) => sum + r.gex, 0);
  const netCharm = rows.reduce((sum, r) => sum + r.charmExposure, 0);

  // Charm Anchor: blend of (a) which side of the gamma flip spot sits on,
  // since that sets the regime (pinned vs amplified), and (b) net charm
  // exposure near spot, which sets the direction dealer delta-hedging flow
  // should push price as the session decays toward expiry.
  const nearSpot = rows.filter((r) => Math.abs(r.strike - spot) / spot < 0.03);
  const localCharm = nearSpot.reduce((sum, r) => sum + r.charmExposure, 0);

  const regime = netGex >= 0 ? "pinned" : "amplified";
  // Sign convention: positive local charm => dealers must buy as time passes => upward drift pressure
  const direction = localCharm === 0 ? "neutral" : localCharm > 0 ? "up" : "down";
  const magnitude = Math.min(1, Math.abs(localCharm) / (Math.abs(netGex) + 1e-6));

  return {
    symbol,
    spot,
    expirationDate,
    rows,
    flipStrike,
    callWall: callWall?.strike ?? null,
    putWall: putWall?.strike ?? null,
    maxPain,
    netGex,
    netCharm,
    charmAnchor: {
      direction,
      magnitude,
      regime,
      localCharm,
    },
  };
}
