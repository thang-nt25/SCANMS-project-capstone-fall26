import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authService, type UserProfile } from '../../services/auth.service';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import './MainLayout.css';
import { applyTheme, getSavedTheme, saveTheme, THEME_STORAGE_KEY, type Theme } from '../../utils/theme';

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState<Theme>(getSavedTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        setTheme(getSavedTheme());
      }
    };
    window.addEventListener('storage', syncTheme);
    return () => window.removeEventListener('storage', syncTheme);
  }, []);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    const token = localStorage.getItem('token');
    if (token) {
      authService
        .getMe()
        .then((freshUser) => {
          if (freshUser && freshUser.id) {
            setCurrentUser(freshUser);
          }
        })
        .catch(() => {
          // Token expired or invalid
        });
    }

    const handleUserUpdated = () => {
      const updated = authService.getCurrentUser();
      if (updated) {
        setCurrentUser(updated);
      }
    };

    window.addEventListener('auth-user-updated', handleUserUpdated);
    return () => window.removeEventListener('auth-user-updated', handleUserUpdated);
  }, [location.pathname]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    saveTheme(nextTheme);
    setTheme(nextTheme);
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
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1612] flex flex-col font-sans">
      {/* 1. Topbar nằm full-width trên cùng (chuẩn vị trí Header như Customer) */}
      <Topbar
        currentUser={currentUser}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />

      {/* 2. Container nội dung căn giữa đồng bộ 100% với Customer (max-w-[1520px]) */}
      <main className="max-w-[1520px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-4 sm:pb-5 flex-1">
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Cột trái: Sidebar điều hướng các chức năng của từng vai trò */}
          <div className="workspace-sidebar-slot">
            <Sidebar currentUser={currentUser} onLogout={handleLogout} />
          </div>

          {/* Cột phải: Khung nội dung chính của vai trò */}
          <div className="workspace-page-column w-full flex-1 min-w-0 flex flex-col gap-4 text-left">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
