import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { PALETTE } from "../constants.js";
import { formatBRL } from "../utils.js";
import { api } from "../api.js";

const LS_DCF = "valuation_dcf";

function carregar() {
  try {
    const raw = localStorage.getItem(LS_DCF);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function salvar(rows) {
  try {
    localStorage.setItem(LS_DCF, JSON.stringify(rows));
  } catch {
    /* localStorage indisponível: cálculo continua funcionando só sem persistência */
  }
}

const inputStyle = {
  width: "100%",
  background: PALETTE.bg,
  border: `1px solid ${PALETTE.line}`,
  borderRadius: 5,
  padding: "7px 9px",
  color: PALETTE.textPrimary,
  fontSize: 12.5,
  fontFamily: "'IBM Plex Mono', monospace",
  textAlign: "right",
};

const tickerInputStyle = {
  background: PALETTE.surface,
  border: `1px solid ${PALETTE.line}`,
  borderRadius: 6,
  padding: "8px 10px",
  color: PALETTE.textPrimary,
  fontSize: 13,
  fontFamily: "'IBM Plex Mono', monospace",
  width: 160,
};

const addBtnStyle = {
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
};

const fieldWrapStyle = { position: "relative" };
const affixStyle = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: 12,
  color: PALETTE.textMuted,
  fontFamily: "'IBM Plex Mono', monospace",
  pointerEvents: "none",
};

function formatInt(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function parseDigits(str) {
  const digits = String(str).replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function formatCents(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCents(str) {
  const digits = String(str).replace(/\D/g, "");
  return digits ? parseInt(digits, 10) / 100 : 0;
}

function IntegerField({ value, onChange, prefix }) {
  return (
    <div style={fieldWrapStyle}>
      {prefix && <span style={{ ...affixStyle, left: 9 }}>{prefix}</span>}
      <input
        type="text"
        inputMode="numeric"
        style={{ ...inputStyle, paddingLeft: prefix ? 28 : 9 }}
        value={value ? formatInt(value) : ""}
        onChange={(e) => onChange(parseDigits(e.target.value))}
        placeholder="0"
      />
    </div>
  );
}

function PriceField({ value, onChange }) {
  return (
    <div style={fieldWrapStyle}>
      <span style={{ ...affixStyle, left: 9 }}>R$</span>
      <input
        type="text"
        inputMode="numeric"
        style={{ ...inputStyle, paddingLeft: 28 }}
        value={formatCents(value)}
        onChange={(e) => onChange(parseCents(e.target.value))}
      />
    </div>
  );
}

function PercentField({ value, onChange }) {
  return (
    <div style={fieldWrapStyle}>
      <input
        type="number"
        step="0.01"
        style={{ ...inputStyle, paddingRight: 22 }}
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span style={{ ...affixStyle, right: 9 }}>%</span>
    </div>
  );
}

function fieldLabel(text, extra) {
  return (
    <div style={{ fontSize: 10, fontFamily: "'Manrope', sans-serif", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: PALETTE.textMuted, marginBottom: 4, ...extra }}>
      {text}
    </div>
  );
}

function thStyle(align) {
  return {
    padding: "8px 10px",
    fontSize: 10,
    fontFamily: "'Manrope', sans-serif",
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: PALETTE.textMuted,
    textAlign: align,
    whiteSpace: "nowrap",
  };
}

function tdStyle(align, extra) {
  return { padding: "7px 10px", textAlign: align, ...extra };
}

function upsideBadge(v) {
  if (v == null) return <span style={{ color: PALETTE.textMuted }}>—</span>;
  const positivo = v >= 0;
  return (
    <span
      className="mono"
      style={{
        display: "inline-block",
        fontWeight: 700,
        fontSize: 13,
        color: "#0E1522",
        background: positivo ? PALETTE.emerald : PALETTE.crimson,
        borderRadius: 5,
        padding: "3px 10px",
      }}
    >
      {positivo ? "+" : ""}
      {v.toFixed(2)}%
    </span>
  );
}

export function ValuationDcfTab() {
  const [rows, setRows] = useState(() => carregar());
  const [ticker, setTicker] = useState("");
  const [loadingTicker, setLoadingTicker] = useState("");
  const [error, setError] = useState("");
  const [tesouro, setTesouro] = useState(null);

  useEffect(() => salvar(rows), [rows]);
  useEffect(() => {
    api.getTesouro().then(setTesouro).catch(() => setTesouro(null));
  }, []);

  async function buscarEAdicionar(tickerAlvo) {
    const clean = String(tickerAlvo || ticker).trim().toUpperCase();
    if (!clean) return;
    setLoadingTicker(clean);
    setError("");
    try {
      const f = await api.getFundamentals(clean);
      const preco = f.regularMarketPrice || 0;
      const nome = f.longName || f.symbol;
      setRows((rs) => {
        const existe = rs.findIndex((r) => r.ticker === (f.symbol || clean));
        if (existe >= 0) {
          const copia = [...rs];
          copia[existe] = { ...copia[existe], preco, nome };
          return copia;
        }
        return [
          ...rs,
          {
            ticker: f.symbol || clean,
            nome,
            preco,
            numAcoes: 0,
            lucroAtual: 0,
            payout: 30,
            roe: 15,
            taxaDesconto: 20,
            anos: 5,
          },
        ];
      });
      setTicker("");
    } catch (e) {
      setError(e.message || `Não foi possível buscar ${clean}.`);
    } finally {
      setLoadingTicker("");
    }
  }

  function atualizarCampo(ticker, campo, valor) {
    setRows((rs) => rs.map((r) => (r.ticker === ticker ? { ...r, [campo]: valor } : r)));
  }

  function remover(ticker) {
    setRows((rs) => rs.filter((r) => r.ticker !== ticker));
  }

  const calculadas = useMemo(
    () =>
      rows.map((r) => {
        const roe = Number(r.roe) || 0;
        const payout = Number(r.payout) || 0;
        const taxaDesconto = Number(r.taxaDesconto) || 0;
        const lucroAtual = Number(r.lucroAtual) || 0;
        const numAcoes = Number(r.numAcoes) || 0;
        const g = roe * (1 - payout / 100);

        const anoAtual = new Date().getFullYear();
        const anosProjetados = [];
        let lucroAnterior = lucroAtual;
        let somaVpl = 0;
        for (let i = 1; i <= r.anos; i++) {
          const lucro = lucroAnterior * (1 + g / 100);
          const vpl = taxaDesconto > -100 ? lucro / Math.pow(1 + taxaDesconto / 100, i) : null;
          if (vpl != null) somaVpl += vpl;
          anosProjetados.push({ ano: anoAtual + i, lucro, crescimento: g, vpl });
          lucroAnterior = lucro;
        }

        const podeCalcularTerminal = taxaDesconto > g;
        const lucroTerminalBase = lucroAnterior * (1 + g / 100);
        const valorTerminal = podeCalcularTerminal ? lucroTerminalBase / ((taxaDesconto - g) / 100) : null;
        const vpTerminal = podeCalcularTerminal ? valorTerminal / Math.pow(1 + taxaDesconto / 100, r.anos) : null;

        const valorEmpresa = somaVpl + (vpTerminal || 0);
        const precoJusto = numAcoes > 0 ? valorEmpresa / numAcoes : null;
        const upside = precoJusto != null && r.preco > 0 ? ((precoJusto - r.preco) / r.preco) * 100 : null;

        return { ...r, g, anosProjetados, somaVpl, vpTerminal, valorEmpresa, precoJusto, upside, podeCalcularTerminal };
      }),
    [rows]
  );

  return (
    <div>
      <div className="display" style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>
        Valuation por Fluxo de Caixa Descontado
      </div>
      <div style={{ fontSize: 12.5, color: PALETTE.textMuted, marginBottom: 24, maxWidth: 780 }}>
        Projeta o Lucro Líquido a partir da Taxa Esperada de Crescimento (ROE × (1 − Payout)), traz cada ano a valor
        presente e soma um valor terminal (perpetuidade de Gordon) para estimar o valor justo da empresa e o preço
        justo por ação.
        {tesouro?.selicMeta != null && <> Selic (meta atual): {tesouro.selicMeta}%.</>}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscarEAdicionar()}
          placeholder="Ticker (ex: BBAS3)"
          style={tickerInputStyle}
        />
        <button onClick={() => buscarEAdicionar()} disabled={!!loadingTicker} style={{ ...addBtnStyle, opacity: loadingTicker ? 0.6 : 1 }}>
          {loadingTicker ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}
          Adicionar
        </button>
      </div>
      {error && <div style={{ color: PALETTE.crimson, fontSize: 12.5, marginBottom: 16 }}>{error}</div>}

      {calculadas.length === 0 ? (
        <div
          className="card-surface"
          style={{ background: PALETTE.surface, border: `1px solid ${PALETTE.line}`, borderRadius: 10, color: PALETTE.textMuted, padding: 32, textAlign: "center", fontSize: 13 }}
        >
          Adicione uma ação para montar o valuation por fluxo de caixa descontado.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {calculadas.map((r) => (
            <div key={r.ticker} className="card-surface" style={{ background: PALETTE.surface, border: `1px solid ${PALETTE.line}`, borderRadius: 10, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
                <div>
                  <div className="mono" style={{ fontWeight: 700, fontSize: 15 }}>
                    {r.ticker}
                  </div>
                  <div style={{ fontSize: 11.5, color: PALETTE.textMuted }}>{r.nome}</div>
                </div>
                <button onClick={() => remover(r.ticker)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }} aria-label="Remover">
                  <Trash2 size={15} color={PALETTE.crimson} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 16 }}>
                <div>
                  {fieldLabel("Preço Atual")}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ flex: 1 }}>
                      <PriceField value={r.preco} onChange={(v) => atualizarCampo(r.ticker, "preco", v)} />
                    </div>
                    <button onClick={() => buscarEAdicionar(r.ticker)} title="Atualizar cotação" style={{ background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}>
                      <RefreshCw size={11} color={PALETTE.textMuted} />
                    </button>
                  </div>
                </div>
                <div>
                  {fieldLabel("Nº Ações (ex-tesouraria)")}
                  <IntegerField value={r.numAcoes} onChange={(v) => atualizarCampo(r.ticker, "numAcoes", v)} />
                </div>
                <div>
                  {fieldLabel("Lucro Líquido Atual")}
                  <IntegerField prefix="R$" value={r.lucroAtual} onChange={(v) => atualizarCampo(r.ticker, "lucroAtual", v)} />
                </div>
                <div>
                  {fieldLabel("Payout Médio %")}
                  <PercentField value={r.payout} onChange={(v) => atualizarCampo(r.ticker, "payout", v)} />
                </div>
                <div>
                  {fieldLabel("ROE %")}
                  <PercentField value={r.roe} onChange={(v) => atualizarCampo(r.ticker, "roe", v)} />
                </div>
                <div>
                  {fieldLabel("Taxa de Desconto %")}
                  <PercentField value={r.taxaDesconto} onChange={(v) => atualizarCampo(r.ticker, "taxaDesconto", v)} />
                </div>
                <div>
                  {fieldLabel("Anos de Projeção")}
                  <div style={{ display: "flex", gap: 4 }}>
                    {[3, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => atualizarCampo(r.ticker, "anos", n)}
                        style={{
                          flex: 1,
                          padding: "7px 0",
                          fontSize: 12,
                          fontFamily: "'IBM Plex Mono', monospace",
                          border: `1px solid ${r.anos === n ? PALETTE.gold : PALETTE.line}`,
                          borderRadius: 5,
                          background: r.anos === n ? "rgba(212,169,79,0.12)" : PALETTE.bg,
                          color: r.anos === n ? PALETTE.gold : PALETTE.textPrimary,
                          cursor: "pointer",
                        }}
                      >
                        {n} anos
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: PALETTE.textMuted, marginBottom: 14 }}>
                Taxa Esperada de Crescimento (g) = ROE × (1 − Payout) ={" "}
                <span className="mono" style={{ color: PALETTE.gold, fontWeight: 700 }}>
                  {r.g.toFixed(2)}%
                </span>
                {!r.podeCalcularTerminal && (
                  <span style={{ color: PALETTE.crimson }}> — taxa de desconto precisa ser maior que g para calcular o valor terminal.</span>
                )}
              </div>

              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: 8, border: `1px solid ${PALETTE.line}`, marginBottom: 16 }}>
                <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: PALETTE.surfaceAlt, borderBottom: `1px solid ${PALETTE.line}` }}>
                      <th style={thStyle("left")}>Ano</th>
                      <th style={thStyle("right")}>Lucro Líquido</th>
                      <th style={thStyle("right")}>Crescimento</th>
                      <th style={thStyle("right")}>VPL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.anosProjetados.map((a, i) => (
                      <tr key={a.ano} style={{ borderBottom: i < r.anosProjetados.length - 1 ? `1px dashed ${PALETTE.line}` : "none" }}>
                        <td style={tdStyle("left")} className="mono">
                          {a.ano}
                        </td>
                        <td style={tdStyle("right")} className="mono">
                          {formatBRL(a.lucro)}
                        </td>
                        <td style={tdStyle("right")} className="mono">
                          {a.crescimento.toFixed(2)}%
                        </td>
                        <td style={tdStyle("right", { background: "rgba(212,169,79,0.08)" })} className="mono">
                          {a.vpl != null ? formatBRL(a.vpl) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", paddingTop: 4 }}>
                <div>
                  {fieldLabel("Valor da Empresa")}
                  <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>
                    {formatBRL(r.valorEmpresa)}
                  </div>
                </div>
                <div>
                  {fieldLabel("Preço Justo")}
                  <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.gold }}>
                    {r.precoJusto != null ? formatBRL(r.precoJusto) : "—"}
                  </div>
                </div>
                <div>
                  {fieldLabel("Upside / Downside")}
                  {upsideBadge(r.upside)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
