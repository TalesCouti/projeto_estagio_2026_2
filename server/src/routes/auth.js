const bcrypt = require("bcryptjs");
const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const pool = require("../db/pool");
const config = require("../lib/config");
const requireAuth = require("../middleware/auth");

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: "Informe email e senha validos." });
    }

    const { email, password } = parsed.data;
    const result = await pool.query("SELECT id, email, senha_hash FROM admins WHERE email = $1", [
      email
    ]);
    const admin = result.rows[0];

    if (!admin) {
      return res.status(401).json({ message: "Credenciais invalidas." });
    }

    const validPassword = await bcrypt.compare(password, admin.senha_hash);

    if (!validPassword) {
      return res.status(401).json({ message: "Credenciais invalidas." });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email }, config.jwtSecret, {
      expiresIn: "8h"
    });

    return res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ admin: req.admin });
});

router.post("/logout", requireAuth, (req, res) => {
  res.json({ message: "Sessao encerrada." });
});

module.exports = router;
