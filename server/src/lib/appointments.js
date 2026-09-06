const APPOINTMENT_TYPES = [
  {
    value: "clinica_geral",
    label: "Clinica geral",
    description: "Consultas iniciais, acompanhamento de rotina e orientacao preventiva."
  },
  {
    value: "cardiologia",
    label: "Cardiologia",
    description: "Avaliacao cardiologica, retorno e acompanhamento de exames."
  },
  {
    value: "psicologia",
    label: "Psicologia",
    description: "Atendimento individual com foco em acolhimento e continuidade."
  }
];

const APPOINTMENT_STATUS = ["pendente", "confirmado", "cancelado"];

const AVAILABLE_TIMES = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00"
];

// Regras simples da clinica: atendimento apenas em dias uteis e slots fixos.
function isValidType(type) {
  return APPOINTMENT_TYPES.some((item) => item.value === type);
}

function isValidStatus(status) {
  return APPOINTMENT_STATUS.includes(status);
}

function isValidDateString(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return false;
  }

  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function isBusinessDay(date) {
  if (!isValidDateString(date)) {
    return false;
  }

  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
}

function isFutureOrToday(date) {
  const today = new Date().toISOString().slice(0, 10);
  return date >= today;
}

function isValidTime(time) {
  return AVAILABLE_TIMES.includes(time);
}

function isBusinessDayWithHolidays(date, holidayDates = new Set()) {
  return isBusinessDay(date) && !holidayDates.has(date);
}

function isFutureClinicSlot(date, time, now = new Date()) {
  if (!isBusinessDay(date) || !isValidTime(time)) return false;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${date}T${time}` > `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function normalizeDbTime(time) {
  return String(time).slice(0, 5);
}

function getDaysInMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(month || "")) {
    return [];
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: lastDay }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return `${month}-${day}`;
  });
}

module.exports = {
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUS,
  AVAILABLE_TIMES,
  getDaysInMonth,
  isBusinessDay,
  isBusinessDayWithHolidays,
  isFutureOrToday,
  isValidDateString,
  isValidStatus,
  isValidTime,
  isFutureClinicSlot,
  isValidType,
  normalizeDbTime
};
