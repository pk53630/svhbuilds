import { ticketImageUrl } from '../api.js';

const STATUS_LABEL = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Closed',
};

export default function TicketCard({ ticket, canManage, onUpdateStatus, onNotifyTechnician }) {
  return (
    <div className={`ticket-card status-${ticket.status}`}>
      <div className="ticket-card-header">
        <strong>{ticket.ticketNumber}</strong>
        <span className={`status-pill status-${ticket.status}`}>{STATUS_LABEL[ticket.status]}</span>
      </div>
      <p className="muted">
        Flat {ticket.flatNumber} · {ticket.category}
      </p>
      {ticket.description ? <p>{ticket.description}</p> : <p className="muted">No description provided.</p>}
      {ticket.images && ticket.images.length > 0 && (
        <div className="image-preview-row">
          {ticket.images.map((img, i) => {
            // Newer tickets store the photo inline (data URL); older ones store a /uploads path.
            const src = img.startsWith('data:') ? img : ticketImageUrl(img);
            return (
              <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                <img className="ticket-photo" src={src} alt={`Photo ${i + 1}`} />
              </a>
            );
          })}
        </div>
      )}
      {ticket.resolutionNotes && (
        <p className="muted">
          <strong>Resolution:</strong> {ticket.resolutionNotes}
        </p>
      )}
      <p className="muted small">Raised {new Date(ticket.createdAt).toLocaleString()}</p>
      {ticket.technicianNotifiedAt && (
        <p className="muted small">
          📲 Technician notified {new Date(ticket.technicianNotifiedAt).toLocaleString()} (
          {ticket.technicianPhone})
        </p>
      )}

      {canManage && ticket.status !== 'closed' && (
        <div className="ticket-card-actions">
          {ticket.status === 'open' && (
            <button className="btn btn-secondary" onClick={() => onUpdateStatus(ticket, 'in_progress')}>
              Mark In Progress
            </button>
          )}
          <button className="btn btn-whatsapp" onClick={() => onNotifyTechnician(ticket)}>
            📲 Notify Technician
          </button>
          <button className="btn btn-primary" onClick={() => onUpdateStatus(ticket, 'closed')}>
            Close Ticket
          </button>
        </div>
      )}
    </div>
  );
}
