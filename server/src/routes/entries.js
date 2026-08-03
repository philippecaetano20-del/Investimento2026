import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db, withTransaction } from "../db.js";
import { IMPORT_2026 } from "../seedData.js";

const router = Router();

const COLUMNS = [
  "id",
  "tipo",
  "nivel",
  "valorPago",
  "quantidade",
  "valorInvestido",
  "data",
  "rentabilidade",
  "valorReinvestido",
  "estaReinvestido",
];

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isTrue(v) {
  return v === true || v === "true" || v === 1 || v === "1" || v === "Sim";
}

function toEntryRow(body, id) {
  const valorPago = num(body.valorPago);
  const quantidade = num(body.quantidade);
  const estaReinvestido = isTrue(body.estaReinvestido);
  const calculado = valorPago * quantidade;
  return {
    id,
    tipo: String(body.tipo || "").trim(),
    nivel: String(body.nivel || "").trim(),
    valorPago,
    quantidade,
    valorInvestido: estaReinvestido ? 0 : calculado,
    data: String(body.data || ""),
    rentabilidade: num(body.rentabilidade),
    valorReinvestido: calculado,
    estaReinvestido: estaReinvestido ? 1 : 0,
  };
}

function rowValues(row) {
  return COLUMNS.map((c) => row[c]);
}

const insertStmt = db.prepare(
  `INSERT INTO entries (${COLUMNS.join(", ")}) VALUES (${COLUMNS.map(() => "?").join(", ")})`
);
const updateStmt = db.prepare(
  `UPDATE entries SET ${COLUMNS.filter((c) => c !== "id")
    .map((c) => `${c} = ?`)
    .join(", ")} WHERE id = ?`
);

router.get("/", (req, res) => {
  const rows = db.prepare(`SELECT ${COLUMNS.join(", ")} FROM entries ORDER BY data DESC`).all();
  res.json(rows);
});

router.post("/", (req, res) => {
  const { nivel, valorPago, quantidade, data } = req.body || {};
  if (!nivel || !String(nivel).trim()) return res.status(400).json({ error: "Informe o ativo." });
  if (valorPago === undefined || valorPago === "" || Number.isNaN(Number(valorPago))) {
    return res.status(400).json({ error: "Informe um valor pago válido." });
  }
  if (quantidade === undefined || quantidade === "" || Number.isNaN(Number(quantidade))) {
    return res.status(400).json({ error: "Informe uma quantidade válida." });
  }
  if (!data) return res.status(400).json({ error: "Informe a data." });

  const row = toEntryRow(req.body, randomUUID());
  insertStmt.run(...rowValues(row));
  res.status(201).json(row);
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT id FROM entries WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Lançamento não encontrado." });

  const row = toEntryRow(req.body, req.params.id);
  const updateValues = COLUMNS.filter((c) => c !== "id").map((c) => row[c]);
  updateStmt.run(...updateValues, row.id);
  res.json(row);
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM entries WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

router.post("/import-2026", (req, res) => {
  const existentes = db.prepare(`SELECT ${COLUMNS.join(", ")} FROM entries`).all();

  const encontraIgual = (novo) =>
    existentes.find(
      (e) =>
        e.nivel === novo.nivel &&
        e.data === novo.data &&
        Math.abs(e.valorPago - novo.valorPago) < 0.001 &&
        Math.abs(e.quantidade - novo.quantidade) < 0.001
    );

  const updateImportStmt = db.prepare(
    "UPDATE entries SET tipo = ?, valorInvestido = ?, valorReinvestido = ?, estaReinvestido = ? WHERE id = ?"
  );

  let adicionados = 0;
  let atualizados = 0;

  withTransaction(() => {
    IMPORT_2026.forEach((n) => {
      const valorInvestido = num(n.valorInvestido);
      const valorReinvestido = num(n.valorReinvestido);
      const dados = {
        tipo: n.tipo,
        nivel: n.nivel,
        valorPago: num(n.valorPago),
        quantidade: num(n.quantidade),
        valorInvestido,
        data: n.data,
        rentabilidade: n.rentabilidade === "" ? 0 : num(n.rentabilidade),
        valorReinvestido,
        estaReinvestido: valorInvestido === 0 && valorReinvestido > 0 ? 1 : 0,
      };
      const existente = encontraIgual(dados);
      if (existente) {
        const mudou =
          Math.abs(existente.valorInvestido - dados.valorInvestido) > 0.001 ||
          Math.abs(existente.valorReinvestido - dados.valorReinvestido) > 0.001 ||
          existente.tipo !== dados.tipo ||
          Number(existente.estaReinvestido) !== dados.estaReinvestido;
        if (mudou) {
          updateImportStmt.run(dados.tipo, dados.valorInvestido, dados.valorReinvestido, dados.estaReinvestido, existente.id);
          existente.tipo = dados.tipo;
          existente.valorInvestido = dados.valorInvestido;
          existente.valorReinvestido = dados.valorReinvestido;
          existente.estaReinvestido = dados.estaReinvestido;
          atualizados++;
        }
      } else {
        const row = { ...dados, id: randomUUID() };
        insertStmt.run(...rowValues(row));
        existentes.push(row);
        adicionados++;
      }
    });
  });

  const partes = [];
  if (adicionados > 0) partes.push(`${adicionados} lançamento${adicionados !== 1 ? "s" : ""} importado${adicionados !== 1 ? "s" : ""}`);
  if (atualizados > 0) partes.push(`${atualizados} corrigido${atualizados !== 1 ? "s" : ""}`);
  const message =
    partes.length === 0
      ? "Todos os lançamentos da planilha já estavam cadastrados e atualizados."
      : partes.join(" e ") + " a partir da planilha.";

  res.json({ adicionados, atualizados, message });
});

export default router;
