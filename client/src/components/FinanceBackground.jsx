import React from "react";
import { PALETTE } from "../constants.js";

// PRNG determinística (mesmo layout a cada carregamento, sem jank de recálculo)
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 1600;
const H = 900;
const rand = mulberry32(42);

const NODES = Array.from({ length: 42 }, () => ({
  x: rand() * W,
  y: rand() * H,
  r: 1.4 + rand() * 2.2,
}));

const EDGES = [];
for (let i = 0; i < NODES.length; i++) {
  for (let j = i + 1; j < NODES.length; j++) {
    const dx = NODES[i].x - NODES[j].x;
    const dy = NODES[i].y - NODES[j].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 165) EDGES.push([i, j, dist]);
  }
}

function trendPoints(baseline, amplitude, seedOffset) {
  const r = mulberry32(seedOffset);
  const steps = 9;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const x = (W / steps) * i;
    const trend = (i / steps) * amplitude * 1.15;
    const wobble = (r() - 0.5) * amplitude * 0.35;
    const y = baseline - trend + wobble - (i === steps ? amplitude * 0.25 : 0);
    pts.push([x, Math.max(40, y)]);
  }
  return pts;
}

const LINE_GOLD = trendPoints(620, 430, 7);
const LINE_EMERALD = trendPoints(560, 340, 19);

function pathFrom(points) {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

const YEARS = ["2021", "2022", "2023", "2024", "2025", "2026"];

export function FinanceBackground() {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <defs>
        <radialGradient id="fb-vign" cx="50%" cy="38%" r="75%">
          <stop offset="0%" stopColor={PALETTE.bg} stopOpacity="0" />
          <stop offset="100%" stopColor={PALETTE.bg} stopOpacity="0.85" />
        </radialGradient>
        <linearGradient id="fb-bottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PALETTE.bg} stopOpacity="0" />
          <stop offset="100%" stopColor={PALETTE.bg} stopOpacity="1" />
        </linearGradient>
        <filter id="fb-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={W} height={H} fill={PALETTE.bg} />

      {/* rede de conexões */}
      <g stroke={PALETTE.line} strokeWidth="1">
        {EDGES.map(([i, j, dist], k) => (
          <line
            key={k}
            x1={NODES[i].x}
            y1={NODES[i].y}
            x2={NODES[j].x}
            y2={NODES[j].y}
            opacity={Math.max(0, 1 - dist / 165) * 0.22}
          />
        ))}
      </g>
      <g fill={PALETTE.gold}>
        {NODES.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r} opacity="0.28" />
        ))}
      </g>

      {/* linhas de tendência ascendente */}
      <path d={pathFrom(LINE_EMERALD)} fill="none" stroke={PALETTE.emerald} strokeWidth="2.5" opacity="0.32" filter="url(#fb-glow)" />
      <path d={pathFrom(LINE_GOLD)} fill="none" stroke={PALETTE.gold} strokeWidth="3" opacity="0.55" filter="url(#fb-glow)" />
      {LINE_GOLD.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={PALETTE.gold} opacity="0.6" />
      ))}

      <rect width={W} height={H} fill="url(#fb-vign)" />
      <rect width={W} height={110} y={H - 110} fill="url(#fb-bottom)" />

      {/* rótulos de anos */}
      <g fontFamily="'IBM Plex Mono', monospace" fontSize="16" fill={PALETTE.gold} opacity="0.4">
        {YEARS.map((y, i) => (
          <text key={y} x={(W / (YEARS.length - 1)) * i} y={H - 46} textAnchor="middle">
            {y}
          </text>
        ))}
      </g>
    </svg>
  );
}
