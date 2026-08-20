import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';
import BarChart from '../components/BarChart.jsx';

const FLOOR_SERIES = ['1', '2', '3', '4', '5', '6'];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function LpgPage() {
  const { buildingId } = useParams();
  const { token } = useAuth();
  const [records, setRecords] = useState([]);
  const [report, setReport] = useState([]);
  const [form, setForm] = useState({ floorSeries: '', date: todayStr(), amount: '' });
  const [error, setError] = useState('');

  function load() {
    api.getLpgRecords(token, buildingId).then(setRecords).catch((err) => setError(err.message));
    api.getLpgReport(token, buildingId).then(setReport).catch((err) => setError(err.message));
  }
  useEffect(load, [token, buildingId]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.addLpgRecord(token, { ...form, buildingId });
      setForm({ floorSeries: '', date: todayStr(), amount: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this LPG record?')) return;
    try {
      await api.deleteLpgRecord(token, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h1>LPG filling information</h1>

      <form className="form-card inline-form" onSubmit={handleAdd}>
        <h3>Log a cylinder purchase</h3>
        <div className="form-row">
          <select value={form.floorSeries} onChange={(e) => setForm({ ...form, floorSeries: e.target.value })} required>
            <option value="">Floor series…</option>
            {FLOOR_SERIES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} max={todayStr()} required />
        </div>
        <input placeholder="Amount (optional)" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary" type="submit">Add record</button>
      </form>

      <h2>Fillings per year</h2>
      <BarChart data={report} />

      <table className="data-table">
        <thead>
          <tr><th>Date</th><th>Floor series</th><th>Amount</th><th></th></tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.date).toLocaleDateString()}</td>
              <td>{r.floorSeries}</td>
              <td>{r.amount != null ? `₹${r.amount}` : '—'}</td>
              <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>Delete</button></td>
            </tr>
          ))}
          {records.length === 0 && (
            <tr><td colSpan={4} className="muted">No LPG records yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
