const API_URL = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const token = localStorage.getItem("aurora_token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Nao foi possivel concluir a operacao.");
  }

  return data;
}

export const api = {
  getTypes: () => request("/api/appointments/types"),
  getCalendar: (tipo, month) =>
    request(`/api/appointments/calendar?tipo=${tipo}&month=${month}`),
  getAvailability: (tipo, date) =>
    request(`/api/appointments/availability?tipo=${tipo}&date=${date}`),
  createAppointment: (payload) =>
    request("/api/appointments", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  login: (payload) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  logout: () =>
    request("/api/auth/logout", {
      method: "POST"
    }),
  getAppointments: () => request("/api/appointments/admin"),
  updateStatus: (id, status) =>
    request(`/api/appointments/admin/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    })
};
