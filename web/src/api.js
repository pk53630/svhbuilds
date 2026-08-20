const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Origin of the backend server (strips the trailing /api). Used to build URLs
// for images the backend serves (/images for building photos, /uploads for
// photos attached to requests). Empty string in local dev = same origin,
// where the Vite proxy forwards to the backend.
const API_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

/** URL of a building photo, e.g. buildingImageUrl("SVresidency.jpg") */
export function buildingImageUrl(filename) {
  return filename ? `${API_ORIGIN}/images/${filename}` : null;
}

/** URL of a photo attached to a ticket (path like "/uploads/SV12345-1.jpg") */
export function ticketImageUrl(path) {
  return path ? `${API_ORIGIN}${path}` : null;
}

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  changePassword: (token, currentPassword, newPassword) =>
    request('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword }, token }),

  getBuildings: (token) => request('/buildings', { token }),
  createBuilding: (token, body) => request('/buildings', { method: 'POST', body, token }),
  deleteBuilding: (token, id) => request(`/buildings/${id}`, { method: 'DELETE', token }),

  getAdmins: (token) => request('/admins', { token }),
  createAdmin: (token, body) => request('/admins', { method: 'POST', body, token }),
  updateAdminBuildings: (token, id, buildingIds) =>
    request(`/admins/${id}`, { method: 'PATCH', body: { buildingIds }, token }),
  deleteAdmin: (token, id) => request(`/admins/${id}`, { method: 'DELETE', token }),

  getUsers: (token, buildingId) =>
    request(`/users${buildingId ? `?buildingId=${buildingId}` : ''}`, { token }),
  createUser: (token, body) => request('/users', { method: 'POST', body, token }),
  deleteUser: (token, id) => request(`/users/${id}`, { method: 'DELETE', token }),

  getCategories: (token) => request('/tickets/categories', { token }),
  getTickets: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/tickets${qs ? `?${qs}` : ''}`, { token });
  },
  createTicket: (token, body) => request('/tickets', { method: 'POST', body, token }),
  updateTicketStatus: (token, id, body) =>
    request(`/tickets/${id}/status`, { method: 'PATCH', body, token }),
  notifyTechnician: (token, id) => request(`/tickets/${id}/notify-technician`, { method: 'POST', token }),

  getWaitlist: (token, buildingId) => request(`/waitlist?buildingId=${buildingId}`, { token }),
  addWaitlist: (token, body) => request('/waitlist', { method: 'POST', body, token }),
  deleteWaitlist: (token, id) => request(`/waitlist/${id}`, { method: 'DELETE', token }),
  notifyWaitlist: (token, body) => request('/waitlist/notify', { method: 'POST', body, token }),

  getFloorSeries: (token) => request('/lpg/floor-series', { token }),
  getLpgRecords: (token, buildingId) => request(`/lpg?buildingId=${buildingId}`, { token }),
  getLpgReport: (token, buildingId) => request(`/lpg/report?buildingId=${buildingId}`, { token }),
  addLpgRecord: (token, body) => request('/lpg', { method: 'POST', body, token }),
  deleteLpgRecord: (token, id) => request(`/lpg/${id}`, { method: 'DELETE', token }),

  getDieselRecords: (token, buildingId) => request(`/diesel?buildingId=${buildingId}`, { token }),
  getDieselReport: (token, buildingId) => request(`/diesel/report?buildingId=${buildingId}`, { token }),
  addDieselRecord: (token, body) => request('/diesel', { method: 'POST', body, token }),
  deleteDieselRecord: (token, id) => request(`/diesel/${id}`, { method: 'DELETE', token }),

  getMaintenanceRecords: (token, buildingId, type) =>
    request(`/maintenance?buildingId=${buildingId}&type=${type}`, { token }),
  addMaintenanceRecord: (token, body) => request('/maintenance', { method: 'POST', body, token }),
  deleteMaintenanceRecord: (token, id) => request(`/maintenance/${id}`, { method: 'DELETE', token }),

  getRentChecklist: (token, buildingId, month) =>
    request(`/rent?buildingId=${buildingId}${month ? `&month=${month}` : ''}`, { token }),
  toggleRent: (token, body) => request('/rent/toggle', { method: 'PATCH', body, token }),
  getRentReport: (token, buildingId) => request(`/rent/report?buildingId=${buildingId}`, { token }),

  runDueChecks: (token) => request('/cron/run-checks', { method: 'POST', token }),
};
