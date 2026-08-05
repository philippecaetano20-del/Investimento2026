const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro na requisição (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listEntries: () => request("/entries"),
  createEntry: (entry) => request("/entries", { method: "POST", body: JSON.stringify(entry) }),
  updateEntry: (id, entry) => request(`/entries/${id}`, { method: "PUT", body: JSON.stringify(entry) }),
  deleteEntry: (id) => request(`/entries/${id}`, { method: "DELETE" }),

  listAtivos: () => request("/ativos"),
  addAtivo: (nome) => request("/ativos", { method: "POST", body: JSON.stringify({ nome }) }),
  renameAtivo: (nomeAtual, novoNome) =>
    request(`/ativos/${encodeURIComponent(nomeAtual)}`, { method: "PUT", body: JSON.stringify({ nome: novoNome }) }),
  removeAtivo: (nome) => request(`/ativos/${encodeURIComponent(nome)}`, { method: "DELETE" }),

  searchMarket: (q) => request(`/market/search?q=${encodeURIComponent(q)}`),
  getQuote: (ticker, range = "3mo") => request(`/market/quote/${encodeURIComponent(ticker)}?range=${encodeURIComponent(range)}`),
  getWatchlist: (tickers) => request(`/market/watchlist?tickers=${encodeURIComponent(tickers.join(","))}`),
  getFiiRanking: () => request("/market/fii-ranking"),
};
