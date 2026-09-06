import { ArrowUpRight, HeartPulse, Mail, MapPin, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-intro">
          <a className="brand" href="#top" aria-label="Clínica Aurora Saúde — início">
            <HeartPulse size={24} aria-hidden="true" />
            <span>Clínica Aurora Saúde</span>
          </a>
          <p>Cuidado, acolhimento e atenção em cada etapa da sua saúde.</p>
        </div>

        <section className="footer-section" aria-labelledby="footer-contact">
          <h2 id="footer-contact">Fale com a gente</h2>
          <address>
            <p><Phone size={17} aria-hidden="true" /><span>(38) 9999-9999</span></p>
            <p><Mail size={17} aria-hidden="true" /><span>clinicaaurora@gmail.com</span></p>
            <p><MapPin size={17} aria-hidden="true" /><span>Rua Zero, 0<br />Centro · Montes Claros / MG</span></p>
          </address>
        </section>

        <section className="footer-section" aria-labelledby="footer-hours">
          <h2 id="footer-hours">Atendimento</h2>
          <p>Segunda a sexta</p>
          <p>8h às 12h · 13h às 18h</p>
          <p>Sábados e domingos: fechado</p>
        </section>

        <nav className="footer-section footer-nav" aria-label="Navegação do rodapé">
          <h2>Explore</h2>
          <a href="#servicos">Especialidades</a>
          <a href="#agenda">Agendar consulta</a>
          <a href="#top">Voltar ao topo <ArrowUpRight size={16} aria-hidden="true" /></a>
        </nav>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Clínica Aurora Saúde.</span>
        <span>Clínica fictícia · Informações de exemplo</span>
      </div>
    </footer>
  );
}
