import React from "react";
import { PALETTE } from "../constants.js";

export function AuthShell({ children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: PALETTE.bg,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,500;0,600;1,500&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .login-bg {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 900px 600px at 15% -10%, rgba(212,169,79,0.16), transparent 60%),
            radial-gradient(ellipse 700px 500px at 110% 30%, rgba(63,174,122,0.12), transparent 60%),
            repeating-linear-gradient(115deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 64px);
        }
        .login-grain {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.035; mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }
        .login-fade { animation: loginFade 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes loginFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .login-input:focus { outline: none !important; border-color: ${PALETTE.gold} !important; box-shadow: 0 0 0 3px rgba(212,169,79,0.15); }
      `}</style>

      <div className="login-bg" />
      <div className="login-grain" />

      <div style={{ position: "relative", zIndex: 1, padding: "24px 32px" }}>
        <div
          className="login-fade"
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 600,
            fontStyle: "italic",
            fontSize: 26,
            letterSpacing: "0.02em",
            color: PALETTE.gold,
          }}
        >
          Investidor
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 20px 60px" }}>
        {children}
      </div>
    </div>
  );
}

export const authInputStyle = {
  width: "100%",
  background: "rgba(6, 9, 16, 0.55)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 6,
  padding: "13px 14px",
  color: "#EDEFF4",
  fontSize: 14,
  fontFamily: "'Manrope', sans-serif",
};

export const authCardStyle = {
  width: "100%",
  maxWidth: 380,
  background: "rgba(22, 31, 48, 0.82)",
  backdropFilter: "blur(8px)",
  border: `1px solid ${PALETTE.line}`,
  borderRadius: 12,
  padding: "36px 32px",
  boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)",
};
