import * as cheerio from "cheerio";

const URL = "https://www.fundamentus.com.br/fii_resultado.php";
const URL_ACOES = "https://www.fundamentus.com.br/resultado.php";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

const SEGMENTOS_PAPEL = new Set(["Títulos e Val. Mob.", "Titulos e Val. Mob."]);
const SEGMENTOS_HIBRIDO = new Set(["Multicategoria", "Outros"]);

let cache = { data: null, fetchedAt: 0 };

function tipoPorSegmento(segmento) {
  if (SEGMENTOS_PAPEL.has(segmento)) return "Papel";
  if (SEGMENTOS_HIBRIDO.has(segmento)) return "Híbrido";
  return "Tijolo";
}

function parseNumero(texto) {
  if (texto == null) return null;
  const limpo = String(texto).trim().replace(/\./g, "").replace(",", ".").replace("%", "");
  if (limpo === "" || limpo === "-") return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

function parsePercentual(texto) {
  const n = parseNumero(texto);
  return n === null ? null : n;
}

async function baixarPagina(url = URL) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`Falha ao acessar Fundamentus (${res.status})`);
  const buffer = await res.arrayBuffer();
  return new TextDecoder("iso-8859-1").decode(buffer);
}

function parseTabela(html) {
  const $ = cheerio.load(html);
  const linhas = [];

  $("#tabelaResultado tbody tr").each((_, tr) => {
    const tds = $(tr).find("td");
    const ticker = $(tds[0]).find("a").text().trim();
    if (!ticker) return;

    const segmento = $(tds[1]).text().trim() || "Outros";

    linhas.push({
      ticker,
      segmento,
      tipo: tipoPorSegmento(segmento),
      cotacao: parseNumero($(tds[2]).text()),
      ffoYield: parsePercentual($(tds[3]).text()),
      dividendYield: parsePercentual($(tds[4]).text()),
      pvp: parseNumero($(tds[5]).text()),
      valorMercado: parseNumero($(tds[6]).text()),
      liquidez: parseNumero($(tds[7]).text()),
      qtdImoveis: parseNumero($(tds[8]).text()),
      precoM2: parseNumero($(tds[9]).text()),
      aluguelM2: parseNumero($(tds[10]).text()),
      capRate: parsePercentual($(tds[11]).text()),
      vacancia: parsePercentual($(tds[12]).text()),
    });
  });

  return linhas;
}

export async function getFiiRanking({ force = false } = {}) {
  const agora = Date.now();
  if (!force && cache.data && agora - cache.fetchedAt < CACHE_TTL_MS) {
    return { items: cache.data, updatedAt: cache.fetchedAt };
  }

  const html = await baixarPagina();
  const items = parseTabela(html);
  if (items.length === 0) throw new Error("Não foi possível interpretar os dados do Fundamentus.");

  cache = { data: items, fetchedAt: agora };
  return { items, updatedAt: agora };
}

let cacheAcoes = { data: null, fetchedAt: 0 };

function parseTabelaAcoes(html) {
  const $ = cheerio.load(html);
  const mapa = new Map();

  $("#resultado tbody tr").each((_, tr) => {
    const tds = $(tr).find("td");
    const ticker = $(tds[0]).find("a").text().trim();
    if (!ticker) return;
    const nome = $(tds[0]).find(".tips").attr("title") || ticker;

    const cotacao = parseNumero($(tds[1]).text());
    const pl = parseNumero($(tds[2]).text());
    const pvp = parseNumero($(tds[3]).text());
    const dividendYield = parsePercentual($(tds[5]).text());

    mapa.set(ticker, {
      ticker,
      nome,
      cotacao,
      pl,
      pvp,
      dividendYield,
      lpa: pl && cotacao != null ? Number((cotacao / pl).toFixed(2)) : null,
      vpa: pvp && cotacao != null ? Number((cotacao / pvp).toFixed(2)) : null,
    });
  });

  return mapa;
}

export async function getAcoesFundamentus({ force = false } = {}) {
  const agora = Date.now();
  if (!force && cacheAcoes.data && agora - cacheAcoes.fetchedAt < CACHE_TTL_MS) {
    return cacheAcoes.data;
  }

  const html = await baixarPagina(URL_ACOES);
  const mapa = parseTabelaAcoes(html);
  if (mapa.size === 0) throw new Error("Não foi possível interpretar os dados de ações do Fundamentus.");

  cacheAcoes = { data: mapa, fetchedAt: agora };
  return mapa;
}

export async function getAcaoFundamentus(ticker) {
  const mapa = await getAcoesFundamentus();
  return mapa.get(String(ticker).toUpperCase().trim()) || null;
}
