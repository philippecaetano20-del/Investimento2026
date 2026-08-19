import React from "react";
import { X } from "lucide-react";
import { PALETTE, TIPOS } from "../constants.js";
import { parseNumBR } from "../utils.js";
import { AssetSelect } from "./AssetSelect.jsx";

export function EntryForm({ form, setForm, onSubmit, onCancel, error, isEdit, ativosList, saving }) {
  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }
  const label = { fontSize: 11, color: PALETTE.textMuted, marginBottom: 4, display: "block", fontFamily: "Manrope, sans-serif", letterSpacing: "0.04em" };
  const input = {
    width: "100%",
    background: PALETTE.bg,
    border: `1px solid ${PALETTE.line}`,
    borderRadius: 6,
    padding: "8px 10px",
    color: PALETTE.textPrimary,
    fontSize: 13,
  };
  const moneyInputWrap = { position: "relative" };
  const moneyPrefix = {
    position: "absolute",
    left: 10,
    top: "50%",
    transform: "translateY(-50%)",
    color: PALETTE.textMuted,
    fontSize: 13,
    pointerEvents: "none",
  };
  const moneyInput = { ...input, paddingLeft: 30 };

  const isRendaFixa = form.tipo === "Renda Fixa";
  const quantidadeEfetiva = isRendaFixa ? 1 : parseNumBR(form.quantidade) || 0;
  const calculado = (parseNumBR(form.valorPago) || 0) * quantidadeEfetiva;
  const reinvestido = form.estaReinvestido === "Sim";
  const valorInvestidoExibido = reinvestido ? 0 : calculado;
  const readonlyMoneyStyle = (valor) => ({
    ...moneyInput,
    color: valor < 0 ? PALETTE.crimson : PALETTE.gold,
    fontWeight: 600,
    cursor: "not-allowed",
  });

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6, 9, 16, 0.6)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: PALETTE.surfaceAlt,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: 10,
          padding: 24,
          width: 640,
          maxWidth: "100%",
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
          position: "relative",
          boxShadow: "0 24px 60px -16px rgba(0,0,0,0.6)",
        }}
      >
        <button
          onClick={onCancel}
          style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", cursor: "pointer" }}
          aria-label="Fechar"
        >
          <X size={16} color={PALETTE.textMuted} />
        </button>
        <div className="display" style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>
          {isEdit ? "Editar lançamento" : "Novo lançamento"}
        </div>
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={label} htmlFor="entry-tipo">Classe</label>
              <select id="entry-tipo" style={input} value={form.tipo} onChange={set("tipo")}>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={label} htmlFor="entry-nivel">Ativo</label>
              <AssetSelect
                id="entry-nivel"
                value={form.nivel}
                onChange={(v) => setForm({ ...form, nivel: v })}
                options={ativosList}
                inputStyle={input}
              />
            </div>
            <div>
              <label style={label} htmlFor="entry-data">Data</label>
              <input id="entry-data" type="date" style={input} value={form.data} onChange={set("data")} />
            </div>
            <div>
              <label style={label} htmlFor="entry-valor-pago">Valor Pago</label>
              <div style={moneyInputWrap}>
                <span style={moneyPrefix}>R$</span>
                <input id="entry-valor-pago" type="text" inputMode="decimal" style={moneyInput} value={form.valorPago} onChange={set("valorPago")} placeholder="0,00" />
              </div>
              {isRendaFixa && (
                <div style={{ fontSize: 10.5, color: PALETTE.textMuted, marginTop: 4 }}>
                  Dica: digite um valor negativo (ex: -500) para registrar uma retirada.
                </div>
              )}
            </div>
            {!isRendaFixa && (
              <div>
                <label style={label} htmlFor="entry-quantidade">Quantidade</label>
                <input id="entry-quantidade" type="text" inputMode="decimal" style={input} value={form.quantidade} onChange={set("quantidade")} placeholder="0" />
              </div>
            )}
            <div>
              <label style={label} htmlFor="entry-reinvestido">Está Reinvestido?</label>
              <select id="entry-reinvestido" style={input} value={form.estaReinvestido || "Não"} onChange={set("estaReinvestido")}>
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>
            <div>
              <label style={label} htmlFor="entry-valor-investido">Valor Investido</label>
              <div style={moneyInputWrap}>
                <span style={moneyPrefix}>R$</span>
                <input
                  id="entry-valor-investido"
                  type="text"
                  readOnly
                  style={readonlyMoneyStyle(valorInvestidoExibido)}
                  value={valorInvestidoExibido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                />
              </div>
            </div>
            <div>
              <label style={label} htmlFor="entry-rentabilidade">Rentabilidade</label>
              <input id="entry-rentabilidade" type="text" inputMode="decimal" style={input} value={form.rentabilidade} onChange={set("rentabilidade")} placeholder="0,00" />
            </div>
            <div>
              <label style={label} htmlFor="entry-valor-reinvestido">Valor Investido/Reinvestido</label>
              <div style={moneyInputWrap}>
                <span style={moneyPrefix}>R$</span>
                <input
                  id="entry-valor-reinvestido"
                  type="text"
                  readOnly
                  style={readonlyMoneyStyle(calculado)}
                  value={calculado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                />
              </div>
            </div>
          </div>
          {error && <div style={{ color: PALETTE.crimson, fontSize: 12, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onCancel}
              style={{ background: "transparent", border: `1px solid ${PALETTE.line}`, color: PALETTE.textMuted, borderRadius: 6, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: "Manrope, sans-serif" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={saving}
              style={{
                background: PALETTE.gold,
                color: "#1A1406",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? "default" : "pointer",
                fontFamily: "Manrope, sans-serif",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Adicionar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
