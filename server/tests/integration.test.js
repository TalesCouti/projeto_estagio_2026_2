const test = require("node:test");
const assert = require("node:assert/strict");

test("fluxo completo com PostgreSQL e interface compilada", {
  skip: process.env.AURORA_INTEGRATION_TEST !== "1"
}, async (t) => {
  const { createEnvironment } = require("./support/environment");
  const environment = await createEnvironment();
  t.after(() => environment.close());
  let token;
  async function request(path, method = "GET", body, authenticated = false) {
    const response = await fetch(`${environment.url}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    return { status: response.status, body: await response.json() };
  }

  for (const route of ["/", "/login", "/admin"]) {
    const response = await fetch(`${environment.url}${route}`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /id="root"/);
  }
  assert.equal((await request("/api/unknown")).status, 404);
  assert.equal((await request("/api/appointments/admin")).status, 401);
  assert.equal((await request("/api/holidays/admin")).status, 401);
  assert.equal((await request("/api/auth/login", "POST", { email: "admin@aurora.local", password: "invalid" })).status, 401);
  const login = await request("/api/auth/login", "POST", { email: "admin@aurora.local", password: "Aurora@123" });
  assert.equal(login.status, 200);
  token = login.body.token;
  assert.equal((await request("/api/appointments/admin", "GET", undefined, true)).body.appointments.length, 0);

  const holiday = await request("/api/appointments/availability?tipo=cardiologia&date=2026-09-07");
  assert.equal(holiday.body.isBusinessDay, false);
  assert.equal(holiday.body.holidayName, "Independência do Brasil");
  assert.deepEqual(holiday.body.availableSlots, []);
  const customHoliday = await request("/api/holidays/admin", "POST", {
    data: "2026-09-15",
    nome: "Recesso da clínica"
  }, true);
  assert.equal(customHoliday.status, 201);
  assert.equal(customHoliday.body.holiday.source, "admin");
  const customHolidayAvailability = await request("/api/appointments/availability?tipo=cardiologia&date=2026-09-15");
  assert.equal(customHolidayAvailability.body.isBusinessDay, false);
  assert.equal(customHolidayAvailability.body.holidayName, "Recesso da clínica");
  assert.deepEqual(customHolidayAvailability.body.availableSlots, []);
  assert.equal((await request("/api/holidays/admin", "POST", {
    data: "2026-09-15",
    nome: "Outro nome"
  }, true)).status, 409);
  assert.equal((await request("/api/holidays/admin/2026-09-07", "DELETE", undefined, true)).status, 404);
  assert.equal((await request("/api/holidays/admin/2026-09-15", "DELETE", undefined, true)).status, 200);
  const restoredHolidayAvailability = await request("/api/appointments/availability?tipo=cardiologia&date=2026-09-15");
  assert.equal(restoredHolidayAvailability.body.isBusinessDay, true);
  const booking = { nome: "Teste integração", email: "integration@example.com", tipo: "cardiologia", data: "2026-09-08", horario: "09:00" };
  const holidayBooking = await request("/api/appointments", "POST", { ...booking, data: "2026-09-07" });
  assert.equal(holidayBooking.status, 400);
  const concurrent = await Promise.all([request("/api/appointments", "POST", booking), request("/api/appointments", "POST", booking)]);
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 409]);
  const original = concurrent.find((r) => r.status === 201).body.appointment;
  assert.equal(original.status, "pendente");
  const blocked = await request("/api/appointments/availability?tipo=cardiologia&date=2026-09-08");
  assert.ok(!blocked.body.availableSlots.includes("09:00"));

  const confirmed = await request(`/api/appointments/admin/${original.id}/status`, "PATCH", { status: "confirmado" }, true);
  assert.equal(confirmed.body.appointment.status, "confirmado");
  const rescheduled = await request(`/api/appointments/admin/${original.id}/reschedule`, "PATCH", {
    data: "2026-09-09", horario: "14:00", previous: { data: booking.data, horario: booking.horario, status: "confirmado" }
  }, true);
  assert.equal(rescheduled.status, 200);
  assert.equal(rescheduled.body.notification.simulated, true);
  const freed = await request("/api/appointments/availability?tipo=cardiologia&date=2026-09-08");
  assert.ok(freed.body.availableSlots.includes("09:00"));
  const other = await request("/api/appointments", "POST", booking);
  assert.equal(other.status, 201);
  const collision = await request(`/api/appointments/admin/${original.id}/reschedule`, "PATCH", {
    data: booking.data, horario: booking.horario, previous: { data: "2026-09-09", horario: "14:00", status: "confirmado" }
  }, true);
  assert.equal(collision.status, 409);
  const records = (await request("/api/appointments/admin", "GET", undefined, true)).body.appointments;
  assert.equal(records[0].id, other.body.appointment.id);
  assert.equal(records[1].data, "2026-09-09");
  assert.equal(records[1].horario, "14:00");
  assert.equal((await request(`/api/appointments/admin/${original.id}/status`, "PATCH", { status: "cancelado" }, true)).status, 200);
  assert.ok((await request("/api/appointments/availability?tipo=cardiologia&date=2026-09-09")).body.availableSlots.includes("14:00"));
  assert.equal((await request("/api/auth/logout", "POST", undefined, true)).status, 200);
  assert.equal((await request("/api/appointments/admin")).status, 401);
});
