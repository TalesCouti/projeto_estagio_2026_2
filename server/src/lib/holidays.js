const pool = require("../db/pool");
const config = require("./config");

const cache = new Map();
const pending = new Map();

function validateYear(year) {
  return /^\d{4}$/.test(String(year)) && Number(year) >= 2000 && Number(year) <= 2100;
}

function normalizeHoliday(item) {
  if (!item || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !item.name) {
    return null;
  }

  return {
    date: item.date,
    name: String(item.name).trim().slice(0, 180),
    type: String(item.type || "NACIONAL").trim().slice(0, 40)
  };
}

async function readStoredHolidays(year) {
  const result = await pool.query(
    `SELECT data::text AS date, nome AS name, tipo AS type
     FROM holidays
     WHERE data >= $1::date AND data < ($1::date + INTERVAL '1 year')
     ORDER BY data ASC`,
    [`${year}-01-01`]
  );
  return result.rows;
}

async function fetchNationalHolidays(year) {
  const response = await fetch(`${config.holidaysApiUrl}/${year}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(config.holidaysApiTimeoutMs)
  });

  if (!response.ok) {
    throw new Error(`A API de feriados respondeu com status ${response.status}.`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("A API de feriados retornou um formato inesperado.");
  }

  const holidays = data.map(normalizeHoliday).filter(Boolean);
  if (!holidays.length) {
    throw new Error("A API de feriados não retornou datas válidas.");
  }
  return holidays;
}

async function storeHolidays(holidays) {
  for (const holiday of holidays) {
    await pool.query(
      `INSERT INTO holidays (data, nome, tipo, fonte, atualizado_em)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (data) DO UPDATE SET
         nome = EXCLUDED.nome,
         tipo = EXCLUDED.tipo,
         fonte = EXCLUDED.fonte,
         atualizado_em = now()
       WHERE holidays.fonte = EXCLUDED.fonte`,
      [holiday.date, holiday.name, holiday.type, config.holidaysApiUrl]
    );
  }
}

async function getHolidays(year) {
  const normalizedYear = String(year);
  if (!validateYear(normalizedYear)) {
    throw new Error("Ano de feriados inválido.");
  }

  if (cache.has(normalizedYear)) {
    return cache.get(normalizedYear);
  }

  if (pending.has(normalizedYear)) {
    return pending.get(normalizedYear);
  }

  const operation = (async () => {
    const stored = await readStoredHolidays(normalizedYear);
    if (!config.holidaysEnabled) {
      cache.set(normalizedYear, stored);
      return stored;
    }

    try {
      const holidays = await fetchNationalHolidays(normalizedYear);
      await storeHolidays(holidays);
      const merged = await readStoredHolidays(normalizedYear);
      cache.set(normalizedYear, merged);
      return merged;
    } catch (error) {
      if (stored.length) {
        cache.set(normalizedYear, stored);
        return stored;
      }
      throw Object.assign(new Error("Não foi possível carregar os feriados nacionais. Tente novamente."), {
        status: 503,
        cause: error
      });
    }
  })();

  pending.set(normalizedYear, operation);
  try {
    return await operation;
  } finally {
    pending.delete(normalizedYear);
  }
}

async function getHolidayDates(year) {
  const holidays = await getHolidays(year);
  return new Set(holidays.map((holiday) => holiday.date));
}

function clearHolidayCache() {
  cache.clear();
  pending.clear();
}

function invalidateHolidayCache(year) {
  cache.delete(String(year));
  pending.delete(String(year));
}

module.exports = {
  clearHolidayCache,
  fetchNationalHolidays,
  getHolidayDates,
  getHolidays,
  invalidateHolidayCache,
  normalizeHoliday,
  validateYear
};
