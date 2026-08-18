import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        🏢 Building Maintenance
      </Link>
      <div className="navbar-right">
        {user?.role === 'super_admin' && (
          <Link to="/super-admin" className="navbar-link">
            Super Admin
          </Link>
        )}
        <span className="navbar-user">
          {user?.name} · <span className="badge">{user?.role.replace('_', ' ')}</span>
        </span>
        <button
          className="btn btn-ghost"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
