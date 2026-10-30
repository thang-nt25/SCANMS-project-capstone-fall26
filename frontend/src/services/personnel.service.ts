import api from './api';

export interface InternalStaffMember {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  role: 'SHOP_MANAGER' | 'SYSTEM_MANAGER' | 'SYSTEM_ADMIN';
  isActive: boolean;
  createdAt: string;
  stores?: Array<{
    id: string;
    name: string;
    slug: string;
    isVerified: boolean;
    isActive: boolean;
  }>;
}

export interface CreateStaffPayload {
  email: string;
  fullName: string;
  phoneNumber?: string;
  password: string;
  role: 'SHOP_MANAGER' | 'SYSTEM_MANAGER';
  storeId?: string;
}

export interface AdminStoreOption {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  ownerId: string;
  isVerified: boolean;
  isActive: boolean;
  defaultCommissionRate: number;
  owner?: {
    id: string;
    fullName: string;
    email: string;
  };
  _count?: {
    products: number;
  };
}

export const personnelService = {
  async getStaffList(): Promise<InternalStaffMember[]> {
    const res = await api.get('/users/staff');
    return res.data;
  },

  async createStaff(payload: CreateStaffPayload): Promise<InternalStaffMember> {
    const res = await api.post('/users/internal-staff', payload);
    return res.data;
  },

  async toggleStaffStatus(
    id: string,
    isActive?: boolean,
  ): Promise<{ id: string; isActive: boolean }> {
    const res = await api.patch(`/users/${id}/toggle-status`, { isActive });
    return res.data;
  },

  async getAdminStores(): Promise<AdminStoreOption[]> {
    const res = await api.get('/stores/all-admin');
    return res.data;
  },
};

