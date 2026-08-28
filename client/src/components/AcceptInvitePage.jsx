import React, { useState, useEffect } from "react";
import { UserPlus } from "lucide-react";
import { PALETTE } from "../constants.js";
import { api, setToken } from "../api.js";
import { AuthShell, authInputStyle, authCardStyle } from "./AuthShell.jsx";

export function AcceptInvitePage({ token, onAccepted }) {
  const [checking, setChecking] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);
  const [checkError, setCheckError] = useState("");

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .checkInvite(token)
      .then(() => setInviteValid(true))
      .catch((e) => setCheckError(e.message || "Convite inválido."))
      .finally(() => setChecking(false));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !senha) {
      setError("Preencha todos os campos.");
      return;
    }
    if (senha.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmSenha) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.acceptInvite({ token, nome: nome.trim(), email: email.trim(), senha });
      setToken(data.token);
      onAccepted(data.user);
    } catch (err) {
      setError(err.message || "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <AuthShell>
        <div style={{ color: PALETTE.textMuted, fontSize: 13 }}>Verificando convite...</div>
      </AuthShell>
    );
  }

  if (!inviteValid) {
    return (
      <AuthShell>
        <div style={{ ...authCardStyle, textAlign: "center" }} className="login-fade">
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: PALETTE.textPrimary, marginBottom: 10 }}>
            Convite inválido
          </div>
          <div style={{ fontSize: 13, color: PALETTE.textMuted }}>{checkError}</div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className="login-fade" style={{ ...authCardStyle, animationDelay: "0.08s" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 500, color: PALETTE.textPrimary, marginBottom: 6 }}>
          Criar sua conta
        </div>
        <div style={{ fontSize: 12, color: PALETTE.textMuted, marginBottom: 22 }}>
          Você foi convidado para o Investidor. Defina seus dados de acesso.
        </div>

        <div style={{ marginBottom: 12 }}>
          <input className="login-input" type="text" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} style={authInputStyle} />
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
        <div style={{ marginBottom: 12 }}>
          <input
            className="login-input"
            type="password"
            autoComplete="new-password"
            placeholder="Senha (mín. 6 caracteres)"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={authInputStyle}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <input
            className="login-input"
            type="password"
            autoComplete="new-password"
            placeholder="Confirmar senha"
            value={confirmSenha}
            onChange={(e) => setConfirmSenha(e.target.value)}
            style={authInputStyle}
          />
        </div>

        {error && <div style={{ color: PALETTE.crimsonText, fontSize: 12.5, margin: "10px 0" }}>{error}</div>}

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
          <UserPlus size={15} />
          {loading ? "Criando conta..." : "Criar conta e entrar"}
        </button>
      </form>
    </AuthShell>
  );
}
