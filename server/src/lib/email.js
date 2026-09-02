const config = require("./config");
const formatError = require("./formatError");

const statusMessages = {
  pendente: {
    subject: "Seu pedido de agendamento foi recebido",
    title: "Pedido de agendamento recebido",
    body: "Recebemos sua solicitacao. A equipe da Clinica Aurora Saude vai analisar o horario e retornar com a confirmacao."
  },
  confirmado: {
    subject: "Sua consulta foi confirmada",
    title: "Consulta confirmada",
    body: "Seu agendamento foi confirmado. Aguardamos voce no horario marcado."
  },
  cancelado: {
    subject: "Sua consulta foi cancelada",
    title: "Consulta cancelada",
    body: "Seu agendamento foi cancelado. Se precisar, envie uma nova solicitacao com outro horario disponivel."
  }
};

const typeLabels = {
  clinica_geral: "Clinica geral",
  cardiologia: "Cardiologia",
  psicologia: "Psicologia"
};

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T12:00:00Z`));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildAppointmentEmail(appointment) {
  const statusCopy = statusMessages[appointment.status] || statusMessages.pendente;
  const tipo = typeLabels[appointment.tipo] || appointment.tipo;
  const data = formatDate(appointment.data);
  const safeName = escapeHtml(appointment.nome);

  const text = [
    `Ola, ${appointment.nome}.`,
    "",
    statusCopy.body,
    "",
    `Tipo de consulta: ${tipo}`,
    `Data: ${data}`,
    `Horario: ${appointment.horario}`,
    `Status: ${appointment.status}`,
    "",
    "Clinica Aurora Saude"
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #17231d;">
      <h2>${statusCopy.title}</h2>
      <p>Ola, ${safeName}.</p>
      <p>${statusCopy.body}</p>
      <ul>
        <li><strong>Tipo de consulta:</strong> ${tipo}</li>
        <li><strong>Data:</strong> ${data}</li>
        <li><strong>Horario:</strong> ${appointment.horario}</li>
        <li><strong>Status:</strong> ${appointment.status}</li>
      </ul>
      <p>Clinica Aurora Saude</p>
    </div>
  `;

  return {
    subject: statusCopy.subject,
    text,
    html
  };
}

async function sendAppointmentStatusEmail(appointment) {
  const email = buildAppointmentEmail(appointment);

  if (!config.emailEnabled) {
    console.log(`[email simulado] Para: ${appointment.email} | Assunto: ${email.subject}`);
    console.log(email.text);
    return { sent: false, simulated: true };
  }

  if (config.emailProvider !== "resend") {
    console.warn(`Provedor de email nao configurado: ${config.emailProvider}`);
    return { sent: false, simulated: false };
  }

  if (!config.emailApiKey) {
    console.warn("EMAIL_API_KEY nao foi configurada. Email nao enviado.");
    return { sent: false, simulated: false };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.emailApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: config.emailFrom,
        to: appointment.email,
        subject: email.subject,
        html: email.html,
        text: email.text
      })
    });

    if (!response.ok) {
      const data = await response.text();
      throw new Error(data || `Falha no envio: ${response.status}`);
    }

    return { sent: true, simulated: false };
  } catch (error) {
    console.warn("Email nao enviado:", formatError(error));
    return { sent: false, simulated: false };
  }
}

module.exports = {
  buildAppointmentEmail,
  sendAppointmentStatusEmail
};
