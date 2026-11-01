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
  categoryName?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  ownerId: string;
  isVerified: boolean;
  isActive: boolean;
  defaultCommissionRate: number;
  returnWarehouse?: {
    warehouseName?: string;
    contactName?: string;
    contactPhone?: string;
    address?: string;
    ghnDistrictId?: number;
    ghnWardCode?: string;
  } | null;
  owner?: {
    id: string;
    fullName: string;
    email: string;
  };
  _count?: {
    products: number;
  };
}

export interface CreateStorePayload {
  name: string;
  slug?: string;
  categoryName: string;
  description?: string;
  logoUrl?: string;
  defaultCommissionRate?: number;
  warehouseName?: string;
  contactName?: string;
  contactPhone?: string;
  warehouseAddress?: string;
  ghnDistrictId?: number;
  ghnWardCode?: string;
  ownerId?: string;
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

  async createStore(payload: CreateStorePayload): Promise<AdminStoreOption> {
    const res = await api.post('/stores', payload);
    return res.data;
  },

  async toggleStoreStatus(
    id: string,
    isActive?: boolean,
  ): Promise<{ id: string; name: string; isActive: boolean }> {
    const res = await api.patch(`/stores/admin/${id}/toggle-status`, { isActive });
    return res.data;
  },

  async updateStore(
    id: string,
    payload: Partial<CreateStorePayload>,
  ): Promise<AdminStoreOption> {
    const res = await api.put(`/stores/admin/${id}`, payload);
    return res.data;
  },

  async deleteStore(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`/stores/admin/${id}`);
    return res.data;
  },
};

