require("dotenv").config();

const config = {
  port: Number(process.env.PORT || 3001),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  adminEmail: process.env.ADMIN_EMAIL || "admin@aurora.local",
  adminPassword: process.env.ADMIN_PASSWORD || "Aurora@123",
  emailEnabled: process.env.EMAIL_ENABLED === "true",
  emailProvider: process.env.EMAIL_PROVIDER || "resend",
  emailApiKey: process.env.EMAIL_API_KEY,
  emailFrom: process.env.EMAIL_FROM || "Clinica Aurora Saude <agendamentos@exemplo.com>"
};

module.exports = config;
