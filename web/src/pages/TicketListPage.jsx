import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';
import TicketCard from '../components/TicketCard.jsx';

export default function TicketListPage() {
  const { buildingId } = useParams();
  const { user, token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  const canManage = user.role === 'admin' || user.role === 'super_admin';

  function load() {
    const params = user.role === 'super_admin' ? { buildingId } : {};
    if (statusFilter) params.status = statusFilter;
    api
      .getTickets(token, params)
      .then((all) =>
        setTickets(user.role === 'super_admin' ? all : all.filter((t) => t.buildingId === buildingId))
      )
      .catch((err) => setError(err.message));
  }

  useEffect(load, [token, buildingId, statusFilter]);

  async function handleUpdateStatus(ticket, status) {
    let resolutionNotes;
    if (status === 'closed') {
      resolutionNotes = window.prompt('Closure notes / resolution feedback (required):', '');
      if (!resolutionNotes || !resolutionNotes.trim()) return;
    }
    try {
      await api.updateTicketStatus(token, ticket.id, { status, resolutionNotes });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleNotifyTechnician(ticket) {
    try {
      const { whatsappUrl } = await api.notifyTechnician(token, ticket.id);
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h1>{canManage ? 'Building requests' : 'My requests'}</h1>

      <div className="filter-row">
        <label>Filter by status:</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="ticket-list">
        {tickets.map((t) => (
          <TicketCard
            key={t.id}
            ticket={t}
            canManage={canManage}
            onUpdateStatus={handleUpdateStatus}
            onNotifyTechnician={handleNotifyTechnician}
          />
        ))}
        {tickets.length === 0 && <p className="muted">No requests found.</p>}
      </div>
    </div>
  );
}
