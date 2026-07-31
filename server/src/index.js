import express from "express";
import cors from "cors";
import "./db.js";
import entriesRouter from "./routes/entries.js";
import ativosRouter from "./routes/ativos.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/entries", entriesRouter);
app.use("/api/ativos", ativosRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
