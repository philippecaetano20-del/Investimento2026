import express from "express";
import cors from "cors";
import { initDb } from "./db.js";
import entriesRouter from "./routes/entries.js";
import ativosRouter from "./routes/ativos.js";
import marketRouter from "./routes/market.js";

const app = express();
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN;

app.use(cors(CORS_ORIGIN ? { origin: CORS_ORIGIN.split(",") } : {}));
app.use(express.json());

app.use("/api/entries", entriesRouter);
app.use("/api/ativos", ativosRouter);
app.use("/api/market", marketRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API rodando em http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Falha ao inicializar o banco de dados:", err);
    process.exit(1);
  });
