import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LabelList } from "recharts";
import { PALETTE, BAR_COLORS } from "../constants.js";
import { formatBRL } from "../utils.js";

const FONT = "'Hanken Grotesk', sans-serif";

const compactBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

const tooltipProps = {
  formatter: (v) => [formatBRL(v), "Valor"],
  contentStyle: {
    background: PALETTE.surfaceAlt,
    border: `1px solid ${PALETTE.line}`,
    borderRadius: 8,
    fontFamily: FONT,
    fontSize: 13,
    fontVariantNumeric: "tabular-nums",
    boxShadow: "0 8px 24px -8px rgba(0,0,0,0.5)",
  },
  labelStyle: { color: PALETTE.textPrimary, fontWeight: 600 },
  itemStyle: { color: PALETTE.textMuted },
};

/** Moldura comum dos blocos do painel: título à esquerda, contexto opcional à direita. */
export function Panel({ title, aside, children, className }) {
  return (
    <section className={`panel ${className || ""}`}>
      <div className="panel-head">
        <h2 className="panel-title">{title}</h2>
        {aside && <div className="panel-aside num">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

function Vazio({ children = "Nenhum aporte neste período." }) {
  return <div className="panel-empty">{children}</div>;
}

/** Barras planas: todas em tom neutro, só o período em foco ganha a cor de destaque. */
function useIsNarrowViewport(breakpoint = 560) {
  const [narrow, setNarrow] = useState(() => (typeof window !== "undefined" ? window.innerWidth < breakpoint : false));
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return narrow;
}

// Coluna 3D no estilo do Excel: frente na cor base, topo mais claro, lateral mais escura
const BARRA_3D = { frente: "#4F7BE0", topo: "#7E9FEC", lado: "#2F55B0" };

function profundidade(width) {
  return Math.max(4, Math.min(12, width * 0.22));
}

function Barra3D({ x, y, width, height }) {
  if (!height || height <= 0) return null;
  const d = profundidade(width);
  const w = width - d;
  return (
    <g>
      <path d={`M${x + w},${y} L${x + w + d},${y - d} L${x + w + d},${y + height - d} L${x + w},${y + height} Z`} fill={BARRA_3D.lado} />
      <path d={`M${x},${y} L${x + d},${y - d} L${x + w + d},${y - d} L${x + w},${y} Z`} fill={BARRA_3D.topo} />
      <rect x={x} y={y} width={w} height={height} fill={BARRA_3D.frente} />
    </g>
  );
}

let contextoMedida;
function larguraTexto(texto) {
  if (!contextoMedida) {
    contextoMedida = document.createElement("canvas").getContext("2d");
    contextoMedida.font = `600 11.5px ${FONT}`;
  }
  return contextoMedida.measureText(texto).width;
}

function larguraCaixa(texto) {
  return Math.ceil(larguraTexto(texto)) + 14;
}

function RotuloValor({ x, y, width, value, texto }) {
  if (!value) return null;
  const d = profundidade(width);
  const caixaW = larguraCaixa(texto);
  const cx = Math.max(caixaW / 2 + 1, x + (width - d) / 2 + d / 2);
  const by = y - d - 26;
  return (
    <g>
      <rect x={cx - caixaW / 2} y={by} width={caixaW} height={20} rx={4} fill={PALETTE.surfaceAlt} stroke="rgba(126,159,236,0.55)" />
      <text x={cx} y={by + 14} textAnchor="middle" fill={PALETTE.textPrimary} fontSize={11.5} fontWeight={600} fontFamily={FONT} style={{ fontVariantNumeric: "tabular-nums" }}>
        {texto}
      </text>
    </g>
  );
}

export function ChartCard({ title, data, highlight, tickFormatter, className }) {
  const reducedMotion = usePrefersReducedMotion();
  // No celular as caixas de valor se sobrepõem: mostra só a do período em destaque (as outras ficam no toque)
  const narrow = useIsNarrowViewport();
  const total = data.reduce((s, d) => s + d.value, 0);
  const [largura, setLargura] = useState(0);
  // Espaço horizontal de cada coluna, para escolher o rótulo mais completo que cabe sem sobrepor o vizinho
  const espacoColuna = data.length ? (largura - 12) / data.length - 6 : 0;
  return (
    <Panel title={title} aside={data.length ? formatBRL(total) : null} className={className}>
      {data.length === 0 ? (
        <Vazio />
      ) : (
        <ResponsiveContainer width="100%" height={300} onResize={(w) => setLargura(w)}>
          <BarChart data={data} margin={{ top: 44, right: 8, left: 4, bottom: 0 }} barCategoryGap="18%">
            <XAxis
              dataKey="name"
              tick={{ fill: PALETTE.textMuted, fontSize: 12, fontFamily: FONT }}
              tickFormatter={tickFormatter}
              axisLine={{ stroke: PALETTE.line }}
              tickLine={false}
              interval={0}
            />
            <YAxis hide domain={[0, "dataMax"]} />
            <Tooltip {...tooltipProps} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="value" shape={Barra3D} fill={BARRA_3D.frente} isAnimationActive={!reducedMotion} animationDuration={600} animationEasing="ease-out">
              <LabelList
                dataKey="value"
                content={(p) => {
                  const destaque = data[p.index] && data[p.index].name === highlight;
                  // Do mais completo ao mais curto; o "R$" pode sair porque o título já diz a moeda
                  const semMoeda = (t) => t.replace(/R\$\s?/, "");
                  const completo = formatBRL(p.value || 0);
                  const compacto = compactBRL.format(p.value || 0);
                  const opcoes = [completo, semMoeda(completo), compacto, semMoeda(compacto)];
                  const texto = opcoes.find((t) => larguraCaixa(t) <= espacoColuna);
                  if (!texto || narrow) return destaque ? <RotuloValor {...p} texto={compacto} /> : null;
                  return <RotuloValor {...p} texto={texto} />;
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

/** Ranking de ativos como lista: nomes longos ("CDB DI Itaú - Mar/2030") ficam legíveis. */
export function AtivosList({ title, data, className }) {
  const [verTodos, setVerTodos] = useState(false);
  const positivos = data.filter((d) => d.value > 0);
  const max = positivos.length ? positivos[0].value : 0;
  const LIMITE = 8;
  const visiveis = verTodos ? positivos : positivos.slice(0, LIMITE);
  return (
    <Panel title={title} aside={positivos.length ? `${positivos.length} ativos` : null} className={className}>
      {positivos.length === 0 ? (
        <Vazio />
      ) : (
        <>
          <ol className="ranking">
            {visiveis.map((d) => (
              <li key={d.name}>
                <span className="ranking-nome" title={d.name}>{d.name}</span>
                <span className="ranking-trilho" aria-hidden="true">
                  <span style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }} />
                </span>
                <span className="ranking-valor num">{formatBRL(d.value)}</span>
              </li>
            ))}
          </ol>
          {positivos.length > LIMITE && (
            <button type="button" className="link-btn" onClick={() => setVerTodos((v) => !v)}>
              {verTodos ? "Mostrar menos" : `Ver todos os ${positivos.length} ativos`}
            </button>
          )}
        </>
      )}
    </Panel>
  );
}

export function PieChartCard({ title, data, colorMap, className }) {
  const reducedMotion = usePrefersReducedMotion();
  const positivos = data.filter((d) => d.value > 0);
  const total = positivos.reduce((s, d) => s + d.value, 0);
  const sorted = [...positivos].sort((a, b) => b.value - a.value);
  const colors = sorted.map((d, i) => (colorMap && colorMap[d.name]) || BAR_COLORS[i % BAR_COLORS.length]);
  return (
    <Panel title={title} className={className}>
      {total === 0 ? (
        <Vazio />
      ) : (
        <div className="classes">
          <div className="classes-rosca">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={sorted}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={84}
                  startAngle={90}
                  endAngle={-270}
                  stroke={PALETTE.surface}
                  strokeWidth={2}
                  isAnimationActive={!reducedMotion}
                  animationDuration={700}
                >
                  {sorted.map((d, i) => (
                    <Cell key={d.name} fill={colors[i]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipProps} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="legenda">
            {sorted.map((d, i) => (
              <li key={d.name}>
                <span className="legenda-cor" style={{ background: colors[i] }} />
                <span className="legenda-nome">{d.name}</span>
                <span className="legenda-pct num">{((d.value / total) * 100).toFixed(1).replace(".", ",")}%</span>
                <span className="legenda-valor num">{formatBRL(d.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
