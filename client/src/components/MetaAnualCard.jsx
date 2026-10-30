import React, { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { PALETTE } from "../constants.js";
import { formatBRL, parseNumBR } from "../utils.js";

const iconBtnStyle = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 6,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  borderRadius: 6,
};

/** Célula "Meta do ano" da faixa de resumo do Painel: progresso + edição inline. */
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
      setEditError("Informe um valor maior que zero.");
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

  return (
    <div className="resumo-celula">
      <div className="resumo-rotulo" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <span>Meta de {ano}</span>
        {!semMeta && !editing && (
          <button onClick={startEdit} style={{ ...iconBtnStyle, margin: -6 }} aria-label={`Editar meta de ${ano}`} title="Editar meta">
            <Pencil size={13} color={PALETTE.textMuted} />
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
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
              placeholder="R$ 0,00"
              inputMode="decimal"
              aria-label={`Valor da meta de ${ano}`}
              className="num"
              style={{
                width: "100%",
                minWidth: 0,
                background: PALETTE.bg,
                border: `1px solid ${PALETTE.line}`,
                borderRadius: 6,
                padding: "6px 8px",
                color: PALETTE.textPrimary,
                fontSize: 15,
                fontWeight: 600,
              }}
            />
            <button onClick={confirmEdit} disabled={saving} style={iconBtnStyle} aria-label="Salvar meta">
              <Check size={16} color={PALETTE.emerald} />
            </button>
            <button onClick={cancelEdit} style={iconBtnStyle} aria-label="Cancelar edição">
              <X size={16} color={PALETTE.textMuted} />
            </button>
          </div>
          {editError && <div style={{ color: PALETTE.crimsonText, fontSize: 12, marginTop: 4 }}>{editError}</div>}
        </div>
      ) : semMeta ? (
        <>
          <button type="button" className="link-btn" onClick={startEdit} style={{ fontSize: 15, marginTop: 2 }}>
            Definir meta
          </button>
          <div className="resumo-nota">Acompanhe quanto falta para o ano.</div>
        </>
      ) : (
        <>
          <div className="resumo-valor num">
            {pct.toFixed(0)}%
            <span style={{ fontSize: 13, fontWeight: 500, color: PALETTE.textMuted, marginLeft: 8 }}>de {formatBRL(meta)}</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progresso da meta de ${ano}`}
            style={{ height: 4, background: PALETTE.line, borderRadius: 999, overflow: "hidden", margin: "10px 0 6px" }}
          >
            <div style={{ width: "100%", height: "100%", background: atingida ? PALETTE.emerald : PALETTE.accent, borderRadius: 999, transform: `scaleX(${pct / 100})`, transformOrigin: "left", transition: "transform 0.6s cubic-bezier(0.16,1,0.3,1)" }} />
          </div>
          <div className="resumo-nota num">
            {atingida ? `Meta batida, ${formatBRL(-restante)} acima` : `Faltam ${formatBRL(restante)}`}
          </div>
        </>
      )}
    </div>
  );
}
