export interface ShopChatPerformance {
  conversationCount: number;
  responseRate: number | null;
  averageResponseMinutes: number | null;
  periodDays: number;
  responseWindowHours: number;
}

export interface PublicShop {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string | null;
  description?: string | null;
  isActive: boolean;
  isVerified: boolean;
  productCount: number;
  followerCount: number;
  rating?: number | null;
  reviewCount?: number;
  categories: string[];
  createdAt?: string;
  location?: string | null;
  companyName?: string | null;
  chatPerformance?: ShopChatPerformance;
}

export interface ShopProduct {
  id: string;
  sku: string;
  title: string;
  imageUrl?: string | null;
  price: number;
  originalPrice?: number;
  categoryName?: string;
  rating?: number | null;
  reviewCount?: number;
  soldCount?: number;
}
