import React from "react";
import { X } from "lucide-react";
import { PALETTE, TIPOS } from "../constants.js";
import { parseNumBR } from "../utils.js";
import { AssetSelect } from "./AssetSelect.jsx";

export function EntryForm({ form, setForm, onSubmit, onCancel, error, isEdit, ativosList }) {
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

  const calculado = (parseNumBR(form.valorPago) || 0) * (parseNumBR(form.quantidade) || 0);
  const reinvestido = form.estaReinvestido === "Sim";
  const valorInvestidoExibido = reinvestido ? 0 : calculado;
  const readonlyMoneyStyle = { ...moneyInput, color: PALETTE.gold, fontWeight: 600, cursor: "not-allowed" };
  return (
    <div
      style={{
        background: PALETTE.surfaceAlt,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
        position: "relative",
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
            <label style={label}>Classe</label>
            <select style={input} value={form.tipo} onChange={set("tipo")}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Ativo</label>
            <AssetSelect
              value={form.nivel}
              onChange={(v) => setForm({ ...form, nivel: v })}
              options={ativosList}
              inputStyle={input}
            />
          </div>
          <div>
            <label style={label}>Data</label>
            <input type="date" style={input} value={form.data} onChange={set("data")} />
          </div>
          <div>
            <label style={label}>Valor Pago</label>
            <div style={moneyInputWrap}>
              <span style={moneyPrefix}>R$</span>
              <input type="text" inputMode="decimal" style={moneyInput} value={form.valorPago} onChange={set("valorPago")} placeholder="0,00" />
            </div>
          </div>
          <div>
            <label style={label}>Quantidade</label>
            <input type="text" inputMode="decimal" style={input} value={form.quantidade} onChange={set("quantidade")} placeholder="0" />
          </div>
          <div>
            <label style={label}>Está Reinvestido?</label>
            <select style={input} value={form.estaReinvestido || "Não"} onChange={set("estaReinvestido")}>
              <option value="Não">Não</option>
              <option value="Sim">Sim</option>
            </select>
          </div>
          <div>
            <label style={label}>Valor Investido</label>
            <div style={moneyInputWrap}>
              <span style={moneyPrefix}>R$</span>
              <input
                type="text"
                readOnly
                style={readonlyMoneyStyle}
                value={valorInvestidoExibido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              />
            </div>
          </div>
          <div>
            <label style={label}>Rentabilidade</label>
            <input type="text" inputMode="decimal" style={input} value={form.rentabilidade} onChange={set("rentabilidade")} placeholder="0,00" />
          </div>
          <div>
            <label style={label}>Valor Investido/Reinvestido</label>
            <div style={moneyInputWrap}>
              <span style={moneyPrefix}>R$</span>
              <input
                type="text"
                readOnly
                style={readonlyMoneyStyle}
                value={calculado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              />
            </div>
          </div>
          <div>
            <label style={label}>Reserva de Oportunidade</label>
            <div style={moneyInputWrap}>
              <span style={moneyPrefix}>R$</span>
              <input type="text" inputMode="decimal" style={moneyInput} value={form.reservaOportunidade} onChange={set("reservaOportunidade")} placeholder="0,00" />
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
            style={{ background: PALETTE.gold, color: "#1A1406", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Manrope, sans-serif" }}
          >
            {isEdit ? "Salvar alterações" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}
