import React, { useState } from "react";
import { Plus, X, Pencil, Check } from "lucide-react";
import { PALETTE } from "../constants.js";

const iconBtnStyle = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 2,
  display: "flex",
  flexShrink: 0,
};

export function AssetsManager({ ativosList, onAdd, onRename, onRemove }) {
  const [novo, setNovo] = useState("");
  const [addError, setAddError] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingName, setEditingName] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState("");

  async function handleAdd() {
    if (!novo.trim() || busy) return;
    setBusy(true);
    try {
      await onAdd(novo);
      setNovo("");
      setAddError("");
    } catch (e) {
      setAddError(e.message || "Não foi possível adicionar o ativo.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(nome) {
    setEditingName(nome);
    setEditValue(nome);
    setEditError("");
  }

  function cancelEdit() {
    setEditingName(null);
    setEditValue("");
    setEditError("");
  }

  async function confirmEdit(nomeOriginal) {
    if (!editValue.trim() || editValue.trim() === nomeOriginal) {
      cancelEdit();
      return;
    }
    try {
      await onRename(nomeOriginal, editValue);
      cancelEdit();
    } catch (e) {
      setEditError(e.message || "Não foi possível renomear o ativo.");
    }
  }

  async function handleRemove(nome) {
    if (editingName === nome) cancelEdit();
    try {
      await onRemove(nome);
    } catch (e) {
      setAddError(e.message || "Não foi possível remover o ativo.");
    }
  }

  return (
    <div
      className="card-surface"
      style={{
        background: PALETTE.surface,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 10,
        padding: 24,
      }}
    >
      <div className="display" style={{ fontSize: 18, fontWeight: 500, marginBottom: 6 }}>
        Ativos cadastrados
      </div>
      <div style={{ fontSize: 13, color: PALETTE.textMuted, marginBottom: 20 }}>
        Esses são os ativos disponíveis para seleção ao registrar um lançamento. Adicione novos abaixo, ou
        clique no lápis para renomear um ativo já cadastrado.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={novo}
          onChange={(e) => {
            setNovo(e.target.value);
            if (addError) setAddError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="ex: VALE3"
          style={{
            flex: 1,
            background: PALETTE.bg,
            border: `1px solid ${addError ? PALETTE.crimson : PALETTE.line}`,
            borderRadius: 6,
            padding: "9px 12px",
            color: PALETTE.textPrimary,
            fontSize: 13,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: PALETTE.gold,
            color: "#1A1406",
            border: "none",
            borderRadius: 6,
            padding: "9px 16px",
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 600,
            fontSize: 13,
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          <Plus size={15} /> Adicionar ativo
        </button>
      </div>
      {addError && <div style={{ color: PALETTE.crimsonText, fontSize: 12, marginBottom: 16 }}>{addError}</div>}
      <div style={{ marginBottom: addError ? 8 : 24 }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
        {ativosList.map((a) => {
          const isEditing = editingName === a;
          return (
            <div
              key={a}
              style={{
                background: PALETTE.surfaceAlt,
                border: `1px solid ${isEditing ? PALETTE.gold : PALETTE.line}`,
                borderRadius: 6,
                padding: "8px 10px",
              }}
            >
              {isEditing ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => {
                      setEditValue(e.target.value);
                      if (editError) setEditError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmEdit(a);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: PALETTE.bg,
                      border: `1px solid ${PALETTE.line}`,
                      borderRadius: 4,
                      padding: "4px 6px",
                      color: PALETTE.textPrimary,
                      fontSize: 12.5,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  />
                  <button onClick={() => confirmEdit(a)} style={iconBtnStyle} aria-label="Salvar novo nome">
                    <Check size={14} color={PALETTE.emerald} />
                  </button>
                  <button onClick={cancelEdit} style={iconBtnStyle} aria-label="Cancelar edição">
                    <X size={14} color={PALETTE.textMuted} />
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span
                    className="mono"
                    style={{ fontSize: 12.5, color: PALETTE.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {a}
                  </span>
                  <div style={{ display: "flex", gap: 2 }}>
                    <button onClick={() => startEdit(a)} style={iconBtnStyle} aria-label={`Renomear ${a}`}>
                      <Pencil size={13} color={PALETTE.textMuted} />
                    </button>
                    <button onClick={() => handleRemove(a)} style={iconBtnStyle} aria-label={`Remover ${a}`}>
                      <X size={13} color={PALETTE.textMuted} />
                    </button>
                  </div>
                </div>
              )}
              {isEditing && editError && (
                <div style={{ color: PALETTE.crimsonText, fontSize: 11, marginTop: 6 }}>{editError}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
