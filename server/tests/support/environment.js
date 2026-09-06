const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const express = require("express");
const config = require("../../src/lib/config");
const pool = require("../../src/db/pool");
const { createApp } = require("../../src/index");

async function createEnvironment({ port = 0, calendarFailure = false } = {}) {
  const schemaName = `aurora_test_${randomUUID().replaceAll("-", "")}`;
  const bootstrap = new Pool(pool.options);
  let server;
  const previousEmailEnabled = config.emailEnabled;
  const previousHolidaysEnabled = config.holidaysEnabled;
  config.emailEnabled = false;
  config.holidaysEnabled = false;
  await bootstrap.query(`CREATE SCHEMA "${schemaName}"`);
  try {
    pool.options.options = `-c search_path=${schemaName},public`;
    const schema = fs.readFileSync(path.join(__dirname, "../../src/db/schema.sql"), "utf8")
      .replace("CREATE EXTENSION IF NOT EXISTS pgcrypto;", "");
    await pool.query(schema);
    await pool.query("INSERT INTO admins (email, senha_hash) VALUES ($1, $2)", [
      "admin@aurora.local", await bcrypt.hash("Aurora@123", 4)
    ]);
    await pool.query(
      "INSERT INTO holidays (data, nome, tipo, fonte) VALUES ($1, $2, $3, $4)",
      ["2026-09-07", "Independência do Brasil", "NACIONAL", "teste"]
    );
    const wrapper = express();
    let saved = false;
    wrapper.use((req, res, next) => {
      if (calendarFailure && saved && req.path === "/api/appointments/calendar") {
        return res.status(503).json({ message: "Calendário indisponível." });
      }
      if (req.method === "POST" && req.path === "/api/appointments") {
        res.on("finish", () => { if (res.statusCode === 201) saved = true; });
      }
      next();
    });
    wrapper.use(createApp({ production: true }));
    server = await new Promise((resolve, reject) => {
      const listener = wrapper.listen(port, "127.0.0.1", () => resolve(listener));
      listener.on("error", reject);
    });
  } catch (error) {
    await pool.end();
    await bootstrap.query(`DROP SCHEMA "${schemaName}" CASCADE`);
    await bootstrap.end();
    throw error;
  }
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    pool,
    async close() {
      await new Promise((resolve) => server.close(resolve));
      await pool.end();
      await bootstrap.query(`DROP SCHEMA "${schemaName}" CASCADE`);
      await bootstrap.end();
      config.emailEnabled = previousEmailEnabled;
      config.holidaysEnabled = previousHolidaysEnabled;
    }
  };
}

module.exports = { createEnvironment };

if (require.main === module) {
  createEnvironment({ port: 3107, calendarFailure: true }).then((environment) => {
    console.log(`Verificação isolada: ${environment.url}`);
    let closing = false;
    const close = async () => {
      if (closing) return;
      closing = true;
      await environment.close();
      process.exit(0);
    };
    process.stdin.once("data", close);
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  }).catch((error) => { console.error(error.message); process.exit(1); });
}
