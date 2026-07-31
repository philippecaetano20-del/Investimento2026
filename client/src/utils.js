export function formatBRL(v) {
  const n = Number(v) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseNumBR(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim();
  if (!s) return 0;
  const normalized = s.replace(",", ".");
  const n = Number(normalized);
  return isNaN(n) ? NaN : n;
}

export function formatDateBR(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function monthLabel(iso) {
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const [y, m] = iso.split("-");
  return `${meses[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}

export function emptyForm() {
  return {
    id: null,
    tipo: "Ação",
    nivel: "",
    valorInvestido: "",
    rentabilidade: "",
    quantidade: "",
    valorPago: "",
    data: new Date().toISOString().slice(0, 10),
    valorReinvestido: "",
    reservaOportunidade: "",
    estaReinvestido: "Não",
  };
}
