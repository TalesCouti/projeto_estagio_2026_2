const path = require("path");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const config = require("./lib/config");
const authRoutes = require("./routes/auth");
const appointmentRoutes = require("./routes/appointments");
const holidayRoutes = require("./routes/holidays");
const formatError = require("./lib/formatError");

function createApp({ production = process.env.NODE_ENV === "production" } = {}) {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );
  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/appointments", appointmentRoutes);
  app.use("/api/holidays", holidayRoutes);

  app.use("/api", (req, res) => {
    res.status(404).json({ message: "Rota nao encontrada." });
  });

  if (production) {
    const distPath = path.join(__dirname, "..", "..", "dist");
    app.use(express.static(distPath));
    app.get("/{*path}", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((req, res) => {
    res.status(404).json({ message: "Rota nao encontrada." });
  });

  app.use((error, req, res, next) => {
    console.error("Erro na API:", formatError(error));

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        message: "Banco de dados indisponivel. Confira DATABASE_URL e se o Postgres esta ativo."
      });
    }

    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    res.status(500).json({ message: "Erro interno do servidor." });
  });

  return app;
}

if (require.main === module) {
  createApp().listen(config.port, () => {
    console.log(`API rodando em http://localhost:${config.port}`);
  });
}

module.exports = { createApp };
