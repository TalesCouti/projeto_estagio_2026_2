import { ChevronLeft, ChevronRight } from "lucide-react";

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function monthLabel(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function shiftMonth(month, direction) {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber - 1 + direction, 1));
  return next.toISOString().slice(0, 7);
}

function firstWeekday(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
}

export default function CalendarPicker({
  month,
  onMonthChange,
  calendar,
  selectedDate,
  onSelectDate,
  loading
}) {
  const blanks = Array.from({ length: firstWeekday(month) }, (_, index) => `blank-${index}`);

  return (
    <div className="calendar-panel">
      <div className="calendar-head">
        <button
          className="icon-button"
          type="button"
          aria-label="Mes anterior"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
        >
          <ChevronLeft size={18} />
        </button>
        <strong>{monthLabel(month)}</strong>
        <button
          className="icon-button"
          type="button"
          aria-label="Proximo mes"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="week-row">
        {weekDays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="calendar-grid" aria-busy={loading}>
        {blanks.map((key) => (
          <span className="calendar-blank" key={key} />
        ))}
        {calendar.map((day) => {
          const dateNumber = Number(day.date.slice(-2));
          const disabled = !day.isBusinessDay || day.isFullyBooked;
          const selected = selectedDate === day.date;

          return (
            <button
              className={`day-button ${selected ? "selected" : ""}`}
              disabled={disabled}
              key={day.date}
              type="button"
              onClick={() => onSelectDate(day.date)}
            >
              <span>{dateNumber}</span>
              <small>{disabled ? "Indisponivel" : `${day.availableCount} horarios`}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
