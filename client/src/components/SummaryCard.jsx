import React from "react";
import { PALETTE } from "../constants.js";

export function SummaryCard({ icon, label, value, valueColor }) {
  return (
    <div
      className="card-surface"
      style={{
        background: PALETTE.surface,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 10,
        padding: "16px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        {icon}
        <span style={{ fontSize: 11, color: PALETTE.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
      </div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: valueColor || PALETTE.textPrimary }}>
        {value}
      </div>
    </div>
  );
}
