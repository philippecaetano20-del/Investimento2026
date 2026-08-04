import React, { useState, useEffect, useRef } from "react";
import { Search, TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PALETTE } from "../constants.js";
import { formatBRL } from "../utils.js";
import { api } from "../api.js";

const RANGES = [
  { key: "1mo", label: "1M" },
  { key: "3mo", label: "3M" },
  { key: "6mo", label: "6M" },
  { key: "1y", label: "1A" },
];

export function MercadoTab({ ativosList }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ticker, setTicker] = useState(null);
  const [range, setRange] = useState("3mo");
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);

  const [watchlist, setWatchlist] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  useEffect(() => {
    if (ativosList.length === 0) {
      setWatchlist([]);
      return;
    }
    let cancelled = false;
    setWatchlistLoading(true);
    api
      .getWatchlist(ativosList)
      .then((data) => {
        if (!cancelled) setWatchlist(data.quotes || []);
      })
      .catch(() => {
        if (!cancelled) setWatchlist([]);
      })
      .finally(() => {
        if (!cancelled) setWatchlistLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ativosList]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await api.searchMarket(query.trim());
        setSuggestions(result.stocks || []);
      } catch {
        setSuggestions([]);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  async function buscarTicker(t, rangeOverride) {
    const clean = String(t || "").trim().toUpperCase();
    if (!clean) return;
    setShowSuggestions(false);
    setQuery(clean);
    setTicker(clean);
    setLoading(true);
    setError("");
    try {
      const data = await api.getQuote(clean, rangeOverride || range);
      setQuote(data);
    } catch (e) {
      setQuote(null);
      setError(e.message || "Não foi possível buscar esse ativo.");
    } finally {
      setLoading(false);
    }
  }

  function trocarRange(r) {
    setRange(r);
    if (ticker) buscarTicker(ticker, r);
  }

  const historico = (quote?.historicalDataPrice || []).map((p) => ({
    label: new Date(p.date * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    fechamento: p.close,
  }));

  const positivo = (quote?.regularMarketChangePercent || 0) >= 0;

  return (
    <div>
      <div className="display" style={{ fontSize: 18, fontWeight: 500, marginBottom: 12 }}>
        Mercado
      </div>

      <div style={{ position: "relative", marginBottom: 20, maxWidth: 420 }}>
        <div style={{ position: "relative" }}>
          <Search
            size={15}
            color={PALETTE.textMuted}
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") buscarTicker(query);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Buscar ação ou FII (ex: PETR4, MXRF11)"
            style={{
              width: "100%",
              background: PALETTE.surface,
              border: `1px solid ${PALETTE.line}`,
              borderRadius: 8,
              padding: "10px 12px 10px 36px",
              color: PALETTE.textPrimary,
              fontSize: 13,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          />
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 20,
              background: PALETTE.bg,
              border: `1px solid ${PALETTE.line}`,
              borderRadius: 8,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {suggestions.map((s) => (
              <div
                key={s}
                onMouseDown={() => buscarTicker(s)}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: PALETTE.textPrimary,
                  cursor: "pointer",
                  borderBottom: `1px solid ${PALETTE.surfaceAlt}`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = PALETTE.surfaceAlt)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      {watchlistLoading ? (
        <div style={{ color: PALETTE.textMuted, padding: 24, textAlign: "center", fontSize: 13 }}>
          Carregando cotações dos seus ativos...
        </div>
      ) : watchlist.length > 0 ? (
        <div
          className="card-surface"
          style={{ background: PALETTE.surface, border: `1px solid ${PALETTE.line}`, borderRadius: 10, marginBottom: 24, overflow: "hidden" }}
        >
          {watchlist.map((q, i) => (
            <WatchlistRow
              key={q.symbol}
              quote={q}
              selected={ticker === q.symbol}
              onClick={() => buscarTicker(q.symbol)}
              isLast={i === watchlist.length - 1}
            />
          ))}
        </div>
      ) : null}

      {error && <div style={{ color: PALETTE.crimson, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {loading && (
        <div style={{ color: PALETTE.textMuted, padding: 40, textAlign: "center" }}>Buscando cotação...</div>
      )}

      {!loading && quote && (
        <div
          className="card-surface"
          style={{ background: PALETTE.surface, border: `1px solid ${PALETTE.line}`, borderRadius: 10, padding: 20 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
            <div>
              <div className="mono" style={{ fontSize: 11, color: PALETTE.gold, letterSpacing: "0.1em", marginBottom: 4 }}>
                {quote.symbol}
              </div>
              <div className="display" style={{ fontSize: 18, fontWeight: 500 }}>
                {quote.longName || quote.shortName}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="mono" style={{ fontSize: 28, fontWeight: 600, color: PALETTE.textPrimary }}>
                {formatBRL(quote.regularMarketPrice)}
              </div>
              <div
                className="mono"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 4,
                  fontSize: 13,
                  color: positivo ? PALETTE.emerald : PALETTE.crimson,
                }}
              >
                {positivo ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {positivo ? "+" : ""}
                {(quote.regularMarketChangePercent || 0).toFixed(2)}% ({formatBRL(quote.regularMarketChange)})
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 20 }}>
            <MiniStat label="Abertura" value={formatBRL(quote.regularMarketOpen)} />
            <MiniStat label="Máxima do dia" value={formatBRL(quote.regularMarketDayHigh)} />
            <MiniStat label="Mínima do dia" value={formatBRL(quote.regularMarketDayLow)} />
            <MiniStat label="Máx. 52 semanas" value={formatBRL(quote.fiftyTwoWeekHigh)} />
            <MiniStat label="Mín. 52 semanas" value={formatBRL(quote.fiftyTwoWeekLow)} />
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => trocarRange(r.key)}
                style={{
                  background: range === r.key ? PALETTE.gold : "transparent",
                  color: range === r.key ? "#1A1406" : PALETTE.textMuted,
                  border: `1px solid ${range === r.key ? PALETTE.gold : PALETTE.line}`,
                  borderRadius: 6,
                  padding: "4px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {historico.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={historico} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="quoteGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={positivo ? PALETTE.emerald : PALETTE.crimson} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={positivo ? PALETTE.emerald : PALETTE.crimson} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.line} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: PALETTE.textMuted, fontSize: 10, fontFamily: "IBM Plex Mono" }}
                  axisLine={{ stroke: PALETTE.line }}
                  tickLine={false}
                  minTickGap={30}
                />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  formatter={(v) => formatBRL(v)}
                  contentStyle={{
                    background: PALETTE.surfaceAlt,
                    border: `1px solid ${PALETTE.line}`,
                    borderRadius: 8,
                    fontFamily: "IBM Plex Mono",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: PALETTE.textPrimary }}
                />
                <Area
                  type="monotone"
                  dataKey="fechamento"
                  stroke={positivo ? PALETTE.emerald : PALETTE.crimson}
                  strokeWidth={2}
                  fill="url(#quoteGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: PALETTE.textMuted, fontSize: 12, textAlign: "center", padding: 20 }}>
              Sem histórico disponível para esse período.
            </div>
          )}
        </div>
      )}

      {!loading && !quote && !error && !watchlistLoading && watchlist.length === 0 && (
        <div style={{ color: PALETTE.textMuted, padding: 40, textAlign: "center", fontSize: 13 }}>
          Busque uma ação ou FII acima para ver a cotação e o histórico de preços.
        </div>
      )}
    </div>
  );
}

function WatchlistRow({ quote, selected, onClick, isLast }) {
  const positivo = (quote.regularMarketChangePercent || 0) >= 0;
  const cor = positivo ? PALETTE.emerald : PALETTE.crimson;
  const sparkline = (quote.historicalDataPrice || []).map((p, i) => ({ i, close: p.close }));

  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 80px 110px",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderBottom: isLast ? "none" : `1px dashed ${PALETTE.line}`,
        background: selected ? PALETTE.surfaceAlt : "transparent",
        cursor: "pointer",
        transition: "background 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = PALETTE.surfaceAlt;
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = "transparent";
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div className="mono" style={{ fontWeight: 700, fontSize: 13.5, color: PALETTE.textPrimary }}>
          {quote.symbol}
        </div>
        <div style={{ fontSize: 11.5, color: PALETTE.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {quote.longName || quote.shortName}
        </div>
      </div>

      <div style={{ width: 80, height: 32 }}>
        {sparkline.length > 1 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <defs>
                <linearGradient id={`spark-${quote.symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={cor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="close"
                stroke={cor}
                strokeWidth={1.5}
                fill={`url(#spark-${quote.symbol})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ textAlign: "right" }}>
        <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: PALETTE.textPrimary, marginBottom: 4 }}>
          {formatBRL(quote.regularMarketPrice)}
        </div>
        <span
          className="mono"
          style={{
            display: "inline-block",
            fontSize: 11,
            fontWeight: 700,
            color: "#0E1522",
            background: cor,
            borderRadius: 5,
            padding: "1px 6px",
          }}
        >
          {positivo ? "+" : ""}
          {(quote.regularMarketChangePercent || 0).toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: PALETTE.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: PALETTE.textPrimary }}>
        {value}
      </div>
    </div>
  );
}
