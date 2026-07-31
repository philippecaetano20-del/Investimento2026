import React from "react";
import { ResponsiveContainer, PieChart } from "recharts";
import { PALETTE } from "../constants.js";
import { formatBRL } from "../utils.js";
import { renderPie2D } from "./charts.jsx";

export function MetaAnualCard({ investido2026, meta }) {
  const restante = meta - investido2026;
  const pct = Math.max(0, Math.min(100, (investido2026 / meta) * 100));
  const atingida = restante <= 0;
  const pieData = [
    { name: "Investido", value: Math.min(investido2026, meta) },
    { name: "Ainda resta", value: Math.max(0, restante) },
  ];
  const pieColors = [PALETTE.emerald, PALETTE.crimson];

  return (
    <div
      className="card-surface"
      style={{
        background: PALETTE.surface,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 10,
        padding: "18px 20px",
        marginBottom: 28,
        display: "flex",
        flexWrap: "wrap",
        gap: 20,
        alignItems: "center",
      }}
    >
      <div style={{ flex: "1 1 320px", minWidth: 280 }}>
        <div className="display" style={{ fontSize: 15, fontWeight: 500, marginBottom: 14, color: PALETTE.textPrimary }}>
          Meta
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10.5, color: PALETTE.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Meta para 2026
            </div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: PALETTE.textPrimary }}>
              {formatBRL(meta)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: PALETTE.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Já investido
            </div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: PALETTE.emerald }}>
              {formatBRL(investido2026)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: PALETTE.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              {atingida ? "Meta batida, excedente" : "Ainda resta"}
            </div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: atingida ? PALETTE.gold : PALETTE.crimson }}>
              {formatBRL(Math.abs(restante))}
            </div>
          </div>
        </div>

        <div style={{ background: PALETTE.bg, borderRadius: 999, height: 10, overflow: "hidden", border: `1px solid ${PALETTE.line}` }}>
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: atingida ? PALETTE.emerald : PALETTE.gold,
              borderRadius: 999,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <div className="mono" style={{ fontSize: 11, color: PALETTE.textMuted, marginTop: 6, textAlign: "right" }}>
          {pct.toFixed(1)}% da meta
        </div>
      </div>

      <div style={{ flex: "0 0 220px", width: 220 }}>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            {renderPie2D({ data: pieData, colors: pieColors, cyTop: 105, outerRadius: 78, showLabel: false, showTooltip: true, showLegend: false })}
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: -8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: PALETTE.textMuted }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: pieColors[0], display: "inline-block" }} />
            Investido
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: PALETTE.textMuted }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: pieColors[1], display: "inline-block" }} />
            Resta
          </span>
        </div>
      </div>
    </div>
  );
}
