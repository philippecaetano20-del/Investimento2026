import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { db, initDb } from "../src/db.js";

const email = String(process.env.OWNER_EMAIL || "").trim().toLowerCase();
const senha = String(process.env.OWNER_PASSWORD || "");
const nome = String(process.env.OWNER_NOME || "Philippe");

if (!email || !senha) {
  console.error("Defina OWNER_EMAIL e OWNER_PASSWORD no ambiente antes de rodar este script.");
  process.exit(1);
}

await initDb();

let ownerId;
const existing = await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] });
if (existing.rows.length > 0) {
  ownerId = existing.rows[0].id;
  console.log(`Usuário ${email} já existe (id ${ownerId}). Reaproveitando.`);
} else {
  ownerId = randomUUID();
  const passwordHash = await bcrypt.hash(senha, 10);
  await db.execute({
    sql: "INSERT INTO users (id, email, nome, passwordHash) VALUES (?, ?, ?, ?)",
    args: [ownerId, email, nome, passwordHash],
  });
  console.log(`Usuário ${email} criado (id ${ownerId}).`);
}

const entriesResult = await db.execute({
  sql: "UPDATE entries SET userId = ? WHERE userId IS NULL",
  args: [ownerId],
});
console.log(`Lançamentos atribuídos ao usuário: ${entriesResult.rowsAffected ?? "?"}`);

const ativosNullResult = await db.execute({
  sql: "UPDATE ativos SET userId = ? WHERE userId IS NULL",
  args: [ownerId],
});
console.log(`Ativos (tabela nova) atribuídos: ${ativosNullResult.rowsAffected ?? 0}`);

const legacyExists = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ativos_legacy'");
if (legacyExists.rows.length > 0) {
  const legacyRows = await db.execute("SELECT nome FROM ativos_legacy");
  let migrados = 0;
  for (const row of legacyRows.rows) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO ativos (id, userId, nome) VALUES (?, ?, ?)",
      args: [randomUUID(), ownerId, row.nome],
    });
    migrados++;
  }
  await db.execute("DROP TABLE ativos_legacy");
  console.log(`Ativos migrados da tabela legada: ${migrados}. Tabela ativos_legacy removida.`);
} else {
  console.log("Nenhuma tabela ativos_legacy encontrada (migração já concluída antes).");
}

console.log("Concluído.");
process.exit(0);
