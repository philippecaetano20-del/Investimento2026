import React, { useState } from "react";
import { Search } from "lucide-react";
import { PALETTE } from "../constants.js";

const LS_LAST_SYMBOL = "trade_last_symbol";

function widgetSrc(symbol) {
  const config = {
    symbol,
    interval: "D",
    theme: "dark",
    style: "1",
    locale: "br",
    timezone: "America/Sao_Paulo",
    toolbar_bg: PALETTE.surface,
    enable_publishing: false,
    hide_top_toolbar: false,
    hide_legend: false,
    withdateranges: true,
    allow_symbol_change: true,
    save_image: false,
    studies: ["STD;SMA"],
    autosize: true,
  };
  return `https://www.tradingview-widget.com/embed-widget/advanced-chart/#${encodeURIComponent(JSON.stringify(config))}`;
}

export function TradeTab() {
  const [ticker, setTicker] = useState("");
  const [symbol, setSymbol] = useState(() => {
    try {
      return localStorage.getItem(LS_LAST_SYMBOL) || "";
    } catch {
      return "";
    }
  });

  function buscar(tickerAlvo) {
    const clean = String(tickerAlvo || ticker).trim().toUpperCase();
    if (!clean) return;
    const novoSimbolo = `BMFBOVESPA:${clean}`;
    setSymbol(novoSimbolo);
    try {
      localStorage.setItem(LS_LAST_SYMBOL, novoSimbolo);
    } catch {
      /* localStorage indisponível: apenas não persiste entre sessões */
    }
    setTicker("");
  }

  return (
    <div>
      <div className="display" style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>
        Trade
      </div>
      <div style={{ fontSize: 12.5, color: PALETTE.textMuted, marginBottom: 20 }}>
        Busque uma ação ou FII para ver o gráfico completo (velas, indicadores, médias móveis, RSI e mais), via
        TradingView.
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
        <div style={{ position: "relative", width: 220 }}>
          <Search size={14} color={PALETTE.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
            placeholder="Ticker (ex: BBAS3, MXRF11)"
            style={{
              width: "100%",
              background: PALETTE.surface,
              border: `1px solid ${PALETTE.line}`,
              borderRadius: 6,
              padding: "8px 10px 8px 32px",
              color: PALETTE.textPrimary,
              fontSize: 13,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          />
        </div>
        <button
          onClick={() => buscar()}
          style={{
            background: PALETTE.gold,
            color: "#1A1406",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Buscar
        </button>
      </div>

      {!symbol ? (
        <div
          className="card-surface"
          style={{
            background: PALETTE.surface,
            border: `1px solid ${PALETTE.line}`,
            borderRadius: 10,
            padding: 40,
            textAlign: "center",
            color: PALETTE.textMuted,
            fontSize: 13,
          }}
        >
          Busque uma ação ou FII acima para ver o gráfico.
        </div>
      ) : (
        <div
          style={{
            background: PALETTE.surface,
            border: `1px solid ${PALETTE.line}`,
            borderRadius: 10,
            overflow: "hidden",
            height: 640,
          }}
        >
          <iframe
            key={symbol}
            src={widgetSrc(symbol)}
            title={`Gráfico ${symbol}`}
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="fullscreen"
          />
        </div>
      )}
    </div>
  );
}
