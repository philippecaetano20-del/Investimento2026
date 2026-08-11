import React, { useState, useEffect, useMemo } from "react";
import { Wallet, LogOut, UserPlus, Copy, Check } from "lucide-react";
import { PALETTE } from "./constants.js";
import { formatBRL, monthLabel, emptyForm, parseNumBR } from "./utils.js";
import { api, getToken, clearToken, setUnauthorizedHandler } from "./api.js";
import { HISTORICO_ANOS_ANTERIORES } from "./constants.js";
import { ChartCard, PieChartCard } from "./components/charts.jsx";
import { MetaAnualCard } from "./components/MetaAnualCard.jsx";
import { TabButton } from "./components/TabButton.jsx";
import { LancamentosTab } from "./components/LancamentosTab.jsx";
import { AssetsManager } from "./components/AssetsManager.jsx";
import { MercadoTab } from "./components/MercadoTab.jsx";
import { CalculadoraTab } from "./components/CalculadoraTab.jsx";
import { LoginPage } from "./components/LoginPage.jsx";
import { AcceptInvitePage } from "./components/AcceptInvitePage.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const inviteToken = new URLSearchParams(window.location.search).get("convite");

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    const token = getToken();
    if (!token) {
      setCheckingAuth(false);
      return;
    }
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => clearToken())
      .finally(() => setCheckingAuth(false));
  }, []);

  function handleLogout() {
    clearToken();
    setUser(null);
  }

  if (inviteToken && !user) {
    return <AcceptInvitePage token={inviteToken} onAccepted={setUser} />;
  }

  if (checkingAuth) {
    return (
      <div style={{ position: "fixed", inset: 0, background: PALETTE.bg, display: "flex", alignItems: "center", justifyContent: "center", color: PALETTE.textMuted, fontSize: 13 }}>
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoggedIn={setUser} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

function Dashboard({ user, onLogout }) {
  const [entries, setEntries] = useState([]);
  const [ativosList, setAtivosList] = useState([]);
  const [activeTab, setActiveTab] = useState("painel");
  const [loading, setLoading] = useState(true);
  const [slowLoading, setSlowLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [meta, setMeta] = useState(0);

  useEffect(() => {
    const slowTimer = setTimeout(() => setSlowLoading(true), 4000);
    (async () => {
      try {
        const anoAtual = new Date().getFullYear();
        const [entriesData, ativosData, metaData] = await Promise.all([
          api.listEntries(),
          api.listAtivos(),
          api.getMeta(anoAtual),
        ]);
        setEntries(entriesData);
        setAtivosList(ativosData);
        setMeta(metaData.valor);
      } catch (e) {
        setSaveError("Não foi possível carregar os dados do servidor.");
      } finally {
        clearTimeout(slowTimer);
        setLoading(false);
      }
    })();
    return () => clearTimeout(slowTimer);
  }, []);

  async function saveMeta(valor) {
    const anoAtual = new Date().getFullYear();
    const data = await api.setMeta(anoAtual, valor);
    setMeta(data.valor);
  }

  async function addAtivo(nome) {
    const trimmed = nome.trim();
    if (!trimmed) throw new Error("Informe o nome do ativo.");
    if (ativosList.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error("Esse ativo já está cadastrado.");
    }
    await api.addAtivo(trimmed);
    setAtivosList([...ativosList, trimmed].sort((a, b) => a.localeCompare(b, "pt-BR")));
  }

  async function renameAtivo(nomeAtual, novoNome) {
    const trimmed = novoNome.trim();
    if (!trimmed) throw new Error("Informe o novo nome do ativo.");
    if (trimmed === nomeAtual) return;
    if (ativosList.some((a) => a.toLowerCase() === trimmed.toLowerCase() && a !== nomeAtual)) {
      throw new Error("Já existe um ativo com esse nome.");
    }
    await api.renameAtivo(nomeAtual, trimmed);
    setAtivosList(
      ativosList.map((a) => (a === nomeAtual ? trimmed : a)).sort((a, b) => a.localeCompare(b, "pt-BR"))
    );
    setEntries(entries.map((e) => (e.nivel === nomeAtual ? { ...e, nivel: trimmed } : e)));
  }

  async function removeAtivo(nome) {
    await api.removeAtivo(nome);
    setAtivosList(ativosList.filter((a) => a !== nome));
  }

  function openNewForm() {
    setForm(emptyForm());
    setError("");
    setFormOpen(true);
  }

  function openEditForm(entry) {
    setForm({ ...entry, estaReinvestido: entry.estaReinvestido ? "Sim" : "Não" });
    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setError("");
  }

  async function handleSubmit() {
    if (!form.nivel.trim()) {
      setError("Informe o ativo (ex: BBSE3, CPTS11).");
      return;
    }
    if (!form.valorPago || isNaN(parseNumBR(form.valorPago))) {
      setError("Informe um valor pago válido.");
      return;
    }
    const isRendaFixa = form.tipo === "Renda Fixa";
    if (!isRendaFixa && (!form.quantidade || isNaN(parseNumBR(form.quantidade)))) {
      setError("Informe uma quantidade válida.");
      return;
    }
    if (!form.data) {
      setError("Informe a data.");
      return;
    }

    const cleaned = {
      tipo: form.tipo,
      nivel: form.nivel,
      data: form.data,
      valorPago: parseNumBR(form.valorPago) || 0,
      quantidade: isRendaFixa ? 1 : parseNumBR(form.quantidade) || 0,
      rentabilidade: parseNumBR(form.rentabilidade) || 0,
      valorReinvestido: parseNumBR(form.valorReinvestido) || 0,
      estaReinvestido: form.estaReinvestido === "Sim",
    };

    try {
      if (form.id) {
        const updated = await api.updateEntry(form.id, cleaned);
        setEntries(entries.map((en) => (en.id === form.id ? updated : en)));
      } else {
        const created = await api.createEntry(cleaned);
        setEntries([...entries, created]);
      }
      setSaveError("");
      setFormOpen(false);
    } catch (e) {
      setError(e.message || "Não foi possível salvar o lançamento.");
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteEntry(id);
      setEntries(entries.filter((en) => en.id !== id));
      setSaveError("");
    } catch (e) {
      setSaveError("Não foi possível excluir o lançamento.");
    }
  }

  const totals = useMemo(() => {
    const totalInvestido = entries.reduce((s, e) => s + e.valorInvestido, 0);
    const rentMedia =
      entries.length > 0
        ? entries.reduce((s, e) => s + e.rentabilidade, 0) / entries.length
        : 0;
    const ativos = new Set(entries.map((e) => e.nivel)).size;
    return { totalInvestido, rentMedia, ativos };
  }, [entries]);

  const porTipo = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      map[e.tipo] = (map[e.tipo] || 0) + e.valorReinvestido;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [entries]);

  const porAtivo = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      map[e.nivel] = (map[e.nivel] || 0) + e.valorReinvestido;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [entries]);

  const porAno = useMemo(() => {
    const map = { ...HISTORICO_ANOS_ANTERIORES };
    entries.forEach((e) => {
      const ano = e.data.slice(0, 4);
      map[ano] = (map[ano] || 0) + e.valorInvestido;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  const porMes = useMemo(() => {
    const map = {};
    entries
      .filter((e) => e.valorInvestido > 0)
      .forEach((e) => {
        const key = e.data.slice(0, 7);
        map[key] = (map[key] || 0) + e.valorInvestido;
      });
    return Object.entries(map)
      .map(([key, value]) => ({ name: monthLabel(key), value, key }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [entries]);

  const anoAtual = new Date().getFullYear();
  const investidoAnoAtual = porAno.find((d) => d.name === String(anoAtual))?.value || 0;

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => (a.data < b.data ? 1 : -1)),
    [entries]
  );

  return (
    <div
      style={{
        background: PALETTE.bg,
        backgroundImage: `radial-gradient(ellipse 900px 520px at 12% -12%, rgba(212,169,79,0.11), transparent 60%),
          radial-gradient(ellipse 720px 520px at 105% 0%, rgba(63,174,122,0.07), transparent 55%),
          repeating-linear-gradient(180deg, rgba(255,255,255,0.014) 0px, rgba(255,255,255,0.014) 1px, transparent 1px, transparent 34px)`,
        backgroundAttachment: "fixed",
        color: PALETTE.textPrimary,
        minHeight: "100%",
        fontFamily: "'Manrope', sans-serif",
        padding: "32px 20px 60px",
        position: "relative",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,500;0,600;1,500&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        html, body, #root { height: 100%; margin: 0; }
        .mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
        .display { font-family: 'Fraunces', serif; }
        input, select { font-family: 'IBM Plex Mono', monospace; }
        ::placeholder { color: #5C6884; }
        .ledger-row:hover .row-actions { opacity: 1; }

        .grain-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.035;
          z-index: 0;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .reveal { animation: fadeUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
        .reveal-1 { animation-delay: 0.02s; }
        .reveal-2 { animation-delay: 0.1s; }
        .reveal-3 { animation-delay: 0.18s; }
        @media (prefers-reduced-motion: reduce) { .reveal { animation: none; } }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }

        @media (max-width: 640px) {
          .tabs-scroll {
            mask-image: linear-gradient(to right, black calc(100% - 28px), transparent 100%);
            -webkit-mask-image: linear-gradient(to right, black calc(100% - 28px), transparent 100%);
          }
        }

        .card-surface { transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; }
        .card-surface:hover {
          transform: translateY(-3px);
          border-color: rgba(212, 169, 79, 0.4);
          box-shadow: 0 16px 32px -14px rgba(0,0,0,0.55), 0 0 0 1px rgba(212, 169, 79, 0.06);
        }

        button { transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease; }
        button:not(:disabled):hover { filter: brightness(1.1); }
        button:not(:disabled):active { transform: scale(0.97); }

        input:focus, select:focus {
          outline: none !important;
          border-color: ${PALETTE.gold} !important;
          box-shadow: 0 0 0 3px rgba(212, 169, 79, 0.15);
        }
      `}</style>

      <div className="grain-overlay" />

      <div style={{ maxWidth: 1400, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, marginBottom: 10, fontSize: 12 }}>
          <span style={{ color: PALETTE.textMuted }}>
            Olá, <span style={{ color: PALETTE.textPrimary, fontWeight: 600 }}>{user.nome}</span>
          </span>
          <InviteButton />
          <button
            onClick={onLogout}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: PALETTE.textMuted, cursor: "pointer", fontSize: 12, fontFamily: "'Manrope', sans-serif", padding: 0 }}
          >
            <LogOut size={13} /> Sair
          </button>
        </div>

        {/* Header */}
        <div
          className="reveal reveal-1"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 28,
            borderBottom: "1px solid transparent",
            borderImage: `linear-gradient(90deg, ${PALETTE.gold}, ${PALETTE.line} 45%, ${PALETTE.line}) 1`,
            paddingBottom: 24,
          }}
        >
          <div>
            <div
              className="mono"
              style={{
                fontSize: 12,
                letterSpacing: "0.18em",
                color: PALETTE.gold,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Carteira · Posição consolidada
            </div>
            <div className="display" style={{ fontSize: 30, fontWeight: 500, marginBottom: 4 }}>
              Painel de Investimentos
            </div>
            <div style={{ fontSize: 13, color: PALETTE.textMuted }}>
              {entries.length} lançamento{entries.length !== 1 ? "s" : ""} registrado
              {entries.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              className="mono"
              style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, fontSize: 11, color: PALETTE.textMuted, marginBottom: 4, letterSpacing: "0.1em" }}
            >
              <Wallet size={13} color={PALETTE.gold} />
              TOTAL INVESTIDO
            </div>
            <div className="mono" style={{ fontSize: 34, fontWeight: 600, color: PALETTE.textPrimary }}>
              {formatBRL(totals.totalInvestido)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="reveal reveal-2 tabs-scroll"
          style={{ display: "flex", gap: 4, marginBottom: 24, overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch" }}
        >
          <TabButton active={activeTab === "painel"} onClick={() => setActiveTab("painel")}>
            Painel
          </TabButton>
          <TabButton active={activeTab === "lancamentos"} onClick={() => setActiveTab("lancamentos")}>
            Lançamentos
          </TabButton>
          <TabButton active={activeTab === "ativos"} onClick={() => setActiveTab("ativos")}>
            Ativos
          </TabButton>
          <TabButton active={activeTab === "mercado"} onClick={() => setActiveTab("mercado")}>
            Mercado
          </TabButton>
          <TabButton active={activeTab === "calculadora"} onClick={() => setActiveTab("calculadora")}>
            Calculadora
          </TabButton>
        </div>

        <div className="reveal reveal-3">
        {loading ? (
          <div style={{ color: PALETTE.textMuted, padding: 40, textAlign: "center" }}>
            <div>Carregando dados...</div>
            {slowLoading && (
              <div style={{ fontSize: 12.5, marginTop: 10, color: PALETTE.textMuted, maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
                O servidor gratuito "dorme" após um tempo sem uso e pode levar até 50 segundos para acordar na
                primeira visita. Só aguardar, já está carregando.
              </div>
            )}
          </div>
        ) : activeTab === "ativos" ? (
          <AssetsManager ativosList={ativosList} onAdd={addAtivo} onRename={renameAtivo} onRemove={removeAtivo} />
        ) : activeTab === "mercado" ? (
          <MercadoTab ativosList={ativosList} />
        ) : activeTab === "calculadora" ? (
          <CalculadoraTab />
        ) : activeTab === "lancamentos" ? (
          <LancamentosTab
            sortedEntries={sortedEntries}
            openEditForm={openEditForm}
            handleDelete={handleDelete}
            openNewForm={openNewForm}
            saveError={saveError}
            formOpen={formOpen}
            form={form}
            setForm={setForm}
            handleSubmit={handleSubmit}
            closeForm={closeForm}
            error={error}
            ativosList={ativosList}
          />
        ) : (
          <>
            {/* Charts */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                marginBottom: 28,
              }}
            >
              <ChartCard title="Por ativo" data={porAtivo} angledLabels />
              <ChartCard title="Por classe" data={porTipo} />
              <PieChartCard title="Distribuição da carteira por classe" data={porTipo} />
              <ChartCard title="Por mês" data={porMes} />
              <ChartCard title="Por ano" data={porAno} />
            </div>

            <MetaAnualCard ano={anoAtual} investidoAno={investidoAnoAtual} meta={meta} onSaveMeta={saveMeta} />
          </>
        )}
        </div>
      </div>
    </div>
  );
}

function InviteButton() {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function gerarConvite() {
    setOpen(true);
    setError("");
    setCopied(false);
    if (link) return;
    setLoading(true);
    try {
      const data = await api.createInvite();
      setLink(`${window.location.origin}${window.location.pathname}?convite=${data.token}`);
    } catch (e) {
      setError(e.message || "Não foi possível gerar o convite.");
    } finally {
      setLoading(false);
    }
  }

  function copiar() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={gerarConvite}
        style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: PALETTE.gold, cursor: "pointer", fontSize: 12, fontFamily: "'Manrope', sans-serif", padding: 0 }}
      >
        <UserPlus size={13} /> Convidar
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 999 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              zIndex: 1000,
              width: 300,
              background: PALETTE.surfaceAlt,
              border: `1px solid ${PALETTE.line}`,
              borderRadius: 8,
              padding: 14,
              boxShadow: "0 16px 40px -12px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ fontSize: 11.5, color: PALETTE.textMuted, marginBottom: 8 }}>
              Envie este link para a pessoa criar a própria conta:
            </div>
            {loading ? (
              <div style={{ fontSize: 12, color: PALETTE.textMuted }}>Gerando link...</div>
            ) : error ? (
              <div style={{ fontSize: 12, color: PALETTE.crimson }}>{error}</div>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  readOnly
                  value={link}
                  onClick={(e) => e.target.select()}
                  className="mono"
                  style={{ flex: 1, background: PALETTE.bg, border: `1px solid ${PALETTE.line}`, borderRadius: 6, padding: "6px 8px", color: PALETTE.textPrimary, fontSize: 11 }}
                />
                <button
                  onClick={copiar}
                  style={{ display: "flex", alignItems: "center", gap: 4, background: PALETTE.gold, color: "#1A1406", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
