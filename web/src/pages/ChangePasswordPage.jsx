import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';

/**
 * Shown voluntarily from anywhere, but also FORCED after first login for
 * residents created by an admin (mustChangePassword) — the app redirects here
 * and won't let them in until the password is changed.
 */
export default function ChangePasswordPage() {
  const { token, user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const forced = user?.mustChangePassword;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirm) return setError('New passwords do not match.');
    if (newPassword.length < 6) return setError('New password must be at least 6 characters.');

    setLoading(true);
    try {
      const { user: updated } = await api.changePassword(token, currentPassword, newPassword);
      updateUser(updated);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>🔒 Change password</h1>
        {forced ? (
          <p className="muted">
            Welcome! For security you must set your own password before continuing. Enter the
            default password you were given, then choose a new one.
          </p>
        ) : (
          <p className="muted">Choose a new password for your account.</p>
        )}

        <label>{forced ? 'Default password' : 'Current password'}</label>
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />

        <label>New password (min 6 characters)</label>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />

        <label>Confirm new password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </div>
  );
}
