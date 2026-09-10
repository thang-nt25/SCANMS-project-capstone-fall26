import api from './api';

export interface MediaAsset {
  id: string;
  storeId: string;
  productId?: string;
  title: string;
  assetType: 'IMAGE' | 'VIDEO' | 'COPYWRITE_TEXT';
  urlOrContent: string;
  createdAt: string;
  store?: { name: string; slug: string };
  product?: { id: string; title: string; sku: string };
}

export const mediaService = {
  async getMediaAssets(params?: { productId?: string; assetType?: string; page?: number; limit?: number }) {
    const res: any = await api.get('/media', { params });
    return res.data;
  },

  async createMediaAsset(data: {
    productId?: string;
    title: string;
    assetType: 'IMAGE' | 'VIDEO' | 'COPYWRITE_TEXT';
    urlOrContent: string;
  }) {
    const res: any = await api.post('/media', data);
    return res.data;
  },

  async deleteMediaAsset(id: string) {
    const res: any = await api.delete(`/media/${id}`);
    return res.data;
  },
};
