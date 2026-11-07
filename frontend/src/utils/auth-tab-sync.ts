import { authService } from '../services/auth.service';
import { apiCache } from './api-cache.utils';
import { queryClient } from '../config/query-client.config';
import { disconnectChatSocket } from '../services/chat-socket.service';

function sessionIdentity() {
  const user = authService.getCurrentUser();
  return { token: localStorage.getItem('token'), userId: user?.id, role: user?.role };
}

export function startAuthTabSync() {
  let previous = sessionIdentity();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let navigating = false;
  const clearPreviousAccount = () => {
    apiCache.clear();
    queryClient.clear();
    disconnectChatSocket();
  };
  const sync = (fromOtherTab: boolean) => {
    if (navigating) return;
    const current = sessionIdentity();
    if (current.token === previous.token && current.userId === previous.userId && current.role === previous.role) return;
    const accountChanged = current.userId !== previous.userId || current.role !== previous.role;
    const loggedOut = !current.token && !!previous.token;
    previous = current;

    // If only the token was refreshed without account identity change, do NOT wipe cache or reload
    if (!accountChanged && !loggedOut) {
      return;
    }

    clearPreviousAccount();
    if (!fromOtherTab) return;

    // Recreate the old tab's providers, page state and sockets together when identity changes from another tab.
    navigating = true;
    const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const workspace = /^\/collaborator(?:\/|$)/.test(window.location.pathname) ? 'kol'
      : /^\/merchant(?:\/|$)/.test(window.location.pathname) ? 'shop'
      : /^\/admin(?:\/|$)/.test(window.location.pathname) ? 'admin' : null;
    const allowed = authService.getUserAvailableWorkspaces().some(item => item.key === workspace);
    if (workspace && accountChanged && (!current.token || !allowed)) {
      const params = new URLSearchParams({ role: workspace, redirect: path, sessionChanged: '1' });
      window.location.replace(`/login?${params}`);
    } else {
      window.location.reload();
    }
  };
  const queueSync = (event: StorageEvent) => {
    if (event.storageArea !== localStorage || (event.key !== null && !['token', 'user'].includes(event.key))) return;
    clearTimeout(timer);
    timer = setTimeout(() => sync(true), 100);
  };
  const onLocalAuth = () => sync(false);

  // Storage events fire exclusively on other tabs when localStorage is modified.
  // Aggressive 'focus' and 'visibilitychange' reloads are removed to prevent losing form input on Alt+Tab.
  window.addEventListener('storage', queueSync);
  window.addEventListener('auth-user-updated', onLocalAuth);
  return () => {
    clearTimeout(timer);
    window.removeEventListener('storage', queueSync);
    window.removeEventListener('auth-user-updated', onLocalAuth);
  };
}
