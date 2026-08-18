import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';

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

  const isAdminHere = user.role === 'admin' && user.buildingId === buildingId;
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
      </div>
    </div>
  );
}
