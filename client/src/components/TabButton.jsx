import React from "react";
import { PALETTE } from "../constants.js";

export function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? PALETTE.surface : "transparent",
        color: active ? PALETTE.gold : PALETTE.textMuted,
        border: `1px solid ${active ? PALETTE.line : "transparent"}`,
        borderBottom: active ? `1px solid ${PALETTE.surface}` : "none",
        borderRadius: "8px 8px 0 0",
        padding: "8px 18px",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "'Manrope', sans-serif",
        cursor: "pointer",
        transition: "color 0.2s ease, background 0.2s ease, border-color 0.2s ease",
      }}
    >
      {children}
    </button>
  );
}
