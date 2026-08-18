import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';

export default function AdminUsersPage() {
  const { buildingId } = useParams();
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [building, setBuilding] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', flatNumber: '' });
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null); // last created user, to show the default password

  function load() {
    api.getUsers(token, buildingId).then(setUsers).catch((err) => setError(err.message));
    api
      .getBuildings(token)
      .then((list) => setBuilding(list.find((b) => b.id === buildingId) || null))
      .catch((err) => setError(err.message));
  }
  useEffect(load, [token, buildingId]);

  // One user per flat: only offer flats that don't have a user yet.
  const takenFlats = new Set(users.map((u) => u.flatNumber));
  const availableFlats = (building?.flats || []).filter((f) => !takenFlats.has(f));

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    setCreated(null);
    try {
      const newUser = await api.createUser(token, { ...form, buildingId });
      setCreated(newUser);
      setForm({ name: '', email: '', phone: '', flatNumber: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this resident? Their flat becomes available again.')) return;
    try {
      await api.deleteUser(token, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h1>Manage residents{building ? ` · ${building.name}` : ''}</h1>
      <p className="muted">
        One user per flat. The resident's <strong>username is their mobile number</strong>; they
        get a default password and must change it the first time they log in.
      </p>

      <form className="form-card inline-form" onSubmit={handleAdd}>
        <h3>Add resident</h3>
        <div className="form-row">
          <select
            value={form.flatNumber}
            onChange={(e) => setForm({ ...form, flatNumber: e.target.value })}
            required
          >
            <option value="">Select flat…</option>
            {availableFlats.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <input
            placeholder="Mobile number (this becomes their username)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
        </div>
        <div className="form-row">
          <input placeholder="Name (optional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Email (optional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        {error && <p className="error-text">{error}</p>}
        {availableFlats.length === 0 && building && (
          <p className="muted small">All flats in this building already have users.</p>
        )}
        <button className="btn btn-primary" type="submit" disabled={!form.flatNumber || !form.phone}>
          Add resident
        </button>
        {created && (
          <p className="success-note">
            ✅ Created flat {created.flatNumber}. Login: <strong>{created.phone}</strong> · default
            password: <strong>{created.defaultPassword}</strong> — share these with the resident;
            they'll be asked to set their own password on first login.
          </p>
        )}
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>Flat</th>
            <th>Username (mobile)</th>
            <th>Name</th>
            <th>Password status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.flatNumber}</td>
              <td>{u.phone}</td>
              <td>{u.name}</td>
              <td>{u.mustChangePassword ? 'Default (not yet changed)' : 'Set by resident'}</td>
              <td>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">No residents yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
