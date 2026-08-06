import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-troque-em-producao";
const TOKEN_TTL = "30d";

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, nome: user.nome }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Não autenticado." });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, nome: payload.nome };
    next();
  } catch {
    return res.status(401).json({ error: "Sessão inválida ou expirada." });
  }
}
