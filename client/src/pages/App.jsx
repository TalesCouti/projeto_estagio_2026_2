import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ClipboardList, HeartPulse, ShieldCheck } from "lucide-react";
import { api } from "../api";
import CalendarPicker from "../components/CalendarPicker";
import TimeSlots from "../components/TimeSlots";
import heroImage from "../assets/clinic-hero.png";

const fallbackTypes = [
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

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatDate(date) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T12:00:00Z`));
}

export default function App({ onNavigate }) {
  const [types, setTypes] = useState(fallbackTypes);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    tipo: "clinica_geral",
    data: "",
    horario: ""
  });
  const [month, setMonth] = useState(currentMonth());
  const [calendar, setCalendar] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitState, setSubmitState] = useState({ type: "idle", message: "" });

  const selectedType = useMemo(
    () => types.find((type) => type.value === form.tipo) || types[0],
    [types, form.tipo]
  );

  useEffect(() => {
    api.getTypes().then((data) => setTypes(data.types)).catch(() => setTypes(fallbackTypes));
  }, []);

  useEffect(() => {
    setCalendarLoading(true);
    api
      .getCalendar(form.tipo, month)
      .then((data) => setCalendar(data.calendar))
      .catch(() => setCalendar([]))
      .finally(() => setCalendarLoading(false));
  }, [form.tipo, month]);

  useEffect(() => {
    if (!form.data) {
      setAvailableSlots([]);
      return;
    }

    // Horarios sao recarregados sempre que muda a especialidade ou a data escolhida.
    setSlotsLoading(true);
    api
      .getAvailability(form.tipo, form.data)
      .then((data) => setAvailableSlots(data.availableSlots))
      .catch(() => setAvailableSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [form.tipo, form.data]);

  function updateField(field, value) {
    setSubmitState({ type: "idle", message: "" });
    setForm((current) => ({
      ...current,
      [field]: value,
      // Ao trocar tipo ou data, o horario anterior pode deixar de ser valido.
      ...(field === "tipo" ? { data: "", horario: "" } : {}),
      ...(field === "data" ? { horario: "" } : {})
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitState({ type: "loading", message: "Enviando solicitacao..." });

    try {
      await api.createAppointment(form);
      setSubmitState({
        type: "success",
        message: `Pedido enviado para ${formatDate(form.data)} as ${form.horario}. Status: pendente.`
      });
      setForm((current) => ({
        ...current,
        nome: "",
        email: "",
        data: "",
        horario: ""
      }));
      const data = await api.getCalendar(form.tipo, month);
      setCalendar(data.calendar);
      setAvailableSlots([]);
    } catch (error) {
      setSubmitState({ type: "error", message: error.message });
    }
  }

  return (
    <main className="site-shell">
      <header className="public-nav">
        <a className="brand" href="#top">
          <HeartPulse size={24} />
          <span>Clinica Aurora Saude</span>
        </a>
        <nav>
          <a href="#servicos">Servicos</a>
          <a href="#agenda">Agenda</a>
          <button className="nav-link-button" type="button" onClick={() => onNavigate("/login")}>
            Painel admin
          </button>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">Agenda medica</span>
          <h1>Cuidado proximo, consulta sem espera confusa</h1>
          <p>
            Escolha especialidade, veja dias livres e envie seu pedido de agendamento em poucos
            minutos.
          </p>
          <a className="primary-link" href="#agenda">
            <CalendarDays size={18} />
            Agendar consulta
          </a>
        </div>
        <div className="hero-media">
          <img src={heroImage} alt="Medico atendendo paciente em uma clinica moderna" />
        </div>
      </section>

      <section className="services-section" id="servicos">
        <div className="section-copy">
          <h2>Especialidades disponiveis</h2>
          <p>
            A agenda separa os horarios por especialidade para evitar conflito e deixar a escolha
            clara para o paciente.
          </p>
        </div>
        <div className="service-grid">
          {types.map((type) => (
            <article className="service-card" key={type.value}>
              <ShieldCheck size={22} />
              <h3>{type.label}</h3>
              <p>{type.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="booking-section" id="agenda">
        <div className="booking-intro">
          <ClipboardList size={28} />
          <div>
            <h2>Solicitar agendamento</h2>
            <p>
              Todos os pedidos entram como pendentes. A equipe confirma ou cancela no painel de
              gestao.
            </p>
          </div>
        </div>

        <form className="booking-layout" onSubmit={handleSubmit}>
          <div className="form-panel">
            <label>
              Nome completo
              <input
                autoComplete="name"
                minLength="2"
                name="nome"
                onChange={(event) => updateField("nome", event.target.value)}
                required
                type="text"
                value={form.nome}
              />
            </label>

            <label>
              Email
              <input
                autoComplete="email"
                name="email"
                onChange={(event) => updateField("email", event.target.value)}
                required
                type="email"
                value={form.email}
              />
            </label>

            <label>
              Tipo de consulta
              <select
                name="tipo"
                onChange={(event) => updateField("tipo", event.target.value)}
                required
                value={form.tipo}
              >
                {types.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="selected-summary">
              <strong>{selectedType.label}</strong>
              <span>{form.data ? formatDate(form.data) : "Nenhuma data escolhida"}</span>
              <span>{form.horario || "Nenhum horario escolhido"}</span>
            </div>

            {submitState.message ? (
              <div className={`feedback ${submitState.type}`}>
                {submitState.type === "success" ? <CheckCircle2 size={18} /> : null}
                <span>{submitState.message}</span>
              </div>
            ) : null}

            <button
              className="submit-button"
              disabled={submitState.type === "loading" || !form.data || !form.horario}
              type="submit"
            >
              Enviar pedido
            </button>
          </div>

          <div className="calendar-stack">
            <CalendarPicker
              calendar={calendar}
              loading={calendarLoading}
              month={month}
              onMonthChange={setMonth}
              onSelectDate={(date) => updateField("data", date)}
              selectedDate={form.data}
            />
            <TimeSlots
              loading={slotsLoading}
              onSelectTime={(time) => updateField("horario", time)}
              selectedDate={form.data}
              selectedTime={form.horario}
              slots={availableSlots}
            />
          </div>
        </form>
      </section>
    </main>
  );
}
