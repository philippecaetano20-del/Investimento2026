import React from "react";
import { PALETTE } from "../constants.js";

export function ConfirmDialog({ title, message, confirmLabel = "Sim", cancelLabel = "Não", onConfirm, onCancel }) {
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
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: PALETTE.surfaceAlt,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: 10,
          padding: 24,
          width: 340,
          maxWidth: "calc(100vw - 32px)",
          boxShadow: "0 20px 50px -12px rgba(0,0,0,0.6)",
        }}
      >
        <div className="display" style={{ fontSize: 16, fontWeight: 500, marginBottom: 8, color: PALETTE.textPrimary }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: PALETTE.textMuted, marginBottom: 20, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "transparent",
              border: `1px solid ${PALETTE.line}`,
              color: PALETTE.textMuted,
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            style={{
              background: PALETTE.crimson,
              color: "#FDEDEA",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
