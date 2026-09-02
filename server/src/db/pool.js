const { Pool } = require("pg");
const config = require("../lib/config");

const pool = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl
    })
  : new Pool({
      host: process.env.PGHOST || "localhost",
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || "clinica_aurora",
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD || "postgres"
    });

module.exports = pool;
