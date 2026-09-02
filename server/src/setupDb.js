const fs = require("fs");
const path = require("path");
const pool = require("./db/pool");
const formatError = require("./lib/formatError");

async function setupDb() {
  const schemaPath = path.join(__dirname, "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  await pool.query(schema);
  await pool.end();
  console.log("Banco configurado com sucesso.");
}

setupDb().catch(async (error) => {
  console.error("Falha ao configurar banco:", formatError(error));
  await pool.end();
  process.exit(1);
});
