"use client";

function Row({ label, value, color }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "9px 0",
        borderBottom: "1px solid var(--line-soft)",
      }}
    >
      <span style={{ fontSize: "0.78rem", color: "var(--ink-dim)" }}>{label}</span>
      <span className="mono" style={{ fontSize: "0.95rem", color: color || "var(--ink)" }}>
        {value}
      </span>
    </div>
  );
}

function fmtGex(v) {
  const abs = Math.abs(v);
  const sign = v > 0 ? "+" : v < 0 ? "" : "";
  if (abs >= 1e9) return `${sign}${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(v / 1e3).toFixed(0)}K`;
  return `${sign}${v.toFixed(0)}`;
}

export default function LevelsPanel({ profile }) {
  const { spot, flipStrike, callWall, putWall, maxPain, netGex } = profile;

  return (
    <div className="panel" style={{ padding: "20px 22px" }}>
      <span className="eyebrow">Key Levels</span>
      <div style={{ marginTop: 10 }}>
        <Row label="Spot" value={spot?.toFixed(2)} color="var(--gold-soft)" />
        <Row label="Gamma Flip" value={flipStrike ?? "—"} />
        <Row label="Call Wall (resistance)" value={callWall ?? "—"} color="var(--bull)" />
        <Row label="Put Wall (support)" value={putWall ?? "—"} color="var(--bear)" />
        <Row label="Max Pain" value={maxPain ?? "—"} />
        <Row
          label="Net GEX"
          value={fmtGex(netGex)}
          color={netGex >= 0 ? "var(--bull)" : "var(--bear)"}
        />
      </div>
    </div>
  );
}
