import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, LogOut, RefreshCw } from "lucide-react";
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
      if (error.message.toLowerCase().includes("sessao")) {
        localStorage.removeItem("aurora_token");
        onNavigate("/login", true);
      }
    } finally {
      setLoading(false);
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
