import { Router } from "express";

const router = Router();
const BRAPI_BASE = "https://brapi.dev/api";

function ah(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

function withToken(params) {
  if (process.env.BRAPI_TOKEN) params.set("token", process.env.BRAPI_TOKEN);
  return params;
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

    const range = String(req.query.range || "3mo");
    const interval = String(req.query.interval || "1d");
    const params = withToken(new URLSearchParams({ range, interval }));
    const r = await fetch(`${BRAPI_BASE}/quote/${encodeURIComponent(ticker)}?${params.toString()}`);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || "Não foi possível obter a cotação." });

    const quote = data.results?.[0];
    if (!quote) return res.status(404).json({ error: "Ativo não encontrado." });
    res.json(quote);
  })
);

export default router;
