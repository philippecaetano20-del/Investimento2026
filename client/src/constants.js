export const PALETTE = {
  bg: "#0E1522",
  surface: "#161F30",
  surfaceAlt: "#1C2740",
  line: "#2A3652",
  gold: "#D4A94F",
  emerald: "#3FAE7A",
  crimson: "#B8503F",
  // Lighter tint of `crimson` for text/icons on dark backgrounds — the base
  // crimson only hits ~3.3:1 there, below the 4.5:1 WCAG AA floor for text.
  // Keep `crimson` itself for fills/borders/buttons where it sits behind light text.
  crimsonText: "#D97A5C",
  textPrimary: "#EDEFF4",
  textMuted: "#8B96AA",
};

export const BAR_COLORS = ["#D4A94F", "#3FAE7A", "#5B8CC9", "#B8503F", "#8B6FC9", "#4FA8B8", "#C98F4F", "#6FA8DC"];

export const TIPOS = ["Ação", "FII", "ETF", "Renda Fixa", "Tesouro Direto", "Cripto", "Outro"];

export const TIPO_COLORS = Object.fromEntries(TIPOS.map((t, i) => [t, BAR_COLORS[i % BAR_COLORS.length]]));

export const HISTORICO_ANOS_ANTERIORES = {
  "2023": 3351.12,
  "2024": 24376.74,
  "2025": 52089.94,
};
