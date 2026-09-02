const test = require("node:test");
const assert = require("node:assert/strict");
const {
  AVAILABLE_TIMES,
  getDaysInMonth,
  isBusinessDay,
  isValidTime,
  isValidType
} = require("../src/lib/appointments");

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
