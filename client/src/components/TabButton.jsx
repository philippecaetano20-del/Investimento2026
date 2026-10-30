import React from "react";
import { PALETTE } from "../constants.js";

export function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="tab-btn"
      style={{
        background: active ? PALETTE.surfaceAlt : "transparent",
        color: active ? PALETTE.textPrimary : PALETTE.textMuted,
        border: `1px solid ${active ? PALETTE.line : "transparent"}`,
        borderRadius: 8,
        padding: "7px 14px",
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        fontFamily: "'Hanken Grotesk', sans-serif",
        cursor: "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}
