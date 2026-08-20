import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';

function DueCheckButton({ token }) {
  const [status, setStatus] = useState('');
  async function run() {
    setStatus('Checking…');
    try {
      const r = await api.runDueChecks(token);
      setStatus(`Done — ${r.maintenanceReminders} maintenance, ${r.rentReminders} rent reminder(s) sent.`);
    } catch (err) {
      setStatus(err.message);
    }
  }
  return (
    <div className="form-card inline-form" style={{ marginTop: 24 }}>
      <button className="btn btn-secondary" onClick={run}>🔔 Check due dates now</button>
      {status && <p className="muted small">{status}</p>}
    </div>
  );
}

export default function BuildingDetailPage() {
  const { buildingId } = useParams();
  const { user, token } = useAuth();
  const [building, setBuilding] = useState(null);

  useEffect(() => {
    api.getBuildings(token).then((list) => {
      setBuilding(list.find((b) => b.id === buildingId) || null);
    });
  }, [token, buildingId]);

  if (!building) return <div className="page">Loading…</div>;

  const adminIds = user.buildingIds || (user.buildingId ? [user.buildingId] : []);
  const isAdminHere = user.role === 'admin' && adminIds.includes(buildingId);
  const isUserHere = user.role === 'user' && user.buildingId === buildingId;
  const isSuperAdmin = user.role === 'super_admin';

  return (
    <div className="page">
      <h1>
        {building.name} <span className="muted">({building.code})</span>
      </h1>
      <p className="muted">{building.address}</p>

      <div className="action-grid">
        {(isUserHere || isSuperAdmin) && (
          <Link className="action-card" to={`/buildings/${building.id}/raise-request`}>
            <h3>➕ Raise a request</h3>
            <p className="muted">Report plumbing, electrical, lift, or other issues.</p>
          </Link>
        )}
        <Link className="action-card" to={`/buildings/${building.id}/tickets`}>
          <h3>🗒️ View requests</h3>
          <p className="muted">
            {isUserHere ? 'Track the status of your requests.' : 'View and manage all requests for this building.'}
          </p>
        </Link>
        {(isAdminHere || isSuperAdmin) && (
          <Link className="action-card" to={`/buildings/${building.id}/users`}>
            <h3>👥 Manage residents</h3>
            <p className="muted">Add or remove residents for this building.</p>
          </Link>
        )}
        {(isAdminHere || isSuperAdmin) && (
          <Link className="action-card" to={`/buildings/${building.id}/waitlist`}>
            <h3>⏳ Waiting list</h3>
            <p className="muted">Interested candidates; notify them when a flat vacates.</p>
          </Link>
        )}
        {(isAdminHere || isSuperAdmin) && (
          <Link className="action-card" to={`/buildings/${building.id}/lpg`}>
            <h3>🔥 LPG filling</h3>
            <p className="muted">Log cylinder purchases; see fillings per year.</p>
          </Link>
        )}
        {(isAdminHere || isSuperAdmin) && (
          <Link className="action-card" to={`/buildings/${building.id}/diesel`}>
            <h3>⛽ Diesel filling</h3>
            <p className="muted">Log generator diesel fill-ups; see fillings per year.</p>
          </Link>
        )}
        {(isAdminHere || isSuperAdmin) && (
          <Link className="action-card" to={`/buildings/${building.id}/maintenance`}>
            <h3>🛠️ Generator &amp; lift maintenance</h3>
            <p className="muted">Track service dates; automatic reminders 3 days before due.</p>
          </Link>
        )}
        {(isAdminHere || isSuperAdmin) && (
          <Link className="action-card" to={`/buildings/${building.id}/rent`}>
            <h3>💰 Rent tracking</h3>
            <p className="muted">Mark rent received per flat; auto reminders if unpaid past the 5th.</p>
          </Link>
        )}
      </div>
      {(isAdminHere || isSuperAdmin) && <DueCheckButton token={token} />}
    </div>
  );
}
