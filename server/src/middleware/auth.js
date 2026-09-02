const jwt = require("jsonwebtoken");
const config = require("../lib/config");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");

  if (!token) {
    return res.status(401).json({ message: "Autenticacao obrigatoria." });
  }

  try {
    req.admin = jwt.verify(token, config.jwtSecret);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Sessao invalida ou expirada." });
  }
}

module.exports = requireAuth;
