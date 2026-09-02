const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const {
  APPOINTMENT_TYPES,
  AVAILABLE_TIMES,
  getDaysInMonth,
  isBusinessDay,
  isFutureOrToday,
  isValidDateString,
  isValidStatus,
  isValidTime,
  isValidType,
  normalizeDbTime
} = require("../lib/appointments");
const requireAuth = require("../middleware/auth");

const router = express.Router();

const appointmentSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  tipo: z.string().refine(isValidType),
  data: z.string().refine(isValidDateString),
  horario: z.string().refine(isValidTime)
});

router.get("/types", (req, res) => {
  res.json({ types: APPOINTMENT_TYPES });
});

router.get("/availability", async (req, res, next) => {
  try {
    const { tipo, date } = req.query;

    if (!isValidType(tipo) || !isValidDateString(date)) {
      return res.status(400).json({ message: "Especialidade ou data invalida." });
    }

    const result = await pool.query(
      `
        SELECT horario
        FROM appointments
        WHERE tipo = $1
          AND data = $2
          AND status IN ('pendente', 'confirmado')
      `,
      [tipo, date]
    );

    // Pendentes tambem bloqueiam o horario ate a equipe confirmar ou cancelar.
    const bookedSlots = result.rows.map((row) => normalizeDbTime(row.horario));
    const businessDay = isBusinessDay(date) && isFutureOrToday(date);
    const availableSlots = businessDay
      ? AVAILABLE_TIMES.filter((time) => !bookedSlots.includes(time))
      : [];

    return res.json({
      tipo,
      date,
      bookedSlots,
      availableSlots,
      isBusinessDay: businessDay
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/calendar", async (req, res, next) => {
  try {
    const { tipo, month } = req.query;

    if (!isValidType(tipo) || !/^\d{4}-\d{2}$/.test(month || "")) {
      return res.status(400).json({ message: "Especialidade ou mes invalido." });
    }

    const days = getDaysInMonth(month);

    if (!days.length) {
      return res.status(400).json({ message: "Mes invalido." });
    }

    const result = await pool.query(
      `
        SELECT data::text AS data, COUNT(*)::int AS total
        FROM appointments
        WHERE tipo = $1
          AND data >= $2
          AND data <= $3
          AND status IN ('pendente', 'confirmado')
        GROUP BY data
      `,
      [tipo, days[0], days[days.length - 1]]
    );

    const totalsByDate = new Map(result.rows.map((row) => [row.data, row.total]));
    const calendar = days.map((date) => {
      const bookedCount = totalsByDate.get(date) || 0;
      const enabled = isBusinessDay(date) && isFutureOrToday(date);
      const availableCount = enabled ? Math.max(AVAILABLE_TIMES.length - bookedCount, 0) : 0;

      return {
        date,
        bookedCount,
        availableCount,
        isBusinessDay: enabled,
        isFullyBooked: enabled && availableCount === 0
      };
    });

    return res.json({ tipo, month, calendar });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = appointmentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: "Revise os dados do formulario." });
    }

    const { nome, email, tipo, data, horario } = parsed.data;

    if (!isBusinessDay(data) || !isFutureOrToday(data)) {
      return res.status(400).json({ message: "Escolha um dia util futuro." });
    }

    const result = await pool.query(
      `
        INSERT INTO appointments (nome, email, tipo, data, horario, status)
        VALUES ($1, $2, $3, $4, $5, 'pendente')
        RETURNING id, nome, email, tipo, data::text, horario::text, status, criado_em
      `,
      [nome, email, tipo, data, horario]
    );

    const appointment = result.rows[0];
    appointment.horario = normalizeDbTime(appointment.horario);

    return res.status(201).json({
      message: "Solicitacao enviada com sucesso.",
      appointment
    });
  } catch (error) {
    // O indice parcial do banco segura corridas entre dois envios no mesmo slot.
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Esse horario acabou de ser reservado. Escolha outro horario."
      });
    }

    return next(error);
  }
});

router.get("/admin", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT id, nome, email, tipo, data::text, horario::text, status, criado_em
        FROM appointments
        ORDER BY data ASC, horario ASC, criado_em DESC
      `
    );

    const appointments = result.rows.map((item) => ({
      ...item,
      horario: normalizeDbTime(item.horario)
    }));

    return res.json({ appointments });
  } catch (error) {
    return next(error);
  }
});

router.patch("/admin/:id/status", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.string().refine(isValidStatus)
    });
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: "Status invalido." });
    }

    const result = await pool.query(
      `
        UPDATE appointments
        SET status = $1
        WHERE id = $2
        RETURNING id, nome, email, tipo, data::text, horario::text, status, criado_em
      `,
      [parsed.data.status, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Registro nao encontrado." });
    }

    const appointment = result.rows[0];
    appointment.horario = normalizeDbTime(appointment.horario);

    return res.json({ appointment });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Nao e possivel ativar dois agendamentos no mesmo horario."
      });
    }

    return next(error);
  }
});

module.exports = router;
