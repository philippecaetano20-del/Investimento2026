import React, { useState } from "react";
import { ResponsiveContainer, PieChart } from "recharts";
import { Pencil, Check, X, Target } from "lucide-react";
import { PALETTE } from "../constants.js";
import { formatBRL, parseNumBR } from "../utils.js";
import { renderPie2D } from "./charts.jsx";

const iconBtnStyle = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  borderRadius: 6,
};

export function MetaAnualCard({ ano, investidoAno, meta, onSaveMeta }) {
  const [editing, setEditing] = useState(false);
  const [valorEdit, setValorEdit] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  function startEdit() {
    setValorEdit(meta > 0 ? String(meta).replace(".", ",") : "");
    setEditError("");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setEditError("");
  }

  async function confirmEdit() {
    const valor = parseNumBR(valorEdit);
    if (!valor || valor <= 0) {
      setEditError("Informe um valor válido.");
      return;
    }
    setSaving(true);
    try {
      await onSaveMeta(valor);
      setEditing(false);
    } catch (e) {
      setEditError(e.message || "Não foi possível salvar a meta.");
    } finally {
      setSaving(false);
    }
  }

  const semMeta = !meta || meta <= 0;
  const restante = meta - investidoAno;
  const pct = semMeta ? 0 : Math.max(0, Math.min(100, (investidoAno / meta) * 100));
  const atingida = !semMeta && restante <= 0;
  const pieData = [
    { name: "Investido", value: Math.min(investidoAno, meta || 0) },
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
              META {ano}
            </div>
            {editing ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    autoFocus
                    value={valorEdit}
                    onChange={(e) => {
                      setValorEdit(e.target.value);
                      if (editError) setEditError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    placeholder="0,00"
                    className="mono"
                    style={{
                      width: 130,
                      background: PALETTE.bg,
                      border: `1px solid ${PALETTE.line}`,
                      borderRadius: 5,
                      padding: "4px 8px",
                      color: PALETTE.textPrimary,
                      fontSize: 15,
                      fontWeight: 600,
                    }}
                  />
                  <button onClick={confirmEdit} disabled={saving} style={iconBtnStyle} aria-label="Salvar meta">
                    <Check size={15} color={PALETTE.emerald} />
                  </button>
                  <button onClick={cancelEdit} style={iconBtnStyle} aria-label="Cancelar edição">
                    <X size={15} color={PALETTE.textMuted} />
                  </button>
                </div>
                {editError && <div style={{ color: PALETTE.crimson, fontSize: 11, marginTop: 4 }}>{editError}</div>}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: PALETTE.textPrimary }}>
                  {semMeta ? "Não definida" : formatBRL(meta)}
                </div>
                <button onClick={startEdit} style={iconBtnStyle} aria-label={`Editar meta de ${ano}`}>
                  <Pencil size={13} color={PALETTE.textMuted} />
                </button>
              </div>
            )}
          </div>
          {!semMeta && (
            <>
              <div>
                <div style={{ fontSize: 10.5, color: PALETTE.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Já investido
                </div>
                <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: PALETTE.emerald }}>
                  {formatBRL(investidoAno)}
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
            </>
          )}
        </div>

        {semMeta ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: PALETTE.textMuted, fontSize: 12.5 }}>
            <Target size={14} />
            Defina uma meta para {ano} para acompanhar seu progresso.
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {!semMeta && (
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
      )}
    </div>
  );
}
