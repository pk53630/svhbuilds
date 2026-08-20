import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (24 * 60 * 60 * 1000));
}

export default function MaintenancePage() {
  const { buildingId } = useParams();
  const { token } = useAuth();
  const [type, setType] = useState('generator');
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ lastServiceDate: todayStr(), nextServiceDate: '', notes: '' });
  const [error, setError] = useState('');

  function load() {
    api.getMaintenanceRecords(token, buildingId, type).then(setRecords).catch((err) => setError(err.message));
  }
  useEffect(load, [token, buildingId, type]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.addMaintenanceRecord(token, { ...form, type, buildingId });
      setForm({ lastServiceDate: todayStr(), nextServiceDate: '', notes: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this maintenance record?')) return;
    try {
      await api.deleteMaintenanceRecord(token, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const latestNext = records[0]?.nextServiceDate;
  const daysLeft = latestNext ? daysUntil(latestNext) : null;

  return (
    <div className="page">
      <h1>{type === 'generator' ? 'Generator' : 'Lift'} maintenance</h1>

      <div className="tab-row">
        <button className={`btn ${type === 'generator' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setType('generator')}>
          Generator
        </button>
        <button className={`btn ${type === 'lift' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setType('lift')}>
          Lift
        </button>
      </div>

      {latestNext && (
        <p style={{ marginTop: 12 }}>
          Next due: <strong>{new Date(latestNext).toLocaleDateString()}</strong>{' '}
          <span className={`due-badge ${daysLeft <= 3 ? 'due-soon' : 'due-ok'}`}>
            {daysLeft < 0 ? `${Math.abs(daysLeft)} day(s) overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft} day(s) left`}
          </span>
        </p>
      )}
      <p className="muted small">
        Admins and the super admin get a WhatsApp + email reminder automatically 3 days before the
        next due date.
      </p>

      <form className="form-card inline-form" onSubmit={handleAdd}>
        <h3>Log a service</h3>
        <div className="form-row">
          <div>
            <label>Last service date</label>
            <input type="date" value={form.lastServiceDate} onChange={(e) => setForm({ ...form, lastServiceDate: e.target.value })} max={todayStr()} required />
          </div>
          <div>
            <label>Next service due</label>
            <input type="date" value={form.nextServiceDate} onChange={(e) => setForm({ ...form, nextServiceDate: e.target.value })} required />
          </div>
        </div>
        <input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary" type="submit">Add record</button>
      </form>

      <table className="data-table">
        <thead>
          <tr><th>Last service</th><th>Next due</th><th>Notes</th><th></th></tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.lastServiceDate).toLocaleDateString()}</td>
              <td>{new Date(r.nextServiceDate).toLocaleDateString()}</td>
              <td>{r.notes}</td>
              <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>Delete</button></td>
            </tr>
          ))}
          {records.length === 0 && (
            <tr><td colSpan={4} className="muted">No {type} maintenance records yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
