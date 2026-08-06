import { Router } from "express";
import { db } from "../db.js";

const router = Router();

function ah(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

router.get(
  "/:ano",
  ah(async (req, res) => {
    const ano = Number(req.params.ano);
    if (!Number.isInteger(ano)) return res.status(400).json({ error: "Ano inválido." });

    const result = await db.execute({
      sql: "SELECT valor FROM metas WHERE userId = ? AND ano = ?",
      args: [req.user.id, ano],
    });
    res.json({ ano, valor: result.rows[0]?.valor ?? 0 });
  })
);

router.put(
  "/:ano",
  ah(async (req, res) => {
    const ano = Number(req.params.ano);
    const valor = Number(req.body?.valor);
    if (!Number.isInteger(ano)) return res.status(400).json({ error: "Ano inválido." });
    if (!Number.isFinite(valor) || valor < 0) return res.status(400).json({ error: "Informe um valor de meta válido." });

    await db.execute({
      sql: `INSERT INTO metas (userId, ano, valor) VALUES (?, ?, ?)
            ON CONFLICT(userId, ano) DO UPDATE SET valor = excluded.valor`,
      args: [req.user.id, ano, valor],
    });
    res.json({ ano, valor });
  })
);

export default router;
