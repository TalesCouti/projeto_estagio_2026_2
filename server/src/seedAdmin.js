const bcrypt = require("bcryptjs");
const pool = require("./db/pool");
const config = require("./lib/config");
const formatError = require("./lib/formatError");

async function seedAdmin() {
  const senhaHash = await bcrypt.hash(config.adminPassword, 12);

  await pool.query(
    `
      INSERT INTO admins (email, senha_hash)
      VALUES ($1, $2)
      ON CONFLICT (email)
      DO UPDATE SET senha_hash = EXCLUDED.senha_hash
    `,
    [config.adminEmail, senhaHash]
  );

  await pool.end();
  console.log(`Admin pronto: ${config.adminEmail}`);
}

seedAdmin().catch(async (error) => {
  console.error("Falha ao criar admin:", formatError(error));
  await pool.end();
  process.exit(1);
});
