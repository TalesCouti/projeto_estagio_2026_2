const { test, mock, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const pool = require("../src/db/pool");
const config = require("../src/lib/config");
const holidays = require("../src/lib/holidays");

afterEach(() => {
  mock.restoreAll();
  holidays.clearHolidayCache();
  config.holidaysEnabled = true;
});

test("busca, persiste e reutiliza os feriados nacionais do ano", async () => {
  const queries = [];
  mock.method(pool, "query", async (sql, values) => {
    queries.push({ sql, values });
    if (sql.startsWith("SELECT")) {
      return queries.filter(({ sql: query }) => query.startsWith("INSERT")).length
        ? { rows: [{ date: "2027-09-07", name: "Independência do Brasil", type: "NACIONAL" }] }
        : { rows: [] };
    }
    return { rows: [] };
  });
  let calls = 0;
  mock.method(global, "fetch", async () => {
    calls += 1;
    return { ok: true, async json() { return [{ date: "2027-09-07", name: "Independência do Brasil", type: "NACIONAL" }]; } };
  });

  const first = await holidays.getHolidays("2027");
  const second = await holidays.getHolidays("2027");
  assert.equal(calls, 1);
  assert.deepEqual(first, second);
  assert.equal(first[0].date, "2027-09-07");
  assert.ok(queries.some(({ sql }) => sql.startsWith("INSERT")));
});

test("usa os dados salvos quando a API fica indisponível", async () => {
  mock.method(pool, "query", async (sql) => sql.startsWith("SELECT")
    ? { rows: [{ date: "2027-09-07", name: "Independência do Brasil", type: "NACIONAL" }] }
    : { rows: [] });
  mock.method(global, "fetch", async () => { throw new Error("offline"); });

  const result = await holidays.getHolidays("2027");
  assert.deepEqual(result, [{ date: "2027-09-07", name: "Independência do Brasil", type: "NACIONAL" }]);
});
