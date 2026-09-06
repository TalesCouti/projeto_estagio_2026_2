import { useState } from "react";
import { ArrowLeft, LogIn } from "lucide-react";
import { api } from "../api";

export default function Login({ onNavigate }) {
  const [form, setForm] = useState({
    email: "admin@aurora.local",
    password: "Aurora@123"
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const data = await api.login(form);
      localStorage.setItem("aurora_token", data.token);
      onNavigate("/admin");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <a className="brand auth-brand" href="/" aria-label="Voltar para a página inicial da Clínica Aurora Saúde" title="Voltar para a página inicial">
          <ArrowLeft size={24} aria-hidden="true" />
          <span>Clinica Aurora Saude</span>
        </a>
        <div>
          <h1>Entrar no painel</h1>
          <p>Acesso restrito para gestao dos pedidos de consulta.</p>
        </div>

        <label>
          Email
          <input
            autoComplete="email"
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required
            type="email"
            value={form.email}
          />
        </label>

        <label>
          Senha
          <input
            autoComplete="current-password"
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            required
            type="password"
            value={form.password}
          />
        </label>

        {message ? <div className="feedback error">{message}</div> : null}

        <button className="submit-button" disabled={loading} type="submit">
          <LogIn size={18} />
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
