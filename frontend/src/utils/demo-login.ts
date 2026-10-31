export type DemoLoginRole = 'customer' | 'kol' | 'shop' | 'manager' | 'admin';

export interface DemoAccountDetail {
  id: string;
  name: string;
  email: string;
  password: string;
  role: DemoLoginRole;
  badge: string;
}

export const ALL_DEMO_ACCOUNTS: Record<DemoLoginRole, DemoAccountDetail[]> = {
  admin: [
    {
      id: 'admin-thang',
      name: 'Nguyễn Thành Thắng',
      email: 'admin@scanms.vn',
      password: 'Admin@123456',
      role: 'admin',
      badge: 'Super Admin · Toàn quyền',
    },
  ],
  manager: [
    {
      id: 'manager-trang',
      name: 'Lê Thu Trang',
      email: 'manager@scanms.vn',
      password: 'Manager@123456',
      role: 'manager',
      badge: 'Vận hành sàn · Duyệt eKYC',
    },
  ],
  shop: [
    {
      id: 'shop-sora',
      name: 'Nguyễn Văn Minh',
      email: 'manager.sora@scanms.vn',
      password: 'Shop@123456',
      role: 'shop',
      badge: 'Sora Skincare (Kho Tân Bình)',
    },
    {
      id: 'shop-aura',
      name: 'Trần Thị Mai',
      email: 'manager.aura@scanms.vn',
      password: 'Shop@123456',
      role: 'shop',
      badge: 'Aura Apparel (Kho Bình Thạnh)',
    },
    {
      id: 'shop-greenbio',
      name: 'Lê Hoàng Nam',
      email: 'manager.greenbio@scanms.vn',
      password: 'Shop@123456',
      role: 'shop',
      badge: 'GreenBio Health (Kho Quận 7)',
    },
    {
      id: 'shop-lumiere',
      name: 'Vũ Tuấn Kiệt',
      email: 'manager.lumiere@scanms.vn',
      password: 'Shop@123456',
      role: 'shop',
      badge: 'Lumière Living (Kho Thủ Đức)',
    },
  ],
  kol: [
    {
      id: 'kol-bronze',
      name: 'Lê Hoàng Yến Nhi',
      email: 'kol.bronze@scanms.vn',
      password: 'Kol@123456',
      role: 'kol',
      badge: 'Hạng Đồng (10%) · 25K Follower',
    },
    {
      id: 'kol-silver',
      name: 'Vũ Thanh Huyền',
      email: 'kol.silver@scanms.vn',
      password: 'Kol@123456',
      role: 'kol',
      badge: 'Hạng Bạc (11%) · 85K Follower',
    },
    {
      id: 'kol-gold',
      name: 'Bùi Minh Anh',
      email: 'kol.gold@scanms.vn',
      password: 'Kol@123456',
      role: 'kol',
      badge: 'Hạng Vàng (12%) · 280K Follower',
    },
    {
      id: 'kol-diamond',
      name: 'Dương Tuấn Anh',
      email: 'kol.diamond@scanms.vn',
      password: 'Kol@123456',
      role: 'kol',
      badge: 'Hạng Kim Cương (13%) · 650K Follower',
    },
  ],
  customer: [
    {
      id: 'customer-an',
      name: 'Trần An',
      email: 'customer.an@scanms.vn',
      password: 'Customer@123456',
      role: 'customer',
      badge: 'Mua hàng qua link · Ví 2.5Tr',
    },
    {
      id: 'customer-binh',
      name: 'Lê Bình',
      email: 'customer.binh@scanms.vn',
      password: 'Customer@123456',
      role: 'customer',
      badge: 'Khiếu nại đổi trả GHN · Demo',
    },
  ],
};

// Local development only. Production builds discard the credential branch.
export function getDemoLogin(role: DemoLoginRole): { identifier: string; password: string } | null {
  const defaultAccounts: Record<DemoLoginRole, { identifier: string; password: string }> = {
    customer: { identifier: 'customer.an@scanms.vn', password: 'Customer@123456' },
    kol: { identifier: 'kol.bronze@scanms.vn', password: 'Kol@123456' },
    shop: { identifier: 'manager.sora@scanms.vn', password: 'Shop@123456' },
    manager: { identifier: 'manager@scanms.vn', password: 'Manager@123456' },
    admin: { identifier: 'admin@scanms.vn', password: 'Admin@123456' },
  };

  const envAccount = {
    identifier: import.meta.env[`VITE_DEMO_${role.toUpperCase()}_IDENTIFIER`] || defaultAccounts[role]?.identifier,
    password: import.meta.env[`VITE_DEMO_${role.toUpperCase()}_PASSWORD`] || defaultAccounts[role]?.password,
  };

  return envAccount.identifier && envAccount.password ? envAccount : defaultAccounts[role] || null;
}
