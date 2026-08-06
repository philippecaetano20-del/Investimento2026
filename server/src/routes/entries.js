import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
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
const ALL_COLUMNS = [...COLUMNS, "userId"];

const INSERT_SQL = `INSERT INTO entries (${ALL_COLUMNS.join(", ")}) VALUES (${ALL_COLUMNS.map(() => "?").join(", ")})`;
const UPDATE_SQL = `UPDATE entries SET ${COLUMNS.filter((c) => c !== "id")
  .map((c) => `${c} = ?`)
  .join(", ")} WHERE id = ? AND userId = ?`;

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
  return ALL_COLUMNS.map((c) => row[c]);
}

function ah(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

router.get(
  "/",
  ah(async (req, res) => {
    const result = await db.execute({
      sql: `SELECT ${COLUMNS.join(", ")} FROM entries WHERE userId = ? ORDER BY data DESC`,
      args: [req.user.id],
    });
    res.json(result.rows);
  })
);

router.post(
  "/",
  ah(async (req, res) => {
    const { nivel, valorPago, quantidade, data } = req.body || {};
    if (!nivel || !String(nivel).trim()) return res.status(400).json({ error: "Informe o ativo." });
    if (valorPago === undefined || valorPago === "" || Number.isNaN(Number(valorPago))) {
      return res.status(400).json({ error: "Informe um valor pago válido." });
    }
    if (quantidade === undefined || quantidade === "" || Number.isNaN(Number(quantidade))) {
      return res.status(400).json({ error: "Informe uma quantidade válida." });
    }
    if (!data) return res.status(400).json({ error: "Informe a data." });

    const row = { ...toEntryRow(req.body, randomUUID()), userId: req.user.id };
    await db.execute({ sql: INSERT_SQL, args: rowValues(row) });
    res.status(201).json(row);
  })
);

router.put(
  "/:id",
  ah(async (req, res) => {
    const existing = await db.execute({
      sql: "SELECT id FROM entries WHERE id = ? AND userId = ?",
      args: [req.params.id, req.user.id],
    });
    if (existing.rows.length === 0) return res.status(404).json({ error: "Lançamento não encontrado." });

    const row = { ...toEntryRow(req.body, req.params.id), userId: req.user.id };
    const updateValues = COLUMNS.filter((c) => c !== "id").map((c) => row[c]);
    await db.execute({ sql: UPDATE_SQL, args: [...updateValues, row.id, req.user.id] });
    res.json(row);
  })
);

router.delete(
  "/:id",
  ah(async (req, res) => {
    await db.execute({ sql: "DELETE FROM entries WHERE id = ? AND userId = ?", args: [req.params.id, req.user.id] });
    res.status(204).end();
  })
);

router.post(
  "/import-2026",
  ah(async (req, res) => {
    let adicionados = 0;
    let atualizados = 0;

    const tx = await db.transaction("write");
    try {
      const existentesResult = await tx.execute({
        sql: `SELECT ${COLUMNS.join(", ")} FROM entries WHERE userId = ?`,
        args: [req.user.id],
      });
      const existentes = existentesResult.rows.map((r) => ({ ...r }));

      const encontraIgual = (novo) =>
        existentes.find(
          (e) =>
            e.nivel === novo.nivel &&
            e.data === novo.data &&
            Math.abs(e.valorPago - novo.valorPago) < 0.001 &&
            Math.abs(e.quantidade - novo.quantidade) < 0.001
        );

      for (const n of IMPORT_2026) {
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
            await tx.execute({
              sql: "UPDATE entries SET tipo = ?, valorInvestido = ?, valorReinvestido = ?, estaReinvestido = ? WHERE id = ? AND userId = ?",
              args: [dados.tipo, dados.valorInvestido, dados.valorReinvestido, dados.estaReinvestido, existente.id, req.user.id],
            });
            existente.tipo = dados.tipo;
            existente.valorInvestido = dados.valorInvestido;
            existente.valorReinvestido = dados.valorReinvestido;
            existente.estaReinvestido = dados.estaReinvestido;
            atualizados++;
          }
        } else {
          const row = { ...dados, id: randomUUID(), userId: req.user.id };
          await tx.execute({ sql: INSERT_SQL, args: rowValues(row) });
          existentes.push(row);
          adicionados++;
        }
      }

      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    const partes = [];
    if (adicionados > 0) partes.push(`${adicionados} lançamento${adicionados !== 1 ? "s" : ""} importado${adicionados !== 1 ? "s" : ""}`);
    if (atualizados > 0) partes.push(`${atualizados} corrigido${atualizados !== 1 ? "s" : ""}`);
    const message =
      partes.length === 0
        ? "Todos os lançamentos da planilha já estavam cadastrados e atualizados."
        : partes.join(" e ") + " a partir da planilha.";

    res.json({ adicionados, atualizados, message });
  })
);

export default router;
