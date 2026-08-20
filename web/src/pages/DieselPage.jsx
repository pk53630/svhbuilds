import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';
import BarChart from '../components/BarChart.jsx';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function DieselPage() {
  const { buildingId } = useParams();
  const { token } = useAuth();
  const [records, setRecords] = useState([]);
  const [report, setReport] = useState([]);
  const [form, setForm] = useState({ liters: '', date: todayStr(), amount: '' });
  const [error, setError] = useState('');

  function load() {
    api.getDieselRecords(token, buildingId).then(setRecords).catch((err) => setError(err.message));
    api.getDieselReport(token, buildingId).then(setReport).catch((err) => setError(err.message));
  }
  useEffect(load, [token, buildingId]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.addDieselRecord(token, { ...form, buildingId });
      setForm({ liters: '', date: todayStr(), amount: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this diesel record?')) return;
    try {
      await api.deleteDieselRecord(token, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h1>Diesel filling information</h1>
      <p className="muted">For the backup power generator.</p>

      <form className="form-card inline-form" onSubmit={handleAdd}>
        <h3>Log a diesel fill-up</h3>
        <div className="form-row">
          <input placeholder="Liters" type="number" min="0" step="0.1" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} required />
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} max={todayStr()} required />
        </div>
        <input placeholder="Amount (optional)" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary" type="submit">Add record</button>
      </form>

      <h2>Fillings per year</h2>
      <BarChart data={report} color="#d97706" />

      <table className="data-table">
        <thead>
          <tr><th>Date</th><th>Liters</th><th>Amount</th><th></th></tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.date).toLocaleDateString()}</td>
              <td>{r.liters} L</td>
              <td>{r.amount != null ? `₹${r.amount}` : '—'}</td>
              <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>Delete</button></td>
            </tr>
          ))}
          {records.length === 0 && (
            <tr><td colSpan={4} className="muted">No diesel records yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
