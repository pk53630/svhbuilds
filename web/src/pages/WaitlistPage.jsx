import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';

/**
 * Waiting list of interested candidates for a building. Building admins (and
 * super admins) add/remove people, and when a flat vacates they broadcast a
 * WhatsApp message to everyone on the list (opens each chat pre-filled).
 */
export default function WaitlistPage() {
  const { buildingId } = useParams();
  const { token } = useAuth();
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', note: '' });
  const [flatNumber, setFlatNumber] = useState('');
  const [error, setError] = useState('');

  function load() {
    api.getWaitlist(token, buildingId).then(setList).catch((err) => setError(err.message));
  }
  useEffect(load, [token, buildingId]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.addWaitlist(token, { ...form, buildingId });
      setForm({ name: '', phone: '', note: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this candidate from the waiting list?')) return;
    try {
      await api.deleteWaitlist(token, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleNotify() {
    setError('');
    try {
      const { recipients, count } = await api.notifyWaitlist(token, { buildingId, flatNumber });
      // Open a pre-filled WhatsApp chat for each candidate.
      recipients.forEach((r) => window.open(r.whatsappUrl, '_blank', 'noopener,noreferrer'));
      alert(
        `Opened WhatsApp for ${count} candidate(s). Press Send in each tab.\n` +
          `(If your browser blocked pop-ups, allow them for this site and try again.)`
      );
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h1>Waiting list</h1>
      <p className="muted">
        People interested in a flat when none is available. When a flat vacates, notify everyone
        here on WhatsApp.
      </p>

      <form className="form-card inline-form" onSubmit={handleAdd}>
        <h3>Add interested candidate</h3>
        <div className="form-row">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Mobile number (for WhatsApp)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        </div>
        <input placeholder="Note (optional, e.g. wants 2BHK, budget, etc.)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary" type="submit">Add to waiting list</button>
      </form>

      <div className="form-card inline-form">
        <h3>Notify everyone — a flat is available</h3>
        <div className="form-row">
          <input
            placeholder="Flat number that vacated (optional)"
            value={flatNumber}
            onChange={(e) => setFlatNumber(e.target.value)}
          />
          <button className="btn btn-whatsapp" onClick={handleNotify} disabled={list.length === 0}>
            📲 Notify {list.length} candidate{list.length === 1 ? '' : 's'} on WhatsApp
          </button>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Mobile</th>
            <th>Note</th>
            <th>Added</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((w) => (
            <tr key={w.id}>
              <td>{w.name}</td>
              <td>{w.phone}</td>
              <td>{w.note}</td>
              <td>{new Date(w.createdAt).toLocaleDateString()}</td>
              <td>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(w.id)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">No one on the waiting list yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
