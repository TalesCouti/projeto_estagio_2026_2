import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, LogOut, Plus, RefreshCw, Trash2 } from "lucide-react";
import { api } from "../api";
import RescheduleForm from "../components/RescheduleForm";

const statusOptions = ["todos", "pendente", "confirmado", "cancelado"];
const typeLabels = {
  clinica_geral: "Clinica geral",
  cardiologia: "Cardiologia",
  psicologia: "Psicologia"
};

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatCreatedAt(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function Dashboard({ onNavigate }) {
  const [appointments, setAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [rescheduling, setRescheduling] = useState(null);
  const [notification, setNotification] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [holidayForm, setHolidayForm] = useState({ data: "", nome: "" });
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [holidayMessage, setHolidayMessage] = useState("");

  function handleRescheduled(result) {
    setAppointments((current) => current
      .map((item) => item.id === result.appointment.id ? result.appointment : item)
      .sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`)));
    setNotification(result.notification);
    setRescheduling(null);
    setMessage("");
  }

  const filteredAppointments = useMemo(() => {
    return appointments.filter((item) => {
      const statusMatches = statusFilter === "todos" || item.status === statusFilter;
      const typeMatches = typeFilter === "todos" || item.tipo === typeFilter;
      return statusMatches && typeMatches;
    });
  }, [appointments, statusFilter, typeFilter]);

  async function loadAppointments() {
    setLoading(true);
    setMessage("");

    try {
      const data = await api.getAppointments();
      setAppointments(data.appointments);
    } catch (error) {
      setMessage(error.message);
      if (error.status === 401) {
        localStorage.removeItem("aurora_token");
        onNavigate("/login", true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadHolidays() {
    try {
      const data = await api.getHolidays();
      setHolidays(data.holidays);
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem("aurora_token");
        onNavigate("/login", true);
      } else {
        setHolidayMessage(error.message);
      }
    }
  }

  async function createHoliday(event) {
    event.preventDefault();
    setHolidayLoading(true);
    setHolidayMessage("");
    try {
      const data = await api.createHoliday(holidayForm);
      setHolidays((current) => [...current, data.holiday].sort((a, b) => a.date.localeCompare(b.date)));
      setHolidayForm({ data: "", nome: "" });
      setHolidayMessage("Feriado personalizado criado com sucesso.");
    } catch (error) {
      setHolidayMessage(error.message);
    } finally {
      setHolidayLoading(false);
    }
  }

  async function deleteHoliday(holiday) {
    if (!window.confirm(`Excluir o feriado "${holiday.name}" de ${formatDate(holiday.date)}?`)) return;
    setHolidayMessage("");
    try {
      await api.deleteHoliday(holiday.date);
      setHolidays((current) => current.filter((item) => item.date !== holiday.date));
      setHolidayMessage("Feriado personalizado excluído.");
    } catch (error) {
      setHolidayMessage(error.message);
    }
  }

  async function updateStatus(id, status) {
    setMessage("");

    try {
      const data = await api.updateStatus(id, status);
      setAppointments((current) =>
        current.map((appointment) => (appointment.id === id ? data.appointment : appointment))
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch (error) {
      setMessage(error.message);
    } finally {
      localStorage.removeItem("aurora_token");
      onNavigate("/login");
    }
  }

  useEffect(() => {
    loadAppointments();
    loadHolidays();
  }, []);

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <span className="eyebrow">Painel de gestao</span>
          <h1>Agendamentos recebidos</h1>
          <p>Registros ordenados por data e horario, com status visivel para acompanhamento.</p>
        </div>
        <div className="dashboard-actions">
          <button className="secondary-button" disabled={Boolean(rescheduling)} onClick={loadAppointments} type="button">
            <RefreshCw size={18} />
            Atualizar
          </button>
          <button className="secondary-button" disabled={Boolean(rescheduling)} onClick={handleLogout} type="button">
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </header>

      <section className="metrics-row">
        <div>
          <strong>{appointments.length}</strong>
          <span>Total</span>
        </div>
        <div>
          <strong>{appointments.filter((item) => item.status === "pendente").length}</strong>
          <span>Pendentes</span>
        </div>
        <div>
          <strong>{appointments.filter((item) => item.status === "confirmado").length}</strong>
          <span>Confirmados</span>
        </div>
        <div>
          <strong>{appointments.filter((item) => item.status === "cancelado").length}</strong>
          <span>Cancelados</span>
        </div>
      </section>

      <section className="admin-toolbar">
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label>
          Especialidade
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="todos">todos</option>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {message ? <div className="feedback error">{message}</div> : null}

      {rescheduling ? <RescheduleForm key={rescheduling.id} appointment={rescheduling}
        onSaved={handleRescheduled} onClose={() => setRescheduling(null)} /> : null}

      {notification ? (
        <section className="reschedule-panel" aria-label="Mensagem de reagendamento">
          <div className="feedback success" role="status">Reagendamento salvo com sucesso.</div>
          <p role="status">{notification.sent
            ? "E-mail aceito pelo serviço de envio."
            : notification.simulated
              ? "Envio simulado: a mensagem abaixo foi gerada, mas não foi enviada por e-mail."
              : "O reagendamento foi salvo, mas o e-mail não foi enviado. Use a mensagem abaixo para avisar o paciente."}</p>
          <p><strong>Para:</strong> {notification.to}</p>
          <p><strong>Assunto:</strong> {notification.subject}</p>
          <pre className="email-preview">{notification.text}</pre>
          <button className="secondary-button" type="button" onClick={() => setNotification(null)}>Fechar mensagem</button>
        </section>
      ) : null}

      <section className="holiday-admin-panel" aria-labelledby="holiday-admin-title">
        <div className="holiday-admin-header">
          <div>
            <span className="eyebrow">Calendário da clínica</span>
            <h2 id="holiday-admin-title">Feriados personalizados</h2>
            <p>Cadastre dias de recesso, eventos internos ou outras datas sem atendimento.</p>
          </div>
          <span className="holiday-count">{holidays.filter((item) => item.source === "admin").length} personalizados</span>
        </div>
        <form className="holiday-form" onSubmit={createHoliday}>
          <label>
            Data
            <input type="date" required value={holidayForm.data} disabled={holidayLoading}
              onChange={(event) => setHolidayForm((current) => ({ ...current, data: event.target.value }))} />
          </label>
          <label>
            Nome do feriado
            <input type="text" required minLength="2" maxLength="180" placeholder="Ex.: Recesso da clínica"
              value={holidayForm.nome} disabled={holidayLoading}
              onChange={(event) => setHolidayForm((current) => ({ ...current, nome: event.target.value }))} />
          </label>
          <button className="submit-button" type="submit" disabled={holidayLoading || !holidayForm.data || !holidayForm.nome.trim()}>
            <Plus size={18} />
            {holidayLoading ? "Salvando..." : "Adicionar feriado"}
          </button>
        </form>
        {holidayMessage ? <div className={`feedback ${holidayMessage.includes("sucesso") || holidayMessage.includes("excluído") ? "success" : "error"}`} role="status">{holidayMessage}</div> : null}
        {holidays.length ? (
          <div className="holiday-list">
            {holidays.map((holiday) => (
              <div className="holiday-row" key={`${holiday.date}-${holiday.source}`}>
                <div>
                  <strong>{formatDate(holiday.date)}</strong>
                  <span>{holiday.name}</span>
                </div>
                {holiday.source === "admin" ? (
                  <button className="icon-action danger-action" type="button" aria-label={`Excluir ${holiday.name}`}
                    title="Excluir feriado personalizado" onClick={() => deleteHoliday(holiday)}>
                    <Trash2 size={17} />
                  </button>
                ) : <span className="holiday-source">Nacional</span>}
              </div>
            ))}
          </div>
        ) : <p className="holiday-empty">Nenhum feriado carregado para exibir.</p>}
      </section>

      <section className="table-wrap" aria-busy={loading}>
        {loading ? (
          <div className="empty-state">Carregando registros...</div>
        ) : filteredAppointments.length ? (
          <table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Email</th>
                <th>Tipo</th>
                <th>Data</th>
                <th>Horario</th>
                <th>Status</th>
                <th>Criado em</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((item) => (
                <tr key={item.id}>
                  <td>{item.nome}</td>
                  <td>{item.email}</td>
                  <td>{typeLabels[item.tipo]}</td>
                  <td>{formatDate(item.data)}</td>
                  <td>{item.horario}</td>
                  <td>
                    <span className={`status-badge ${item.status}`}>{item.status}</span>
                  </td>
                  <td>{formatCreatedAt(item.criado_em)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        disabled={Boolean(rescheduling) || item.status === "confirmado"}
                        onClick={() => updateStatus(item.id, "confirmado")}
                        type="button"
                      >
                        Confirmar
                      </button>
                      <button
                        disabled={Boolean(rescheduling) || item.status === "cancelado"}
                        onClick={() => updateStatus(item.id, "cancelado")}
                        type="button"
                      >
                        Cancelar
                      </button>
                      <button type="button" disabled={Boolean(rescheduling) || item.status === "cancelado"}
                        onClick={() => { setRescheduling(item); setNotification(null); setMessage(""); }}>
                        Reagendar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <CalendarCheck size={32} />
            Nenhum registro encontrado para os filtros atuais.
          </div>
        )}
      </section>
    </main>
  );
}
