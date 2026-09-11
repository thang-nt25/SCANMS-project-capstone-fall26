import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Determine the exact user role needed for a given request
function determineTargetRole(url?: string): 'COLLABORATOR' | 'SHOP_MANAGER' | 'SYSTEM_ADMIN' {
  const reqUrl = (url || '').toLowerCase();
  const currentPath = (typeof window !== 'undefined' ? window.location?.pathname || '' : '').toLowerCase();

  // StoreCollaborator có cả API của Shop và KOL. Phải phân loại trước
  // kiểm tra chuỗi `/collaborator`, nếu không `/store-collaborators/shop`
  // sẽ bị hiểu nhầm là API KOL và tự gắn sai JWT.
  if (
    reqUrl.includes('/store-collaborators/shop') ||
    reqUrl.includes('/store-collaborators/invite')
  ) {
    return 'SHOP_MANAGER';
  }
  if (
    reqUrl.includes('/store-collaborators/my-invitations') ||
    /\/store-collaborators\/[^/]+\/(accept|reject)(?:\?|$)/.test(reqUrl)
  ) {
    return 'COLLABORATOR';
  }

  // 1. COLLABORATOR / KOL routes:
  // MUST CHECK FIRST: routes like /collaborator/stores/... contain both /collaborator and /stores/!
  if (
    reqUrl.includes('/collaborator') ||
    reqUrl.includes('/kol') ||
    reqUrl.includes('/referral-links') ||
    reqUrl.includes('/sample-requests') ||
    reqUrl.includes('/campaigns/my-invitations') ||
    currentPath.includes('/collaborator') ||
    currentPath.includes('/kol')
  ) {
    return 'COLLABORATOR';
  }

  // 2. ADMIN routes:
  if (reqUrl.includes('/admin') || currentPath.includes('/admin')) {
    return 'SYSTEM_ADMIN';
  }

  // 3. MERCHANT / SHOP routes:
  if (
    reqUrl.includes('/merchant') ||
    reqUrl.includes('/commission-rules') ||
    currentPath.includes('/merchant') ||
    (reqUrl.includes('/stores/') && !reqUrl.includes('/collaborator/'))
  ) {
    return 'SHOP_MANAGER';
  }

  const savedRole = localStorage.getItem('scanms-current-role');
  if (savedRole === 'shop') return 'SHOP_MANAGER';
  if (savedRole === 'admin') return 'SYSTEM_ADMIN';

  return 'COLLABORATOR';
}

// Helper for DEV auto-login when token is missing, expired, or wrong role
async function getDevFallbackToken(url?: string): Promise<string | null> {
  if (!import.meta.env.DEV) return null;
  const targetRole = determineTargetRole(url);
  let email = 'demo@scanms.vn';
  if (targetRole === 'SHOP_MANAGER') {
    email = 'shop@scanms.vn';
  } else if (targetRole === 'SYSTEM_ADMIN') {
    email = 'admin@scanms.vn';
  }

  try {
    const res = await axios.post(
      (import.meta.env.VITE_API_URL || 'http://localhost:3000/api') + '/auth/login',
      { email, password: 'Password@123' },
      { timeout: 5000 }
    );
    const newToken = res.data?.data?.accessToken || res.data?.accessToken;
    const user = res.data?.data?.user || res.data?.user;
    if (newToken) {
      localStorage.setItem('token', newToken);
      if (user) localStorage.setItem('user', JSON.stringify(user));
      return newToken;
    }
  } catch {
    // Ignore dev login failure
  }
  return null;
}

// Request Interceptor: Automatically attach Authorization token
api.interceptors.request.use(
  async (config) => {
    let token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let currentUserRole = '';
    let currentUserEmail = '';
    try {
      if (userStr) {
        const parsedUser = JSON.parse(userStr);
        currentUserRole = parsedUser?.role || '';
        currentUserEmail = parsedUser?.email || '';
      }
    } catch {}

    const targetRole = determineTargetRole(config.url);
    const reqUrl = (config.url || '').toLowerCase();
    const currentPath = (window.location?.pathname || '').toLowerCase();
    const requiresDemoKol =
      targetRole === 'COLLABORATOR' &&
      (reqUrl.includes('/store-collaborators') || currentPath.includes('/collaborator/bonus-progress')) &&
      currentUserEmail.toLowerCase() !== 'demo@scanms.vn';

    if (import.meta.env.DEV && !config.url?.includes('/auth/')) {
      // Auto-switch token if missing or if current token belongs to a different role
      if (!token || (currentUserRole && currentUserRole !== targetRole) || requiresDemoKol) {
        token = await getDevFallbackToken(config.url);
      }
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Format errors & auto-retry 401/403 in DEV
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    if (
      (status === 401 || status === 403) &&
      originalRequest &&
      !originalRequest._retry &&
      import.meta.env.DEV &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      originalRequest._retry = true;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const freshToken = await getDevFallbackToken(originalRequest.url);
      if (freshToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${freshToken}`;
        const retryRes = await api.request(originalRequest);
        return retryRes;
      }
    }
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
