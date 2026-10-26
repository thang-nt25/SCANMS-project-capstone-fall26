import api from './api';
import { fetchAllMediaPages, type MediaPage } from '../utils/media-pagination';

export interface MediaAsset {
  id: string;
  storeId: string;
  productId?: string;
  collaboratorId?: string | null;
  title: string;
  assetType: 'IMAGE' | 'VIDEO' | 'COPYWRITE_TEXT';
  urlOrContent: string;
  posterUrl?: string | null;
  caption?: string | null;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';
  isFeatured?: boolean;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  store?: { id?: string; name: string; slug: string };
  product?: { id: string; title: string; sku: string; price?: number | string };
  collaborator?: { id: string; fullName: string };
}

export const mediaService = {
  async getMediaAssets(params?: {
    productId?: string;
    assetType?: string;
    page?: number;
    limit?: number;
  }, options?: { signal?: AbortSignal; fresh?: boolean }): Promise<MediaPage<MediaAsset>> {
    const res: any = await api.get('/media', { params, signal: options?.signal,
      headers: options?.fresh ? { 'x-skip-cache': 'true' } : undefined });
    return res.data;
  },

  async getAllMediaAssets(options: { signal?: AbortSignal; onProgress?: (loaded: number, total: number) => void } = {}) {
    return fetchAllMediaPages((page, limit) => mediaService.getMediaAssets({ page, limit }, { signal: options.signal, fresh: true }), options);
  },

  async createMediaAsset(data: {
    productId?: string;
    title: string;
    assetType: 'IMAGE' | 'VIDEO' | 'COPYWRITE_TEXT';
    urlOrContent: string;
    posterUrl?: string;
    caption?: string;
  }) {
    const res: any = await api.post('/media', data);
    return res.data;
  },


  async submitKolVideo(data: {
    productId: string;
    title: string;
    videoUrl: string;
    posterUrl?: string;
    caption?: string;
    campaignId?: string;
    requiresCampaignParticipation?: boolean;
  }) {
    const res: any = await api.post('/media/kol-submission', data);
    return res.data;
  },

  async deleteMediaAsset(id: string) {
    const res: any = await api.delete(`/media/${id}`);
    return res.data;
  },
};

