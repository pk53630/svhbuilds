import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';

export default function SuperAdminPage() {
  const { token } = useAuth();
  const [buildings, setBuildings] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [buildingForm, setBuildingForm] = useState({ name: '', code: '', address: '', flats: '', imageData: '' });
  const [adminForm, setAdminForm] = useState({ name: '', email: '', phone: '', password: '', buildingIds: [] });
  const [error, setError] = useState('');

  function load() {
    api.getBuildings(token).then(setBuildings).catch((err) => setError(err.message));
    api.getAdmins(token).then(setAdmins).catch((err) => setError(err.message));
  }
  useEffect(load, [token]);

  function handleBuildingPhoto(e) {
    setError('');
    const file = (e.target.files || [])[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError('Building photo must be 3 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setBuildingForm((prev) => ({ ...prev, imageData: reader.result }));
    reader.readAsDataURL(file);
  }

  async function handleAddBuilding(e) {
    e.preventDefault();
    setError('');
    try {
      const flats = buildingForm.flats.split(/[\s,]+/).map((f) => f.trim()).filter(Boolean);
      await api.createBuilding(token, {
        name: buildingForm.name,
        code: buildingForm.code,
        address: buildingForm.address,
        flats,
        imageData: buildingForm.imageData || undefined,
      });
      setBuildingForm({ name: '', code: '', address: '', flats: '', imageData: '' });
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

  function toggleAdminBuilding(id) {
    setAdminForm((prev) => ({
      ...prev,
      buildingIds: prev.buildingIds.includes(id)
        ? prev.buildingIds.filter((x) => x !== id)
        : [...prev.buildingIds, id],
    }));
  }

  async function handleAddAdmin(e) {
    e.preventDefault();
    setError('');
    if (adminForm.buildingIds.length === 0) return setError('Select at least one building for this admin.');
    try {
      await api.createAdmin(token, adminForm);
      setAdminForm({ name: '', email: '', phone: '', password: '', buildingIds: [] });
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

  async function handleEditAdminBuildings(admin) {
    const current = admin.buildingIds || (admin.buildingId ? [admin.buildingId] : []);
    const menu = buildings.map((b, i) => `${i + 1}. ${b.name}${current.includes(b.id) ? ' ✓' : ''}`).join('\n');
    const input = window.prompt(
      `Buildings for ${admin.name} — enter the numbers to assign, separated by commas:\n\n${menu}`,
      current.map((id) => buildings.findIndex((b) => b.id === id) + 1).filter((n) => n > 0).join(',')
    );
    if (input === null) return;
    const chosen = input
      .split(/[\s,]+/)
      .map((n) => parseInt(n, 10))
      .filter((n) => n >= 1 && n <= buildings.length)
      .map((n) => buildings[n - 1].id);
    if (chosen.length === 0) return setError('Select at least one building.');
    try {
      await api.updateAdminBuildings(token, admin.id, chosen);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function adminBuildingNames(admin) {
    const ids = admin.buildingIds || (admin.buildingId ? [admin.buildingId] : []);
    return ids.map((id) => buildings.find((b) => b.id === id)?.name).filter(Boolean).join(', ') || '—';
  }

  return (
    <div className="page">
      <h1>Super Admin</h1>
      {error && <p className="error-text">{error}</p>}

      <section className="section">
        <h2>Buildings</h2>
        <form className="form-card inline-form" onSubmit={handleAddBuilding}>
          <div className="form-row">
            <input placeholder="Building name (e.g. SV RESIDENCY)" value={buildingForm.name} onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })} required />
            <input placeholder="Short code (e.g. SV)" value={buildingForm.code} onChange={(e) => setBuildingForm({ ...buildingForm, code: e.target.value })} required maxLength={6} />
          </div>
          <input placeholder="Address" value={buildingForm.address} onChange={(e) => setBuildingForm({ ...buildingForm, address: e.target.value })} />
          <textarea
            placeholder="Flat numbers, separated by commas or spaces (e.g. 101,102,103,201,202,P-1,G-1)"
            value={buildingForm.flats}
            onChange={(e) => setBuildingForm({ ...buildingForm, flats: e.target.value })}
            rows={3}
          />
          <label>Building photo (optional, JPEG/PNG/WebP, max 3 MB)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleBuildingPhoto} />
          {buildingForm.imageData && (
            <img className="building-card-photo" style={{ maxWidth: 220, margin: '8px 0' }} src={buildingForm.imageData} alt="Preview" />
          )}
          <button className="btn btn-primary" type="submit">Add building</button>
        </form>

        <table className="data-table">
          <thead>
            <tr><th>Photo</th><th>Name</th><th>Code</th><th>Flats</th><th>Address</th><th></th></tr>
          </thead>
          <tbody>
            {buildings.map((b) => (
              <tr key={b.id}>
                <td>{(b.imageData || b.image) ? '🖼️' : '—'}</td>
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
        <p className="muted">One admin can manage several buildings — tick all that apply.</p>
        <form className="form-card inline-form" onSubmit={handleAddAdmin}>
          <div className="form-row">
            <input placeholder="Name" value={adminForm.name} onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} required />
            <input placeholder="Email (used to log in)" type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} required />
          </div>
          <div className="form-row">
            <input placeholder="Phone" value={adminForm.phone} onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })} />
            <input placeholder="Temporary password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} required />
          </div>
          <label>Buildings this admin manages</label>
          <div className="checkbox-grid">
            {buildings.map((b) => (
              <label key={b.id} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={adminForm.buildingIds.includes(b.id)}
                  onChange={() => toggleAdminBuilding(b.id)}
                />
                {b.name}
              </label>
            ))}
          </div>
          <button className="btn btn-primary" type="submit">Add admin</button>
        </form>

        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Buildings</th><th></th></tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td>{adminBuildingNames(a)}</td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEditAdminBuildings(a)}>
                    Edit access
                  </button>{' '}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAdmin(a)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
