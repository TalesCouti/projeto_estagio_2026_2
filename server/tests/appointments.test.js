const test = require("node:test");
const assert = require("node:assert/strict");
const {
  AVAILABLE_TIMES,
  getDaysInMonth,
  isBusinessDay,
  isValidTime,
  isValidType
} = require("../src/lib/appointments");
const { isBusinessDayWithHolidays } = require("../src/lib/appointments");
const { normalizeHoliday, validateYear } = require("../src/lib/holidays");
const { isFutureClinicSlot } = require("../src/lib/appointments");
const { buildRescheduleEmail } = require("../src/lib/email");
const { buildAppointmentEmail } = require("../src/lib/email");

test("mantem apenas os tipos de consulta permitidos", () => {
  assert.equal(isValidType("clinica_geral"), true);
  assert.equal(isValidType("cardiologia"), true);
  assert.equal(isValidType("dermatologia"), false);
});

test("aceita apenas horarios da agenda da clinica", () => {
  assert.equal(isValidTime(AVAILABLE_TIMES[0]), true);
  assert.equal(isValidTime("12:00"), false);
});

test("desativa fins de semana no calendario", () => {
  assert.equal(isBusinessDay("2026-09-05"), false);
  assert.equal(isBusinessDay("2026-09-07"), true);
});

test("gera todos os dias de um mes valido", () => {
  const days = getDaysInMonth("2026-09");
  assert.equal(days.length, 30);
  assert.equal(days[0], "2026-09-01");
  assert.equal(days[29], "2026-09-30");
});

test("monta email com o status atual do agendamento", () => {
  const email = buildAppointmentEmail({
    nome: "Paciente Teste",
    email: "paciente@example.com",
    tipo: "clinica_geral",
    data: "2026-09-02",
    horario: "08:00",
    status: "confirmado"
  });

  assert.equal(email.subject, "Sua consulta foi confirmada");
  assert.match(email.text, /Status: confirmado/);
});

test("escapa o nome do paciente no html do email", () => {
  const email = buildAppointmentEmail({
    nome: "<Paciente>",
    email: "paciente@example.com",
    tipo: "psicologia",
    data: "2026-09-03",
    horario: "09:00",
    status: "pendente"
  });

  assert.match(email.html, /&lt;Paciente&gt;/);
});

test("desativa feriados nacionais e valida o formato importado", () => {
  const holidays = new Set(["2026-09-07"]);
  assert.equal(isBusinessDayWithHolidays("2026-09-07", holidays), false);
  assert.equal(isBusinessDayWithHolidays("2026-09-08", holidays), true);
  assert.deepEqual(normalizeHoliday({ date: "2026-09-07", name: "Independência do Brasil" }), {
    date: "2026-09-07", name: "Independência do Brasil", type: "NACIONAL"
  });
  assert.equal(normalizeHoliday({ date: "07/09/2026", name: "Inválido" }), null);
  assert.equal(validateYear("2026"), true);
  assert.equal(validateYear("1999"), false);
});

test("reagendamento considera o fuso da clinica e rejeita horarios passados", () => {
  const now = new Date("2026-09-07T13:30:00Z"); // 10:30 em Brasília
  assert.equal(isFutureClinicSlot("2026-09-07", "10:00", now), false);
  assert.equal(isFutureClinicSlot("2026-09-07", "11:00", now), true);
  assert.equal(isFutureClinicSlot("2026-09-06", "11:00", now), false);
  assert.equal(isFutureClinicSlot("2026-09-12", "11:00", now), false);
  assert.equal(isFutureClinicSlot("2026-09-08", "12:00", now), false);
  assert.equal(isFutureClinicSlot("2026-13-01", "11:00", now), false);
});

test("email de reagendamento informa antes e depois sem confirmar pedido pendente", () => {
  const appointment = {
    nome: "<Paciente>", tipo: "cardiologia", data: "2026-09-09", horario: "14:00", status: "pendente"
  };
  const previous = { data: "2026-09-08", horario: "09:00" };
  const email = buildRescheduleEmail(appointment, previous);
  assert.equal(email.subject, "Sua consulta foi reagendada");
  assert.match(email.text, /Agendamento anterior: 08 de setembro de 2026 às 09:00/);
  assert.match(email.text, /Novo agendamento: 09 de setembro de 2026 às 14:00/);
  assert.match(email.text, /continua pendente/);
  assert.doesNotMatch(email.text, /está confirmada/);
  assert.match(email.html, /&lt;Paciente&gt;/);
  assert.doesNotMatch(email.html, /<Paciente>/);
  assert.match(buildRescheduleEmail({ ...appointment, status: "confirmado" }, previous).text, /está confirmada/);
});
