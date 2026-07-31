import React, { useState, useMemo } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { PALETTE } from "../constants.js";
import { formatBRL, formatDateBR } from "../utils.js";
import { EntryForm } from "./EntryForm.jsx";
import { ColumnFilterDropdown } from "./ColumnFilterDropdown.jsx";

const iconBtnStyle = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 4,
  display: "flex",
};

const COLUNAS_EXTRATO = [
  { key: "data", label: "Data", align: "left", format: (v) => formatDateBR(v), filterable: true },
  { key: "nivel", label: "Ativo", align: "left", format: (v) => v, filterable: true },
  { key: "tipo", label: "Classe", align: "left", format: (v) => v, filterable: true },
  { key: "valorPago", label: "Valor Pago", align: "right", format: (v) => formatBRL(v) },
  { key: "quantidade", label: "Quantidade", align: "right", format: (v) => String(v) },
  { key: "valorInvestido", label: "Valor Investido", align: "right", format: (v) => formatBRL(v) },
  { key: "rentabilidade", label: "Rentabilidade", align: "right", format: (v) => `${v >= 0 ? "+" : ""}${Number(v).toFixed(2)}%` },
  { key: "valorReinvestido", label: "Valor Investido/Reinvestido", align: "right", format: (v) => formatBRL(v) },
];

const GRID_COLUNAS = "85px 110px 85px 100px 75px 105px 115px 175px 55px";

export function LancamentosTab({
  sortedEntries,
  openEditForm,
  handleDelete,
  openNewForm,
  saveError,
  formOpen,
  form,
  setForm,
  handleSubmit,
  closeForm,
  error,
  ativosList,
}) {
  const [filters, setFilters] = useState({});

  const opcoesPorColuna = useMemo(() => {
    const map = {};
    COLUNAS_EXTRATO.filter((col) => col.filterable).forEach((col) => {
      const unicos = Array.from(new Set(sortedEntries.map((e) => e[col.key])));
      unicos.sort((a, b) => {
        if (typeof a === "number" && typeof b === "number") return a - b;
        return String(a).localeCompare(String(b), "pt-BR");
      });
      map[col.key] = unicos;
    });
    return map;
  }, [sortedEntries]);

  const entriesFiltradas = sortedEntries.filter((e) =>
    COLUNAS_EXTRATO.every((col) => {
      const sel = filters[col.key];
      return !sel || sel.has(e[col.key]);
    })
  );

  const filtrosAtivos = Object.values(filters).some((s) => s);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div className="display" style={{ fontSize: 18, fontWeight: 500 }}>
          Extrato de lançamentos
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={openNewForm}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: PALETTE.gold,
              color: "#1A1406",
              border: "none",
              borderRadius: 6,
              padding: "8px 14px",
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <Plus size={15} /> Novo lançamento
          </button>
        </div>
      </div>
      {saveError && <div style={{ color: PALETTE.crimson, fontSize: 12, marginBottom: 10 }}>{saveError}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 11.5, color: PALETTE.textMuted }}>
          {entriesFiltradas.length} de {sortedEntries.length} lançamento{sortedEntries.length !== 1 ? "s" : ""}
        </div>
        {filtrosAtivos && (
          <button
            onClick={() => setFilters({})}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "transparent",
              border: `1px solid ${PALETTE.line}`,
              color: PALETTE.gold,
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 11.5,
              fontFamily: "'Manrope', sans-serif",
              cursor: "pointer",
            }}
          >
            <X size={12} /> Limpar filtros
          </button>
        )}
      </div>

      {formOpen && (
        <EntryForm
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          error={error}
          isEdit={!!form.id}
          ativosList={ativosList}
        />
      )}

      <div
        className="card-surface"
        style={{
          background: PALETTE.surface,
          borderRadius: 10,
          border: `1px solid ${PALETTE.line}`,
          overflow: "hidden",
          overflowX: "auto",
        }}
      >
        {entriesFiltradas.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: PALETTE.textMuted, fontSize: 14 }}>
            {sortedEntries.length === 0
              ? 'Nenhum lançamento ainda. Clique em "Novo lançamento" para começar.'
              : "Nenhum lançamento encontrado para esse filtro."}
          </div>
        ) : (
          <div style={{ minWidth: 1000 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: GRID_COLUNAS,
                gap: 10,
                padding: "10px 16px",
                borderBottom: `1px solid ${PALETTE.line}`,
                background: PALETTE.surfaceAlt,
              }}
            >
              {COLUNAS_EXTRATO.map((col) => (
                <div
                  key={col.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    justifyContent: col.align === "right" ? "flex-end" : "flex-start",
                    fontSize: 10,
                    fontFamily: "'Manrope', sans-serif",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    color: PALETTE.textMuted,
                    textTransform: "uppercase",
                  }}
                >
                  {col.filterable && col.align === "right" && (
                    <ColumnFilterDropdown
                      options={opcoesPorColuna[col.key]}
                      format={col.format}
                      selectedSet={filters[col.key]}
                      onApply={(next) => setFilters((f) => ({ ...f, [col.key]: next }))}
                    />
                  )}
                  <span>{col.label}</span>
                  {col.filterable && col.align !== "right" && (
                    <ColumnFilterDropdown
                      options={opcoesPorColuna[col.key]}
                      format={col.format}
                      selectedSet={filters[col.key]}
                      onApply={(next) => setFilters((f) => ({ ...f, [col.key]: next }))}
                    />
                  )}
                </div>
              ))}
              <div />
            </div>
            {entriesFiltradas.map((e, i) => (
              <div
                key={e.id}
                className="ledger-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: GRID_COLUNAS,
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 16px",
                  borderBottom: i < entriesFiltradas.length - 1 ? `1px dashed ${PALETTE.line}` : "none",
                  fontSize: 13,
                }}
              >
                <div className="mono" style={{ color: PALETTE.textMuted, fontSize: 12 }}>
                  {formatDateBR(e.data)}
                </div>
                <div className="mono" style={{ fontWeight: 600 }}>
                  {e.nivel}
                </div>
                <div style={{ fontSize: 11.5, color: PALETTE.textMuted }}>{e.tipo}</div>
                <div className="mono" style={{ textAlign: "right", fontSize: 12.5 }}>
                  {formatBRL(e.valorPago)}
                </div>
                <div className="mono" style={{ textAlign: "right", fontSize: 12.5, color: PALETTE.textMuted }}>
                  {e.quantidade}
                </div>
                <div className="mono" style={{ textAlign: "right", fontWeight: 600 }}>
                  {formatBRL(e.valorInvestido)}
                </div>
                <div
                  className="mono"
                  style={{
                    textAlign: "right",
                    fontSize: 12.5,
                    color: e.rentabilidade >= 0 ? PALETTE.emerald : PALETTE.crimson,
                  }}
                >
                  {e.rentabilidade >= 0 ? "+" : ""}
                  {e.rentabilidade.toFixed(2)}%
                </div>
                <div className="mono" style={{ textAlign: "right", fontSize: 12.5, color: PALETTE.textMuted }}>
                  {formatBRL(e.valorReinvestido)}
                </div>
                <div
                  className="row-actions"
                  style={{
                    display: "flex",
                    gap: 6,
                    justifyContent: "flex-end",
                    opacity: 0.5,
                    transition: "opacity 0.15s",
                  }}
                >
                  <button onClick={() => openEditForm(e)} style={iconBtnStyle} aria-label="Editar">
                    <Pencil size={14} color={PALETTE.textMuted} />
                  </button>
                  <button onClick={() => handleDelete(e.id)} style={iconBtnStyle} aria-label="Excluir">
                    <Trash2 size={14} color={PALETTE.crimson} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
