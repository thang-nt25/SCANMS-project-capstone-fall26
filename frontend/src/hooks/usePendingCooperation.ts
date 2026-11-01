import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';

export function usePendingCooperation(storeId?: string) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++revision.current;
    try {
      const response: any = await api.get('/store-collaborators/shop', {
        params: storeId ? { storeId } : undefined, headers: { 'x-skip-cache': '1' },
      });
      if (request !== revision.current) return;
      const body = response?.data || response;
      if (!Array.isArray(body?.members)) return;
      const next: Record<string, number> = {};
      body.members.forEach((item: any) => {
        const id = item.collaboratorId || item.collaborator?.id;
        if (id && item.status === 'PENDING' && item.requestedByKol) next[id] = (next[id] || 0) + 1;
      });
      setCounts(next);
    } catch { /* Keep the last known counts during a temporary connection failure. */ }
  }, [storeId]);
  useEffect(() => {
    setCounts({});
    void refresh();
    const update = () => { if (!document.hidden) void refresh(); };
    const timer = window.setInterval(update, 15000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      revision.current++;
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [refresh]);
  return { counts, refresh };
}
