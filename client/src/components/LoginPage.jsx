import React, { useState } from "react";
import { LogIn } from "lucide-react";
import { PALETTE } from "../constants.js";
import { api, setToken } from "../api.js";
import { AuthShell, authInputStyle, authCardStyle } from "./AuthShell.jsx";

export function LoginPage({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !senha) {
      setError("Preencha email e senha.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.login(email.trim(), senha);
      setToken(data.token);
      onLoggedIn(data.user);
    } catch (err) {
      setError(err.message || "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className="login-fade" style={{ ...authCardStyle, animationDelay: "0.08s" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 500, color: PALETTE.textPrimary, marginBottom: 22 }}>
          Entrar
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            className="login-input"
            type="email"
            autoComplete="username"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={authInputStyle}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <input
            className="login-input"
            type="password"
            autoComplete="current-password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={authInputStyle}
          />
        </div>

        {error && <div style={{ color: PALETTE.crimson, fontSize: 12.5, margin: "10px 0" }}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: PALETTE.gold,
            color: "#1A1406",
            border: "none",
            borderRadius: 8,
            padding: "12px 16px",
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
            marginTop: 14,
          }}
        >
          <LogIn size={15} />
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <div style={{ fontSize: 11.5, color: PALETTE.textMuted, marginTop: 18, textAlign: "center", lineHeight: 1.5 }}>
          Você permanecerá conectado neste dispositivo.
          <br />
          Acesso somente para convidados.
        </div>
      </form>
    </AuthShell>
  );
}
