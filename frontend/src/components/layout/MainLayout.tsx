import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Home, User, LogOut } from 'lucide-react';

function MainLayout() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="app-container">
      {/* Header / Navbar */}
      <header className="app-header">
        <div className="nav-container">
          <div className="nav-links">
            <Link to="/" className="nav-logo">
              SCANMS
            </Link>
            <nav className="nav-links">
              <Link to="/" className="nav-link">
                <Home size={16} /> Home
              </Link>
            </nav>
          </div>

          <div className="nav-links">
            {token ? (
              <button onClick={handleLogout} className="btn btn-logout">
                <LogOut size={16} /> Logout
              </button>
            ) : (
              <Link to="/login" className="btn btn-primary">
                <User size={16} /> Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-main">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          &copy; {new Date().getFullYear()} SCANMS (FA26SE032) - Sales Collaborator & Affiliate Network Management System.
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;
