import { Router } from "express";
import { db, withTransaction } from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT nome FROM ativos ORDER BY nome COLLATE NOCASE").all();
  res.json(rows.map((r) => r.nome));
});

router.post("/", (req, res) => {
  const nome = String(req.body?.nome || "").trim();
  if (!nome) return res.status(400).json({ error: "Informe o nome do ativo." });
  const dup = db.prepare("SELECT nome FROM ativos WHERE nome = ? COLLATE NOCASE").get(nome);
  if (dup) return res.status(409).json({ error: "Esse ativo já está cadastrado." });
  db.prepare("INSERT INTO ativos (nome) VALUES (?)").run(nome);
  res.status(201).json({ nome });
});

router.put("/:nome", (req, res) => {
  const nomeAtual = req.params.nome;
  const novoNome = String(req.body?.nome || "").trim();
  if (!novoNome) return res.status(400).json({ error: "Informe o novo nome do ativo." });

  const existente = db.prepare("SELECT nome FROM ativos WHERE nome = ?").get(nomeAtual);
  if (!existente) return res.status(404).json({ error: "Ativo não encontrado." });

  if (novoNome.toLowerCase() !== nomeAtual.toLowerCase()) {
    const dup = db.prepare("SELECT nome FROM ativos WHERE nome = ? COLLATE NOCASE").get(novoNome);
    if (dup) return res.status(409).json({ error: "Já existe um ativo com esse nome." });
  }

  withTransaction(() => {
    db.prepare("UPDATE ativos SET nome = ? WHERE nome = ?").run(novoNome, nomeAtual);
    db.prepare("UPDATE entries SET nivel = ? WHERE nivel = ?").run(novoNome, nomeAtual);
  });

  res.json({ nome: novoNome });
});

router.delete("/:nome", (req, res) => {
  db.prepare("DELETE FROM ativos WHERE nome = ?").run(req.params.nome);
  res.status(204).end();
});

export default router;
