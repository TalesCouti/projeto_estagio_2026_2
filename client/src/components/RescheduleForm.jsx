import { useEffect, useState } from "react";
import { api } from "../api";

function futureSlots(date, slots) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const now = `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
  return slots.filter((slot) => `${date}T${slot}` > now);
}

export default function RescheduleForm({ appointment, onSaved, onClose }) {
  const [date, setDate] = useState(appointment.data);
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setSlots([]);
    setLoading(true);
    if (!date) {
      setLoading(false);
      return;
    }
    api.getAvailability(appointment.tipo, date)
      .then((result) => { if (active) setSlots(futureSlots(date, result.availableSlots)); })
      .catch(() => { if (active) setError("Não foi possível carregar os horários. Tente novamente."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [appointment.tipo, date, reload]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await api.rescheduleAppointment(appointment.id, {
        data: date, horario: time,
        previous: { data: appointment.data, horario: appointment.horario, status: appointment.status }
      });
      onSaved(result);
    } catch (failure) {
      setError(failure.message);
      setTime("");
      setReload((value) => value + 1);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="reschedule-panel" aria-labelledby="reschedule-title">
      <h2 id="reschedule-title">Reagendar consulta</h2>
      <p><strong>{appointment.nome}</strong> — {appointment.email}</p>
      <p>Atual: {appointment.data.split("-").reverse().join("/")} às {appointment.horario}.</p>
      <p>O status será mantido como <strong>{appointment.status}</strong>. Uma mensagem com a alteração será gerada para o paciente.</p>
      <form onSubmit={submit}>
        <div className="reschedule-fields">
          <label>Nova data
            <input autoFocus type="date" required value={date} disabled={saving}
              onChange={(event) => { setDate(event.target.value); setTime(""); setError(""); setSlots([]); }} />
          </label>
          <label>Novo horário
            <select required value={time} disabled={loading || saving || !slots.length}
              onChange={(event) => setTime(event.target.value)}>
              <option value="">{loading ? "Carregando..." : "Selecione um horário"}</option>
              {slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
            </select>
          </label>
        </div>
        <p className="reschedule-hint">Horários de Brasília. Escolha um horário futuro em um dia útil.</p>
        {!loading && date && !slots.length && !error ? <p role="status">Não há horários disponíveis nesta data. Escolha outro dia.</p> : null}
        {error ? <div className="feedback error" role="alert">{error}</div> : null}
        <div className="reschedule-actions">
          <button className="submit-button" disabled={saving || loading || !date || !time} type="submit">
            {saving ? "Salvando reagendamento..." : "Salvar reagendamento"}
          </button>
          <button className="secondary-button" type="button" disabled={saving} onClick={onClose}>Fechar</button>
          {error ? <button className="secondary-button" type="button" disabled={saving || loading}
            onClick={() => { setError(""); setTime(""); setReload((value) => value + 1); }}>Recarregar horários</button> : null}
        </div>
      </form>
    </section>
  );
}
