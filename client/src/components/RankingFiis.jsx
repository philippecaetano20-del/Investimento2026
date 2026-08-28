import React, { useState, useEffect, useMemo } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, RotateCcw, Star } from "lucide-react";
import { PALETTE } from "../constants.js";
import { formatBRL } from "../utils.js";
import { api } from "../api.js";

const COLUNAS = [
  { key: "ticker", label: "Fundo", align: "left" },
  { key: "segmento", label: "Segmento", align: "left" },
  { key: "tipo", label: "Tipo", align: "left" },
  { key: "cotacao", label: "Cotação", align: "right", format: (v) => formatBRL(v) },
  { key: "dividendYield", label: "Dividend Yield", align: "right", format: (v) => `${v.toFixed(2)}%` },
  { key: "pvp", label: "P/VP", align: "right", format: (v) => v.toFixed(2) },
  { key: "liquidez", label: "Liquidez", align: "right", format: (v) => formatBRL(v) },
  { key: "qtdImoveis", label: "Nº Imóveis", align: "right", format: (v) => String(v) },
  { key: "vacancia", label: "Vacância", align: "right", format: (v) => `${v.toFixed(2)}%` },
];

const GRID = "minmax(75px,0.9fr) minmax(120px,1.3fr) minmax(75px,0.75fr) minmax(85px,0.9fr) minmax(95px,1fr) minmax(65px,0.7fr) minmax(95px,1fr) minmax(85px,0.9fr) minmax(85px,0.9fr)";

const PASSO = 25;

const inputStyle = {
  background: PALETTE.bg,
  border: `1px solid ${PALETTE.line}`,
  borderRadius: 6,
  padding: "7px 9px",
  color: PALETTE.textPrimary,
  fontSize: 12.5,
  fontFamily: "'IBM Plex Mono', monospace",
  width: "100%",
};

const fieldLabel = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: PALETTE.textMuted,
  marginBottom: 5,
};

export function RankingFiis({ ativosList }) {
  const [items, setItems] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [busca, setBusca] = useState("");
  const [segmento, setSegmento] = useState("");
  const [tipo, setTipo] = useState("");
  const [dyMin, setDyMin] = useState("");
  const [pvpMax, setPvpMax] = useState("");
  const [liquidezMin, setLiquidezMin] = useState("");
  const [vacanciaMax, setVacanciaMax] = useState("");

  const [sort, setSort] = useState({ key: "pvp", dir: "asc" });
  const [visivel, setVisivel] = useState(PASSO);

  useEffect(() => {
    setLoading(true);
    api
      .getFiiRanking()
      .then((data) => {
        setItems(data.items || []);
        setUpdatedAt(data.updatedAt || null);
      })
      .catch((e) => setError(e.message || "Não foi possível carregar o ranking de FIIs."))
      .finally(() => setLoading(false));
  }, []);

  const carteira = useMemo(() => new Set((ativosList || []).map((a) => String(a).toUpperCase())), [ativosList]);

  const segmentos = useMemo(() => Array.from(new Set(items.map((i) => i.segmento))).sort((a, b) => a.localeCompare(b, "pt-BR")), [items]);
  const tipos = useMemo(() => Array.from(new Set(items.map((i) => i.tipo))).sort((a, b) => a.localeCompare(b, "pt-BR")), [items]);

  const filtrados = useMemo(() => {
    const buscaU = busca.trim().toUpperCase();
    return items.filter((it) => {
      if (buscaU && !it.ticker.includes(buscaU)) return false;
      if (segmento && it.segmento !== segmento) return false;
      if (tipo && it.tipo !== tipo) return false;
      if (dyMin !== "" && (it.dividendYield ?? 0) < Number(dyMin)) return false;
      if (pvpMax !== "" && (it.pvp ?? Infinity) > Number(pvpMax)) return false;
      if (liquidezMin !== "" && (it.liquidez ?? 0) < Number(liquidezMin)) return false;
      if (vacanciaMax !== "" && (it.vacancia ?? 0) > Number(vacanciaMax)) return false;
      return true;
    });
  }, [items, busca, segmento, tipo, dyMin, pvpMax, liquidezMin, vacanciaMax]);

  const ordenados = useMemo(() => {
    const copia = [...filtrados];
    copia.sort((a, b) => {
      if (sort.key === "ticker" || sort.key === "segmento" || sort.key === "tipo") {
        const cmp = String(a[sort.key]).localeCompare(String(b[sort.key]), "pt-BR");
        return sort.dir === "asc" ? cmp : -cmp;
      }
      const av = a[sort.key] ?? (sort.dir === "asc" ? Infinity : -Infinity);
      const bv = b[sort.key] ?? (sort.dir === "asc" ? Infinity : -Infinity);
      return sort.dir === "asc" ? av - bv : bv - av;
    });
    return copia;
  }, [filtrados, sort]);

  function alternarOrdenacao(key) {
    setVisivel(PASSO);
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "pvp" ? "asc" : "desc" }));
  }

  function limparFiltros() {
    setBusca("");
    setSegmento("");
    setTipo("");
    setDyMin("");
    setPvpMax("");
    setLiquidezMin("");
    setVacanciaMax("");
    setVisivel(PASSO);
  }

  const filtrosAtivos = busca || segmento || tipo || dyMin !== "" || pvpMax !== "" || liquidezMin !== "" || vacanciaMax !== "";
  const visiveis = ordenados.slice(0, visivel);

  return (
    <div className="card-surface" style={{ background: PALETTE.surface, border: `1px solid ${PALETTE.line}`, borderRadius: 10, padding: 20, marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <div>
          <div className="display" style={{ fontSize: 16, fontWeight: 500 }}>
            Ranking de FIIs
          </div>
          <div style={{ fontSize: 11.5, color: PALETTE.textMuted, marginTop: 2 }}>
            Ordene por P/VP para ver os fundos mais descontados. Dados: Fundamentus
            {updatedAt ? ` · atualizado ${new Date(updatedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""}
          </div>
        </div>
        {filtrosAtivos && (
          <button
            onClick={limparFiltros}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "transparent",
              border: `1px solid ${PALETTE.line}`,
              color: PALETTE.gold,
              borderRadius: 6,
              padding: "5px 10px",
              fontSize: 11.5,
              fontFamily: "'Manrope', sans-serif",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={12} /> Limpar filtros
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div>
          <div style={fieldLabel}>Buscar</div>
          <input style={inputStyle} placeholder="Ticker" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div>
          <div style={fieldLabel}>Segmento</div>
          <select style={inputStyle} value={segmento} onChange={(e) => setSegmento(e.target.value)}>
            <option value="">Todos</option>
            {segmentos.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={fieldLabel}>Tipo</div>
          <select style={inputStyle} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={fieldLabel}>DY mínimo %</div>
          <input style={inputStyle} type="number" placeholder="ex: 7" value={dyMin} onChange={(e) => setDyMin(e.target.value)} />
        </div>
        <div>
          <div style={fieldLabel}>P/VP máximo</div>
          <input style={inputStyle} type="number" step="0.01" placeholder="ex: 1.00" value={pvpMax} onChange={(e) => setPvpMax(e.target.value)} />
        </div>
        <div>
          <div style={fieldLabel}>Liquidez mínima</div>
          <input style={inputStyle} type="number" placeholder="R$/dia" value={liquidezMin} onChange={(e) => setLiquidezMin(e.target.value)} />
        </div>
        <div>
          <div style={fieldLabel}>Vacância máxima %</div>
          <input style={inputStyle} type="number" placeholder="ex: 15" value={vacanciaMax} onChange={(e) => setVacanciaMax(e.target.value)} />
        </div>
      </div>

      {error && <div style={{ color: PALETTE.crimsonText, fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ color: PALETTE.textMuted, padding: 30, textAlign: "center", fontSize: 13 }}>Carregando ranking de FIIs...</div>
      ) : (
        <>
          <div style={{ fontSize: 11.5, color: PALETTE.textMuted, marginBottom: 8 }}>
            Mostrando {visiveis.length} de {ordenados.length} FIIs
          </div>
          <div style={{ borderRadius: 8, border: `1px solid ${PALETTE.line}`, overflow: "hidden", overflowX: "auto" }}>
            <div style={{ minWidth: 900 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: GRID,
                  gap: 8,
                  padding: "9px 14px",
                  background: PALETTE.surfaceAlt,
                  borderBottom: `1px solid ${PALETTE.line}`,
                }}
              >
                {COLUNAS.map((col) => {
                  const ativo = sort.key === col.key;
                  return (
                    <button
                      key={col.key}
                      onClick={() => alternarOrdenacao(col.key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        justifyContent: col.align === "right" ? "flex-end" : "flex-start",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        fontSize: 10,
                        fontFamily: "'Manrope', sans-serif",
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        color: ativo ? PALETTE.gold : PALETTE.textMuted,
                        textTransform: "uppercase",
                      }}
                    >
                      {col.label}
                      {ativo ? sort.dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} /> : <ArrowUpDown size={11} opacity={0.4} />}
                    </button>
                  );
                })}
              </div>

              {visiveis.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: PALETTE.textMuted, fontSize: 13 }}>Nenhum FII encontrado para esses filtros.</div>
              ) : (
                visiveis.map((it, i) => {
                  const naCarteira = carteira.has(it.ticker);
                  return (
                    <div
                      key={it.ticker}
                      style={{
                        display: "grid",
                        gridTemplateColumns: GRID,
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 14px",
                        borderBottom: i < visiveis.length - 1 ? `1px dashed ${PALETTE.line}` : "none",
                        borderLeft: naCarteira ? `2px solid ${PALETTE.gold}` : "2px solid transparent",
                        fontSize: 12.5,
                      }}
                    >
                      <div className="mono" style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        {naCarteira && <Star size={10} color={PALETTE.gold} fill={PALETTE.gold} />}
                        {it.ticker}
                      </div>
                      <div style={{ fontSize: 11.5, color: PALETTE.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {it.segmento}
                      </div>
                      <div style={{ fontSize: 11.5, color: PALETTE.textMuted }}>{it.tipo}</div>
                      <div className="mono" style={{ textAlign: "right" }}>
                        {it.cotacao != null ? formatBRL(it.cotacao) : "—"}
                      </div>
                      <div className="mono" style={{ textAlign: "right", color: PALETTE.emerald }}>
                        {it.dividendYield != null ? `${it.dividendYield.toFixed(2)}%` : "—"}
                      </div>
                      <div className="mono" style={{ textAlign: "right", fontWeight: 600 }}>
                        {it.pvp != null ? it.pvp.toFixed(2) : "—"}
                      </div>
                      <div className="mono" style={{ textAlign: "right", color: PALETTE.textMuted }}>
                        {it.liquidez != null ? formatBRL(it.liquidez) : "—"}
                      </div>
                      <div className="mono" style={{ textAlign: "right", color: PALETTE.textMuted }}>
                        {it.qtdImoveis ?? "—"}
                      </div>
                      <div className="mono" style={{ textAlign: "right", color: PALETTE.textMuted }}>
                        {it.vacancia != null ? `${it.vacancia.toFixed(2)}%` : "—"}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {visivel < ordenados.length && (
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button
                onClick={() => setVisivel((v) => v + PASSO)}
                style={{
                  background: "transparent",
                  border: `1px solid ${PALETTE.line}`,
                  color: PALETTE.textPrimary,
                  borderRadius: 6,
                  padding: "7px 16px",
                  fontSize: 12.5,
                  fontFamily: "'Manrope', sans-serif",
                  cursor: "pointer",
                }}
              >
                Mostrar mais
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
