import { Router } from "express";
import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { requireAuth, signToken } from "../middleware/auth.js";

const router = Router();

function ah(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

router.post(
  "/login",
  ah(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const senha = String(req.body?.senha || "");
    if (!email || !senha) return res.status(400).json({ error: "Informe email e senha." });

    const result = await db.execute({ sql: "SELECT * FROM users WHERE email = ?", args: [email] });
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Email ou senha inválidos." });

    const ok = await bcrypt.compare(senha, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Email ou senha inválidos." });

    const token = signToken(user);
    res.json({ token, user: { id: user.id, email: user.email, nome: user.nome } });
  })
);

router.get(
  "/me",
  requireAuth,
  ah(async (req, res) => {
    res.json({ user: req.user });
  })
);

router.get(
  "/invites/:token",
  ah(async (req, res) => {
    const result = await db.execute({ sql: "SELECT * FROM invites WHERE token = ?", args: [req.params.token] });
    const invite = result.rows[0];
    if (!invite) return res.status(404).json({ error: "Convite não encontrado." });
    if (invite.usedAt) return res.status(410).json({ error: "Esse convite já foi utilizado." });
    res.json({ valid: true });
  })
);

router.post(
  "/accept-invite",
  ah(async (req, res) => {
    const token = String(req.body?.token || "").trim();
    const nome = String(req.body?.nome || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const senha = String(req.body?.senha || "");
    if (!token || !nome || !email || !senha) return res.status(400).json({ error: "Preencha todos os campos." });
    if (senha.length < 6) return res.status(400).json({ error: "A senha precisa ter pelo menos 6 caracteres." });

    const inviteResult = await db.execute({ sql: "SELECT * FROM invites WHERE token = ?", args: [token] });
    const invite = inviteResult.rows[0];
    if (!invite) return res.status(404).json({ error: "Convite não encontrado." });
    if (invite.usedAt) return res.status(410).json({ error: "Esse convite já foi utilizado." });

    const dup = await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] });
    if (dup.rows.length > 0) return res.status(409).json({ error: "Já existe uma conta com esse email." });

    const passwordHash = await bcrypt.hash(senha, 10);
    const user = { id: randomUUID(), email, nome, passwordHash };

    const tx = await db.transaction("write");
    try {
      await tx.execute({
        sql: "INSERT INTO users (id, email, nome, passwordHash) VALUES (?, ?, ?, ?)",
        args: [user.id, user.email, user.nome, user.passwordHash],
      });
      await tx.execute({
        sql: "UPDATE invites SET usedBy = ?, usedAt = datetime('now') WHERE token = ?",
        args: [user.id, token],
      });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    const jwtToken = signToken(user);
    res.status(201).json({ token: jwtToken, user: { id: user.id, email: user.email, nome: user.nome } });
  })
);

router.post(
  "/invites",
  requireAuth,
  ah(async (req, res) => {
    const token = randomBytes(16).toString("hex");
    await db.execute({
      sql: "INSERT INTO invites (token, createdBy) VALUES (?, ?)",
      args: [token, req.user.id],
    });
    res.status(201).json({ token });
  })
);

export default router;
