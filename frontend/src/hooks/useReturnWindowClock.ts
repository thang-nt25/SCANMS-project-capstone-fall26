import { useEffect, useState } from 'react';

/** Re-render at the next delivery deadline, without fetching orders repeatedly. */
export function useReturnWindowClock(orders: ReadonlyArray<{ deliveredAt?: string | null } | null>) {
  const [clock, setClock] = useState(Date.now);
  const now = Math.max(clock, Date.now());
  const nextDeadline = orders.reduce((next, order) => {
    const deadline = Date.parse(order?.deliveredAt || '') + 14 * 86400000;
    return deadline > now ? Math.min(next, deadline) : next;
  }, Infinity);

  useEffect(() => {
    const update = () => setClock(Date.now());
    const timer = Number.isFinite(nextDeadline)
      ? window.setTimeout(update, Math.min(Math.max(1, nextDeadline - Date.now()), 2147483647))
      : undefined;
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [nextDeadline, clock]);
  return now;
}
