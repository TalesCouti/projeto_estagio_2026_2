export default function TimeSlots({ slots, selectedTime, onSelectTime, loading, selectedDate }) {
  if (!selectedDate) {
    return <p className="muted-box">Escolha uma data no calendario para ver os horarios.</p>;
  }

  if (loading) {
    return <p className="muted-box">Carregando horarios disponiveis...</p>;
  }

  if (!slots.length) {
    return <p className="muted-box">Nao ha horarios livres para esta data.</p>;
  }

  return (
    <div className="slots-grid">
      {slots.map((slot) => (
        <button
          className={`slot-button ${selectedTime === slot ? "selected" : ""}`}
          key={slot}
          type="button"
          onClick={() => onSelectTime(slot)}
        >
          {slot}
        </button>
      ))}
    </div>
  );
}
