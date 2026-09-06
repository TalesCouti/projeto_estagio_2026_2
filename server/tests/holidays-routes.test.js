const { afterEach, mock, test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../src/db/pool");
const config = require("../src/lib/config");
const routes = require("../src/routes/holidays");

const token = jwt.sign({ id: "admin-id", email: "admin@example.com" }, config.jwtSecret);

afterEach(() => mock.restoreAll());

async function request({ method = "GET", path = "/api/holidays/admin", body, authenticated = true, query }) {
  mock.method(pool, "query", query || (async () => ({ rows: [] })));
  const app = express();
  app.use(express.json());
  app.use("/api/holidays", routes);
  app.use((error, req, res, next) => res.status(500).json({ message: error.message }));
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });

  try {
    const headers = { "Content-Type": "application/json" };
    if (authenticated) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("feriados administrativos exigem autenticacao", async () => {
  const result = await request({ authenticated: false });
  assert.equal(result.status, 401);
});

test("valida data e nome do feriado", async () => {
  const result = await request({
    method: "POST",
    body: { data: "2099-02-30", nome: "x" }
  });
  assert.equal(result.status, 400);
});

test("lista e cria feriado personalizado", async () => {
  const calls = [];
  const result = await request({
    method: "POST",
    body: { data: "2099-09-07", nome: "Recesso da clínica" },
    query: async (sql, values) => {
      calls.push({ sql, values });
      return { rows: [{ date: "2099-09-07", name: "Recesso da clínica", type: "PERSONALIZADO", source: "admin" }] };
    }
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.holiday.source, "admin");
  assert.equal(calls[0].values[0], "2099-09-07");

  const listed = await request({
    query: async () => ({ rows: [{ date: "2099-09-07", name: "Recesso da clínica", type: "PERSONALIZADO", source: "admin" }] })
  });
  assert.deepEqual(listed.body.holidays, [{ date: "2099-09-07", name: "Recesso da clínica", type: "PERSONALIZADO", source: "admin" }]);
});

test("valida duplicidade e impede excluir feriado nacional", async () => {
  const duplicate = await request({
    method: "POST",
    body: { data: "2099-09-07", nome: "Outro nome" },
    query: async () => ({ rows: [] })
  });
  assert.equal(duplicate.status, 409);

  const national = await request({
    method: "DELETE",
    path: "/api/holidays/admin/2099-09-07",
    query: async () => ({ rows: [] })
  });
  assert.equal(national.status, 404);
});

test("exclui feriado personalizado", async () => {
  const result = await request({
    method: "DELETE",
    path: "/api/holidays/admin/2099-09-15",
    query: async () => ({ rows: [{ date: "2099-09-15", name: "Recesso", type: "PERSONALIZADO", source: "admin" }] })
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.holiday.date, "2099-09-15");
});
