import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { PALETTE } from "../constants.js";
import { formatBRL } from "../utils.js";
import { api } from "../api.js";

const LS_ACOES = "calc_teto_acoes";
const LS_FIIS = "calc_teto_fiis";
const LS_GORDON = "calc_teto_fiis_gordon";

function carregar(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function salvar(key, rows) {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    /* localStorage indisponível: cálculo continua funcionando só sem persistência */
  }
}

const numInputStyle = {
  width: "100%",
  background: PALETTE.bg,
  border: `1px solid ${PALETTE.line}`,
  borderRadius: 5,
  padding: "5px 7px",
  color: PALETTE.textPrimary,
  fontSize: 12,
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

function thStyle(align) {
  return {
    padding: "9px 10px",
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
  return { padding: "8px 10px", textAlign: align, ...extra };
}

function margemBadge(margem) {
  if (margem == null) return <span style={{ color: PALETTE.textMuted }}>—</span>;
  const positivo = margem >= 0;
  return (
    <span
      className="mono"
      style={{
        display: "inline-block",
        fontWeight: 700,
        fontSize: 12,
        color: "#0E1522",
        background: positivo ? PALETTE.emerald : PALETTE.crimson,
        borderRadius: 5,
        padding: "2px 8px",
      }}
    >
      {positivo ? "+" : ""}
      {margem.toFixed(2)}%
    </span>
  );
}

export function CalculadoraTab() {
  const [ranking, setRanking] = useState(null);
  const [tesouro, setTesouro] = useState(null);

  useEffect(() => {
    api
      .getFiiRanking()
      .then((data) => {
        const map = new Map();
        (data.items || []).forEach((it) => map.set(it.ticker, it));
        setRanking(map);
      })
      .catch(() => setRanking(new Map()));
    api.getTesouro().then(setTesouro).catch(() => setTesouro(null));
  }, []);

  return (
    <div>
      <div className="display" style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>
        Calculadora de Preço Teto
      </div>
      <div style={{ fontSize: 12.5, color: PALETTE.textMuted, marginBottom: 24 }}>
        Estima o preço máximo a pagar por um ativo com base em métodos consagrados. Os campos são preenchidos
        automaticamente e podem ser editados livremente.
      </div>

      <CalculadoraAcoes />
      <CalculadoraFiis ranking={ranking} />
      <CalculadoraFiisGordon ranking={ranking} tesouro={tesouro} />
    </div>
  );
}

function CalculadoraAcoes() {
  const [rows, setRows] = useState(() => carregar(LS_ACOES));
  const [ticker, setTicker] = useState("");
  const [loadingTicker, setLoadingTicker] = useState("");
  const [error, setError] = useState("");

  useEffect(() => salvar(LS_ACOES, rows), [rows]);

  async function buscarEAdicionar(tickerAlvo) {
    const clean = String(tickerAlvo || ticker).trim().toUpperCase();
    if (!clean) return;
    setLoadingTicker(clean);
    setError("");
    try {
      const f = await api.getFundamentals(clean);
      if (!f.fundamentalsAvailable) {
        setError(`Não há LPA/VPA/dividendos disponíveis para ${clean} (pode ser um FII ou ativo sem cobertura).`);
        return;
      }
      const preco = f.regularMarketPrice || 0;
      const divAnual = f.dividendYield != null ? Number(((preco * f.dividendYield) / 100).toFixed(2)) : 0;
      const novaLinha = {
        ticker: f.symbol,
        nome: f.longName || f.symbol,
        preco,
        divAnual,
        yieldDesejado: 6,
        lpa: f.lpa != null ? Number(f.lpa.toFixed(2)) : 0,
        vpa: f.vpa != null ? Number(f.vpa.toFixed(2)) : 0,
      };
      setRows((rs) => {
        const existe = rs.findIndex((r) => r.ticker === novaLinha.ticker);
        if (existe >= 0) {
          const copia = [...rs];
          copia[existe] = { ...copia[existe], preco, nome: novaLinha.nome };
          return copia;
        }
        return [...rs, novaLinha];
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
        const tetoBazin = r.yieldDesejado > 0 ? r.divAnual / (r.yieldDesejado / 100) : null;
        const tetoGraham = r.lpa > 0 && r.vpa > 0 ? Math.sqrt(22.5 * r.lpa * r.vpa) : null;
        const validos = [tetoBazin, tetoGraham].filter((v) => v != null && v > 0);
        const tetoConservador = validos.length ? Math.min(...validos) : null;
        const margem = tetoConservador != null && r.preco > 0 ? ((tetoConservador - r.preco) / r.preco) * 100 : null;
        return { ...r, tetoBazin, tetoGraham, margem };
      }),
    [rows]
  );

  return (
    <div className="card-surface" style={{ background: PALETTE.surface, border: `1px solid ${PALETTE.line}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
        <div>
          <div className="display" style={{ fontSize: 16, fontWeight: 500 }}>
            Ações — Bazin &amp; Graham
          </div>
          <div style={{ fontSize: 11.5, color: PALETTE.textMuted, marginTop: 2 }}>
            Bazin: Dividendo Anual ÷ Yield desejado. Graham: √(22,5 × LPA × VPA). Margem usa o menor teto entre os dois.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "14px 0" }}>
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscarEAdicionar()}
          placeholder="Ticker (ex: PETR4)"
          style={tickerInputStyle}
        />
        <button onClick={() => buscarEAdicionar()} disabled={!!loadingTicker} style={{ ...addBtnStyle, opacity: loadingTicker ? 0.6 : 1 }}>
          {loadingTicker ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}
          Adicionar
        </button>
      </div>
      {error && <div style={{ color: PALETTE.crimson, fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

      {calculadas.length === 0 ? (
        <div style={{ color: PALETTE.textMuted, padding: 24, textAlign: "center", fontSize: 13 }}>
          Adicione uma ação para calcular o preço teto.
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${PALETTE.line}` }}>
          <table style={{ width: "100%", minWidth: 920, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: PALETTE.surfaceAlt, borderBottom: `1px solid ${PALETTE.line}` }}>
                <th style={thStyle("left")}>Ação</th>
                <th style={thStyle("right")}>Preço</th>
                <th style={thStyle("right")}>Div. Anual</th>
                <th style={thStyle("right")}>Yield Desej. %</th>
                <th style={thStyle("right")}>LPA</th>
                <th style={thStyle("right")}>VPA</th>
                <th style={{ ...thStyle("right"), color: PALETTE.gold }}>Teto Bazin</th>
                <th style={{ ...thStyle("right"), color: PALETTE.gold }}>Teto Graham</th>
                <th style={thStyle("right")}>Margem</th>
                <th style={thStyle("center")}></th>
              </tr>
            </thead>
            <tbody>
              {calculadas.map((r, i) => (
                <tr key={r.ticker} style={{ borderBottom: i < calculadas.length - 1 ? `1px dashed ${PALETTE.line}` : "none" }}>
                  <td style={tdStyle("left")}>
                    <div className="mono" style={{ fontWeight: 700, fontSize: 13 }}>
                      {r.ticker}
                    </div>
                    <div style={{ fontSize: 10.5, color: PALETTE.textMuted, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.nome}
                    </div>
                  </td>
                  <td style={tdStyle("right")} className="mono">
                    {formatBRL(r.preco)}
                    <button onClick={() => buscarEAdicionar(r.ticker)} title="Atualizar cotação" style={{ background: "transparent", border: "none", cursor: "pointer", verticalAlign: "middle", marginLeft: 4 }}>
                      <RefreshCw size={11} color={PALETTE.textMuted} />
                    </button>
                  </td>
                  <td style={tdStyle("right")}>
                    <input style={numInputStyle} type="number" step="0.01" value={r.divAnual} onChange={(e) => atualizarCampo(r.ticker, "divAnual", Number(e.target.value))} />
                  </td>
                  <td style={tdStyle("right")}>
                    <input style={numInputStyle} type="number" step="0.1" value={r.yieldDesejado} onChange={(e) => atualizarCampo(r.ticker, "yieldDesejado", Number(e.target.value))} />
                  </td>
                  <td style={tdStyle("right")}>
                    <input style={numInputStyle} type="number" step="0.01" value={r.lpa} onChange={(e) => atualizarCampo(r.ticker, "lpa", Number(e.target.value))} />
                  </td>
                  <td style={tdStyle("right")}>
                    <input style={numInputStyle} type="number" step="0.01" value={r.vpa} onChange={(e) => atualizarCampo(r.ticker, "vpa", Number(e.target.value))} />
                  </td>
                  <td style={tdStyle("right", { background: "rgba(212,169,79,0.08)" })} className="mono">
                    {r.tetoBazin != null ? formatBRL(r.tetoBazin) : "—"}
                  </td>
                  <td style={tdStyle("right", { background: "rgba(212,169,79,0.08)" })} className="mono">
                    {r.tetoGraham != null ? formatBRL(r.tetoGraham) : "não aplicável"}
                  </td>
                  <td style={tdStyle("right")}>{margemBadge(r.margem)}</td>
                  <td style={tdStyle("center")}>
                    <button onClick={() => remover(r.ticker)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }} aria-label="Remover">
                      <Trash2 size={14} color={PALETTE.crimson} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CalculadoraFiis({ ranking }) {
  const [rows, setRows] = useState(() => carregar(LS_FIIS));
  const [ticker, setTicker] = useState("");
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => salvar(LS_FIIS, rows), [rows]);

  useEffect(() => {
    if (!ranking || !ticker.trim()) {
      setSuggestions([]);
      return;
    }
    const q = ticker.trim().toUpperCase();
    const matches = [...ranking.keys()].filter((t) => t.includes(q)).slice(0, 8);
    setSuggestions(matches);
  }, [ticker, ranking]);

  function adicionar(tickerAlvo) {
    const clean = String(tickerAlvo || ticker).trim().toUpperCase();
    if (!clean) return;
    setShowSuggestions(false);
    setError("");
    if (!ranking) return;
    const item = ranking.get(clean);
    if (!item) {
      setError(`${clean} não encontrado na base de FIIs.`);
      return;
    }
    const dividendo12m = item.dividendYield != null ? Number(((item.cotacao * item.dividendYield) / 100).toFixed(2)) : 0;
    const novaLinha = {
      ticker: item.ticker,
      preco: item.cotacao || 0,
      dividendo12m,
      ipcaMais: 7,
      premio: 2,
    };
    setRows((rs) => {
      const existe = rs.findIndex((r) => r.ticker === novaLinha.ticker);
      if (existe >= 0) {
        const copia = [...rs];
        copia[existe] = { ...copia[existe], preco: novaLinha.preco };
        return copia;
      }
      return [...rs, novaLinha];
    });
    setTicker("");
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
        const taxaTotal = (r.ipcaMais || 0) + (r.premio || 0);
        const precoIdeal = taxaTotal > 0 ? r.dividendo12m / (taxaTotal / 100) : null;
        const margem = precoIdeal != null && r.preco > 0 ? ((precoIdeal - r.preco) / r.preco) * 100 : null;
        return { ...r, precoIdeal, margem };
      }),
    [rows]
  );

  return (
    <div className="card-surface" style={{ background: PALETTE.surface, border: `1px solid ${PALETTE.line}`, borderRadius: 10, padding: 20 }}>
      <div>
        <div className="display" style={{ fontSize: 16, fontWeight: 500 }}>
          FIIs — IPCA+ e Prêmio de Risco
        </div>
        <div style={{ fontSize: 11.5, color: PALETTE.textMuted, marginTop: 2 }}>
          Preço Ideal = Dividendo 12M ÷ (IPCA+ desejado + Prêmio de risco). Dividendo 12M é estimado a partir do
          Dividend Yield do Fundamentus e pode ser editado.
        </div>
      </div>

      <div style={{ position: "relative", display: "flex", gap: 8, alignItems: "center", margin: "14px 0", maxWidth: 320 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            value={ticker}
            onChange={(e) => {
              setTicker(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Ticker (ex: MXRF11)"
            style={{ ...tickerInputStyle, width: "100%" }}
          />
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
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              {suggestions.map((s) => (
                <div
                  key={s}
                  onMouseDown={() => adicionar(s)}
                  style={{ padding: "7px 10px", fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = PALETTE.surfaceAlt)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => adicionar()} style={addBtnStyle}>
          <Plus size={15} /> Adicionar
        </button>
      </div>
      {error && <div style={{ color: PALETTE.crimson, fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

      {calculadas.length === 0 ? (
        <div style={{ color: PALETTE.textMuted, padding: 24, textAlign: "center", fontSize: 13 }}>
          Adicione um FII para calcular o preço ideal.
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${PALETTE.line}` }}>
          <table style={{ width: "100%", minWidth: 680, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: PALETTE.surfaceAlt, borderBottom: `1px solid ${PALETTE.line}` }}>
                <th style={thStyle("left")}>Fundo</th>
                <th style={thStyle("right")}>Preço</th>
                <th style={thStyle("right")}>Dividendo 12M</th>
                <th style={thStyle("right")}>IPCA+ %</th>
                <th style={thStyle("right")}>Prêmio %</th>
                <th style={{ ...thStyle("right"), color: PALETTE.gold }}>Preço Ideal</th>
                <th style={thStyle("right")}>Margem de Seg.</th>
                <th style={thStyle("center")}></th>
              </tr>
            </thead>
            <tbody>
              {calculadas.map((r, i) => (
                <tr key={r.ticker} style={{ borderBottom: i < calculadas.length - 1 ? `1px dashed ${PALETTE.line}` : "none" }}>
                  <td style={tdStyle("left")} className="mono">
                    <span style={{ fontWeight: 700 }}>{r.ticker}</span>
                  </td>
                  <td style={tdStyle("right")}>
                    <input style={numInputStyle} type="number" step="0.01" value={r.preco} onChange={(e) => atualizarCampo(r.ticker, "preco", Number(e.target.value))} />
                  </td>
                  <td style={tdStyle("right")}>
                    <input style={numInputStyle} type="number" step="0.01" value={r.dividendo12m} onChange={(e) => atualizarCampo(r.ticker, "dividendo12m", Number(e.target.value))} />
                  </td>
                  <td style={tdStyle("right")}>
                    <input style={numInputStyle} type="number" step="0.1" value={r.ipcaMais} onChange={(e) => atualizarCampo(r.ticker, "ipcaMais", Number(e.target.value))} />
                  </td>
                  <td style={tdStyle("right")}>
                    <input style={numInputStyle} type="number" step="0.1" value={r.premio} onChange={(e) => atualizarCampo(r.ticker, "premio", Number(e.target.value))} />
                  </td>
                  <td style={tdStyle("right", { background: "rgba(212,169,79,0.08)" })} className="mono">
                    {r.precoIdeal != null ? formatBRL(r.precoIdeal) : "—"}
                  </td>
                  <td style={tdStyle("right")}>{margemBadge(r.margem)}</td>
                  <td style={tdStyle("center")}>
                    <button onClick={() => remover(r.ticker)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }} aria-label="Remover">
                      <Trash2 size={14} color={PALETTE.crimson} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function refBenchmark(tipoFundo, tesouro) {
  if (!tesouro) return null;
  return tipoFundo === "Papel" ? tesouro.prefixado : tesouro.ipca;
}

function CalculadoraFiisGordon({ ranking, tesouro }) {
  const [rows, setRows] = useState(() => carregar(LS_GORDON));
  const [ticker, setTicker] = useState("");
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => salvar(LS_GORDON, rows), [rows]);

  useEffect(() => {
    if (!ranking || !ticker.trim()) {
      setSuggestions([]);
      return;
    }
    const q = ticker.trim().toUpperCase();
    setSuggestions([...ranking.keys()].filter((t) => t.includes(q)).slice(0, 8));
  }, [ticker, ranking]);

  function adicionar(tickerAlvo) {
    const clean = String(tickerAlvo || ticker).trim().toUpperCase();
    if (!clean) return;
    setShowSuggestions(false);
    setError("");
    if (!ranking) return;
    const item = ranking.get(clean);
    if (!item) {
      setError(`${clean} não encontrado na base de FIIs.`);
      return;
    }
    const dividendoAnual = item.dividendYield != null ? Number(((item.cotacao * item.dividendYield) / 100).toFixed(2)) : 0;
    const ref = refBenchmark(item.tipo, tesouro);
    const novaLinha = {
      ticker: item.ticker,
      tipo: item.tipo,
      preco: item.cotacao || 0,
      dividendoAnual,
      tituloRef: ref ? ref.titulo : "—",
      taxaBase: ref ? ref.taxaLiquida : 0,
      premio: 2,
      crescimento: 0,
    };
    setRows((rs) => {
      const existe = rs.findIndex((r) => r.ticker === novaLinha.ticker);
      if (existe >= 0) {
        const copia = [...rs];
        copia[existe] = { ...copia[existe], preco: novaLinha.preco, tipo: novaLinha.tipo };
        return copia;
      }
      return [...rs, novaLinha];
    });
    setTicker("");
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
        const fallback = refBenchmark(r.tipo, tesouro);
        const taxaBase = r.taxaBase ?? fallback?.taxaLiquida ?? 0;
        const tituloRef = r.tituloRef ?? fallback?.titulo ?? "—";
        const k = taxaBase + r.premio;
        const denom = k - r.crescimento;
        const precoJusto = denom > 0 ? r.dividendoAnual / (denom / 100) : null;
        const margem = precoJusto != null && r.preco > 0 ? ((precoJusto - r.preco) / r.preco) * 100 : null;
        return { ...r, taxaBase, tituloRef, k, precoJusto, margem };
      }),
    [rows, tesouro]
  );

  return (
    <div className="card-surface" style={{ background: PALETTE.surface, border: `1px solid ${PALETTE.line}`, borderRadius: 10, padding: 20, marginTop: 24 }}>
      <div>
        <div className="display" style={{ fontSize: 16, fontWeight: 500 }}>
          FIIs — Modelo de Gordon
        </div>
        <div style={{ fontSize: 11.5, color: PALETTE.textMuted, marginTop: 2 }}>
          Preço Justo = D ÷ (K − g), onde D é o dividendo anual, K a taxa de desconto (Tesouro líquido de IR + prêmio
          de risco) e g o crescimento real esperado dos dividendos. Fundos de Tijolo/Híbrido usam o Tesouro IPCA+
          como referência; fundos de Papel usam o Tesouro Prefixado (a inflação já está embutida no dividendo).
          {tesouro && (
            <>
              {" "}
              Taxas de {tesouro.dataBase}: IPCA+ {tesouro.ipca.taxaBruta}% bruto ({tesouro.ipca.taxaLiquida}%
              líquido) · Prefixado {tesouro.prefixado.taxaBruta}% bruto ({tesouro.prefixado.taxaLiquida}% líquido).
            </>
          )}
        </div>
      </div>

      <div style={{ position: "relative", display: "flex", gap: 8, alignItems: "center", margin: "14px 0", maxWidth: 320 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            value={ticker}
            onChange={(e) => {
              setTicker(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Ticker (ex: GARE11)"
            style={{ ...tickerInputStyle, width: "100%" }}
          />
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
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              {suggestions.map((s) => (
                <div
                  key={s}
                  onMouseDown={() => adicionar(s)}
                  style={{ padding: "7px 10px", fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = PALETTE.surfaceAlt)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => adicionar()} style={addBtnStyle}>
          <Plus size={15} /> Adicionar
        </button>
      </div>
      {error && <div style={{ color: PALETTE.crimson, fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

      {calculadas.length === 0 ? (
        <div style={{ color: PALETTE.textMuted, padding: 24, textAlign: "center", fontSize: 13 }}>
          Adicione um FII para calcular o preço justo pelo modelo de Gordon.
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${PALETTE.line}` }}>
          <table style={{ width: "100%", minWidth: 920, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: PALETTE.surfaceAlt, borderBottom: `1px solid ${PALETTE.line}` }}>
                <th style={thStyle("left")}>Fundo</th>
                <th style={thStyle("left")}>Tipo</th>
                <th style={thStyle("right")}>Preço</th>
                <th style={thStyle("right")}>D (Div. Anual)</th>
                <th style={thStyle("left")}>K (IPCA+ %)</th>
                <th style={thStyle("right")}>Prêmio %</th>
                <th style={thStyle("right")}>g %</th>
                <th style={thStyle("right")}>K %</th>
                <th style={{ ...thStyle("right"), color: PALETTE.gold }}>Preço Justo</th>
                <th style={thStyle("right")}>Desconto</th>
                <th style={thStyle("center")}></th>
              </tr>
            </thead>
            <tbody>
              {calculadas.map((r, i) => (
                <tr key={r.ticker} style={{ borderBottom: i < calculadas.length - 1 ? `1px dashed ${PALETTE.line}` : "none" }}>
                  <td style={tdStyle("left")} className="mono">
                    <span style={{ fontWeight: 700 }}>{r.ticker}</span>
                  </td>
                  <td style={tdStyle("left")}>
                    <span style={{ fontSize: 11.5, color: PALETTE.textMuted }}>{r.tipo}</span>
                  </td>
                  <td style={tdStyle("right")}>
                    <input style={numInputStyle} type="number" step="0.01" value={r.preco} onChange={(e) => atualizarCampo(r.ticker, "preco", Number(e.target.value))} />
                  </td>
                  <td style={tdStyle("right")}>
                    <input style={numInputStyle} type="number" step="0.01" value={r.dividendoAnual} onChange={(e) => atualizarCampo(r.ticker, "dividendoAnual", Number(e.target.value))} />
                  </td>
                  <td style={tdStyle("left")}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <input
                        style={{ ...numInputStyle, width: 64, textAlign: "left" }}
                        type="number"
                        step="0.01"
                        value={r.taxaBase}
                        onChange={(e) => atualizarCampo(r.ticker, "taxaBase", Number(e.target.value))}
                      />
                      <span style={{ fontSize: 11.5, color: PALETTE.textMuted }}>%</span>
                    </div>
                  </td>
                  <td style={tdStyle("right")}>
                    <input style={numInputStyle} type="number" step="0.1" value={r.premio} onChange={(e) => atualizarCampo(r.ticker, "premio", Number(e.target.value))} />
                  </td>
                  <td style={tdStyle("right")}>
                    <input style={numInputStyle} type="number" step="0.1" value={r.crescimento} onChange={(e) => atualizarCampo(r.ticker, "crescimento", Number(e.target.value))} />
                  </td>
                  <td style={tdStyle("right")} className="mono">
                    {r.k != null ? `${r.k.toFixed(2)}%` : "—"}
                  </td>
                  <td style={tdStyle("right", { background: "rgba(212,169,79,0.08)" })} className="mono">
                    {r.precoJusto != null ? formatBRL(r.precoJusto) : "não aplicável"}
                  </td>
                  <td style={tdStyle("right")}>{margemBadge(r.margem)}</td>
                  <td style={tdStyle("center")}>
                    <button onClick={() => remover(r.ticker)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }} aria-label="Remover">
                      <Trash2 size={14} color={PALETTE.crimson} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
