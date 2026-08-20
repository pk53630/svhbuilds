import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';
import BarChart from '../components/BarChart.jsx';

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function RentTrackingPage() {
  const { buildingId } = useParams();
  const { token } = useAuth();
  const [month, setMonth] = useState(currentMonthKey());
  const [list, setList] = useState([]);
  const [report, setReport] = useState([]);
  const [error, setError] = useState('');

  function load() {
    api.getRentChecklist(token, buildingId, month).then((r) => setList(r.list)).catch((err) => setError(err.message));
    api.getRentReport(token, buildingId).then(setReport).catch((err) => setError(err.message));
  }
  useEffect(load, [token, buildingId, month]);

  async function handleToggle(flatNumber, received) {
    try {
      await api.toggleRent(token, { buildingId, flatNumber, month, received });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const delayedCount = list.filter((r) => !r.received).length;

  return (
    <div className="page">
      <h1>Rent tracking</h1>
      <p className="muted">
        Check off each flat once rent is received for the month. If a flat is still unchecked
        after the 5th, the resident (and admins) get an automatic WhatsApp + email reminder.
      </p>

      <div className="filter-row">
        <label>Month:</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        {delayedCount > 0 && <span className="due-badge due-soon">{delayedCount} not received</span>}
      </div>

      {error && <p className="error-text">{error}</p>}

      <table className="data-table rent-grid">
        <thead>
          <tr><th>Flat</th><th>Resident</th><th>Received?</th></tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.flatNumber}>
              <td>{r.flatNumber}</td>
              <td>{r.name}</td>
              <td>
                <input
                  type="checkbox"
                  checked={r.received}
                  onChange={(e) => handleToggle(r.flatNumber, e.target.checked)}
                />
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr><td colSpan={3} className="muted">No residents in this building yet.</td></tr>
          )}
        </tbody>
      </table>

      <h2>Delayed residents — last 4 months</h2>
      <BarChart data={report} color="#dc2626" />
    </div>
  );
}
