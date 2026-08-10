"use client";

const CX = 110;
const CY = 100;
const R = 82;

function needleAngleDeg(direction, magnitude) {
  // -90 = full down, 0 = neutral (straight up), +90 = full up
  const clamped = Math.max(0, Math.min(1, magnitude));
  if (direction === "down") return -clamped * 85;
  if (direction === "up") return clamped * 85;
  return 0;
}

function polar(cx, cy, r, angleDeg) {
  // angle measured from vertical (0 = straight up), positive = clockwise (right/up drift)
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

export default function CharmAnchor({ charmAnchor, symbol }) {
  const { direction, magnitude, regime } = charmAnchor;
  const angle = needleAngleDeg(direction, magnitude);
  const tip = polar(CX, CY, R - 14, angle);
  const isPinned = regime === "pinned";

  const directionLabel =
    direction === "up" ? "Upward drift" : direction === "down" ? "Downward drift" : "No clear drift";
  const directionColor =
    direction === "up" ? "var(--bull)" : direction === "down" ? "var(--bear)" : "var(--ink-dim)";

  return (
    <div className="panel" style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="eyebrow">Charm Anchor · {symbol}</span>
        <span
          className="mono"
          style={{
            fontSize: "0.68rem",
            padding: "3px 9px",
            borderRadius: 999,
            border: `1px solid ${isPinned ? "var(--gold)" : "var(--bear)"}`,
            color: isPinned ? "var(--gold-soft)" : "var(--bear)",
            letterSpacing: "0.06em",
          }}
        >
          {isPinned ? "PINNED REGIME" : "AMPLIFIED REGIME"}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg width="220" height="118" viewBox="0 0 220 118" style={{ flexShrink: 0 }}>
          {/* arc track */}
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none"
            stroke="var(--line-soft)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* down half (bearish) */}
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX} ${CY - R}`}
            fill="none"
            stroke="var(--bear)"
            strokeWidth="3"
            opacity="0.35"
          />
          {/* up half (bullish) */}
          <path
            d={`M ${CX} ${CY - R} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none"
            stroke="var(--bull)"
            strokeWidth="3"
            opacity="0.35"
          />
          {/* needle */}
          <line
            x1={CX}
            y1={CY}
            x2={tip.x}
            y2={tip.y}
            stroke={directionColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* anchor pivot — the "anchor" the needle swings from */}
          <circle cx={CX} cy={CY} r="7" fill="var(--navy-deep)" stroke="var(--gold)" strokeWidth="2" />
          <circle cx={CX} cy={CY} r="2.4" fill="var(--gold-soft)" />
          <text x={CX - R - 4} y={CY + 16} className="mono" fontSize="9" fill="var(--bear)" textAnchor="start">
            DOWN
          </text>
          <text x={CX + R + 4} y={CY + 16} className="mono" fontSize="9" fill="var(--bull)" textAnchor="end">
            UP
          </text>
        </svg>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: directionColor }}>
            {directionLabel}
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--ink-dim)", lineHeight: 1.5, maxWidth: 240 }}>
            {isPinned
              ? "Dealers net long gamma near spot — expect price to get pulled back toward the gamma flip / walls. Charm flow sets the lean within that range."
              : "Dealers net short gamma near spot — hedging can amplify moves rather than dampen them. Charm flow direction matters more here."}
          </div>
        </div>
      </div>
    </div>
  );
}
