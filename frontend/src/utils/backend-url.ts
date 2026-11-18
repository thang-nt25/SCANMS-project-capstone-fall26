// Local development uses Vite's proxy so Android/LAN browsers never call their own localhost.
export function resolveBackendUrls(apiUrl: string | undefined, socketUrl: string | undefined, dev: boolean) {
  const local = (value: string) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(value);
  const api = apiUrl?.trim() || '/api';
  const base = dev && local(api) ? '/api' : api.replace(/\/$/, '');
  const socket = socketUrl?.trim();
  const origin = base.replace(/\/api\/?$/, '');
  return { api: base, socket: socket && !(dev && local(socket)) ? socket.replace(/\/$/, '') : origin };
}

export const backendUrls = resolveBackendUrls(import.meta.env.VITE_API_URL, import.meta.env.VITE_SOCKET_URL, import.meta.env.DEV);
