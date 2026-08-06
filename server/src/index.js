import express from "express";
import cors from "cors";
import { initDb } from "./db.js";
import { requireAuth } from "./middleware/auth.js";
import authRouter from "./routes/auth.js";
import entriesRouter from "./routes/entries.js";
import ativosRouter from "./routes/ativos.js";
import marketRouter from "./routes/market.js";
import metasRouter from "./routes/metas.js";

const app = express();
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN;

app.use(cors(CORS_ORIGIN ? { origin: CORS_ORIGIN.split(",") } : {}));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/entries", requireAuth, entriesRouter);
app.use("/api/ativos", requireAuth, ativosRouter);
app.use("/api/market", requireAuth, marketRouter);
app.use("/api/metas", requireAuth, metasRouter);

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
