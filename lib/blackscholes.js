// Black-Scholes greeks needed to build GEX (gamma exposure) and charm exposure
// from an options chain that only gives us strike / OI / implied vol.
// Yahoo (and yfinance) don't hand us gamma/charm directly, so we derive them.

const SQRT_2PI = Math.sqrt(2 * Math.PI);

function phi(x) {
  // standard normal PDF
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

function erf(x) {
  // Abramowitz-Stegun approximation, good to ~1e-7
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1 = 0.254829592,
    a2 = -0.284496736,
    a3 = 1.421413741,
    a4 = -1.453152027,
    a5 = 1.061405429,
    p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function N(x) {
  // standard normal CDF
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function d1d2(S, K, T, sigma, r, q) {
  const safeT = Math.max(T, 1 / (365 * 24)); // floor at 1 hour to avoid /0 on expiry day
  const safeSigma = Math.max(sigma, 0.01); // floor vol so 0-IV quotes don't blow up
  const d1 =
    (Math.log(S / K) + (r - q + 0.5 * safeSigma * safeSigma) * safeT) /
    (safeSigma * Math.sqrt(safeT));
  const d2 = d1 - safeSigma * Math.sqrt(safeT);
  return { d1, d2, T: safeT, sigma: safeSigma };
}

// Gamma is identical for calls and puts
export function gamma(S, K, T, sigma, r, q) {
  const { d1, T: t, sigma: s } = d1d2(S, K, T, sigma, r, q);
  return (Math.exp(-q * t) * phi(d1)) / (S * s * Math.sqrt(t));
}

// Charm = dDelta/dTime (a.k.a. delta decay). Positive charm means delta is
// drifting up as time passes with no price move -- dealers hedging that off
// have to buy; negative charm means they have to sell. This is what drives
// the well-known "charm flow" grind into the close, especially on 0/1DTE names.
export function charm(S, K, T, sigma, r, q, isCall) {
  const { d1, d2, T: t, sigma: s } = d1d2(S, K, T, sigma, r, q);
  const term =
    (Math.exp(-q * t) * phi(d1) * (2 * (r - q) * t - d2 * s * Math.sqrt(t))) /
    (2 * t * s * Math.sqrt(t));
  if (isCall) {
    return q * Math.exp(-q * t) * N(d1) - term;
  }
  return -q * Math.exp(-q * t) * N(-d1) - term;
}
