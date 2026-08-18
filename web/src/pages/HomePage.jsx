import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';
import BuildingCard from '../components/BuildingCard.jsx';

export default function HomePage() {
  const { user, token } = useAuth();
  const [buildings, setBuildings] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getBuildings(token)
      .then(setBuildings)
      .catch((err) => setError(err.message));
  }, [token]);

  // Super admin sees every building. Admin/user see only the building(s) they belong to.
  const visible =
    user.role === 'super_admin'
      ? buildings
      : buildings.filter((b) => b.id === user.buildingId);

  return (
    <div className="page">
      <h1>Buildings</h1>
      <p className="muted">
        {user.role === 'super_admin'
          ? 'All buildings in the system.'
          : 'Select your building to raise or manage requests.'}
      </p>

      {error && <p className="error-text">{error}</p>}

      <div className="building-grid">
        {visible.map((b) => (
          <BuildingCard key={b.id} building={b} canDelete={false} />
        ))}
        {visible.length === 0 && !error && (
          <p className="muted">No buildings to show yet.</p>
        )}
      </div>
    </div>
  );
}
