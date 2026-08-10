"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const MA_COLORS = {
  ma10: "#7fd4e8",
  ma20: "var(--gold-soft)",
  ma50: "#b48ee8",
  ma200: "var(--ink)",
};

function CandleShape(props) {
  const { x, y, width, height, payload } = props;
  if (payload.open == null || payload.close == null || height === 0) return null;

  const { open, close, high, low } = payload;
  const range = Math.max(high - low, 1e-6);
  const pxPerUnit = height / range;

  const bodyTopVal = Math.max(open, close);
  const bodyBotVal = Math.min(open, close);
  const bodyTop = y + (high - bodyTopVal) * pxPerUnit;
  const bodyBottom = y + (high - bodyBotVal) * pxPerUnit;
  const bodyHeight = Math.max(bodyBottom - bodyTop, 1);

  const isUp = close >= open;
  const color = isUp ? "var(--bull)" : "var(--bear)";
  const cx = x + width / 2;
  const bodyWidth = Math.max(width * 0.62, 2);

  return (
    <g>
      <line x1={cx} y1={y} x2={cx} y2={y + height} stroke={color} strokeWidth={1} />
      <rect
        x={cx - bodyWidth / 2}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        fill={isUp ? color : color}
        fillOpacity={isUp ? 0.85 : 1}
        stroke={color}
      />
    </g>
  );
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function PriceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="mono panel" style={{ padding: "8px 12px", fontSize: "0.72rem", border: "1px solid var(--gold)" }}>
      <div style={{ color: "var(--gold-soft)", marginBottom: 4 }}>{fmtDate(d.date)}</div>
      <div>O {d.open?.toFixed(2)} · H {d.high?.toFixed(2)}</div>
      <div>L {d.low?.toFixed(2)} · C {d.close?.toFixed(2)}</div>
      {d.ma10 && <div style={{ color: MA_COLORS.ma10 }}>MA10 {d.ma10.toFixed(2)}</div>}
      {d.ma20 && <div style={{ color: MA_COLORS.ma20 }}>MA20 {d.ma20.toFixed(2)}</div>}
      {d.ma50 && <div style={{ color: MA_COLORS.ma50 }}>MA50 {d.ma50.toFixed(2)}</div>}
      {d.ma200 && <div style={{ color: MA_COLORS.ma200 }}>MA200 {d.ma200.toFixed(2)}</div>}
    </div>
  );
}

export default function PriceChart({ bars, symbol }) {
  if (!bars?.length) return null;

  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  const change = prev ? last.close - prev.close : 0;
  const changePct = prev ? (change / prev.close) * 100 : 0;
  const up = change >= 0;

  return (
    <div className="panel" style={{ padding: "20px 20px 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <div>
          <span className="eyebrow">{symbol} · Daily</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <span className="mono" style={{ fontSize: "1.3rem", color: "var(--ink)" }}>
            {last.close?.toFixed(2)}
          </span>
          <span
            className="mono"
            style={{ marginLeft: 8, fontSize: "0.78rem", color: up ? "var(--bull)" : "var(--bear)" }}
          >
            {up ? "+" : ""}
            {change.toFixed(2)} ({up ? "+" : ""}
            {changePct.toFixed(2)}%)
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
        {Object.entries(MA_COLORS).map(([key, color]) => (
          <div key={key} className="mono" style={{ fontSize: "0.66rem", color, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 2, background: color, display: "inline-block" }} />
            {key.toUpperCase()}
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={bars} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line-soft)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fill: "var(--ink-dim)", fontSize: 10 }}
            axisLine={{ stroke: "var(--line-soft)" }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fill: "var(--ink-dim)", fontSize: 10 }}
            axisLine={{ stroke: "var(--line-soft)" }}
            tickLine={false}
            width={54}
          />
          <Tooltip content={<PriceTooltip />} />
          <Bar dataKey={(d) => [d.low, d.high]} shape={<CandleShape />} isAnimationActive={false} />
          <Line type="monotone" dataKey="ma10" stroke={MA_COLORS.ma10} dot={false} strokeWidth={1.4} isAnimationActive={false} />
          <Line type="monotone" dataKey="ma20" stroke={MA_COLORS.ma20} dot={false} strokeWidth={1.4} isAnimationActive={false} />
          <Line type="monotone" dataKey="ma50" stroke={MA_COLORS.ma50} dot={false} strokeWidth={1.4} isAnimationActive={false} />
          <Line type="monotone" dataKey="ma200" stroke={MA_COLORS.ma200} dot={false} strokeWidth={1.6} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={70}>
        <ComposedChart data={bars} margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={[0, "auto"]} />
          <Bar dataKey="volume" isAnimationActive={false}>
            {bars.map((d, i) => (
              <Cell key={i} fill={d.close >= d.open ? "var(--bull)" : "var(--bear)"} fillOpacity={0.5} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
