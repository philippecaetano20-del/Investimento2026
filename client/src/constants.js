// Grafite neutro: a cor fica reservada para significado (destaque, ganho, perda, classe)
export const PALETTE = {
  bg: "#0F1012",
  surface: "#16171A",
  surfaceAlt: "#1D1E22",
  line: "#2A2B30",
  accent: "#9AA7FF",
  onAccent: "#0F1012",
  emerald: "#5BC08C",
  crimson: "#C9574A",
  // Tom mais claro de `crimson` para texto/ícones sobre fundo escuro (≥4.5:1);
  // `crimson` fica para preenchimentos e bordas atrás de texto claro.
  crimsonText: "#EB8A7A",
  textPrimary: "#ECECEE",
  textMuted: "#9A9CA5",
  barMuted: "#3A3C44",
};

export const BAR_COLORS = ["#9AA7FF", "#5BC08C", "#E3B46A", "#D98AA6", "#6CC3E0", "#B59CF0", "#C7C2B8", "#E0876A"];

export const TIPOS = ["Ação", "FII", "ETF", "Renda Fixa", "Tesouro Direto", "Cripto", "Outro"];

export const TIPO_COLORS = Object.fromEntries(TIPOS.map((t, i) => [t, BAR_COLORS[i % BAR_COLORS.length]]));

export const HISTORICO_ANOS_ANTERIORES = {
  "2023": 3351.12,
  "2024": 24376.74,
  "2025": 52089.94,
};
