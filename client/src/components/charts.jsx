import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { PALETTE, BAR_COLORS } from "../constants.js";
import { formatBRL } from "../utils.js";

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

export function shadeColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + Math.round(255 * percent);
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * percent);
  let b = (num & 0x0000ff) + Math.round(255 * percent);
  r = Math.max(Math.min(255, r), 0);
  g = Math.max(Math.min(255, g), 0);
  b = Math.max(Math.min(255, b), 0);
  return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

export function Bar3DShape(props) {
  const { x, y, width, height, fill } = props;
  if (height <= 0) return null;
  const w = width * 0.62;
  const depth = Math.min(16, width * 0.3);
  const x0 = x + (width - w - depth) / 2;
  const y0 = y;
  const topColor = shadeColor(fill, 0.28);
  const sideColor = shadeColor(fill, -0.22);

  const front = `M${x0},${y0} L${x0 + w},${y0} L${x0 + w},${y0 + height} L${x0},${y0 + height} Z`;
  const top = `M${x0},${y0} L${x0 + depth},${y0 - depth} L${x0 + w + depth},${y0 - depth} L${x0 + w},${y0} Z`;
  const side = `M${x0 + w},${y0} L${x0 + w + depth},${y0 - depth} L${x0 + w + depth},${y0 + height - depth} L${x0 + w},${y0 + height} Z`;

  return (
    <g>
      <path d={side} fill={sideColor} />
      <path d={top} fill={topColor} />
      <path d={front} fill={fill} />
    </g>
  );
}

export function Bar3DLabel(colors) {
  return function Label(props) {
    const { x, y, width, value, index } = props;
    if (value === undefined || value === null) return null;
    const text = formatBRL(value);
    const boxWidth = Math.max(60, text.length * 6.4 + 18);
    const boxHeight = 23;
    const w = width * 0.62;
    const depth = Math.min(16, width * 0.3);
    const cx = Math.round(x + (width - w - depth) / 2 + w / 2 + depth / 2);
    const bx = Math.round(cx - boxWidth / 2);
    const by = Math.round(y - depth - boxHeight - 9);
    const color = colors[index % colors.length];
    return (
      <g>
        {/* rótulo em HTML (via foreignObject) para texto nítido, sem o anti-aliasing borrado do <text> SVG em telas fracionadas */}
        <foreignObject x={bx} y={by} width={boxWidth} height={boxHeight} style={{ overflow: "visible" }}>
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              boxSizing: "border-box",
              width: boxWidth,
              height: boxHeight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(180deg, #202C46 0%, #182234 100%)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderTop: `2px solid ${color}`,
              borderRadius: 6,
              boxShadow: "0 6px 14px -6px rgba(0,0,0,0.65)",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: "0.01em",
              color: "#EDEFF4",
              whiteSpace: "nowrap",
            }}
          >
            {text}
          </div>
        </foreignObject>
      </g>
    );
  };
}

function PizzaLabel(props) {
  const { cx, cy, midAngle, outerRadius, percent, name } = props;
  if (percent < 0.03) return null;
  const RAD = Math.PI / 180;
  const radius = outerRadius + 22;
  const x = cx + radius * Math.cos(-midAngle * RAD);
  const y = cy + radius * Math.sin(-midAngle * RAD) * 0.55;
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
      fontFamily="'IBM Plex Mono', monospace"
      fill={PALETTE.textMuted}
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

/** Pizza 2D simples. Retorna um array de elementos <Pie>/<Tooltip>/<Legend> que deve ser
 *  espalhado DIRETAMENTE como filhos de <PieChart> — o Recharts só reconhece esses
 *  componentes quando são filhos imediatos, então não dá pra embrulhar isso num componente próprio. */
export function renderPie2D({ data, colors, cyTop, outerRadius, innerRadius = 0, showLabel, showTooltip, showLegend, animate = true }) {
  const children = [];

  children.push(
    <Pie
      key="top"
      data={data}
      dataKey="value"
      nameKey="name"
      cx="50%"
      cy={cyTop}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      startAngle={90}
      endAngle={-270}
      stroke={PALETTE.surface}
      strokeWidth={2}
      label={showLabel ? PizzaLabel : false}
      labelLine={showLabel ? { stroke: PALETTE.line } : false}
      isAnimationActive={animate}
      animationDuration={800}
      animationEasing="ease-out"
    >
      {data.map((_, i) => (
        <Cell key={i} fill={colors[i % colors.length]} />
      ))}
    </Pie>
  );

  if (showTooltip) {
    children.push(
      <Tooltip
        key="tooltip"
        formatter={(v) => formatBRL(v)}
        contentStyle={{
          background: PALETTE.surfaceAlt,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: 8,
          fontFamily: "IBM Plex Mono",
          fontSize: 12,
        }}
        labelStyle={{ color: PALETTE.textPrimary }}
      />
    );
  }

  if (showLegend) {
    children.push(
      <Legend
        key="legend"
        verticalAlign="bottom"
        height={36}
        iconType="circle"
        payload={data.map((d, i) => ({ value: d.name, type: "circle", color: colors[i % colors.length] }))}
        formatter={(value) => <span style={{ color: PALETTE.textMuted, fontSize: 11.5, fontFamily: "'Manrope', sans-serif" }}>{value}</span>}
      />
    );
  }

  return children;
}

export function PieChartCard({ title, data, colorMap }) {
  const reducedMotion = usePrefersReducedMotion();
  const positivos = data.filter((d) => d.value > 0);
  const total = positivos.reduce((s, d) => s + d.value, 0);
  const sorted = [...positivos].sort((a, b) => b.value - a.value);
  const colors = colorMap ? sorted.map((d) => colorMap[d.name] || BAR_COLORS[0]) : BAR_COLORS;
  return (
    <div
      className="card-surface"
      style={{
        background: PALETTE.surface,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 10,
        padding: "16px 18px 8px",
      }}
    >
      <div className="display" style={{ fontSize: 14, fontWeight: 500, marginBottom: 10, color: PALETTE.textPrimary }}>
        {title}
      </div>
      {data.length === 0 || total === 0 ? (
        <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: PALETTE.textMuted, fontSize: 12 }}>
          Sem dados
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", paddingBottom: 16 }}>
          <div style={{ flex: "0 0 260px", width: 260 }}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                {renderPie2D({
                  data: sorted,
                  colors,
                  cyTop: 130,
                  outerRadius: 100,
                  innerRadius: 58,
                  showLabel: false,
                  showTooltip: true,
                  showLegend: false,
                  animate: !reducedMotion,
                })}
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: "1 1 260px", minWidth: 240, display: "flex", flexDirection: "column", gap: 10 }}>
            {sorted.map((d, i) => {
              const pct = total ? (d.value / total) * 100 : 0;
              const color = colors[i % colors.length];
              return (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} />
                  <span style={{ flex: "0 0 110px", fontSize: 12.5, color: PALETTE.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.name}
                  </span>
                  <span className="mono" style={{ flex: "0 0 96px", fontSize: 12, color: PALETTE.textMuted }}>
                    {formatBRL(d.value)}
                  </span>
                  <span className="mono" style={{ flex: "0 0 46px", fontSize: 12, textAlign: "right", color: PALETTE.textMuted }}>
                    {pct.toFixed(1)}%
                  </span>
                  <div style={{ flex: 1, minWidth: 40, height: 7, background: PALETTE.bg, borderRadius: 999, overflow: "hidden", border: `1px solid ${PALETTE.line}` }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ChartCard({ title, data, angledLabels, colorMap }) {
  const reducedMotion = usePrefersReducedMotion();
  const colors = colorMap ? data.map((d) => colorMap[d.name] || BAR_COLORS[0]) : BAR_COLORS;
  return (
    <div
      className="card-surface"
      style={{
        background: PALETTE.surface,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 10,
        padding: "16px 18px 8px",
      }}
    >
      <div className="display" style={{ fontSize: 14, fontWeight: 500, marginBottom: 10, color: PALETTE.textPrimary }}>
        {title}
      </div>
      {data.length === 0 ? (
        <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: PALETTE.textMuted, fontSize: 12 }}>
          Sem dados
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={angledLabels ? 320 : 260}>
          <BarChart data={data} margin={{ top: 50, right: 20, left: 0, bottom: angledLabels ? 70 : 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.line} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: PALETTE.textMuted, fontSize: 10, fontFamily: "IBM Plex Mono" }}
              axisLine={{ stroke: PALETTE.line }}
              tickLine={false}
              interval={0}
              angle={angledLabels ? -40 : 0}
              textAnchor={angledLabels ? "end" : "middle"}
              height={angledLabels ? 80 : 30}
            />
            <YAxis hide />
            <Tooltip
              formatter={(v) => formatBRL(v)}
              contentStyle={{
                background: PALETTE.surfaceAlt,
                border: `1px solid ${PALETTE.line}`,
                borderRadius: 8,
                fontFamily: "IBM Plex Mono",
                fontSize: 12,
              }}
              labelStyle={{ color: PALETTE.textPrimary }}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Bar
              dataKey="value"
              shape={Bar3DShape}
              label={Bar3DLabel(colors)}
              isAnimationActive={!reducedMotion}
              animationDuration={700}
              animationEasing="ease-out"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
