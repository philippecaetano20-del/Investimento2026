const CSV_URL =
  "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas
const IR_LONGO_PRAZO = 0.15; // alíquota mínima (>720 dias) da tabela regressiva

let cache = { data: null, fetchedAt: 0 };

function parseDataBR(str) {
  const [d, m, y] = str.split("/").map(Number);
  return new Date(y, m - 1, d).getTime();
}

function parseNumeroBR(str) {
  const n = Number(String(str).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function melhorReferencia(rows, tipoExato) {
  let melhor = null;
  for (const r of rows) {
    if (r.tipo !== tipoExato) continue;
    if (!melhor || r.vencimentoTs > melhor.vencimentoTs) melhor = r;
  }
  return melhor;
}

async function baixarCsv() {
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`Falha ao acessar Tesouro Transparente (${res.status})`);
  const buffer = await res.arrayBuffer();
  return new TextDecoder("utf-8").decode(buffer);
}

function parseTaxas(csv) {
  const linhas = csv.split("\n");
  let maxTs = -Infinity;
  let recentes = [];

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;
    const cols = linha.split(";");
    if (cols.length < 5) continue;
    const [tipo, vencimento, dataBase, taxaCompra] = cols;
    const dataBaseTs = parseDataBR(dataBase);
    if (!dataBaseTs) continue;

    if (dataBaseTs > maxTs) {
      maxTs = dataBaseTs;
      recentes = [];
    }
    if (dataBaseTs === maxTs) {
      recentes.push({
        tipo,
        vencimento,
        vencimentoTs: parseDataBR(vencimento),
        taxaCompra: parseNumeroBR(taxaCompra),
      });
    }
  }

  const ipca = melhorReferencia(recentes, "Tesouro IPCA+");
  const prefixado = melhorReferencia(recentes, "Tesouro Prefixado");
  if (!ipca || !prefixado) throw new Error("Não foi possível localizar as taxas de referência do Tesouro Direto.");

  function toResultado(r) {
    const bruta = r.taxaCompra;
    const liquida = bruta != null ? Number((bruta * (1 - IR_LONGO_PRAZO)).toFixed(2)) : null;
    return { titulo: `${r.tipo.replace("Tesouro ", "")} ${r.vencimento.slice(-4)}`, vencimento: r.vencimento, taxaBruta: bruta, taxaLiquida: liquida };
  }

  return {
    dataBase: new Date(maxTs).toLocaleDateString("pt-BR"),
    ipca: toResultado(ipca),
    prefixado: toResultado(prefixado),
  };
}

export async function getTaxasTesouro({ force = false } = {}) {
  const agora = Date.now();
  if (!force && cache.data && agora - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }
  const csv = await baixarCsv();
  const data = parseTaxas(csv);
  cache = { data, fetchedAt: agora };
  return data;
}
