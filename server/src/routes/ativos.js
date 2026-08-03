import { Router } from "express";
import { db } from "../db.js";

const router = Router();

function ah(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

router.get(
  "/",
  ah(async (req, res) => {
    const result = await db.execute("SELECT nome FROM ativos ORDER BY nome COLLATE NOCASE");
    res.json(result.rows.map((r) => r.nome));
  })
);

router.post(
  "/",
  ah(async (req, res) => {
    const nome = String(req.body?.nome || "").trim();
    if (!nome) return res.status(400).json({ error: "Informe o nome do ativo." });
    const dup = await db.execute({ sql: "SELECT nome FROM ativos WHERE nome = ? COLLATE NOCASE", args: [nome] });
    if (dup.rows.length > 0) return res.status(409).json({ error: "Esse ativo já está cadastrado." });
    await db.execute({ sql: "INSERT INTO ativos (nome) VALUES (?)", args: [nome] });
    res.status(201).json({ nome });
  })
);

router.put(
  "/:nome",
  ah(async (req, res) => {
    const nomeAtual = req.params.nome;
    const novoNome = String(req.body?.nome || "").trim();
    if (!novoNome) return res.status(400).json({ error: "Informe o novo nome do ativo." });

    const existente = await db.execute({ sql: "SELECT nome FROM ativos WHERE nome = ?", args: [nomeAtual] });
    if (existente.rows.length === 0) return res.status(404).json({ error: "Ativo não encontrado." });

    if (novoNome.toLowerCase() !== nomeAtual.toLowerCase()) {
      const dup = await db.execute({ sql: "SELECT nome FROM ativos WHERE nome = ? COLLATE NOCASE", args: [novoNome] });
      if (dup.rows.length > 0) return res.status(409).json({ error: "Já existe um ativo com esse nome." });
    }

    const tx = await db.transaction("write");
    try {
      await tx.execute({ sql: "UPDATE ativos SET nome = ? WHERE nome = ?", args: [novoNome, nomeAtual] });
      await tx.execute({ sql: "UPDATE entries SET nivel = ? WHERE nivel = ?", args: [novoNome, nomeAtual] });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    res.json({ nome: novoNome });
  })
);

router.delete(
  "/:nome",
  ah(async (req, res) => {
    await db.execute({ sql: "DELETE FROM ativos WHERE nome = ?", args: [req.params.nome] });
    res.status(204).end();
  })
);

export default router;
