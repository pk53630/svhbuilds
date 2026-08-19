import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';

export default function SuperAdminPage() {
  const { token } = useAuth();
  const [buildings, setBuildings] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [buildingForm, setBuildingForm] = useState({ name: '', code: '', address: '', image: '', flats: '' });
  const [adminForm, setAdminForm] = useState({ name: '', email: '', phone: '', password: '', buildingId: '' });
  const [error, setError] = useState('');

  function load() {
    api.getBuildings(token).then(setBuildings).catch((err) => setError(err.message));
    api.getAdmins(token).then(setAdmins).catch((err) => setError(err.message));
  }
  useEffect(load, [token]);

  async function handleAddBuilding(e) {
    e.preventDefault();
    setError('');
    try {
      // Flats entered as a comma/space/newline separated list -> array.
      const flats = buildingForm.flats
        .split(/[\s,]+/)
        .map((f) => f.trim())
        .filter(Boolean);
      await api.createBuilding(token, { ...buildingForm, flats });
      setBuildingForm({ name: '', code: '', address: '', image: '', flats: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteBuilding(building) {
    if (!window.confirm(`Delete "${building.name}"? This removes its residents and requests too.`)) return;
    try {
      await api.deleteBuilding(token, building.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddAdmin(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createAdmin(token, adminForm);
      setAdminForm({ name: '', email: '', phone: '', password: '', buildingId: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteAdmin(admin) {
    if (!window.confirm(`Remove admin "${admin.name}"?`)) return;
    try {
      await api.deleteAdmin(token, admin.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h1>Super Admin</h1>
      {error && <p className="error-text">{error}</p>}

      <section className="section">
        <h2>Buildings</h2>
        <form className="form-card inline-form" onSubmit={handleAddBuilding}>
          <div className="form-row">
            <input placeholder="Building name (e.g. Lasaya Home)" value={buildingForm.name} onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })} required />
            <input placeholder="Short code (e.g. LH)" value={buildingForm.code} onChange={(e) => setBuildingForm({ ...buildingForm, code: e.target.value })} required maxLength={6} />
          </div>
          <input placeholder="Address" value={buildingForm.address} onChange={(e) => setBuildingForm({ ...buildingForm, address: e.target.value })} />
          <input placeholder="Photo filename in Images folder (optional, e.g. MyBuilding.jpg)" value={buildingForm.image} onChange={(e) => setBuildingForm({ ...buildingForm, image: e.target.value })} />
          <textarea
            placeholder="Flat numbers, separated by commas or spaces (e.g. 101,102,103,201,202,P-1,G-1)"
            value={buildingForm.flats}
            onChange={(e) => setBuildingForm({ ...buildingForm, flats: e.target.value })}
            rows={3}
          />
          <button className="btn btn-primary" type="submit">Add building</button>
        </form>

        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Code</th><th>Flats</th><th>Address</th><th></th></tr>
          </thead>
          <tbody>
            {buildings.map((b) => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>{b.code}</td>
                <td>{(b.flats || []).length}</td>
                <td>{b.address}</td>
                <td><button className="btn btn-danger btn-sm" onClick={() => handleDeleteBuilding(b)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section">
        <h2>Building Admins</h2>
        <form className="form-card inline-form" onSubmit={handleAddAdmin}>
          <div className="form-row">
            <input placeholder="Name" value={adminForm.name} onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} required />
            <select value={adminForm.buildingId} onChange={(e) => setAdminForm({ ...adminForm, buildingId: e.target.value })} required>
              <option value="">Select building…</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <input placeholder="Email" type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} required />
            <input placeholder="Phone" value={adminForm.phone} onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })} />
          </div>
          <input placeholder="Temporary password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} required />
          <button className="btn btn-primary" type="submit">Add admin</button>
        </form>

        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Building</th><th></th></tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td>{buildings.find((b) => b.id === a.buildingId)?.name || '—'}</td>
                <td><button className="btn btn-danger btn-sm" onClick={() => handleDeleteAdmin(a)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
