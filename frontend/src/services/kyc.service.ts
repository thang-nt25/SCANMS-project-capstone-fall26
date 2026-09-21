import api from './api';

export interface KycProfile {
  id: string;
  userId: string;
  idCardNumber?: string;
  taxCode?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bio?: string;
  kycStatus: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';
  tier?: {
    id: string;
    name: string;
    extraBonusPercentage: number;
  };
  socialLinksJson?: {
    frontCardUrl?: string;
    backCardUrl?: string;
    [key: string]: any;
  };
  user?: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    socialChannels?: Array<{
      id: string;
      platformName: string;
      channelName: string;
      channelUrl: string;
      followerCount: number;
      isPrimary: boolean;
      status?: string;
    }>;
  };
}

export const kycService = {
  async getMyKyc(): Promise<KycProfile> {
    const res: any = await api.get('/kyc/profile');
    return res.data;
  },

  async submitKyc(data: {
    idCardNumber: string;
    taxCode: string;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
    bio?: string;
    frontCardUrl?: string;
    backCardUrl?: string;
  }) {
    const res: any = await api.put('/kyc/submit', data);
    return res.data;
  },

  async getPendingKyc(): Promise<KycProfile[]> {
    const res: any = await api.get('/kyc/admin/pending');
    return res.data;
  },

  async reviewKyc(profileId: string, status: 'VERIFIED' | 'REJECTED', note?: string) {
    const res: any = await api.patch(`/kyc/admin/${profileId}/review`, { status, note });
    return res.data;
  },
};
