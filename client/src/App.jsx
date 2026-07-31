import React, { useState, useEffect, useMemo } from "react";
import { Wallet } from "lucide-react";
import { PALETTE } from "./constants.js";
import { formatBRL, monthLabel, emptyForm, parseNumBR } from "./utils.js";
import { api } from "./api.js";
import { HISTORICO_ANOS_ANTERIORES, META_2026 } from "./constants.js";
import { ChartCard, PieChartCard } from "./components/charts.jsx";
import { MetaAnualCard } from "./components/MetaAnualCard.jsx";
import { SummaryCard } from "./components/SummaryCard.jsx";
import { TabButton } from "./components/TabButton.jsx";
import { LancamentosTab } from "./components/LancamentosTab.jsx";
import { AssetsManager } from "./components/AssetsManager.jsx";

export default function InvestmentDashboard() {
  const [entries, setEntries] = useState([]);
  const [ativosList, setAtivosList] = useState([]);
  const [activeTab, setActiveTab] = useState("painel");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [entriesData, ativosData] = await Promise.all([api.listEntries(), api.listAtivos()]);
        setEntries(entriesData);
        setAtivosList(ativosData);
      } catch (e) {
        setSaveError("Não foi possível carregar os dados do servidor.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
    if (!form.quantidade || isNaN(parseNumBR(form.quantidade))) {
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
      quantidade: parseNumBR(form.quantidade) || 0,
      rentabilidade: parseNumBR(form.rentabilidade) || 0,
      valorReinvestido: parseNumBR(form.valorReinvestido) || 0,
      reservaOportunidade: parseNumBR(form.reservaOportunidade) || 0,
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
    const totalReserva = entries.reduce((s, e) => s + e.reservaOportunidade, 0);
    const rentMedia =
      entries.length > 0
        ? entries.reduce((s, e) => s + e.rentabilidade, 0) / entries.length
        : 0;
    const ativos = new Set(entries.map((e) => e.nivel)).size;
    return { totalInvestido, totalReserva, rentMedia, ativos };
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
    entries.forEach((e) => {
      const key = e.data.slice(0, 7);
      map[key] = (map[key] || 0) + e.valorInvestido;
    });
    return Object.entries(map)
      .map(([key, value]) => ({ name: monthLabel(key), value, key }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [entries]);

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
        .reveal { animation: fadeUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .reveal-1 { animation-delay: 0.02s; }
        .reveal-2 { animation-delay: 0.1s; }
        .reveal-3 { animation-delay: 0.18s; }
        @media (prefers-reduced-motion: reduce) { .reveal { animation: none; } }

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
              style={{ fontSize: 11, color: PALETTE.textMuted, marginBottom: 4, letterSpacing: "0.1em" }}
            >
              TOTAL INVESTIDO
            </div>
            <div className="mono" style={{ fontSize: 34, fontWeight: 600, color: PALETTE.textPrimary }}>
              {formatBRL(totals.totalInvestido)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="reveal reveal-2" style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          <TabButton active={activeTab === "painel"} onClick={() => setActiveTab("painel")}>
            Painel
          </TabButton>
          <TabButton active={activeTab === "lancamentos"} onClick={() => setActiveTab("lancamentos")}>
            Lançamentos
          </TabButton>
          <TabButton active={activeTab === "ativos"} onClick={() => setActiveTab("ativos")}>
            Ativos
          </TabButton>
        </div>

        <div className="reveal reveal-3">
        {loading ? (
          <div style={{ color: PALETTE.textMuted, padding: 40, textAlign: "center" }}>
            Carregando dados...
          </div>
        ) : activeTab === "ativos" ? (
          <AssetsManager ativosList={ativosList} onAdd={addAtivo} onRename={renameAtivo} onRemove={removeAtivo} />
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
            {/* Summary card */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 14,
                marginBottom: 28,
              }}
            >
              <SummaryCard
                icon={<Wallet size={16} color={PALETTE.gold} />}
                label="Total investido"
                value={formatBRL(totals.totalInvestido)}
              />
            </div>

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

            <MetaAnualCard investido2026={porAno.find((d) => d.name === "2026")?.value || 0} meta={META_2026} />
          </>
        )}
        </div>
      </div>
    </div>
  );
}
