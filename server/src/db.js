import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_ATIVOS } from "./seedData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data.db");

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
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
    reservaOportunidade REAL NOT NULL DEFAULT 0,
    estaReinvestido INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS ativos (
    nome TEXT PRIMARY KEY
  );
`);

const entryColumns = db.prepare("PRAGMA table_info(entries)").all().map((c) => c.name);
if (!entryColumns.includes("estaReinvestido")) {
  db.exec("ALTER TABLE entries ADD COLUMN estaReinvestido INTEGER NOT NULL DEFAULT 0;");
  db.exec("UPDATE entries SET estaReinvestido = 1 WHERE valorInvestido = 0 AND valorReinvestido > 0;");
}

const ativosCount = db.prepare("SELECT COUNT(*) AS c FROM ativos").get().c;
if (ativosCount === 0) {
  const insert = db.prepare("INSERT OR IGNORE INTO ativos (nome) VALUES (?)");
  db.exec("BEGIN");
  try {
    DEFAULT_ATIVOS.forEach((n) => insert.run(n));
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function withTransaction(fn) {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
