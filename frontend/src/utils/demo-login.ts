export type DemoLoginRole = 'customer' | 'kol' | 'shop' | 'manager' | 'admin';

// Local development only. Production builds discard the credential branch.
export function getDemoLogin(role: DemoLoginRole): { identifier: string; password: string } | null {
  const defaultAccounts: Record<DemoLoginRole, { identifier: string; password: string }> = {
    customer: { identifier: 'customer01@seed.scanms.test', password: 'Password@123' },
    kol: { identifier: 'kol01@seed.scanms.test', password: 'Password@123' },
    shop: { identifier: 'shop01@seed.scanms.test', password: 'Password@123' },
    manager: { identifier: 'manager@scanms.vn', password: 'Password@123' },
    admin: { identifier: 'admin@seed.scanms.test', password: 'Password@123' },
  };

  const envAccount = {
    identifier: import.meta.env[`VITE_DEMO_${role.toUpperCase()}_IDENTIFIER`] || defaultAccounts[role]?.identifier,
    password: import.meta.env[`VITE_DEMO_${role.toUpperCase()}_PASSWORD`] || defaultAccounts[role]?.password,
  };

  return envAccount.identifier && envAccount.password ? envAccount : defaultAccounts[role] || null;
}
