const BASE = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "investidor_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

const PUBLIC_PATHS = ["/auth/login", "/auth/accept-invite", "/auth/invites/"];

async function request(path, options) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options?.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && !PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    clearToken();
    if (onUnauthorized) onUnauthorized();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro na requisição (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (email, senha) => request("/auth/login", { method: "POST", body: JSON.stringify({ email, senha }) }),
  me: () => request("/auth/me"),
  checkInvite: (token) => request(`/auth/invites/${encodeURIComponent(token)}`),
  acceptInvite: (data) => request("/auth/accept-invite", { method: "POST", body: JSON.stringify(data) }),
  createInvite: () => request("/auth/invites", { method: "POST" }),

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
  getFundamentals: (ticker) => request(`/market/fundamentals/${encodeURIComponent(ticker)}`),
  getTesouro: () => request("/market/tesouro"),

  getMeta: (ano) => request(`/metas/${ano}`),
  setMeta: (ano, valor) => request(`/metas/${ano}`, { method: "PUT", body: JSON.stringify({ valor }) }),
};
