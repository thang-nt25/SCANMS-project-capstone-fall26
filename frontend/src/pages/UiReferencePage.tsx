import { useLocation } from 'react-router-dom';

export default function UiReferencePage() {
  const location = useLocation();

  // Đọc role và màn hình gần nhất được lưu trong localStorage để giữ nguyên ngữ cảnh khi reload F5
  const savedRole = localStorage.getItem('scanms-current-role') || 'shop';
  const defaultScreenForRole =
    savedRole === 'shop'
      ? 'shop-dashboard'
      : savedRole === 'admin'
        ? 'admin-dashboard'
        : savedRole === 'manager'
          ? 'manager-dashboard'
          : 'kol-dashboard';

  const savedScreen = localStorage.getItem('scanms-current-screen') || defaultScreenForRole;

  let screen = savedScreen;

  if (location.pathname === '/login') {
    screen = 'auth';
  } else if (location.pathname === '/register') {
    screen = 'register';
  } else if (location.pathname === '/marketplace') {
    screen = 'marketplace';
  } else if (location.pathname === '/storefront') {
    screen = 'storefront';
  } else if (location.pathname.startsWith('/app/')) {
    screen = location.pathname.replace('/app/', '');
  } else if (location.hash && location.hash.length > 1) {
    screen = location.hash.slice(1);
  }

  const safeScreen = /^[a-z0-9-]+$/.test(screen) ? screen : defaultScreenForRole;

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <iframe
        title="SCANMS UI/UX Prototype - Nguyễn Đình Tuấn"
        src={`/reference/index.html#${safeScreen}`}
        style={{ width: '100%', height: '100%', border: 'none', flex: 1, display: 'block' }}
      />
    </div>
  );
}
