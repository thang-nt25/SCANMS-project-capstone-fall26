import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import api from '../services/api';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  children?: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles = ['SHOP_MANAGER', 'SYSTEM_ADMIN'], children }: ProtectedRouteProps) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isDev = import.meta.env.DEV;

  // Xác thực token và lấy vai trò thực tế trực tiếp từ Server qua GET /api/auth/me (chống giả mạo role trong localStorage)
  React.useEffect(() => {
    let isCurrent = true;

    async function verifyAuthFromServer() {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) {
        if (isCurrent) {
          setToken(null);
          setUserRole(null);
          setIsVerifying(false);
        }
        return;
      }

      setIsVerifying(true);
      try {
        const res: any = await api.get('/auth/me');
        const user = res?.data || res;
        if (isCurrent) {
          if (user && user.role) {
            setUserRole(user.role);
            setToken(currentToken);
            localStorage.setItem('user', JSON.stringify(user));
          } else {
            throw new Error('Không nhận diện được vai trò người dùng');
          }
        }
      } catch {
        if (isCurrent) {
          // Token không hợp lệ hoặc đã hết hạn trên server
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUserRole(null);
        }
      } finally {
        if (isCurrent) {
          setIsVerifying(false);
        }
      }
    }

    verifyAuthFromServer();

    const handleSync = () => {
      verifyAuthFromServer();
    };

    window.addEventListener('storage', handleSync);
    const handleMsg = (e: MessageEvent) => {
      if (e.data && e.data.type === 'SCANMS_AUTH_SYNC') {
        handleSync();
      }
    };
    window.addEventListener('message', handleMsg);
    return () => {
      isCurrent = false;
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('message', handleMsg);
    };
  }, [token]);

  const handleQuickLogin = async () => {
    if (!isDev) return;
    try {
      setLoginLoading(true);
      setErrorMsg(null);
      const isKolTarget = allowedRoles.includes('COLLABORATOR') && !allowedRoles.includes('SHOP_MANAGER');
      const credentials = isKolTarget
        ? { email: 'kol1@scanms.vn', password: 'Password@123' }
        : { email: 'shop@techstore.vn', password: 'Password@123' };

      const res: any = await api.post('/auth/login', credentials);
      const newToken = res?.accessToken || res?.data?.accessToken;
      const newUser = res?.user || res?.data?.user;
      if (newToken && newUser?.role && allowedRoles.includes(newUser.role)) {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        setToken(newToken);
        setUserRole(newUser.role);
      } else {
        throw new Error('Tài khoản không có vai trò phù hợp');
      }
    } catch {
      setErrorMsg('Đăng nhập API thất bại. Vui lòng kiểm tra lại tài khoản hoặc đăng nhập trực tiếp.');
    } finally {
      setLoginLoading(false);
    }
  };

  const isAuthorized = Boolean(token && userRole && allowedRoles.includes(userRole));

  // Notify parent iframe about content height
  React.useEffect(() => {
    if (window.parent && window.parent !== window) {
      const sendHeight = () => {
        const h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 450);
        window.parent.postMessage({ type: 'SCANMS_IFRAME_RESIZE', height: h }, '*');
      };
      sendHeight();
      const t = setTimeout(sendHeight, 150);
      return () => clearTimeout(t);
    }
  }, [isAuthorized, errorMsg, loginLoading, isVerifying]);

  if (isVerifying) {
    return (
      <div style={{
        minHeight: '260px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAF6F0',
        color: '#7D6D55',
        fontFamily: '"Plus Jakarta Sans", Inter, sans-serif',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #E8DAC4',
          borderTopColor: '#C9A363',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '12px',
        }} />
        <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Đang xác thực bảo mật tài khoản...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthorized) {
    const isKolRoute = allowedRoles.includes('COLLABORATOR') && !allowedRoles.includes('SHOP_MANAGER');
    const roleTitle = isKolRoute ? 'Cộng Tác Viên / KOL' : 'Chủ Shop (SHOP_MANAGER)';

    return (
      <div style={{
        minHeight: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: '#0c101c',
        backgroundImage: 'radial-gradient(ellipse at 50% 20%, rgba(217, 119, 6, 0.12) 0%, rgba(12, 16, 28, 0.98) 70%)',
        color: '#f8fafc',
        padding: '36px 20px 48px',
        textAlign: 'center',
        fontFamily: '"Plus Jakarta Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <div style={{
          maxWidth: '560px',
          width: '100%',
          background: 'rgba(20, 27, 45, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '36px 32px',
          borderRadius: '20px',
          border: '1px solid rgba(217, 119, 6, 0.4)',
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 25px rgba(217, 119, 6, 0.12)',
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'rgba(217, 119, 6, 0.15)',
            border: '2px solid rgba(217, 119, 6, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: '#f59e0b',
            fontSize: '28px',
          }}>
            🛡️
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', marginBottom: '10px' }}>
            Yêu Cầu Xác Thực Quyền {roleTitle}
          </h2>
          <p style={{ fontSize: '13.5px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '18px' }}>
            Khu vực này được bảo vệ bởi <strong>ProtectedRoute</strong> và chỉ cho phép tài khoản có vai trò <strong>{roleTitle}</strong>.
            <br />
            {token ? (
              <span style={{ display: 'inline-block', marginTop: '8px' }}>
                Vai trò hiện tại trong phiên: <code style={{ color: '#f87171', background: 'rgba(0,0,0,0.4)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>{userRole || 'Chưa xác định'}</code> (Không đủ quyền)
              </span>
            ) : (
              <span style={{ display: 'inline-block', marginTop: '8px', color: '#e2e8f0' }}>
                Trạng thái: <em>Chưa đăng nhập tài khoản phù hợp</em>
              </span>
            )}
          </p>

          {errorMsg && (
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '13px', marginBottom: '16px' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {isDev && (
              <button
                type="button"
                onClick={handleQuickLogin}
                disabled={loginLoading}
                style={{
                  padding: '12px 22px',
                  background: 'linear-gradient(135deg, #d97706, #b45309)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '14.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(217, 119, 6, 0.4)',
                  transition: 'all 0.2s ease',
                }}
              >
                {loginLoading ? 'Đang xác thực tài khoản thật…' : `🔑 [Dev] Đăng nhập tài khoản ${roleTitle}`}
              </button>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '6px' }}>
              <Link
                to="/"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  backgroundColor: '#1e293b',
                  color: '#cbd5e1',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: '1px solid #334155',
                }}
              >
                🏠 Về Mẫu UI/UX Prototype
              </Link>
              <Link
                to="/login"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  backgroundColor: '#1e293b',
                  color: '#cbd5e1',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: '1px solid #334155',
                }}
              >
                Đăng nhập tài khoản
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (children) {
    return <>{children}</>;
  }

  return <Outlet />;
}
