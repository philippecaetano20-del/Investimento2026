import React, { useState, useEffect, useMemo } from "react";
import { LogOut, UserPlus, Copy, Check } from "lucide-react";
import { PALETTE } from "./constants.js";
import { formatBRL, monthLabel, emptyForm, parseNumBR } from "./utils.js";
import { api, getToken, clearToken, setUnauthorizedHandler } from "./api.js";
import { useCountUp } from "./useCountUp.js";
import { HISTORICO_ANOS_ANTERIORES, TIPO_COLORS } from "./constants.js";
import { ChartCard, PieChartCard, AtivosList } from "./components/charts.jsx";
import { MetaAnualCard } from "./components/MetaAnualCard.jsx";
import { TabButton } from "./components/TabButton.jsx";
import { LancamentosTab } from "./components/LancamentosTab.jsx";
import { AssetsManager } from "./components/AssetsManager.jsx";
import { MercadoTab } from "./components/MercadoTab.jsx";
import { TradeTab } from "./components/TradeTab.jsx";
import { CalculadoraTab } from "./components/CalculadoraTab.jsx";
import { ValuationDcfTab } from "./components/ValuationDcfTab.jsx";
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
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState(0);
  const [anoSelecionado, setAnoSelecionado] = useState(String(new Date().getFullYear()));

  function loadData() {
    setLoading(true);
    setSaveError("");
    const slowTimer = setTimeout(() => setSlowLoading(true), 4000);
    (async () => {
      try {
        const [entriesData, ativosData] = await Promise.all([api.listEntries(), api.listAtivos()]);
        setEntries(entriesData);
        setAtivosList(ativosData);
      } catch (e) {
        setSaveError("Não foi possível carregar os dados do servidor.");
      } finally {
        clearTimeout(slowTimer);
        setLoading(false);
        setSlowLoading(false);
      }
    })();
    return () => clearTimeout(slowTimer);
  }

  useEffect(loadData, []);

  useEffect(() => {
    api
      .getMeta(anoSelecionado)
      .then((data) => setMeta(data.valor))
      .catch(() => setMeta(0));
  }, [anoSelecionado]);

  async function saveMeta(valor) {
    const data = await api.setMeta(anoSelecionado, valor);
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
    setForm({
      ...entry,
      valorPago: entry.saque ? Math.abs(entry.valorPago) : entry.valorPago,
      estaReinvestido: entry.estaReinvestido ? "Sim" : "Não",
      saque: entry.saque ? "Sim" : "Não",
    });
    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setError("");
  }

  async function handleSubmit() {
    if (saving) return;
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
      estaReinvestido: !isRendaFixa && form.estaReinvestido === "Sim",
      saque: isRendaFixa && form.saque === "Sim",
    };

    setSaving(true);
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
    } finally {
      setSaving(false);
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

  const totalInvestidoAnimado = useCountUp(totals.totalInvestido);

  const anosDisponiveis = useMemo(() => {
    const anoReal = new Date().getFullYear();
    const anos = new Set([anoReal, anoReal + 1]);
    entries.forEach((e) => anos.add(Number(e.data.slice(0, 4))));
    return [...anos].sort((a, b) => b - a).map(String);
  }, [entries]);

  const entriesDoAno = useMemo(
    () => entries.filter((e) => e.data.slice(0, 4) === anoSelecionado),
    [entries, anoSelecionado]
  );

  const porTipo = useMemo(() => {
    const map = {};
    entriesDoAno.forEach((e) => {
      map[e.tipo] = (map[e.tipo] || 0) + e.valorReinvestido;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [entriesDoAno]);

  const porAtivo = useMemo(() => {
    const map = {};
    entriesDoAno.forEach((e) => {
      map[e.nivel] = (map[e.nivel] || 0) + e.valorReinvestido;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [entriesDoAno]);

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
    entriesDoAno
      .filter((e) => e.valorInvestido !== 0)
      .forEach((e) => {
        const key = e.data.slice(0, 7);
        map[key] = (map[key] || 0) + e.valorInvestido;
      });
    return Object.entries(map)
      .map(([key, value]) => ({ name: monthLabel(key), value, key }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [entriesDoAno]);

  const investidoAnoSelecionado = porAno.find((d) => d.name === anoSelecionado)?.value || 0;

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => (a.data < b.data ? 1 : -1)),
    [entries]
  );

  const hoje = new Date();
  const anoEhAtual = anoSelecionado === String(hoje.getFullYear());
  const mesAtualKey = `${anoSelecionado}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  // Ano corrente: o mês de hoje (mesmo sem aporte). Outros anos: o último mês com aporte.
  const mesEmFoco = anoEhAtual
    ? porMes.find((m) => m.key === mesAtualKey) || { key: mesAtualKey, name: monthLabel(mesAtualKey), value: 0 }
    : porMes[porMes.length - 1] || null;
  // Série do gráfico com todos os meses (até o atual, no ano corrente), para os meses sem aporte aparecerem
  const ultimoMesDoGrafico = anoEhAtual ? hoje.getMonth() + 1 : porMes.length ? 12 : 0;
  const porMesCompleto = Array.from({ length: ultimoMesDoGrafico }, (_, i) => {
    const key = `${anoSelecionado}-${String(i + 1).padStart(2, "0")}`;
    return porMes.find((m) => m.key === key) || { key, name: monthLabel(key), value: 0 };
  });
  const ultimoMesComAporte = porMes[porMes.length - 1];
  const aportadoNosMeses = porMes.reduce((s, m) => s + m.value, 0);
  const mediaMensal = porMes.length ? aportadoNosMeses / porMes.length : 0;

  return (
    <div className="app">
      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { min-height: 100%; margin: 0; }
        body { -webkit-font-smoothing: antialiased; }
        .app {
          background: ${PALETTE.bg};
          color: ${PALETTE.textPrimary};
          min-height: 100vh;
          font-family: 'Hanken Grotesk', sans-serif;
          padding: 24px 20px 64px;
        }
        .app-inner { max-width: 1240px; margin: 0 auto; }
        ::selection { background: rgba(154, 167, 255, 0.32); color: ${PALETTE.textPrimary}; }
        * { scrollbar-color: ${PALETTE.line} transparent; scrollbar-width: thin; }
        input, select, textarea { font-family: 'Hanken Grotesk', sans-serif; font-variant-numeric: tabular-nums; caret-color: ${PALETTE.accent}; }
        ::placeholder { color: #6E717B; }

        /* Números sempre com algarismos de largura fixa, para colunas alinharem */
        .num, .mono { font-family: 'Hanken Grotesk', sans-serif; font-variant-numeric: tabular-nums; }
        .display { font-family: 'Hanken Grotesk', sans-serif; font-weight: 600; letter-spacing: -0.015em; }

        .row-actions { opacity: 0.7; }
        .ledger-row:hover .row-actions, .ledger-row:focus-within .row-actions { opacity: 1; }
        @media (hover: none) { .row-actions { opacity: 1; } }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }

        button { transition: background-color 0.15s ease, color 0.15s ease, filter 0.15s ease, transform 0.1s ease; }
        button:not(:disabled):hover { filter: brightness(1.12); }
        button:not(:disabled):active { transform: scale(0.98); }
        .tab-btn:not([aria-current]):hover { color: ${PALETTE.textPrimary} !important; filter: none; }

        input:focus, select:focus, textarea:focus {
          outline: none !important;
          border-color: ${PALETTE.accent} !important;
          box-shadow: 0 0 0 3px rgba(154, 167, 255, 0.18);
        }
        button:focus-visible, a:focus-visible {
          outline: 2px solid ${PALETTE.accent};
          outline-offset: 2px;
        }

        /* Cabeçalho */
        .topo { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 28px; }
        .topo h1 { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; margin: 0; display: flex; align-items: center; gap: 10px; }
        .usuario { display: flex; align-items: center; gap: 16px; font-size: 13px; color: ${PALETTE.textMuted}; }
        .total { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 14px; margin-bottom: 28px; }
        .total-valor { font-size: clamp(30px, 6vw, 44px); font-weight: 600; letter-spacing: -0.025em; line-height: 1.05; }
        .total-rotulo { font-size: 14px; color: ${PALETTE.textMuted}; }

        /* Navegação em dois grupos */
        .abas { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 28px; padding-bottom: 16px; margin-bottom: 28px; border-bottom: 1px solid ${PALETTE.line}; }
        .abas-grupo { display: flex; align-items: center; gap: 4px; overflow-x: auto; max-width: 100%; }
        .abas-grupo-nome { font-size: 12px; font-weight: 500; color: ${PALETTE.textMuted}; margin-right: 8px; flex-shrink: 0; }

        /* Painel */
        .painel-topo { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
        .painel-topo h2 { font-size: 20px; font-weight: 600; letter-spacing: -0.015em; margin: 0; }
        .resumo { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; background: ${PALETTE.line}; border: 1px solid ${PALETTE.line}; border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
        .resumo-celula { background: ${PALETTE.surface}; padding: 16px 20px 18px; min-width: 0; }
        .resumo-rotulo { font-size: 13px; color: ${PALETTE.textMuted}; margin-bottom: 6px; min-height: 20px; }
        .resumo-valor { font-size: 22px; font-weight: 600; letter-spacing: -0.015em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .resumo-nota { font-size: 12.5px; color: ${PALETTE.textMuted}; margin-top: 4px; }

        .grade { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: 20px; }
        .panel { background: ${PALETTE.surface}; border: 1px solid ${PALETTE.line}; border-radius: 12px; padding: 18px 20px 20px; min-width: 0; }
        .panel-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 14px; }
        .panel-title { font-size: 15px; font-weight: 600; margin: 0; letter-spacing: -0.005em; }
        .panel-aside { font-size: 13px; color: ${PALETTE.textMuted}; }
        .panel-empty { height: 180px; display: flex; align-items: center; justify-content: center; color: ${PALETTE.textMuted}; font-size: 13px; }

        .ranking { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
        .ranking li { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr) auto; align-items: center; gap: 14px; font-size: 13.5px; }
        .ranking-nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ranking-trilho { height: 6px; background: ${PALETTE.bg}; border-radius: 999px; overflow: hidden; }
        .ranking-trilho span { display: block; height: 100%; background: rgba(154, 167, 255, 0.7); border-radius: 999px; }
        .ranking li:first-child .ranking-trilho span { background: ${PALETTE.accent}; }
        .ranking-valor { text-align: right; color: ${PALETTE.textPrimary}; min-width: 96px; }
        .link-btn { background: none; border: none; padding: 0; margin-top: 16px; color: ${PALETTE.accent}; font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; text-underline-offset: 3px; }
        .link-btn:hover { text-decoration: underline; filter: none; }

        .classes { display: flex; flex-direction: column; gap: 14px; }
        .classes-rosca { width: 100%; max-width: 220px; margin: 0 auto; }
        .legenda { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
        .legenda li { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto auto; align-items: center; gap: 10px; font-size: 13.5px; }
        .legenda-cor { width: 10px; height: 10px; border-radius: 3px; }
        .legenda-nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .legenda-pct { color: ${PALETTE.textMuted}; text-align: right; min-width: 48px; }
        .legenda-valor { text-align: right; min-width: 92px; }

        @media (max-width: 960px) {
          .grade { grid-template-columns: minmax(0, 1fr); }
          .resumo { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 520px) {
          .app { padding: 18px 16px 48px; }
          .topo { flex-wrap: wrap; }
          .abas { gap: 12px 20px; }
          .abas-grupo { flex-wrap: wrap; row-gap: 6px; overflow: visible; }
          .abas-grupo-nome { width: 100%; }
          .tab-btn { padding: 7px 11px !important; }
          .resumo-celula { padding: 14px 14px 16px; }
          .resumo-valor { font-size: 19px; }
          .ranking li { grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; }
          .ranking-trilho { grid-column: 1 / -1; grid-row: 2; }
        }
      `}</style>

      <div className="app-inner">
        <header className="topo">
          <h1>
            <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill={PALETTE.surfaceAlt} />
              <rect x="7" y="17" width="4" height="8" rx="1" fill={PALETTE.textMuted} />
              <rect x="14" y="12" width="4" height="13" rx="1" fill={PALETTE.textMuted} />
              <rect x="21" y="7" width="4" height="18" rx="1" fill={PALETTE.accent} />
            </svg>
            Painel de Investimentos
          </h1>
          <div className="usuario">
            <span>
              Olá, <span style={{ color: PALETTE.textPrimary, fontWeight: 600 }}>{user.nome}</span>
            </span>
            <InviteButton />
            <button
              onClick={onLogout}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: PALETTE.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: 0 }}
            >
              <LogOut size={14} /> Sair
            </button>
          </div>
        </header>

        <div className="total">
          <span className="total-valor num">{formatBRL(totalInvestidoAnimado)}</span>
          <span className="total-rotulo">
            investidos no total, em {entries.length} lançamento{entries.length !== 1 ? "s" : ""}
          </span>
        </div>

        <nav className="abas" aria-label="Seções">
          {GRUPOS_ABAS.map((grupo) => (
            <div key={grupo.nome} className="abas-grupo" role="group" aria-label={grupo.nome}>
              <span className="abas-grupo-nome">{grupo.nome}</span>
              {grupo.abas.map(([id, rotulo]) => (
                <TabButton key={id} active={activeTab === id} onClick={() => setActiveTab(id)}>
                  {rotulo}
                </TabButton>
              ))}
            </div>
          ))}
        </nav>

        {saveError && !loading && (
          <div role="alert" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ color: PALETTE.crimsonText, fontSize: 13 }}>{saveError}</div>
            <button
              onClick={loadData}
              style={{
                background: "transparent",
                border: `1px solid ${PALETTE.crimsonText}`,
                color: PALETTE.crimsonText,
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 12.5,
                cursor: "pointer",
                fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ color: PALETTE.textMuted, padding: 40, textAlign: "center" }}>
            <div>Carregando dados...</div>
            {slowLoading && (
              <div style={{ fontSize: 13, marginTop: 10, maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
                O servidor gratuito "dorme" após um tempo sem uso e pode levar até 50 segundos para acordar na
                primeira visita. Só aguardar, já está carregando.
              </div>
            )}
          </div>
        ) : activeTab === "ativos" ? (
          <AssetsManager ativosList={ativosList} onAdd={addAtivo} onRename={renameAtivo} onRemove={removeAtivo} />
        ) : activeTab === "mercado" ? (
          <MercadoTab ativosList={ativosList} />
        ) : activeTab === "trade" ? (
          <TradeTab />
        ) : activeTab === "calculadora" ? (
          <CalculadoraTab />
        ) : activeTab === "valuation" ? (
          <ValuationDcfTab />
        ) : activeTab === "lancamentos" ? (
          <LancamentosTab
            sortedEntries={sortedEntries}
            openEditForm={openEditForm}
            handleDelete={handleDelete}
            openNewForm={openNewForm}
            formOpen={formOpen}
            form={form}
            setForm={setForm}
            handleSubmit={handleSubmit}
            saving={saving}
            closeForm={closeForm}
            error={error}
            ativosList={ativosList}
          />
        ) : (
          <>
            <div className="painel-topo">
              <h2>Resumo de {anoSelecionado}</h2>
              <select
                value={anoSelecionado}
                onChange={(e) => setAnoSelecionado(e.target.value)}
                aria-label="Ano do painel"
                style={{
                  background: PALETTE.surface,
                  border: `1px solid ${PALETTE.line}`,
                  borderRadius: 8,
                  padding: "7px 12px",
                  color: PALETTE.textPrimary,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {anosDisponiveis.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="resumo">
              <div className="resumo-celula">
                <div className="resumo-rotulo">Aportado em {anoSelecionado}</div>
                <div className="resumo-valor num">{formatBRL(investidoAnoSelecionado)}</div>
              </div>
              <div className="resumo-celula">
                <div className="resumo-rotulo">{mesEmFoco ? `Aportado em ${mesEmFoco.name}` : "Aportado no mês"}</div>
                <div className="resumo-valor num">{formatBRL(mesEmFoco ? mesEmFoco.value : 0)}</div>
              </div>
              <div className="resumo-celula">
                <div className="resumo-rotulo">Média por mês</div>
                <div className="resumo-valor num">{formatBRL(mediaMensal)}</div>
                <div className="resumo-nota">
                  {porMes.length} {porMes.length === 1 ? "mês" : "meses"} com aporte
                </div>
              </div>
              <MetaAnualCard ano={anoSelecionado} investidoAno={investidoAnoSelecionado} meta={meta} onSaveMeta={saveMeta} />
            </div>

            <div className="grade">
              <ChartCard
                title="Aportes por mês (R$)"
                data={porMesCompleto}
                highlight={ultimoMesComAporte ? ultimoMesComAporte.name : null}
                tickFormatter={(v) => v.split("/")[0]}
              />
              <PieChartCard title="Por classe" data={porTipo} colorMap={TIPO_COLORS} />
              <AtivosList title="Por ativo" data={porAtivo} />
              <ChartCard title="Aportes por ano (R$)" data={porAno} highlight={anoSelecionado} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const GRUPOS_ABAS = [
  { nome: "Carteira", abas: [["painel", "Painel"], ["lancamentos", "Lançamentos"], ["ativos", "Ativos"]] },
  { nome: "Ferramentas", abas: [["mercado", "Mercado"], ["trade", "Trade"], ["calculadora", "Calculadora"], ["valuation", "Valuation"]] },
];

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
        style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: PALETTE.accent, cursor: "pointer", fontSize: 12, fontFamily: "'Hanken Grotesk', sans-serif", padding: 0 }}
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
              <div style={{ fontSize: 12, color: PALETTE.crimsonText }}>{error}</div>
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
                  style={{ display: "flex", alignItems: "center", gap: 4, background: PALETTE.accent, color: PALETTE.onAccent, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
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
