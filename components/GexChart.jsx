"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  CartesianGrid,
} from "recharts";

function fmtGex(v) {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toFixed(0);
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="mono panel"
      style={{ padding: "8px 12px", fontSize: "0.75rem", border: "1px solid var(--gold)" }}
    >
      <div style={{ color: "var(--gold-soft)" }}>Strike {d.strike}</div>
      <div>GEX: {fmtGex(d.gex)}</div>
      <div>Call OI: {d.callOI} · Put OI: {d.putOI}</div>
    </div>
  );
}

export default function GexChart({ rows, spot, flipStrike, callWall, putWall }) {
  // Trim to a reasonable window around spot so the chart isn't dominated by far OTM noise
  const sorted = [...rows].sort((a, b) => a.strike - b.strike);
  const nearIdx = sorted.reduce(
    (best, r, i) => (Math.abs(r.strike - spot) < Math.abs(sorted[best].strike - spot) ? i : best),
    0
  );
  const windowed = sorted.slice(Math.max(0, nearIdx - 18), nearIdx + 18);

  return (
    <div className="panel" style={{ padding: "20px 20px 8px", height: 340 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span className="eyebrow">Gamma Exposure by Strike</span>
        <span className="mono" style={{ fontSize: "0.7rem", color: "var(--ink-dim)" }}>
          window ±{windowed.length ? Math.round(windowed.length / 2) : 0} strikes
        </span>
      </div>
      <ResponsiveContainer width="100%" height="88%">
        <ComposedChart data={windowed} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line-soft)" vertical={false} />
          <XAxis
            dataKey="strike"
            tick={{ fill: "var(--ink-dim)", fontSize: 10 }}
            axisLine={{ stroke: "var(--line-soft)" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtGex}
            tick={{ fill: "var(--ink-dim)", fontSize: 10 }}
            axisLine={{ stroke: "var(--line-soft)" }}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(201,162,39,0.06)" }} />
          <ReferenceLine y={0} stroke="var(--line)" />
          <ReferenceLine
            x={spot}
            stroke="var(--gold)"
            strokeWidth={2}
            label={{ value: "SPOT", position: "top", fill: "var(--gold-soft)", fontSize: 10 }}
          />
          {flipStrike != null && (
            <ReferenceLine
              x={flipStrike}
              stroke="var(--ink)"
              strokeDasharray="4 3"
              label={{ value: "FLIP", position: "insideTopLeft", fill: "var(--ink-dim)", fontSize: 10 }}
            />
          )}
          {callWall != null && (
            <ReferenceLine x={callWall} stroke="var(--bull)" strokeDasharray="2 2" />
          )}
          {putWall != null && (
            <ReferenceLine x={putWall} stroke="var(--bear)" strokeDasharray="2 2" />
          )}
          <Bar dataKey="gex" radius={[2, 2, 0, 0]}>
            {windowed.map((row, i) => (
              <Cell key={i} fill={row.gex >= 0 ? "var(--bull)" : "var(--bear)"} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
