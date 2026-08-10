export function sma(values, period) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function withMovingAverages(bars) {
  const closes = bars.map((b) => b.close);
  const ma10 = sma(closes, 10);
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);
  const ma200 = sma(closes, 200);
  return bars.map((b, i) => ({
    ...b,
    ma10: ma10[i],
    ma20: ma20[i],
    ma50: ma50[i],
    ma200: ma200[i],
  }));
}
