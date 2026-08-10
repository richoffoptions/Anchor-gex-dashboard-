"use client";

import { useEffect, useState, useCallback } from "react";
import CharmAnchor from "../components/CharmAnchor";
import GexChart from "../components/GexChart";
import LevelsPanel from "../components/LevelsPanel";
import PriceChart from "../components/PriceChart";

const SYMBOLS = ["NVDA", "GOOGL", "AMZN", "SPY", "QQQ"];

function fmtExpiry(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}

export default function Home() {
  const [symbol, setSymbol] = useState("SPY");
  const [expirations, setExpirations] = useState([]);
  const [expiry, setExpiry] = useState(null);
  const [profile, setProfile] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadExpirations = useCallback(async (sym) => {
    try {
      const res = await fetch(`/api/expirations?symbol=${sym}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setExpirations(data.expirationDates || []);
      setExpiry(data.expirationDates?.[0] || null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const loadProfile = useCallback(async (sym, exp) => {
    setLoading(true);
    setError(null);
    try {
      const url = exp
        ? `/api/gex?symbol=${sym}&expiry=${encodeURIComponent(exp)}`
        : `/api/gex?symbol=${sym}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProfile(data);
    } catch (e) {
      setError(e.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPrice = useCallback(async (sym) => {
    setPriceLoading(true);
    try {
      const res = await fetch(`/api/price?symbol=${sym}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPriceData(data);
    } catch (e) {
      setPriceData(null);
    } finally {
      setPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpirations(symbol);
    loadPrice(symbol);
  }, [symbol, loadExpirations, loadPrice]);

  useEffect(() => {
    if (expiry) loadProfile(symbol, expiry);
  }, [symbol, expiry, loadProfile]);

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "22px 16px 60px" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-accent)",
              fontWeight: 800,
              letterSpacing: "0.06em",
              fontSize: "1.35rem",
              color: "var(--gold-soft)",
            }}
          >
            ANCHOR
          </div>
          <div className="eyebrow" style={{ marginTop: 2 }}>
            Gamma &amp; Charm Exposure Terminal
          </div>
        </div>
        {profile && (
          <div
            className="mono"
            style={{
              fontSize: "0.72rem",
              color: "var(--ink-dim)",
              textAlign: "right",
            }}
          >
            {profile.dataSource}
            <br />
            updated {new Date(profile.quoteTime).toLocaleTimeString()}
          </div>
        )}
      </header>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {SYMBOLS.map((s) => (
          <button
            key={s}
            onClick={() => setSymbol(s)}
            className="mono"
            style={{
              padding: "9px 20px",
              borderRadius: 10,
              border: `1px solid ${s === symbol ? "var(--gold)" : "var(--line)"}`,
              background: s === symbol ? "rgba(201,162,39,0.14)" : "transparent",
              color: s === symbol ? "var(--gold-soft)" : "var(--ink-dim)",
              fontWeight: 600,
              fontSize: "0.88rem",
              transition: "all 0.15s ease",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 26 }}>
        {expirations.slice(0, 8).map((e) => (
          <button
            key={e}
            onClick={() => setExpiry(e)}
            className="mono"
            style={{
              padding: "5px 11px",
              borderRadius: 999,
              border: `1px solid ${e === expiry ? "var(--gold-soft)" : "var(--line-soft)"}`,
              background: e === expiry ? "rgba(201,162,39,0.08)" : "transparent",
              color: e === expiry ? "var(--gold-soft)" : "var(--ink-dim)",
              fontSize: "0.72rem",
            }}
          >
            {fmtExpiry(e)}
          </button>
        ))}
      </div>

      {!priceLoading && priceData?.bars?.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <PriceChart bars={priceData.bars} symbol={symbol} />
        </div>
      )}

      {loading && (
        <div className="panel" style={{ padding: 24, color: "var(--ink-dim)", marginBottom: 20 }}>
          Pulling chain for {symbol}…
        </div>
      )}

      {error && (
        <div
          className="panel"
          style={{ padding: 20, marginBottom: 20, borderColor: "var(--bear)", color: "var(--bear)" }}
        >
          Couldn&apos;t load data: {error}. Yahoo occasionally rate-limits or has no chain listed for
          this expiry — try another date or refresh.
        </div>
      )}

      {profile && !loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.3fr 1fr",
            gap: 18,
          }}
          className="dashboard-grid"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <GexChart
              rows={profile.rows}
              spot={profile.spot}
              flipStrike={profile.flipStrike}
              callWall={profile.callWall}
              putWall={profile.putWall}
            />
            <CharmAnchor charmAnchor={profile.charmAnchor} symbol={profile.symbol} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <LevelsPanel profile={profile} />
            <div
              className="panel"
              style={{ padding: "18px 20px", fontSize: "0.76rem", color: "var(--ink-dim)", lineHeight: 1.6 }}
            >
              <span className="eyebrow">Read this before trading it</span>
              <p style={{ marginTop: 8 }}>
                GEX and charm here are inferred from free, delayed Yahoo options data using the
                standard retail convention (dealers long gamma via calls, short via puts). Real
                dealer positioning isn&apos;t public — treat this as directional context, not a
                signal on its own, especially sizing small-capital options trades on NVDA / GOOGL /
                AMZN / SPY / QQQ where a wrong strike pick decays fast.
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 800px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
