import type { CustomerAddress } from '../services/customer.service';

function owner() {
  try { return JSON.parse(localStorage.getItem('user') || 'null')?.id as string | undefined; }
  catch { return undefined; }
}
export function readCheckoutAddresses(): CustomerAddress[] {
  try {
    localStorage.removeItem('scanms_cached_addresses'); // Never import a legacy cache with no owner.
    const id = owner();
    if (!id || !localStorage.getItem('token')) return [];
    const data = JSON.parse(localStorage.getItem(`scanms_addresses_v2:${id}`) || '[]');
    return Array.isArray(data) ? data.filter(record => record && typeof record === 'object' && typeof record.id === 'string') : [];
  } catch { return []; }
}
export function cacheCheckoutAddresses(addresses: CustomerAddress[]) {
  const id = owner();
  if (!id || !localStorage.getItem('token')) return;
  try { localStorage.setItem(`scanms_addresses_v2:${id}`, JSON.stringify(addresses)); } catch { /* Storage can be unavailable. */ }
}
export function clearCheckoutAddressCaches() {
  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (key === 'scanms_cached_addresses' || key?.startsWith('scanms_addresses_v2:')) localStorage.removeItem(key);
    }
  } catch { /* Logout must also work when storage is unavailable. */ }
}
