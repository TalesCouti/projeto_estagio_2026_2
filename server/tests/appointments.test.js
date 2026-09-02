const test = require("node:test");
const assert = require("node:assert/strict");
const {
  AVAILABLE_TIMES,
  getDaysInMonth,
  isBusinessDay,
  isValidTime,
  isValidType
} = require("../src/lib/appointments");
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
