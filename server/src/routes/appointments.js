const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const {
  APPOINTMENT_TYPES,
  AVAILABLE_TIMES,
  getDaysInMonth,
  isBusinessDay,
  isFutureOrToday,
  isFutureClinicSlot,
  isValidDateString,
  isValidStatus,
  isValidTime,
  isValidType,
  normalizeDbTime
} = require("../lib/appointments");
const { sendAppointmentStatusEmail, buildRescheduleEmail, sendAppointmentEmail } = require("../lib/email");
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
    await sendAppointmentStatusEmail(appointment);

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

router.patch("/admin/:id/reschedule", requireAuth, async (req, res, next) => {
  const schema = z.object({
    data: z.string().refine(isValidDateString),
    horario: z.string().refine(isValidTime),
    previous: z.object({
      data: z.string().refine(isValidDateString),
      horario: z.string().refine(isValidTime),
      status: z.string().refine(isValidStatus)
    })
  });
  const parsed = schema.safeParse(req.body);
  if (!z.string().uuid().safeParse(req.params.id).success || !parsed.success) {
    return res.status(400).json({ message: "Revise os dados do reagendamento." });
  }
  const { data, horario, previous: expected } = parsed.data;
  if (!isFutureClinicSlot(data, horario)) {
    return res.status(400).json({ message: "Escolha um horário futuro em um dia útil (horário de Brasília)." });
  }

  let client;
  let transactionOpen = false;
  let previous;
  let appointment;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionOpen = true;
    const result = await client.query(
      "SELECT id, data::text, horario::text, status FROM appointments WHERE id = $1 FOR UPDATE",
      [req.params.id]
    );
    previous = result.rows[0];
    let rejection;
    if (!previous) {
      rejection = [404, "Agendamento não encontrado."];
    } else {
      previous.horario = normalizeDbTime(previous.horario);
      if (previous.status === "cancelado") {
        rejection = [409, "Agendamentos cancelados não podem ser reagendados."];
      } else if (previous.data !== expected.data || previous.horario !== expected.horario || previous.status !== expected.status) {
        rejection = [409, "Este agendamento foi alterado por outra pessoa. Feche o formulário e atualize o painel."];
      } else if (previous.data === data && previous.horario === horario) {
        rejection = [400, "Escolha uma data ou um horário diferente do atual."];
      }
    }
    if (rejection) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return res.status(rejection[0]).json({ message: rejection[1] });
    }
    // A alteração é atômica: um conflito mantém a reserva original intacta.
    const updated = await client.query(
      `UPDATE appointments SET data = $1, horario = $2 WHERE id = $3
       RETURNING id, nome, email, tipo, data::text, horario::text, status, criado_em`,
      [data, horario, req.params.id]
    );
    appointment = updated.rows[0];
    appointment.horario = normalizeDbTime(appointment.horario);
    await client.query("COMMIT");
    transactionOpen = false;
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => {});
    if (error.code === "23505") {
      return res.status(409).json({ message: "Esse horário acabou de ser reservado. Escolha outro. O agendamento anterior foi mantido." });
    }
    return next(error);
  } finally {
    if (client) client.release();
  }

  const email = buildRescheduleEmail(appointment, previous);
  const delivery = await sendAppointmentEmail(appointment, email);
  return res.json({
    message: "Agendamento alterado com sucesso.", appointment,
    notification: { to: appointment.email, subject: email.subject, text: email.text, ...delivery }
  });
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
    await sendAppointmentStatusEmail(appointment);

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
