import { createClient } from "@libsql/client";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { DEFAULT_ATIVOS } from "./seedData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data.db");

const url = process.env.TURSO_DATABASE_URL || `file:${DB_PATH}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db = createClient(authToken ? { url, authToken } : { url });

export async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL,
      nivel TEXT NOT NULL,
      valorPago REAL NOT NULL DEFAULT 0,
      quantidade REAL NOT NULL DEFAULT 0,
      valorInvestido REAL NOT NULL DEFAULT 0,
      data TEXT NOT NULL,
      rentabilidade REAL NOT NULL DEFAULT 0,
      valorReinvestido REAL NOT NULL DEFAULT 0,
      estaReinvestido INTEGER NOT NULL DEFAULT 0
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ativos (
      nome TEXT PRIMARY KEY
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invites (
      token TEXT PRIMARY KEY,
      createdBy TEXT NOT NULL,
      usedBy TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      usedAt TEXT
    );
  `);

  const tableInfo = await db.execute("PRAGMA table_info(entries)");
  const entryColumns = tableInfo.rows.map((c) => c.name);
  if (!entryColumns.includes("estaReinvestido")) {
    await db.execute("ALTER TABLE entries ADD COLUMN estaReinvestido INTEGER NOT NULL DEFAULT 0;");
    await db.execute("UPDATE entries SET estaReinvestido = 1 WHERE valorInvestido = 0 AND valorReinvestido > 0;");
  }
  if (entryColumns.includes("reservaOportunidade")) {
    await db.execute("ALTER TABLE entries DROP COLUMN reservaOportunidade;");
  }
  if (!entryColumns.includes("userId")) {
    await db.execute("ALTER TABLE entries ADD COLUMN userId TEXT;");
  }

  const ativosInfo = await db.execute("PRAGMA table_info(ativos)");
  const ativosColumns = ativosInfo.rows.map((c) => c.name);
  if (!ativosColumns.includes("userId")) {
    await db.execute("ALTER TABLE ativos RENAME TO ativos_legacy;");
    await db.execute(`
      CREATE TABLE ativos (
        id TEXT PRIMARY KEY,
        userId TEXT,
        nome TEXT NOT NULL,
        UNIQUE(userId, nome)
      );
    `);
  }

  const ativosCount = await db.execute("SELECT COUNT(*) AS c FROM ativos");
  const legacyExists = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ativos_legacy'");
  if (Number(ativosCount.rows[0].c) === 0 && legacyExists.rows.length === 0) {
    const tx = await db.transaction("write");
    try {
      for (const nome of DEFAULT_ATIVOS) {
        await tx.execute({ sql: "INSERT OR IGNORE INTO ativos (id, userId, nome) VALUES (?, NULL, ?)", args: [randomUUID(), nome] });
      }
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }
}
