import { Router } from "express";
import { getFiiRanking } from "../services/fundamentus.js";
import { getTaxasTesouro } from "../services/tesouro.js";

const router = Router();
const BRAPI_BASE = "https://brapi.dev/api";

function ah(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

function withToken(params) {
  if (process.env.BRAPI_TOKEN) params.set("token", process.env.BRAPI_TOKEN);
  return params;
}

async function fetchQuote(ticker, { range = "3mo", interval = "1d" } = {}) {
  const params = withToken(new URLSearchParams({ range, interval }));
  const r = await fetch(`${BRAPI_BASE}/quote/${encodeURIComponent(ticker)}?${params.toString()}`);
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || "Não foi possível obter a cotação.");
  const quote = data.results?.[0];
  if (!quote) throw new Error("Ativo não encontrado.");
  return quote;
}

router.get(
  "/search",
  ah(async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ stocks: [] });

    const params = withToken(new URLSearchParams({ search: q }));
    const r = await fetch(`${BRAPI_BASE}/available?${params.toString()}`);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || "Erro ao buscar ativos." });
    res.json({ stocks: data.stocks || [] });
  })
);

router.get(
  "/quote/:ticker",
  ah(async (req, res) => {
    const ticker = String(req.params.ticker || "").trim().toUpperCase();
    if (!ticker) return res.status(400).json({ error: "Informe o ticker." });

    try {
      const quote = await fetchQuote(ticker, { range: req.query.range, interval: req.query.interval });
      res.json(quote);
    } catch (e) {
      res.status(404).json({ error: e.message });
    }
  })
);

router.get(
  "/watchlist",
  ah(async (req, res) => {
    const tickers = String(req.query.tickers || "")
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    if (tickers.length === 0) return res.json({ quotes: [] });

    const settled = await Promise.allSettled(
      tickers.map((ticker) => fetchQuote(ticker, { range: "5d", interval: "1d" }))
    );
    const quotes = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);
    res.json({ quotes });
  })
);

router.get(
  "/fundamentals/:ticker",
  ah(async (req, res) => {
    const ticker = String(req.params.ticker || "").trim().toUpperCase();
    if (!ticker) return res.status(400).json({ error: "Informe o ticker." });

    const params = withToken(new URLSearchParams({ modules: "defaultKeyStatistics" }));
    const r = await fetch(`${BRAPI_BASE}/quote/${encodeURIComponent(ticker)}?${params.toString()}`);
    const data = await r.json();

    if (!r.ok) {
      if (data.code !== "MODULES_NOT_AVAILABLE") {
        return res.status(404).json({ error: data.message || "Ativo não encontrado." });
      }
      try {
        const base = await fetchQuote(ticker);
        return res.json({
          symbol: base.symbol,
          longName: base.longName || base.shortName,
          regularMarketPrice: base.regularMarketPrice,
          lpa: base.earningsPerShare ?? null,
          vpa: null,
          dividendYield: null,
          fundamentalsAvailable: false,
        });
      } catch (e) {
        return res.status(404).json({ error: e.message });
      }
    }

    const q = data.results?.[0];
    if (!q) return res.status(404).json({ error: "Ativo não encontrado." });
    const stats = q.defaultKeyStatistics || {};
    res.json({
      symbol: q.symbol,
      longName: q.longName || q.shortName,
      regularMarketPrice: q.regularMarketPrice,
      lpa: q.earningsPerShare ?? stats.trailingEps ?? null,
      vpa: stats.bookValue ?? null,
      dividendYield: stats.dividendYield != null ? stats.dividendYield * 100 : null,
      fundamentalsAvailable: stats.bookValue != null || q.earningsPerShare != null,
    });
  })
);

router.get(
  "/fii-ranking",
  ah(async (req, res) => {
    try {
      const { items, updatedAt } = await getFiiRanking({ force: req.query.force === "1" });
      res.json({ items, updatedAt });
    } catch (e) {
      res.status(502).json({ error: e.message || "Não foi possível obter o ranking de FIIs." });
    }
  })
);

router.get(
  "/tesouro",
  ah(async (req, res) => {
    try {
      const taxas = await getTaxasTesouro({ force: req.query.force === "1" });
      res.json(taxas);
    } catch (e) {
      res.status(502).json({ error: e.message || "Não foi possível obter as taxas do Tesouro Direto." });
    }
  })
);

export default router;
