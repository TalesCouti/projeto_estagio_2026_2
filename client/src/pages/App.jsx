import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  HeartPulse,
  MailCheck,
  ShieldCheck
} from "lucide-react";
import { api } from "../api";
import CalendarPicker from "../components/CalendarPicker";
import TimeSlots from "../components/TimeSlots";
import Footer from "../components/Footer";
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
  const [calendarError, setCalendarError] = useState("");
  const [slotsError, setSlotsError] = useState("");
  const [availabilityVersion, setAvailabilityVersion] = useState(0);

  const selectedType = useMemo(
    () => types.find((type) => type.value === form.tipo) || types[0],
    [types, form.tipo]
  );

  useEffect(() => {
    api.getTypes().then((data) => setTypes(data.types)).catch(() => setTypes(fallbackTypes));
  }, []);

  useEffect(() => {
    let active = true;
    setCalendarLoading(true);
    setCalendar([]);
    setCalendarError("");
    api
      .getCalendar(form.tipo, month)
      .then((data) => { if (active) setCalendar(data.calendar); })
      .catch(() => { if (active) setCalendarError("Não foi possível atualizar o calendário. Tente novamente."); })
      .finally(() => { if (active) setCalendarLoading(false); });
    return () => { active = false; };
  }, [form.tipo, month, availabilityVersion]);

  useEffect(() => {
    let active = true;
    setSlotsError("");
    setAvailableSlots([]);
    if (!form.data) {
      setSlotsLoading(false);
      return;
    }

    // Horarios sao recarregados sempre que muda a especialidade ou a data escolhida.
    setSlotsLoading(true);
    api
      .getAvailability(form.tipo, form.data)
      .then((data) => { if (active) setAvailableSlots(data.availableSlots); })
      .catch(() => { if (active) setSlotsError("Não foi possível carregar os horários. Tente novamente."); })
      .finally(() => { if (active) setSlotsLoading(false); });
    return () => { active = false; };
  }, [form.tipo, form.data, availabilityVersion]);

  function updateField(field, value) {
    if (submitState.type === "loading") return;
    setSubmitState({ type: "idle", message: "" });
    setForm((current) => ({
      ...current,
      [field]: value,
      // Ao trocar tipo ou data, o horario anterior pode deixar de ser valido.
      ...(field === "tipo" ? { data: "", horario: "" } : {}),
      ...(field === "data" ? { horario: "" } : {})
    }));
  }

  function chooseType(type) {
    updateField("tipo", type);
    document.querySelector("#agenda")?.scrollIntoView({ behavior: "smooth" });
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
      setAvailableSlots([]);
      setAvailabilityVersion((value) => value + 1);
    } catch (error) {
      setSubmitState({ type: "error", message: error.message });
      if (error.status === 409) {
        setForm((current) => ({ ...current, horario: "" }));
        setAvailabilityVersion((value) => value + 1);
      }
    }
  }

  return (
    <>
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
          <span className="eyebrow">Cuidado que cabe na rotina</span>
          <h1>Agende sua consulta</h1>
          <p>Escolha a especialidade, confira os horarios livres e envie seu pedido.</p>
          <a className="primary-link" href="#agenda">
            <CalendarDays size={18} />
            Agendar consulta
          </a>
        </div>
        <div className="hero-media">
          <img src={heroImage} alt="Medico atendendo paciente em uma clinica moderna" />
        </div>
      </section>

      <section className="care-strip" aria-label="Informacoes sobre o agendamento">
        <div>
          <Activity size={20} />
          <span>
            <strong>3 especialidades</strong>
            Atendimento direcionado
          </span>
        </div>
        <div>
          <Clock3 size={20} />
          <span>
            <strong>9 horarios por dia</strong>
            Segunda a sexta
          </span>
        </div>
        <div>
          <MailCheck size={20} />
          <span>
            <strong>Acompanhamento por email</strong>
            Do pedido ate a resposta
          </span>
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
              <div className="service-icon">
                <ShieldCheck size={22} />
              </div>
              <div className="service-content">
                <h3>{type.label}</h3>
                <p>{type.description}</p>
              </div>
              <button type="button" onClick={() => chooseType(type.value)}>
                Escolher
                <ArrowRight size={17} />
              </button>
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
              <div className={`feedback ${submitState.type}`} role={submitState.type === "error" ? "alert" : "status"}>
                {submitState.type === "success" ? <CheckCircle2 size={18} /> : null}
                <span>{submitState.message}</span>
              </div>
            ) : null}

            <button
              className="submit-button"
              disabled={submitState.type === "loading" || calendarLoading || slotsLoading || !form.data || !form.horario}
              type="submit"
            >
              Enviar pedido
            </button>
          </div>

          <div className="calendar-stack">
            {calendarError || slotsError ? (
              <div className="feedback error" role="alert">
                <span>{calendarError || slotsError}</span>
                <button className="secondary-button" type="button"
                  onClick={() => setAvailabilityVersion((value) => value + 1)}>Tentar novamente</button>
              </div>
            ) : null}
            <CalendarPicker
              calendar={calendar}
              loading={calendarLoading}
              month={month}
              onMonthChange={(value) => { if (submitState.type !== "loading") setMonth(value); }}
              onSelectDate={(date) => updateField("data", date)}
              selectedDate={form.data}
            />
            {!slotsError ? <TimeSlots
              loading={slotsLoading}
              onSelectTime={(time) => updateField("horario", time)}
              selectedDate={form.data}
              selectedTime={form.horario}
              slots={availableSlots}
            /> : null}
          </div>
        </form>
      </section>
    </main>
    <Footer />
    </>
  );
}
