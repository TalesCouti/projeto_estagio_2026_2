const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { isValidDateString } = require("../lib/appointments");
const { invalidateHolidayCache } = require("../lib/holidays");
const requireAuth = require("../middleware/auth");

const router = express.Router();

const holidaySchema = z.object({
  data: z.string().refine(isValidDateString),
  nome: z.string().trim().min(2).max(180)
});

router.get("/admin", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT data::text AS date, nome AS name, tipo AS type, fonte AS source
       FROM holidays
       ORDER BY data ASC, nome ASC`
    );
    return res.json({ holidays: result.rows });
  } catch (error) {
    return next(error);
  }
});

router.post("/admin", requireAuth, async (req, res, next) => {
  try {
    const parsed = holidaySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Informe uma data válida e o nome do feriado." });
    }

    const { data, nome } = parsed.data;
    const result = await pool.query(
      `INSERT INTO holidays (data, nome, tipo, fonte, atualizado_em)
       VALUES ($1, $2, 'PERSONALIZADO', 'admin', now())
       ON CONFLICT (data) DO NOTHING
       RETURNING data::text AS date, nome AS name, tipo AS type, fonte AS source`,
      [data, nome]
    );

    if (!result.rows[0]) {
      return res.status(409).json({ message: "Já existe um feriado cadastrado nessa data." });
    }

    invalidateHolidayCache(data.slice(0, 4));
    return res.status(201).json({ holiday: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.delete("/admin/:date", requireAuth, async (req, res, next) => {
  try {
    if (!isValidDateString(req.params.date)) {
      return res.status(400).json({ message: "Data inválida." });
    }

    const result = await pool.query(
      `DELETE FROM holidays
       WHERE data = $1 AND fonte = 'admin'
       RETURNING data::text AS date, nome AS name, tipo AS type, fonte AS source`,
      [req.params.date]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Feriado personalizado não encontrado." });
    }

    invalidateHolidayCache(req.params.date.slice(0, 4));
    return res.json({ holiday: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
