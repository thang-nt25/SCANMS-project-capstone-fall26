import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authService, type UserProfile } from '../../services/auth.service';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { RoleSwitcherModal } from './RoleSwitcherModal';

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
  }, [location.pathname]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    navigate('/login');
  };

  const isAuth = location.pathname === '/login' || location.pathname === '/register';
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  if (isAuth || isIframe) {
    return (
      <main className="w-full">
        <Outlet />
      </main>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* 1. SIDEBAR */}
      <Sidebar
        currentUser={currentUser}
        onOpenRoleSwitcher={() => setShowRoleModal(true)}
        onLogout={handleLogout}
      />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar
          currentUser={currentUser}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenRoleSwitcher={() => setShowRoleModal(true)}
        />

        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* 3. DEMO ROLE SWITCHER MODAL */}
      <RoleSwitcherModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        currentUser={currentUser}
        onUserChanged={(user) => setCurrentUser(user)}
      />
    </div>
  );
}
