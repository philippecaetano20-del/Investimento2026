import React, { useState, useEffect, useRef } from "react";
import { Filter } from "lucide-react";
import { PALETTE } from "../constants.js";

export function ColumnFilterDropdown({ options, format, selectedSet, onApply }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [temp, setTemp] = useState(new Set(selectedSet || options));
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTemp(new Set(selectedSet || options));
      setSearch("");
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 240)) });
      }
    }
    // eslint-disable-next-line
  }, [open]);

  useEffect(() => {
    function handleClick(ev) {
      if (
        panelRef.current &&
        !panelRef.current.contains(ev.target) &&
        btnRef.current &&
        !btnRef.current.contains(ev.target)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const ativo = selectedSet && selectedSet.size < options.length;
  const filteredOptions = options.filter((o) => format(o).toLowerCase().includes(search.toLowerCase()));

  function toggleValue(v) {
    setTemp((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }

  function aplicar() {
    onApply(temp.size >= options.length ? null : temp);
    setOpen(false);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5 }}
        aria-label="Filtrar"
      >
        <Filter size={11} color={ativo ? PALETTE.gold : PALETTE.textMuted} />
      </button>
      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 1000,
            background: PALETTE.bg,
            border: `1px solid ${PALETTE.line}`,
            borderRadius: 8,
            width: 230,
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            padding: 10,
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            style={{
              width: "100%",
              background: PALETTE.surface,
              border: `1px solid ${PALETTE.line}`,
              borderRadius: 6,
              padding: "6px 8px",
              color: PALETTE.textPrimary,
              fontSize: 12,
              marginBottom: 8,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          />
          <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
            <button
              onClick={() => setTemp(new Set(options))}
              style={{ background: "transparent", border: "none", color: PALETTE.gold, fontSize: 11, cursor: "pointer", padding: 0 }}
            >
              Selecionar tudo
            </button>
            <button
              onClick={() => setTemp(new Set())}
              style={{ background: "transparent", border: "none", color: PALETTE.textMuted, fontSize: 11, cursor: "pointer", padding: 0 }}
            >
              Limpar
            </button>
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto", borderTop: `1px solid ${PALETTE.line}`, borderBottom: `1px solid ${PALETTE.line}`, padding: "6px 0", marginBottom: 8 }}>
            {filteredOptions.length === 0 ? (
              <div style={{ fontSize: 11.5, color: PALETTE.textMuted, padding: "4px 2px" }}>Nada encontrado</div>
            ) : (
              filteredOptions.map((v, i) => (
                <label
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 2px",
                    fontSize: 12,
                    color: PALETTE.textPrimary,
                    cursor: "pointer",
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  <input type="checkbox" checked={temp.has(v)} onChange={() => toggleValue(v)} />
                  {format(v)}
                </label>
              ))
            )}
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "transparent", border: `1px solid ${PALETTE.line}`, color: PALETTE.textMuted, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              onClick={aplicar}
              style={{ background: PALETTE.gold, border: "none", color: "#1A1406", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
