const resets = new Set<() => void>();
function identity() {
  if (typeof localStorage === 'undefined') return '';
  let account = '';
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    account = `${user?.id ?? ''}:${user?.role ?? ''}`;
  } catch { /* Corrupt profile data must not retain a privileged snapshot. */ }
  return `${account}:${localStorage.getItem('token') ?? ''}:${localStorage.getItem('current_store_id') ?? ''}`;
}
let previous = identity();
function synchronize() {
  const next = identity();
  if (next === previous) return;
  previous = next;
  for (const reset of resets) reset();
}
if (typeof window !== 'undefined') {
  window.addEventListener('auth-user-updated', synchronize);
  window.addEventListener('scanms_workspace_changed', synchronize);
  window.addEventListener('storage', synchronize);
}
/** Module snapshots must participate in the same session lifecycle as the API cache. */
export function registerPrivateCacheReset(reset: () => void) {
  synchronize();
  resets.add(reset);
}
