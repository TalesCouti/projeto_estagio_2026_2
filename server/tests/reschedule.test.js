const { test, mock, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../src/db/pool");
const config = require("../src/lib/config");
const emails = require("../src/lib/email");

// These route tests use a controlled database adapter and never send real email.
const deliveries = [];
emails.sendAppointmentEmail = async (appointment, email) => {
  deliveries.push({ appointment, email });
  return { sent: false, simulated: true };
};
const routes = require("../src/routes/appointments");
const id = "11111111-1111-4111-8111-111111111111";
const previous = { data: "2099-09-07", horario: "09:00", status: "confirmado" };
const payload = { data: "2099-09-08", horario: "14:00", previous };
afterEach(() => { mock.restoreAll(); deliveries.length = 0; });

function database({ row = { id, ...previous }, conflict = false } = {}) {
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.startsWith("SELECT")) return { rows: row ? [{ ...row }] : [] };
      if (sql.startsWith("UPDATE")) {
        if (conflict) throw Object.assign(new Error("occupied"), { code: "23505" });
        return { rows: [{ id, nome: "Paciente Teste", email: "paciente@example.com",
          tipo: "cardiologia", data: values[0], horario: `${values[1]}:00`, status: row.status }] };
      }
      return { rows: [] };
    },
    release() { calls.push({ sql: "RELEASE" }); }
  };
  mock.method(pool, "connect", async () => client);
  return calls;
}

async function request(body, { authenticated = true, appointmentId = id } = {}) {
  const app = express();
  app.use(express.json());
  app.use("/api/appointments", routes);
  app.use((error, req, res, next) => res.status(500).json({ message: error.message }));
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  try {
    const headers = { "Content-Type": "application/json" };
    if (authenticated) headers.Authorization = `Bearer ${jwt.sign({ id, email: "admin@example.com" }, config.jwtSecret)}`;
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/appointments/admin/${appointmentId}/reschedule`, {
      method: "PATCH", headers, body: JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("reagendamento exige autenticacao", async () => {
  const calls = database();
  assert.equal((await request(payload, { authenticated: false })).status, 401);
  assert.equal(calls.length, 0);
});

test("reagendamento valida identificador, data, horario e data passada", async () => {
  const calls = database();
  for (const invalid of [{ ...payload, data: "2099-13-08" }, { ...payload, horario: "12:00" }, { ...payload, data: "2000-01-01" }]) {
    assert.equal((await request(invalid)).status, 400);
  }
  assert.equal((await request(payload, { appointmentId: "invalid" })).status, 400);
  assert.equal(calls.length, 0);
});

test("salva nova data, preserva status e retorna email com antes e depois", async () => {
  const calls = database();
  const result = await request(payload);
  assert.equal(result.status, 200);
  assert.equal(result.body.appointment.status, "confirmado");
  assert.equal(result.body.appointment.horario, "14:00");
  assert.equal(result.body.notification.simulated, true);
  assert.match(result.body.notification.text, /Agendamento anterior:/);
  assert.match(result.body.notification.text, /Novo agendamento:/);
  assert.equal(deliveries.length, 1);
  assert.deepEqual(calls.map(({ sql }) => sql.split(" ")[0]), ["BEGIN", "SELECT", "UPDATE", "COMMIT", "RELEASE"]);
});

test("conflito de vaga desfaz a transacao e nao envia email", async () => {
  const calls = database({ conflict: true });
  const result = await request(payload);
  assert.equal(result.status, 409);
  assert.match(result.body.message, /anterior foi mantido/);
  assert.ok(calls.some(({ sql }) => sql === "ROLLBACK"));
  assert.ok(!calls.some(({ sql }) => sql === "COMMIT"));
  assert.equal(deliveries.length, 0);
});

test("rejeita edicao desatualizada e agendamento cancelado", async () => {
  for (const row of [{ id, ...previous, horario: "10:00" }, { id, ...previous, status: "cancelado" }]) {
    const calls = database({ row });
    assert.equal((await request(payload)).status, 409);
    assert.ok(!calls.some(({ sql }) => sql.startsWith("UPDATE")));
    mock.restoreAll();
  }
  assert.equal(deliveries.length, 0);
});

test("rejeita horario inalterado e registro inexistente", async () => {
  database();
  assert.equal((await request({ ...payload, data: previous.data, horario: previous.horario })).status, 400);
  mock.restoreAll();
  database({ row: null });
  assert.equal((await request(payload)).status, 404);
  assert.equal(deliveries.length, 0);
});
