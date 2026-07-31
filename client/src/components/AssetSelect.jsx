import React, { useState, useEffect } from "react";
import { PALETTE } from "../constants.js";

export function AssetSelect({ value, onChange, options, inputStyle }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  function selectOption(opt) {
    onChange(opt);
    setQuery(opt);
    setOpen(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        style={inputStyle}
        value={query}
        placeholder="Buscar ativo..."
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 20,
            background: PALETTE.bg,
            border: `1px solid ${PALETTE.line}`,
            borderRadius: 6,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {filtered.map((opt) => (
            <div
              key={opt}
              onMouseDown={() => selectOption(opt)}
              style={{
                padding: "8px 10px",
                fontSize: 13,
                fontFamily: "'IBM Plex Mono', monospace",
                color: PALETTE.textPrimary,
                cursor: "pointer",
                borderBottom: `1px solid ${PALETTE.surfaceAlt}`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = PALETTE.surfaceAlt)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
