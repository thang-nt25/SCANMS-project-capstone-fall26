import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GhnTrackingTimeline } from '../../components/shipping/GhnTrackingTimeline';
import {
  Store,
  MessageSquare,
  Package,
  Search,
  Sparkles,
  Link2,
  ExternalLink,
  TrendingUp,
  MapPin,
  Star,
  Plus,
  Loader2,
  Truck,
  CheckCircle2,
  Video,
  Download,
  ShieldAlert,
  Copy,
  AlertTriangle,
  Handshake,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Image,
  Lightbulb,
} from 'lucide-react';
import api from '../../services/api';
import { kycService, type KycProfile } from '../../services/kyc.service';
import { socialService, type SocialChannel } from '../../services/social.service';
import { mediaService, type MediaAsset } from '../../services/media.service';
import { SubmitKolVideoModal } from '../../components/media/SubmitKolVideoModal';
import ChatBoxPage from '../chat/ChatBoxPage';
import { toast } from '../../utils/toast';
import { Select } from '../../components/ui/Select';
import QRCode from 'qrcode';
import './ShopCollaborationPage.css';

export interface PartnerStore {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  ownerAvatarUrl?: string;
  ownerName?: string;
  category?: string;
  commissionRange?: string;
  rating?: number;
  location?: string;
  totalProducts?: number;
  unreadCount?: number;
  pendingSamplesCount?: number;
}

const getShopLogoUrl = (logoUrl?: string | null) => {
  const normalized = logoUrl?.trim();
  if (!normalized || /unsplash\.com/i.test(normalized)) return undefined;
  return normalized;
};

function StoreAvatar({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl?: string;
  className: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [logoUrl]);

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'S';

  return (
    <span className={`${className} relative inline-flex items-center justify-center overflow-hidden bg-[#F3EFE6] text-[#B88E4F] font-extrabold`}>
      {logoUrl && !imageFailed ? (
        <img
          src={logoUrl}
          alt={`Logo ${name}`}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}

const REAL_STORES: PartnerStore[] = [
  {
    id: 'a7e7bd20-bebc-44c9-a98b-004de44cf773',
    name: 'Sora Skin Official Store',
    slug: 'sora-skin',
    category: 'Dược mỹ phẩm & Phục hồi da',
    commissionRange: '10% - 21%',
    rating: 4.9,
    location: 'Quận 1, TP.HCM',
    totalProducts: 12,
    unreadCount: 1,
  },
  {
    id: '461bdfe3-2260-4ac7-b93b-6a6da5c45535',
    name: 'Aura Bio Cosmetics Vietnam',
    slug: 'aura-bio-cosmetics',
    category: 'Mỹ phẩm sinh học & Thuần chay',
    commissionRange: '10% - 21%',
    rating: 4.8,
    location: 'Cầu Giấy, Hà Nội',
    totalProducts: 8,
    unreadCount: 0,
  },
  {
    id: 'c4444444-4444-4444-8444-444444444444',
    name: 'GreenBio Health & Herbs',
    slug: 'greenbio-health',
    category: 'Thực phẩm chức năng & Trà',
    commissionRange: '10% - 21%',
    rating: 4.7,
    location: 'Bình Thạnh, TP.HCM',
    totalProducts: 18,
    unreadCount: 0,
  },
  {
    id: 'd5555555-5555-4555-8555-555555555555',
    name: 'Lumière Lab Vietnam',
    slug: 'lumiere-lab',
    category: 'Serum & Chăm sóc chuyên sâu',
    commissionRange: '10% - 21%',
    rating: 5.0,
    location: 'Quận 1, TP.HCM',
    totalProducts: 6,
    unreadCount: 0,
  },
];

export default function ShopCollaborationPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const shopParam = searchParams.get('shop') || searchParams.get('storeId');
  const tabParam = searchParams.get('tab') || 'messages';

  // Product context from query params
  const productId = searchParams.get('productId');
  const productTitle = searchParams.get('productTitle');
  const productImage = searchParams.get('productImage');
  const productPrice = searchParams.get('productPrice');
  const productSku = searchParams.get('productSku');
  const productVariantId = searchParams.get('productVariantId');
  const commissionRate = searchParams.get('commissionRate');

  const initialProductContext = useMemo(() => {
    if (!productId || !productTitle) return undefined;
    return {
      id: productId,
      title: productTitle,
      image: productImage || undefined,
      price: productPrice ? Number(productPrice) : 0,
      sku: productSku || undefined,
      productVariantId: productVariantId || undefined,
      commissionRate: commissionRate ? Number(commissionRate) : undefined,
    };
  }, [productId, productTitle, productImage, productPrice, productSku, commissionRate, productVariantId]);

  const [stores, setStores] = useState<PartnerStore[]>(REAL_STORES);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(shopParam || REAL_STORES[0].id);
  const [activeTab, setActiveTab] = useState<'messages' | 'products' | 'samples' | 'media'>(
    (tabParam as any) || 'messages'
  );

  const [searchShopQuery, setSearchShopQuery] = useState('');
  const [shopFilter, setShopFilter] = useState<'ALL' | 'CHAT' | 'SAMPLES'>('ALL');

  // KOL verification profile & channels (Business Guard)
  const [kycProfile, setKycProfile] = useState<KycProfile | null>(null);
  const [socialChannels, setSocialChannels] = useState<SocialChannel[]>([]);
  const [sampleEligibility, setSampleEligibility] = useState<any>(null);
  const [loadingKyc, setLoadingKyc] = useState(true);

  // Tab 2: Products
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Tab 3: Samples
  const [samples, setSamples] = useState<any[]>([]);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [sampleStatusFilter, setSampleStatusFilter] = useState('ALL');

  // Tab 4: Media Toolkit
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaTab, setMediaTab] = useState<'BROLL' | 'PHOTOS' | 'USP' | 'HOOKS'>('BROLL');
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Modal 1: Lấy Link Tiếp Thị Chuyên Nghiệp (Giải pháp 1)
  const [linkModalProduct, setLinkModalProduct] = useState<any | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<'TIKTOK' | 'FACEBOOK' | 'YOUTUBE' | 'INSTAGRAM'>('TIKTOK');
  const [generatedShortlink, setGeneratedShortlink] = useState<string>('');
  const [generatedQr, setGeneratedQr] = useState<string>('');

  // Modal 2: Xin Hàng Mẫu 4 Bước (Giải pháp 2)
  const [requestSampleModalProduct, setRequestSampleModalProduct] = useState<any | null>(null);
  const [sampleSocialChannelId, setSampleSocialChannelId] = useState<string>('');
  const [sampleContentType, setSampleContentType] = useState<string>('Video Review 60s (Routine buổi sáng)');
  const [sampleTermsAccepted, setSampleTermsAccepted] = useState(false);
  const [sampleRecipientName, setSampleRecipientName] = useState('');
  const [sampleRecipientPhone, setSampleRecipientPhone] = useState('');
  const [sampleRecipientPhoneConfirmed, setSampleRecipientPhoneConfirmed] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [sampleProvinces, setSampleProvinces] = useState<Array<{ ProvinceID: number; ProvinceName: string }>>([]);
  const [sampleDistricts, setSampleDistricts] = useState<Array<{ DistrictID: number; DistrictName: string }>>([]);
  const [sampleWards, setSampleWards] = useState<Array<{ WardCode: string; WardName: string }>>([]);
  const [sampleProvinceId, setSampleProvinceId] = useState('');
  const [sampleDistrictId, setSampleDistrictId] = useState('');
  const [sampleWardCode, setSampleWardCode] = useState('');
  const [sampleAddressError, setSampleAddressError] = useState('');
  const [trackingSampleId, setTrackingSampleId] = useState<string | null>(null);
  const [submittingSample, setSubmittingSample] = useState(false);

  useEffect(() => {
    if (!requestSampleModalProduct) return;
    let active = true;
    setSampleProvinceId(''); setSampleDistrictId(''); setSampleWardCode('');
    setSampleAddressError('');
    api.get('/shipping/ghn/provinces')
      .then((response: any) => {
        const data = response?.data?.data || response?.data || response;
        if (active) setSampleProvinces(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (active) setSampleAddressError('Chưa tải được tỉnh/thành GHN. Vui lòng thử lại.'); });
    return () => { active = false; };
  }, [requestSampleModalProduct]);

  useEffect(() => {
    if (!sampleProvinceId) { setSampleDistricts([]); return; }
    let active = true;
    api.get(`/shipping/ghn/districts/${sampleProvinceId}`)
      .then((response: any) => {
        const data = response?.data?.data || response?.data || response;
        if (active) setSampleDistricts(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (active) setSampleAddressError('Chưa tải được quận/huyện GHN.'); });
    return () => { active = false; };
  }, [sampleProvinceId]);

  useEffect(() => {
    if (!sampleDistrictId) { setSampleWards([]); return; }
    let active = true;
    api.get(`/shipping/ghn/wards/${sampleDistrictId}`)
      .then((response: any) => {
        const data = response?.data?.data || response?.data || response;
        if (active) setSampleWards(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (active) setSampleAddressError('Chưa tải được phường/xã GHN.'); });
    return () => { active = false; };
  }, [sampleDistrictId]);

  // Modal 3: Nộp link video nghiệm thu
  const [submitVideoSample, setSubmitVideoSample] = useState<any | null>(null);

  // Discover Stores Modal
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [marketplaceStores, setMarketplaceStores] = useState<any[]>([]);
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);
  const [discoverSearch, setDiscoverSearch] = useState('');
  const discoveredStores = useMemo(() => {
    const query = discoverSearch.trim().toLocaleLowerCase('vi');
    return marketplaceStores.filter((shop) =>
      `${shop.name || ''} ${shop.description || ''} ${shop.category || ''}`.toLocaleLowerCase('vi').includes(query),
    );
  }, [marketplaceStores, discoverSearch]);
  const [connectingStoreId, setConnectingStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (!showDiscoverModal) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowDiscoverModal(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
      previousFocus?.focus();
    };
  }, [showDiscoverModal]);

  // Sidebar Collapse state (Thu gọn / Mở rộng thanh bên gian hàng)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('scanms_collab_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('scanms_collab_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Sync with URL query
  useEffect(() => {
    if (shopParam && shopParam !== selectedStoreId) {
      setSelectedStoreId(shopParam);
    }
    if (tabParam && ['messages', 'products', 'samples', 'media'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [shopParam, tabParam]);

  const updateUrl = (storeId: string, tab: string) => {
    setSearchParams({ shop: storeId, tab }, { replace: true });
  };

  // Load verification status of current KOL
  useEffect(() => {
    const fetchVerification = async () => {
      if (!kycProfile) setLoadingKyc(true);
      try {
        const [kycRes, socialRes, eligibilityRes] = await Promise.all([
          kycService.getMyKyc().catch(() => null),
          socialService.getMyChannels().catch(() => []),
          api.get('/sample-requests/my/eligibility').catch(() => null),
        ]);
        setKycProfile(kycRes);
        setSocialChannels(socialRes || []);
        setSampleEligibility(eligibilityRes?.data || eligibilityRes);
        if (socialRes?.length) setSampleSocialChannelId((current) => current || socialRes[0].id);
      } finally {
        setLoadingKyc(false);
      }
    };
    fetchVerification();
  }, []);

  const isKycVerified = kycProfile?.kycStatus === 'VERIFIED';
  const hasSocialChannel = socialChannels.length > 0;
  const canRequestSample = Boolean(sampleEligibility?.canRequest ?? (isKycVerified && hasSocialChannel));
  const visibleSamples = sampleStatusFilter === 'ALL'
    ? samples
    : samples.filter((sample) => sample.status === sampleStatusFilter);

  const handleCancelSampleRequest = async (sampleId: string) => {
    try {
      await api.patch(`/sample-requests/${sampleId}/cancel`, {});
      toast.success('Đã hủy yêu cầu xin mẫu.');
      await loadStoreSamples(selectedStore.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Không thể hủy yêu cầu mẫu.');
    }
  };

  useEffect(() => {
    if (searchParams.get('sampleRequest') !== '1' || !initialProductContext) return;
    setRequestSampleModalProduct({
      ...initialProductContext,
      imageUrl: initialProductContext.image,
    });
    setSampleTermsAccepted(false);
    setSampleRecipientName('');
    setSampleRecipientPhone('');
    setSampleRecipientPhoneConfirmed(false);
    setShippingAddress('');
    setActiveTab('products');
  }, [initialProductContext, searchParams]);

  // Load conversations & stores
  const loadConversationsAndStores = useCallback(async () => {
    try {
      const [convRes, marketRes]: [any, any] = await Promise.all([
        api.get('/chat/conversations').catch(() => []),
        api.get('/stores/marketplace').catch(() => ({ data: [] })),
      ]);

      const convList = Array.isArray(convRes) ? convRes : convRes?.data || [];
      const marketStores = Array.isArray(marketRes?.data) ? marketRes.data : Array.isArray(marketRes) ? marketRes : [];

      const mappedStores: PartnerStore[] = [];

      convList.forEach((conv: any) => {
        const st = conv.store || {};
        const storeId = st.id || conv.storeId;
        if (storeId && !mappedStores.some((store) => store.id === storeId)) {
          mappedStores.push({
            id: storeId,
            name: st.name || 'Gian hàng đối tác',
            slug: st.slug || '',
            logoUrl: getShopLogoUrl(st.logoUrl),
            ownerAvatarUrl: st.owner?.avatarUrl || undefined,
            ownerName: st.owner?.fullName || undefined,
            category: 'Thương mại điện tử & Mỹ phẩm',
            commissionRange: '10% - 21%',
            rating: 4.9,
            location: 'Toàn quốc',
            unreadCount: conv.chatMessages?.[0]?.isRead === false ? 1 : 0,
          });
        }
      });

      marketStores.forEach((ms: any) => {
        if (!mappedStores.some((s) => s.id === ms.id)) {
          mappedStores.push({
            id: ms.id,
            name: ms.name,
            slug: ms.slug || '',
            logoUrl: getShopLogoUrl(ms.logoUrl),
            ownerAvatarUrl: ms.owner?.avatarUrl || undefined,
            ownerName: ms.owner?.fullName || undefined,
            category: ms.description?.slice(0, 30) || 'Mỹ phẩm & Chăm sóc da',
            commissionRange: '10% - 21%',
            rating: 4.8,
            location: 'Toàn quốc',
            totalProducts: ms._count?.products || 10,
            unreadCount: 0,
          });
        }
      });

      const finalList = mappedStores.length > 0 ? mappedStores : REAL_STORES;
      setStores(finalList);

      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!shopParam || !UUID_REGEX.test(shopParam) || !finalList.some((s) => s.id === shopParam)) {
        setSelectedStoreId(finalList[0].id);
        updateUrl(finalList[0].id, activeTab);
      }
    } catch {
      setStores(REAL_STORES);
    }
  }, [shopParam, activeTab]);

  useEffect(() => {
    loadConversationsAndStores();
  }, [loadConversationsAndStores]);

  const selectedStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId) || stores[0] || REAL_STORES[0];
  }, [stores, selectedStoreId]);

  const openStorefront = useCallback((store: PartnerStore) => {
    if (store.slug) {
      navigate(`/shop/${encodeURIComponent(store.slug)}`);
      return;
    }
    navigate(`/marketplace?shop=${encodeURIComponent(store.id)}`);
  }, [navigate]);

  // Load products (chỉ hiện spinner nếu chưa có sản phẩm)
  const loadStoreProducts = useCallback(async (storeId: string) => {
    setLoadingProducts((prev) => (products.length === 0 ? true : prev));
    try {
      const res: any = await api.get('/products', { params: { storeId, limit: 50 } });
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.items)
        ? res.data.items
        : Array.isArray(res?.items)
        ? res.items
        : [];
      setProducts(list);
    } catch {
      setProducts([
        {
          id: 'p-1',
          title: 'Kem Dưỡng Ẩm Phục Hồi Da B5 Pro Sora Skin',
          price: 320000,
          originalPrice: 450000,
          sku: 'SS-B5-PRO',
          imageUrl: 'https://images.unsplash.com/photo-1608248597359-2e11e3b624f1?w=300&auto=format&fit=crop&q=80',
          commissionRate: 25,
          policyType: 'OPEN',
          stockQuantity: 120,
        },
        {
          id: 'p-2',
          title: 'Serum Niacinamide 10% Sáng Da Mờ Thâm Nám VIP',
          price: 285000,
          originalPrice: 380000,
          sku: 'SS-SERUM-10',
          imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&auto=format&fit=crop&q=80',
          commissionRate: 32,
          policyType: 'EXCLUSIVE',
          stockQuantity: 85,
        },
        {
          id: 'p-3',
          title: 'Kem Chống Nắng Phổ Rộng SPF50+ PA++++ Kiềm Dầu',
          price: 360000,
          originalPrice: 490000,
          sku: 'SS-SUNSCREEN',
          imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=80',
          commissionRate: 22,
          policyType: 'OPEN',
          stockQuantity: 210,
        },
      ]);
    } finally {
      setLoadingProducts(false);
    }
  }, [products.length]);

  // Load samples (chỉ hiện spinner nếu chưa có samples)
  const loadStoreSamples = useCallback(async (storeId: string) => {
    setLoadingSamples((prev) => (samples.length === 0 ? true : prev));
    try {
      const res: any = await api.get('/sample-requests/my');
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      const matching = list.filter((item: any) => item.product?.storeId === storeId || !item.product?.storeId);
      setSamples(matching);
    } catch {
      setSamples([]);
    } finally {
      setLoadingSamples(false);
    }
  }, [samples.length]);

  // Load media (chỉ hiện spinner nếu chưa có media)
  const loadStoreMedia = useCallback(async (_storeId: string) => {
    setLoadingMedia((prev) => (mediaAssets.length === 0 ? true : prev));
    try {
      const res = await mediaService.getMediaAssets();
      const list = res?.data || res?.assets || [];
      setMediaAssets(list);
    } catch {
      setMediaAssets([]);
    } finally {
      setLoadingMedia(false);
    }
  }, [mediaAssets.length]);

  useEffect(() => {
    if (activeTab === 'products') loadStoreProducts(selectedStore.id);
    else if (activeTab === 'samples') loadStoreSamples(selectedStore.id);
    else if (activeTab === 'media') loadStoreMedia(selectedStore.id);
  }, [selectedStore.id, activeTab, loadStoreProducts, loadStoreSamples, loadStoreMedia]);

  // Open Link Generator Modal (Giải pháp 1)
  const handleOpenLinkModal = async (prod: any) => {
    setLinkModalProduct(prod);
    try {
      const url = `${window.location.origin}/products/${prod.id}?ref=kol&utm_source=${selectedChannel.toLowerCase()}`;
      setGeneratedShortlink(url);
      const qrData = await QRCode.toDataURL(url, { width: 320, margin: 2 });
      setGeneratedQr(qrData);
    } catch {
      // Fallback
    }
  };

  const handleChannelChange = async (ch: 'TIKTOK' | 'FACEBOOK' | 'YOUTUBE' | 'INSTAGRAM') => {
    setSelectedChannel(ch);
    if (linkModalProduct) {
      const url = `${window.location.origin}/products/${linkModalProduct.id}?ref=kol&utm_source=${ch.toLowerCase()}`;
      setGeneratedShortlink(url);
      const qrData = await QRCode.toDataURL(url, { width: 320, margin: 2 });
      setGeneratedQr(qrData);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedShortlink) return;
    await navigator.clipboard.writeText(generatedShortlink);
    toast.success(`Đã sao chép link tiếp thị có gắn UTM [${selectedChannel}] vào bộ nhớ tạm!`);
  };

  // Submit sample request (Giải pháp 2)
  const handleSubmitSampleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRequestSample) {
      toast.error(sampleEligibility?.blockReason || 'Cần hoàn tất KYC, liên kết kênh mạng xã hội và không bị Admin khóa quyền nhận mẫu.');
      return;
    }
    if (!requestSampleModalProduct || !sampleRecipientName.trim() || !sampleRecipientPhone.trim() || !shippingAddress.trim() || !sampleProvinceId || !sampleDistrictId || !sampleWardCode || !sampleSocialChannelId) return;
    if (!sampleRecipientPhoneConfirmed) {
      toast.error('Vui lòng xác nhận số điện thoại thuộc người nhận và GHN có thể liên hệ.');
      return;
    }
    if (!sampleTermsAccepted) {
      toast.error('Vui lòng xác nhận cam kết nộp video trong 14 ngày sau khi nhận hàng.');
      return;
    }

    setSubmittingSample(true);
    try {
      const province = sampleProvinces.find((item) => String(item.ProvinceID) === sampleProvinceId);
      const district = sampleDistricts.find((item) => String(item.DistrictID) === sampleDistrictId);
      const ward = sampleWards.find((item) => item.WardCode === sampleWardCode);
      if (!province || !district || !ward) throw new Error('Địa chỉ GHN chưa đầy đủ.');
      await api.post('/sample-requests', {
        productId: requestSampleModalProduct.id,
        productVariantId: requestSampleModalProduct.productVariantId,
        recipientName: sampleRecipientName.trim(),
        recipientPhone: sampleRecipientPhone.trim(),
        recipientPhoneConfirmed: true,
        shippingAddress: [shippingAddress.trim(), ward.WardName, district.DistrictName, province.ProvinceName].join(', '),
        ghnProvinceId: province.ProvinceID,
        ghnDistrictId: district.DistrictID,
        ghnWardCode: ward.WardCode,
        socialChannelId: sampleSocialChannelId,
        contentType: sampleContentType,
        termsAccepted: true,
      });
      toast.success(`Đã gửi yêu cầu nhận mẫu "${requestSampleModalProduct.title}" kèm cam kết video trong 14 ngày sau khi nhận hàng.`);
      setRequestSampleModalProduct(null);
      loadStoreSamples(selectedStore.id);
      setActiveTab('samples');
      updateUrl(selectedStore.id, 'samples');
    } catch (err: any) {
      toast.error(err.message || 'Không thể gửi yêu cầu xin mẫu.');
    } finally {
      setSubmittingSample(false);
    }
  };

  // Connect new store
  const handleConnectStore = async (store: any) => {
    setConnectingStoreId(store.id);
    try {
      await api.post('/chat/conversations', { storeId: store.id });
      toast.success(`Đã kết nối thành công với ${store.name}!`);
      setShowDiscoverModal(false);
      await loadConversationsAndStores();
      setSelectedStoreId(store.id);
      setActiveTab('messages');
      updateUrl(store.id, 'messages');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể kết nối gian hàng');
    } finally {
      setConnectingStoreId(null);
    }
  };

  const loadMarketplaceStores = async () => {
    setLoadingMarketplace(true);
    try {
      const res: any = await api.get('/stores/marketplace');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setMarketplaceStores(list);
    } catch {
      setMarketplaceStores([]);
    } finally {
      setLoadingMarketplace(false);
    }
  };

  // Filtered stores
  const filteredStores = useMemo(() => {
    return stores.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchShopQuery.toLowerCase()) ||
        (s.category || '').toLowerCase().includes(searchShopQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (shopFilter === 'CHAT') return Boolean(s.unreadCount);
      if (shopFilter === 'SAMPLES') return Boolean(s.pendingSamplesCount);
      return true;
    });
  }, [stores, searchShopQuery, shopFilter]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLocaleLowerCase('vi');
    if (!query) return products;
    return products.filter((product) =>
      (product.title || '').toLocaleLowerCase('vi').includes(query) ||
      (product.sku || '').toLocaleLowerCase('vi').includes(query),
    );
  }, [products, productSearch]);

  return (
    <div
      className="w-full flex flex-col gap-3 max-w-[1600px] mx-auto h-[calc(100dvh-110px)] min-h-[480px] max-h-[900px]"
      id="partner-collaboration-workspace"
    >
      {/* Top Warning Banner nếu KOL chưa xác minh */}
      {!loadingKyc && !canRequestSample && (
        <div className="shrink-0 bg-[#FBF5EB] border border-[#EAE4D7] px-4 py-2 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#B88E4F]">
            <ShieldAlert className="w-4 h-4 text-[#B88E4F] shrink-0" />
            <span>
              <strong>Lưu ý:</strong> Cần hoàn tất KYC, liên kết ít nhất một kênh mạng xã hội và không bị khóa quyền nhận mẫu để xin mẫu. Quyết định khóa/mở khóa do Admin xét duyệt.
              {sampleEligibility?.blockReason ? ` ${sampleEligibility.blockReason}` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => sampleEligibility?.isBlocked ? setActiveTab('messages') : navigate('/collaborator/profile?tab=kyc')}
            className="px-3 py-1 bg-[#EBD08C] hover:bg-[#DEC07A] text-white font-extrabold rounded-xl transition shadow-2xs shrink-0 cursor-pointer"
          >
            {sampleEligibility?.isBlocked ? 'Liên hệ gian hàng để giải trình' : 'Hoàn tất KYC ngay →'}
          </button>
        </div>
      )}

      {/* Main Unified Workspace */}
      <div className="collaboration-shell flex-1 min-h-0 bg-white border border-[#EAE4D7] rounded-2xl overflow-hidden flex flex-row">
        {/* LEFT COLUMN: Danh Sách Gian Hàng Tinh Gọn (Có thể thu nhỏ chỉ hiện icon) */}
        <div
          data-collapsed={isSidebarCollapsed}
          className={`collaboration-store-list ${
            isSidebarCollapsed ? 'w-[64px]' : 'w-[260px] xl:w-[275px]'
          } shrink-0 border-r border-[#EAE4D7] bg-[#FAF8F5]/60 flex flex-col h-full transition-all duration-300 select-none`}
        >
          {isSidebarCollapsed ? (
            /* COLLAPSED VIEW: Chỉ hiển thị icon gian hàng, bấm icon trên đỉnh để mở rộng */
            <>
              <div className="shrink-0 p-2.5 border-b border-[#EAE4D7] bg-white/95 backdrop-blur-xs flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSidebarCollapse}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#EAE4D7] text-[#7D715E] hover:text-[#B88E4F] transition shadow-2xs cursor-pointer active:scale-95"
                  title="Mở rộng thanh gian hàng"
                  aria-label="Mở rộng thanh gian hàng"
                >
                  <ChevronRight className="w-4 h-4 text-[#B88E4F]" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscoverModal(true);
                    loadMarketplaceStores();
                  }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#FBF5EB] hover:bg-[#F3EFE6] border border-[#EEDFC6] text-[#B88E4F] transition shadow-2xs cursor-pointer active:scale-95"
                  title="Khám phá gian hàng trên Sàn"
                  aria-label="Khám phá gian hàng trên Sàn"
                >
                  <Plus className="w-3.5 h-3.5 text-[#B88E4F]" />
                </button>
              </div>

              {/* Stores List: Chỉ hiển thị icon avatar gian hàng */}
              <div className="collaboration-store-icons flex-1 overflow-y-auto py-2 flex flex-col items-center gap-2 no-scrollbar" role="list">
                {filteredStores.map((st) => {
                  const isSelected = st.id === selectedStore.id;
                  return (
                    <div key={st.id} className="relative group">
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          setSelectedStoreId(st.id);
                          updateUrl(st.id, activeTab);
                        }}
                        title={`${st.name} • Hoa hồng: ${st.commissionRange || '10% - 21%'}`}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#FBF5EB] ring-2 ring-[#C59B58] shadow-xs'
                            : 'hover:bg-white hover:shadow-2xs opacity-85 hover:opacity-100'
                        }`}
                      >
                        <StoreAvatar
                          name={st.ownerName || st.name}
                          logoUrl={st.ownerAvatarUrl || st.logoUrl}
                          className="w-8.5 h-8.5 rounded-lg border border-[#EAE4D7] bg-white shadow-2xs text-[11px]"
                        />
                        {st.unreadCount ? (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#EBD08C] border-2 border-white ring-1 ring-[#C59B58]/30 animate-pulse" />
                        ) : null}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* EXPANDED VIEW: Tinh gọn, thanh mảnh, có nút thu nhỏ */
            <>
              {/* Top Search & Filter Bar */}
              <div className="collaboration-store-tools shrink-0 p-2.5 border-b border-[#EAE4D7] bg-white/95 backdrop-blur-xs flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7D715E]" />
                    <input
                      id="search-partner-store"
                      type="text"
                      aria-label="Tìm gian hàng đối tác"
                      placeholder="Tìm gian hàng..."
                      value={searchShopQuery}
                      onChange={(e) => setSearchShopQuery(e.target.value)}
                      className="w-full pl-7.5 pr-2 py-1.5 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs font-medium text-[#1A1612] placeholder:text-[#7D715E]/70 focus:bg-white focus:outline-none focus:border-[#C59B58] transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={toggleSidebarCollapse}
                    className="w-7.5 h-7.5 rounded-xl flex items-center justify-center bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#EAE4D7] text-[#7D715E] hover:text-[#B88E4F] transition shadow-2xs shrink-0 cursor-pointer active:scale-95"
                    title="Thu gọn thanh bên (chỉ hiện icon)"
                    aria-label="Thu gọn thanh bên"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#B88E4F]" />
                  </button>
                </div>

                {/* Filter chips */}
                <div className="collaboration-store-filters flex items-center justify-between px-1 py-0.5 border-b border-[#EAE4D7]/50" aria-label="Lọc danh sách gian hàng">
                  {[
                    { id: 'ALL', label: 'Tất cả' },
                    { id: 'CHAT', label: 'Tin mới' },
                    { id: 'SAMPLES', label: 'Mẫu thử' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={shopFilter === f.id}
                      onClick={() => setShopFilter(f.id as any)}
                      className={`pb-1 text-[11px] font-bold transition cursor-pointer ${
                        shopFilter === f.id
                          ? 'text-[#B88E4F] border-b-2 border-[#B88E4F]'
                          : 'text-[#7D715E] hover:text-[#1A1612] border-b-2 border-transparent'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Nút khám phá gian hàng như bố cục cũ */}
                <button
                  id="btn-discover-stores"
                  type="button"
                  onClick={() => {
                    setShowDiscoverModal(true);
                    loadMarketplaceStores();
                  }}
                  className="w-full py-1 text-[#B88E4F] hover:text-[#9A7233] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer select-none group"
                >
                  <Plus className="w-3.5 h-3.5 text-[#B88E4F]" />
                  <span className="truncate">Khám phá gian hàng trên Sàn</span>
                </button>

              </div>

              {/* Stores List: Gọn gàng */}
              <div className="collaboration-store-rows flex-1 overflow-y-auto divide-y divide-[#EAE4D7]/50" role="list">
                {filteredStores.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#7D715E]">
                    Không có gian hàng nào phù hợp
                  </div>
                ) : (
                  filteredStores.map((st) => {
                    const isSelected = st.id === selectedStore.id;
                    return (
                      <div
                        key={st.id}
                        id={`shop-item-${st.id}`}
                        data-selected={isSelected}
                        className={`px-3 py-2.5 flex items-center gap-2.5 transition-all ${
                          isSelected
                            ? 'bg-[#FBF5EB] border-l-4 border-l-[#C59B58] text-[#1A1612]'
                            : 'hover:bg-[#FAF8F5] text-[#1A1612] border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => openStorefront(st)}
                            title={`Mở gian hàng ${st.name}`}
                            aria-label={`Mở gian hàng ${st.name}`}
                            className="rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B58]"
                          >
                            <StoreAvatar
                              name={st.ownerName || st.name}
                              logoUrl={st.ownerAvatarUrl || st.logoUrl}
                              className="w-9 h-9 rounded-xl border border-[#EAE4D7] bg-white shadow-2xs text-xs"
                            />
                          </button>
                          {st.unreadCount ? (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#EBD08C] border-2 border-white ring-1 ring-[#C59B58]/30 animate-pulse" />
                          ) : null}
                        </div>

                        <button
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => {
                            setSelectedStoreId(st.id);
                            updateUrl(st.id, activeTab);
                          }}
                          className="flex-1 min-w-0 text-left cursor-pointer bg-transparent border-0 p-0"
                          aria-label={`Mở cuộc trò chuyện với ${st.name}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <strong className="text-xs font-bold truncate text-[#1A1612] leading-snug" title={st.name}>
                              {st.name}
                            </strong>
                          </div>

                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="text-[10px] text-[#7D715E] truncate" title={st.category}>
                              {st.category}
                            </span>
                            <span className="text-[9.5px] font-extrabold text-[#B88E4F] bg-white px-1.5 py-0.2 rounded border border-[#EAE4D7] shrink-0">
                              {st.commissionRange || '10% - 21%'}
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStoreId(st.id);
                            updateUrl(st.id, activeTab);
                          }}
                          title={`Mở chat với ${st.name}`}
                          aria-label={`Mở chat với ${st.name}`}
                          className="shrink-0 bg-transparent border-0 p-1 cursor-pointer"
                        >
                          <MessageSquare
                            className={`w-3.5 h-3.5 transition ${
                              isSelected || st.unreadCount ? 'text-[#B88E4F]' : 'text-stone-300'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN: Không Gian Làm Việc 1-1 Với Shop */}
        <div className="collaboration-chat-pane flex-1 h-full flex flex-col min-w-0 bg-white overflow-hidden">
          {/* Shop Context Header Bar */}
          <div className="collaboration-shop-heading shrink-0 px-4 py-3 border-b border-[#EAE4D7] bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => openStorefront(selectedStore)}
                title={`Mở gian hàng ${selectedStore.name}`}
                aria-label={`Mở gian hàng ${selectedStore.name}`}
                className="rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B58] shrink-0"
              >
                <StoreAvatar
                  name={selectedStore.ownerName || selectedStore.name}
                  logoUrl={selectedStore.ownerAvatarUrl || selectedStore.logoUrl}
                  className="w-10 h-10 rounded-xl border border-[#EAE4D7] shadow-2xs text-sm"
                />
              </button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openStorefront(selectedStore)}
                    className="text-sm font-extrabold text-[#1A1612] truncate m-0 p-0 bg-transparent border-0 hover:text-[#B88E4F] cursor-pointer"
                    title={`Mở gian hàng ${selectedStore.name}`}
                  >
                    {selectedStore.name}
                  </button>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-[#FBF5EB] text-[#B88E4F] border border-[#EAE4D7]">
                    <CheckCircle2 className="w-3 h-3 text-[#B88E4F]" /> Đã xác minh
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#7D715E] mt-0.5">
                  <span className="flex items-center gap-1 text-[#B88E4F] font-semibold">
                    <Star className="w-3 h-3 fill-[#C59B58] text-[#B88E4F]" />
                    <span>{selectedStore.rating || 4.9}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-[#B88E4F]" />
                    <span>Hoa hồng: <strong className="text-[#B88E4F]">{selectedStore.commissionRange || '10% - 21%'}</strong></span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#7D715E]" />
                    <span>{selectedStore.location || 'TP.HCM'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Nút Xem Trang Gian Hàng Trên Sàn nhẹ nhàng */}
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={selectedStore.slug
                  ? `/shop/${encodeURIComponent(selectedStore.slug)}`
                  : `/marketplace?shop=${encodeURIComponent(selectedStore.id)}`}
                target="_blank"
                rel="noreferrer"
                className="collaboration-action inline-flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer group shrink-0 select-none" title={`Xem gian hàng ${selectedStore.name} trên Sàn`}
              >
                <span>Xem gian hàng</span>
                <ExternalLink className="w-3 h-3 text-[#B88E4F]" />
              </a>
            </div>
          </div>

          {/* Sub-Tabs Bar: Vừa Vặn 100%, Nhãn Ngắn Gọn, Không Bị Tràn Chữ */}
          <div
            className="collaboration-tabs shrink-0 px-4 py-2 border-b border-[#EAE4D7] bg-white flex items-center gap-2 overflow-x-auto"
            role="tablist"
            aria-label="Nội dung hợp tác với gian hàng"
          >
            {[
              { id: 'messages', label: 'Tin nhắn & Deal', icon: MessageSquare },
              { id: 'products', label: 'Sản phẩm', icon: Package },
              { id: 'samples', label: 'Hàng mẫu', icon: Truck },
              { id: 'media', label: 'Kho nội dung', icon: Sparkles },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`subtab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    updateUrl(selectedStore.id, tab.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 select-none ${
                    isActive
                      ? 'bg-white text-[#1A1612] shadow-2xs border border-[#EAE4D7]'
                      : 'text-[#7D715E] hover:text-[#1A1612] hover:bg-white/60 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#B88E4F]' : 'text-[#7D715E]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* SUB-TAB CONTENTS */}
          <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col bg-white">
            {/* 1. CHAT TAB */}
            {activeTab === 'messages' && (
              <div className="h-full w-full overflow-hidden animate-in fade-in-50 duration-200 flex flex-col">
                {/* Thanh Deal Bar Đàm Phán Hoa Hồng VIP Tinh Tế */}
                <div className="collaboration-deal-bar bg-white border-b border-[#EAE4D7] px-4 py-2 flex items-center justify-between gap-3 text-xs shrink-0">
                  <div className="flex items-center gap-2 text-[#B88E4F]">
                    <Handshake className="w-4 h-4 text-[#B88E4F] shrink-0" />
                    <span className="collaboration-deal-copy">
                      <strong>Thỏa thuận hoa hồng</strong>
                      <span>Đề xuất thưởng VIP +1%, +2% hoặc +3%; Shop duyệt trước khi áp dụng.</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/collaborator/marketing?tab=links')}
                    className="collaboration-action px-3 py-1 rounded-lg bg-white border border-[#EAE4D7] text-[#B88E4F] font-semibold hover:bg-[#FAF8F5] transition shrink-0 cursor-pointer"
                  >
                    <Plus size={13} aria-hidden="true" /> Đề xuất deal VIP
                  </button>
                </div>

                <div className="flex-1 min-h-0">
                  <ChatBoxPage
                    embedded
                    targetStoreId={selectedStore.id}
                    targetStoreName={selectedStore.name}
                    targetStoreLogo={selectedStore.logoUrl}
                    hideSidebar
                    hideHeaderInChat
                    initialProductContext={initialProductContext}
                    className="h-full w-full border-0 rounded-none shadow-none bg-white"
                  />
                </div>
              </div>
            )}

            {/* Các Tab còn lại */}
            {activeTab !== 'messages' && (
              <div className={`h-full w-full overflow-y-auto ${activeTab === 'products' ? 'collaboration-products-scroll p-4' : 'p-5 space-y-4'}`}>
                {/* 2. PRODUCTS & SMART REFERRAL LINKS */}
                {activeTab === 'products' && (
                  <div className="collaboration-products animate-in fade-in-50 duration-200">
                    <div className="collaboration-products-header">
                      <div className="collaboration-products-heading">
                        <h3 className="collaboration-products-title">
                          Kho sản phẩm <span>{selectedStore.name}</span>
                        </h3>
                        <span className="collaboration-products-count">{products.length} sản phẩm</span>
                        <p>
                          Chính sách hoa hồng mở tự do &amp; độc quyền đối tác VIP
                        </p>
                      </div>

                      <label className="collaboration-products-search">
                        <Search aria-hidden="true" />
                        <input
                          type="text"
                          placeholder="Lọc theo tên, SKU..."
                          aria-label="Lọc sản phẩm theo tên hoặc SKU"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                        />
                      </label>
                    </div>

                    {loadingProducts ? (
                      <div className="collaboration-products-state" role="status">
                        <Loader2 className="animate-spin" aria-hidden="true" />
                        <span>Đang tải danh sách sản phẩm...</span>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="collaboration-products-state">
                        {products.length === 0 ? 'Chưa có sản phẩm nào thuộc gian hàng này.' : 'Không tìm thấy sản phẩm phù hợp.'}
                      </div>
                    ) : (
                      <div className="collaboration-products-grid">
                        {filteredProducts.map((prod) => {
                            const isExclusive = prod.policyType === 'EXCLUSIVE';
                            const canRequestThisProduct = Boolean(
                              canRequestSample && prod.sampleEnabled === true && Number(prod.sampleQuota || 0) > Number(prod.sampleGrantedCount || 0),
                            );

                            return (
                              <div
                                key={prod.id}
                                className="collaboration-product-card"
                              >
                                <div className="collaboration-product-main">
                                  <img
                                    src={prod.imageUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=150'}
                                    alt={prod.title}
                                    className="collaboration-product-image"
                                  />
                                  <div className="collaboration-product-info">
                                    <div className="collaboration-product-meta">
                                      <span className="collaboration-product-sku">
                                        {prod.sku || 'SKU'}
                                      </span>
                                      {isExclusive ? (
                                        <span className="collaboration-product-policy is-exclusive">
                                          Deal VIP
                                        </span>
                                      ) : (
                                        <span className="collaboration-product-policy">
                                          Mở tự do
                                        </span>
                                      )}
                                    </div>
                                    <strong className="collaboration-product-title">
                                      {prod.title}
                                    </strong>
                                    <div className="collaboration-product-price">
                                      <span>
                                        {Number(prod.price).toLocaleString('vi-VN')} ₫
                                      </span>
                                      {prod.originalPrice && (
                                        <span className="collaboration-product-original-price">
                                          {Number(prod.originalPrice).toLocaleString('vi-VN')} ₫
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Commission box */}
                                <div className="collaboration-product-commission">
                                  <span>Hoa hồng tiếp thị</span>
                                  <strong>
                                    Nền 10% + thưởng bậc/VIP/chiến dịch/live (tối đa 21% trên tiền hàng sau voucher)
                                  </strong>
                                </div>

                                {/* Action Buttons */}
                                <div className="collaboration-product-actions">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenLinkModal(prod)}
                                    className="collaboration-product-link"
                                  >
                                    <Link2 className="w-3.5 h-3.5" />
                                    <span>Lấy Link Tiếp Thị</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!canRequestSample) {
                                        toast.error(sampleEligibility?.blockReason || 'Cần hoàn tất KYC và liên kết kênh mạng xã hội trước khi xin mẫu.');
                                        return;
                                      }
                                      if (!canRequestThisProduct) {
                                        toast.error('Shop hiện chưa bật cấp mẫu cho sản phẩm này hoặc đã hết hạn mức.');
                                        return;
                                      }
                                      setSampleTermsAccepted(false);
                                      setSampleRecipientName('');
                                      setSampleRecipientPhone('');
                                      setSampleRecipientPhoneConfirmed(false);
                                      setShippingAddress('');
                                      setRequestSampleModalProduct(prod);
                                    }}
                                    disabled={!canRequestThisProduct}
                                    className="collaboration-product-sample"
                  title={!canRequestSample ? (sampleEligibility?.blockReason || 'Hoàn tất KYC và liên kết kênh mạng xã hội để mở khóa') : !canRequestThisProduct ? 'Shop chưa bật cấp mẫu hoặc đã hết hạn mức' : 'Xin mẫu dùng thử'}
                                  >
                                    <Truck className="w-3.5 h-3.5 text-[#B88E4F]" />
                                    <span>{!canRequestSample ? 'Khóa điều kiện' : canRequestThisProduct ? 'Xin mẫu thử' : 'Chưa cấp mẫu'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. SAMPLES TAB - 4 BƯỚC */}
                {activeTab === 'samples' && (
                  <div className="collaboration-samples animate-in fade-in-50 duration-200">
                    <section className="collaboration-sample-guide" aria-labelledby="sample-guide-title">
                      <div className="collaboration-sample-guide-heading">
                        <div className="collaboration-sample-guide-copy">
                          <span className="collaboration-sample-guide-icon"><Package aria-hidden="true" /></span>
                          <div>
                            <h3 id="sample-guide-title">Quy trình nhận hàng mẫu</h3>
                            <p>Theo dõi từ lúc đăng ký đến khi video được nghiệm thu.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('products');
                            updateUrl(selectedStore.id, 'products');
                          }}
                          className="collaboration-sample-find-products"
                        >
                          <Plus aria-hidden="true" />Tìm sản phẩm
                        </button>
                      </div>

                      <div className="collaboration-sample-steps">
                        <div className="collaboration-sample-step">
                          <span className="collaboration-sample-step-number">01</span>
                          <div><strong>Đăng ký &amp; cam kết</strong><span>Kênh đăng và thời hạn nội dung</span></div>
                        </div>
                        <div className="collaboration-sample-step">
                          <span className="collaboration-sample-step-number">02</span>
                          <div><strong>Shop duyệt &amp; giao hàng</strong><span>Theo dõi trạng thái và vận đơn</span></div>
                        </div>
                        <div className="collaboration-sample-step">
                          <span className="collaboration-sample-step-number">03</span>
                          <div><strong>Xác nhận đã nhận</strong><span>Bắt đầu thời hạn nộp nội dung</span></div>
                        </div>
                        <div className="collaboration-sample-step">
                          <span className="collaboration-sample-step-number">04</span>
                          <div><strong>Nộp bài &amp; nghiệm thu</strong><span>Gửi video để Shop xác nhận</span></div>
                        </div>
                      </div>
                    </section>

                    {/* Danh sách mẫu */}
                    <div className="collaboration-sample-history-toolbar">
                      <div className="collaboration-sample-history-count">
                        <Package aria-hidden="true" />
                        <span>Lịch sử yêu cầu</span>
                        <strong>{samples.length}</strong>
                      </div>
                      <div className="collaboration-sample-filter-wrap">
                        <Select
                          value={sampleStatusFilter}
                          onChange={(event) => setSampleStatusFilter(event.target.value)}
                          aria-label="Lọc trạng thái yêu cầu mẫu"
                          className="w-full collaboration-sample-filter"
                        >
                          <option value="ALL">Tất cả trạng thái</option>
                          <option value="PENDING">Chờ Shop duyệt</option>
                          <option value="APPROVED">Đã duyệt</option>
                          <option value="SHIPPED">Đang giao</option>
                          <option value="RECEIVED">Đã nhận mẫu</option>
                          <option value="VIDEO_SUBMITTED">Chờ nghiệm thu video</option>
                          <option value="REVISION_REQUIRED">Cần sửa video</option>
                          <option value="OVERDUE">Quá hạn</option>
                          <option value="DELIVERY_ISSUE">Sự cố giao hàng</option>
                          <option value="COMPLETED">Hoàn tất</option>
                          <option value="REJECTED">Bị từ chối</option>
                          <option value="CANCELLED">Đã hủy</option>
                        </Select>
                      </div>
                    </div>
                    {loadingSamples ? (
                      <div className="collaboration-sample-state" role="status">
                        <Loader2 className="animate-spin" aria-hidden="true" />
                        <span>Đang tải dữ liệu hàng mẫu...</span>
                      </div>
                    ) : samples.length === 0 ? (
                      <div className="collaboration-sample-empty">
                        <span className="collaboration-sample-empty-icon"><Package aria-hidden="true" /></span>
                        <h4 className="collaboration-sample-empty-title">Chưa có đơn xin mẫu nào từ {selectedStore.name}</h4>
                        <p className="collaboration-sample-empty-copy">
                          Chọn sản phẩm ở tab "Kho Sản Phẩm" để đăng ký nhận mẫu trải nghiệm miễn phí.
                        </p>
                      </div>
                    ) : visibleSamples.length === 0 ? (
                      <div className="collaboration-sample-state">
                        Không có yêu cầu nào ở trạng thái đã chọn.
                      </div>
                    ) : (
                      <div className="collaboration-sample-list">
                        {visibleSamples.map((samp: any) => {
                          const status = samp.status || 'PENDING';
                          const isShipped = status === 'SHIPPED';
                          const canSubmitVideo = ['RECEIVED', 'OVERDUE', 'REVISION_REQUIRED'].includes(status);
                          const activeDeadline = samp.revisionDeadlineAt && ['REVISION_REQUIRED', 'OVERDUE'].includes(status)
                            ? samp.revisionDeadlineAt
                            : samp.deadlineAt;
                          const daysLeft = activeDeadline
                            ? Math.ceil((new Date(activeDeadline).getTime() - Date.now()) / 86400000)
                            : null;
                          const statusLabel: Record<string, string> = {
                            PENDING: 'Chờ Shop duyệt', APPROVED: 'Shop đã duyệt', SHIPPED: 'Đang giao',
                            RECEIVED: 'Đã nhận · chờ video', VIDEO_SUBMITTED: 'Chờ Shop nghiệm thu',
                            REVISION_REQUIRED: 'Shop yêu cầu sửa video', COMPLETED: 'Đã hoàn tất',
                            OVERDUE: 'Quá hạn video · cần xử lý', REJECTED: 'Shop từ chối',
                            CANCELLED: 'Đã hủy', DELIVERY_ISSUE: 'Có sự cố giao hàng',
                          };

                          return (
                            <div
                              key={samp.id}
                              className="collaboration-sample-request"
                              data-status={status.toLowerCase()}
                            >
                              <div className="collaboration-sample-request-main">
                                <img
                                  src={samp.product?.imageUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=150'}
                                  alt={samp.product?.title || 'Sản phẩm'}
                                  className="collaboration-sample-product-image"
                                />
                                <div className="collaboration-sample-request-info">
                                  <strong className="collaboration-sample-request-title">
                                    {samp.product?.title || 'Sản phẩm mẫu'}
                                  </strong>
                                  <div className="collaboration-sample-request-badges">
                                    <span className="collaboration-sample-status" data-status={status.toLowerCase()}>
                                      {statusLabel[status] || status}
                                    </span>
                                    {samp.trackingNumber && (
                                      <span className="collaboration-sample-tracking">
                                        Mã vận đơn: <strong>{samp.trackingNumber}</strong> ({samp.carrier || 'Đơn vị vận chuyển'})
                                      </span>
                                    )}
                                    {activeDeadline && !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(status) && (
                                      <span className="collaboration-sample-deadline" data-expired={daysLeft !== null && daysLeft <= 0}>
                                        {daysLeft !== null && daysLeft > 0 ? `Còn ${daysLeft} ngày` : 'Đã quá hạn'} · hạn {new Date(activeDeadline).toLocaleDateString('vi-VN')}
                                      </span>
                                    )}
                                  </div>
                                  <p className="collaboration-sample-meta">
                                    Kênh cam kết: {samp.socialPlatformSnapshot || samp.socialChannel?.platformName || '—'} · {samp.socialChannelNameSnapshot || samp.socialChannel?.channelName || '—'}
                                    {!activeDeadline && samp.expectedVideoAt ? ` · Dự kiến đăng ${new Date(samp.expectedVideoAt).toLocaleDateString('vi-VN')}` : ''}
                                  </p>
                                  {samp.recipientName && (
                                    <p className="collaboration-sample-meta">
                                      Người nhận: {samp.recipientName} · {samp.recipientPhone} · {samp.shippingAddress}
                                    </p>
                                  )}
                                  {samp.videoRejectionReason && (
                                    <p className="collaboration-sample-problem">Lý do cần sửa: {samp.videoRejectionReason}</p>
                                  )}
                                  {samp.rejectedReason && status === 'REJECTED' && (
                                    <p className="collaboration-sample-problem">Lý do: {samp.rejectedReason}</p>
                                  )}
                                  {(samp.events?.length > 0 || samp.videoAssets?.length > 0) && (
                                    <details className="collaboration-sample-events">
                                      <summary>Xem lịch sử xử lý và video</summary>
                                      <ul>
                                        {(samp.events || []).map((event: any) => (
                                          <li key={event.id}>{new Date(event.createdAt).toLocaleString('vi-VN')} · {event.action}</li>
                                        ))}
                                        {(samp.videoAssets || []).map((asset: any) => (
                                          <li key={asset.id}>
                                            <a href={asset.urlOrContent} target="_blank" rel="noreferrer">{asset.title || 'Video đã gửi'}</a>
                                            {' · '}{asset.status}{asset.rejectionReason ? ` · ${asset.rejectionReason}` : ''}
                                          </li>
                                        ))}
                                      </ul>
                                    </details>
                                  )}
                                </div>
                              </div>

                              <div className="collaboration-sample-actions">
                                {status === 'PENDING' && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelSampleRequest(samp.id)}
                                    className="collaboration-sample-action is-danger-quiet"
                                  >
                                    Hủy yêu cầu
                                  </button>
                                )}
                                {isShipped && samp.carrier?.toUpperCase().includes('GHN') && (
                                  <span className="collaboration-sample-action">Hạn nộp video bắt đầu khi GHN xác nhận giao thành công.</span>
                                )}
                                {samp.trackingNumber && samp.carrier?.toUpperCase().includes('GHN') && (
                                  <button type="button" className="collaboration-sample-action is-quiet"
                                    onClick={() => setTrackingSampleId(trackingSampleId === samp.id ? null : samp.id)}>
                                    Theo dõi hành trình bưu kiện
                                  </button>
                                )}
                                {isShipped && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const reason = window.prompt('Mô tả sự cố giao hàng:');
                                      if (reason?.trim()) {
                                        api.patch(`/sample-requests/${samp.id}/delivery-issue`, { reason: reason.trim() })
                                          .then(() => loadStoreSamples(selectedStore.id))
                                          .catch((err: any) => toast.error(err?.response?.data?.message || 'Không gửi được báo cáo sự cố.'));
                                      }
                                    }}
                                    className="collaboration-sample-action is-quiet"
                                  >Báo sự cố</button>
                                )}
                                {canSubmitVideo && (
                                  <button
                                    type="button"
                                    onClick={() => setSubmitVideoSample(samp)}
                                    className="collaboration-sample-action is-primary"
                                  >
                                    <Video aria-hidden="true" />
                                    <span>Nộp Link Video Review</span>
                                  </button>
                                )}
                              </div>
                              {trackingSampleId === samp.id && samp.trackingNumber && <GhnTrackingTimeline orderCode={samp.trackingNumber} sampleRequestId={samp.id} onSampleDelivered={() => loadStoreSamples(selectedStore.id)} />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. CREATOR TOOLKIT */}
                {activeTab === 'media' && (
                  <div className="collaboration-media animate-in fade-in-50 duration-200">
                    <section className="collaboration-media-header" aria-labelledby="collaboration-media-title">
                      <div className="collaboration-media-heading">
                        <span className="collaboration-media-heading-icon"><Sparkles aria-hidden="true" /></span>
                        <div>
                          <h3 id="collaboration-media-title">Kho nội dung sáng tạo</h3>
                          <p>Tài nguyên quay dựng và thông tin sản phẩm từ {selectedStore.name}.</p>
                        </div>
                      </div>

                      <div className="collaboration-media-tabs" role="tablist" aria-label="Danh mục nội dung sáng tạo">
                        {[
                          { id: 'BROLL', label: 'Video mẫu', icon: Video },
                          { id: 'PHOTOS', label: 'Ảnh & tài liệu', icon: Image },
                          { id: 'USP', label: 'Điểm nổi bật', icon: ShieldAlert },
                          { id: 'HOOKS', label: 'Gợi ý kịch bản', icon: Lightbulb },
                        ].map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => setMediaTab(sub.id as any)}
                            className="collaboration-media-tab"
                            role="tab"
                            aria-selected={mediaTab === sub.id}
                          >
                            <sub.icon aria-hidden="true" />
                            <span>{sub.label}</span>
                          </button>
                        ))}
                      </div>
                    </section>

                    {loadingMedia ? (
                      <div className="collaboration-media-state" role="status">
                        <Loader2 className="animate-spin" aria-hidden="true" />
                        <span>Đang tải kho tài nguyên sáng tạo...</span>
                      </div>
                    ) : (
                      <>
                        {mediaTab === 'BROLL' && (
                      <div className="collaboration-media-grid">
                        {[
                          {
                            id: 'br-1',
                            title: 'B-Roll Cận Cảnh Chất Kem B5 Thấm Nhanh (9:16)',
                            duration: '15s • Full HD 1080x1920',
                            url: 'https://images.unsplash.com/photo-1608248597359-2e11e3b624f1?w=400',
                            note: 'Góc quay dọc Macro không chữ, KOL tải về lồng giọng nói (Voiceover)',
                          },
                          {
                            id: 'br-2',
                            title: 'Footage Mở Hộp & Chi Tiết Vòi Nhấn Serum',
                            duration: '20s • 60 FPS',
                            url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
                            note: 'Âm thanh ASMR mở nắp sắc nét, thích hợp video unboxing',
                          },
                          {
                            id: 'br-3',
                            title: 'B-Roll Thoa Kem Chống Nắng Lên Da Cổ & Mặt',
                            duration: '18s • Ánh Sáng Tự Nhiên',
                            url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
                            note: 'Hiệu ứng nâng tone nhẹ tự nhiên không vón cục',
                          },
                        ].map((item) => (
                          <article
                            key={item.id}
                            className="collaboration-media-card collaboration-media-video-card"
                          >
                            <div className="collaboration-media-preview">
                              <span className="collaboration-media-preview-fallback"><Video aria-hidden="true" /></span>
                              <img src={item.url} alt={item.title} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                              <div className="collaboration-media-preview-meta">
                                <span className="collaboration-media-kind">
                                  VIDEO DỌC 9:16
                                </span>
                                <span>{item.duration}</span>
                              </div>
                            </div>
                            <div className="collaboration-media-card-body">
                              <strong className="collaboration-media-card-title">
                                {item.title}
                              </strong>
                              <p className="collaboration-media-card-copy">
                                {item.note}
                              </p>
                              <div className="collaboration-media-card-footer">
                                <span>MP4 · 24 MB</span>
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  className="collaboration-media-download"
                                >
                                  <Download aria-hidden="true" />
                                  <span>Tải video</span>
                                </a>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}

                    {mediaTab === 'PHOTOS' && (
                      <div className="collaboration-media-grid is-photo-grid">
                        {[
                          {
                            title: 'Bộ Ảnh Studio Concept Tối Giản Da Khỏe',
                            count: '12 ảnh PNG tách nền',
                            img: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300',
                          },
                          {
                            title: 'Chứng Nhận Thử Nghiệm Lâm Sàng Viện Da Liễu',
                            count: '3 trang PDF & Scan HD',
                            img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=300',
                          },
                          {
                            title: 'Banner Khuyến Mãi Flash Sale Dành Cho KOL',
                            count: '8 mẫu kích thước Stories / Feed',
                            img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300',
                          },
                        ].map((p, idx) => (
                          <article key={idx} className="collaboration-media-card collaboration-media-photo-card">
                            <div className="collaboration-media-photo-preview">
                              <span className="collaboration-media-preview-fallback"><Image aria-hidden="true" /></span>
                              <img src={p.img} alt={p.title} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                            </div>
                            <div className="collaboration-media-card-body">
                              <strong className="collaboration-media-card-title">{p.title}</strong>
                              <span className="collaboration-media-card-copy">{p.count}</span>
                              <button
                                type="button"
                                onClick={() => toast.success('Đang tải trọn bộ ảnh độ nét cao...')}
                                className="collaboration-media-download is-full"
                              >
                                <Download aria-hidden="true" /> Tải trọn bộ
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}

                    {mediaTab === 'USP' && (
                      <div className="collaboration-media-grid is-info-grid">
                        <section className="collaboration-usp-card">
                          <h4>
                            <Sparkles aria-hidden="true" />
                            <span>Top 3 Điểm Mạnh Cốt Lõi (USPs)</span>
                          </h4>
                          <ul>
                            <li><strong>Phức hợp B5 5% tinh khiết:</strong> Phục hồi hàng rào ẩm cho da đang treatment cấp tốc chỉ sau 48 giờ.</li>
                            <li><strong>Chất kem mỏng nhẹ tan trên da:</strong> Không gây bít tắc lỗ chân lông, không gây mụn ẩn cho da dầu Việt Nam.</li>
                            <li><strong>Thành phần thuần chay 100%:</strong> Không cồn khô, không hương liệu nhân tạo, an toàn cho mẹ bầu.</li>
                          </ul>
                        </section>

                        <section className="collaboration-usp-card is-caution">
                          <h4>
                            <AlertTriangle aria-hidden="true" />
                            <span>Từ Khóa Cấm Kỵ (Chống Bóp Tương Tác / Vi Phạm)</span>
                          </h4>
                          <p>
                            Khi quay video hoặc viết caption, KOL <strong>tuyệt đối không dùng</strong> các từ sau:
                          </p>
                          <div className="collaboration-usp-terms">
                            {['Trị dứt điểm 100%', 'Thuốc thần kỳ', 'Trắng bật tone sau 1 đêm', 'Cam kết chữa khỏi', 'Chữa lành vĩnh viễn'].map((t, idx) => (
                              <span key={idx}>
                                {t}
                              </span>
                            ))}
                          </div>
                        </section>
                      </div>
                    )}

                    {mediaTab === 'HOOKS' && (
                      <div className="collaboration-media-hook-list">
                        {[
                          {
                            hook: '"Nếu bạn đang dùng kem B5 sai cách suốt 2 năm qua thì dừng ngay lại..."',
                            angle: 'Đánh vào nỗi sợ dùng sai cách gây mụn ẩn -> Hướng dẫn cách bôi chuẩn chuyên gia.',
                            views: 'Ý tưởng video 1.2M View',
                          },
                          {
                            hook: '"Bác sĩ da liễu sẽ không muốn bạn biết hũ kem phục hồi chỉ hơn 300k này..."',
                            angle: 'Tạo cảm giác phát hiện bí mật, so sánh hiệu quả với các dòng đắt đỏ tiền triệu.',
                            views: 'Ý tưởng video 850K View',
                          },
                          {
                            hook: '"Thử thách 7 ngày đổi kem dưỡng và cái kết cho làn da dầu mụn mùa hè..."',
                            angle: 'Format kiểm chứng thực tế (Before / After) cực kỳ uy tín và dễ chốt đơn.',
                            views: 'Ý tưởng video 2.4M View',
                          },
                        ].map((hk, idx) => (
                          <article key={idx} className="collaboration-media-hook-card">
                            <div className="collaboration-media-hook-copy">
                              <div className="collaboration-media-hook-tag">
                                <Lightbulb aria-hidden="true" />
                                <span>
                                  {hk.views}
                                </span>
                              </div>
                              <strong>
                                {hk.hook}
                              </strong>
                              <p>{hk.angle}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(hk.hook);
                                toast.success('Đã sao chép ý tưởng Hook vào bộ nhớ tạm!');
                              }}
                              className="collaboration-media-copy-button"
                            >
                              <Copy aria-hidden="true" />
                              <span>Sao chép kịch bản</span>
                            </button>
                          </article>
                        ))}
                      </div>
                    )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: LẤY LINK TIẾP THỊ CHUẨN KÊNH & MÃ QR */}
      {linkModalProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-[#EAE4D7] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-left">
            <div className="p-5 border-b border-[#EAE4D7] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-[#B88E4F]" />
                <h3 className="text-sm font-extrabold text-[#1A1612] m-0">
                  Tạo Link Tiếp Thị Đa Kênh &amp; Mã QR
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLinkModalProduct(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#7D715E] hover:bg-[#F3EFE6] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="p-3 bg-[#FAF8F5] border border-[#EAE4D7] rounded-2xl flex items-center gap-3">
                <img
                  src={linkModalProduct.imageUrl}
                  alt={linkModalProduct.title}
                  className="w-12 h-12 rounded-xl object-cover border border-[#EAE4D7] bg-white shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <strong className="text-xs font-bold text-[#1A1612] line-clamp-1 block">
                    {linkModalProduct.title}
                  </strong>
                  <span className="text-[11px] text-[#B88E4F] font-bold block mt-0.5">
                    Hoa hồng: {linkModalProduct.commissionRate || 22}% (~
                    {Math.round((Number(linkModalProduct.price) * (linkModalProduct.commissionRate || 22)) / 100).toLocaleString('vi-VN')} ₫)
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                  Chọn kênh bạn dự kiến đăng (Tự động gắn UTM Source):
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'TIKTOK', label: 'TikTok Bio' },
                    { id: 'FACEBOOK', label: 'Facebook' },
                    { id: 'YOUTUBE', label: 'YouTube' },
                    { id: 'INSTAGRAM', label: 'Instagram' },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handleChannelChange(ch.id as any)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                        selectedChannel === ch.id
                          ? 'bg-[#EBD08C] text-white shadow-2xs'
                          : 'bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E] hover:bg-[#F3EFE6]'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                  Đường dẫn tiếp thị rút gọn (Shortlink):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedShortlink}
                    className="flex-1 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3 py-2 text-xs font-mono text-[#1A1612] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 rounded-xl bg-[#EBD08C] hover:bg-[#DEC07A] text-white text-xs font-bold flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </button>
                </div>
              </div>

              {generatedQr && (
                <div className="flex items-center gap-4 p-3 bg-[#FAF8F5] rounded-2xl border border-[#EAE4D7]">
                  <img src={generatedQr} alt="QR Code" className="w-24 h-24 rounded-lg bg-white p-1 border border-[#EAE4D7]" />
                  <div className="flex-1 text-xs text-[#7D715E]">
                    <strong className="text-xs text-[#1A1612] block mb-1">Mã QR Livestream / Bìa Video</strong>
                    <span>Khách quét mã sẽ tự động mở trang thanh toán và ghi nhận hoa hồng cho tài khoản của bạn.</span>
                    <a
                      href={generatedQr}
                      download={`QR_${linkModalProduct.sku || 'scanms'}.png`}
                      className="inline-flex items-center gap-1 text-[#B88E4F] font-bold mt-2 hover:underline block"
                    >
                      <Download className="w-3 h-3" /> Tải ảnh QR HD (PNG)
                    </a>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-[#EAE4D7] flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => navigate('/collaborator/links')}
                  className="text-xs text-[#B88E4F] font-bold hover:underline"
                >
                  Xem Quản Lý Link Đã Tạo (Click &amp; CR%) →
                </button>
                <button
                  type="button"
                  onClick={() => setLinkModalProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7D715E] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: XIN HÀNG MẪU KÈM CAM KẾT NỘI DUNG */}
      {requestSampleModalProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-[#EAE4D7] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-left">
            <div className="p-5 border-b border-[#EAE4D7] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#B88E4F]" />
                <h3 className="text-sm font-extrabold text-[#1A1612] m-0">
                  Đăng Ký Nhận Hàng Mẫu &amp; Cam Kết Review
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRequestSampleModalProduct(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#7D715E] hover:bg-[#F3EFE6] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitSampleRequest} className="p-5 flex flex-col gap-3.5">
              <div className="p-3 bg-[#FBF5EB] border border-[#EAE4D7] rounded-2xl flex items-center gap-3">
                <img
                  src={requestSampleModalProduct.imageUrl}
                  alt={requestSampleModalProduct.title}
                  className="w-12 h-12 rounded-xl object-cover border border-[#EAE4D7] bg-white shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <strong className="text-xs font-bold text-[#1A1612] line-clamp-1 block">
                    {requestSampleModalProduct.title}
                  </strong>
                  <span className="text-[11px] text-[#B88E4F] font-semibold block mt-0.5">
                    Tài trợ 100% miễn phí • Giá trị gốc: {Number(requestSampleModalProduct.price).toLocaleString('vi-VN')} ₫
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1">
                    Kênh mạng xã hội đã liên kết *
                  </label>
                  <Select
                    value={sampleSocialChannelId}
                    onChange={(e) => setSampleSocialChannelId(e.target.value)}
                    className="w-full text-xs"
                    required
                  >
                    <option value="">Chọn kênh đăng video</option>
                    {socialChannels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.platformName} · {channel.channelName || channel.channelUrl} · {Number(channel.followerCount || 0).toLocaleString('vi-VN')} followers
                      </option>
                    ))}
                  </Select>
                </div>

                <p className="text-xs text-[#7D715E]">Hạn đăng video là 14 ngày kể từ thời điểm GHN xác nhận giao hàng thành công.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Định dạng nội dung cam kết *
                </label>
                <input
                  type="text"
                  value={sampleContentType}
                  onChange={(e) => setSampleContentType(e.target.value)}
                  placeholder="VD: Video Review 60s hướng dẫn quy trình dưỡng da..."
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs text-[#1A1612] outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1">Họ tên người nhận *</label>
                  <input
                    type="text"
                    maxLength={150}
                    required
                    value={sampleRecipientName}
                    onChange={(e) => setSampleRecipientName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full p-2.5 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs text-[#1A1612] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    maxLength={20}
                    required
                    value={sampleRecipientPhone}
                    onChange={(e) => { setSampleRecipientPhone(e.target.value); setSampleRecipientPhoneConfirmed(false); }}
                    placeholder="09xx xxx xxx"
                    className="w-full p-2.5 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs text-[#1A1612] outline-none"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 text-xs text-[#7D715E]"><input type="checkbox" checked={sampleRecipientPhoneConfirmed} onChange={(e) => setSampleRecipientPhoneConfirmed(e.target.checked)} className="mt-0.5 accent-[#C59B58]" required /><span>Tôi xác nhận đây là số điện thoại của người nhận thực tế và GHN có thể gọi để giao hàng mẫu.</span></label>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">Địa chỉ nhận hàng mẫu chuẩn GHN *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                  <select required value={sampleProvinceId} onChange={(e) => {
                    setSampleProvinceId(e.target.value); setSampleDistrictId(''); setSampleWardCode('');
                  }} className="w-full p-2.5 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs text-[#1A1612]">
                    <option value="">Tỉnh / Thành phố</option>
                    {sampleProvinces.map((item) => <option key={item.ProvinceID} value={item.ProvinceID}>{item.ProvinceName}</option>)}
                  </select>
                  <select required value={sampleDistrictId} disabled={!sampleProvinceId} onChange={(e) => {
                    setSampleDistrictId(e.target.value); setSampleWardCode('');
                  }} className="w-full p-2.5 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs text-[#1A1612]">
                    <option value="">Quận / Huyện</option>
                    {sampleDistricts.map((item) => <option key={item.DistrictID} value={item.DistrictID}>{item.DistrictName}</option>)}
                  </select>
                  <select required value={sampleWardCode} disabled={!sampleDistrictId} onChange={(e) => setSampleWardCode(e.target.value)} className="w-full p-2.5 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs text-[#1A1612]">
                    <option value="">Phường / Xã</option>
                    {sampleWards.map((item) => <option key={item.WardCode} value={item.WardCode}>{item.WardName}</option>)}
                  </select>
                </div>
                <input type="text" required minLength={5} value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Số nhà, tên đường, tòa nhà..."
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs text-[#1A1612] outline-none" />
                {sampleAddressError && <p className="text-xs text-[#DC2626] mt-1" role="alert">{sampleAddressError}</p>}
              </div>

              <label className="p-2.5 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-[11px] text-[#7D715E] leading-relaxed flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sampleTermsAccepted}
                  onChange={(e) => setSampleTermsAccepted(e.target.checked)}
                  className="mt-0.5 accent-[#C59B58]"
                  required
                />
                <span>⚖️ <strong>Cam kết trách nhiệm:</strong> Từ lúc GHN xác nhận giao hàng mẫu, bạn có tối đa <strong>14 ngày</strong> để nộp link video đăng trên kênh đã chọn. Khi quá hạn, hệ thống ghi nhận và cảnh báo; Shop có thể báo cáo để Admin xét duyệt khóa quyền nhận mẫu mới. Chỉ Admin được mở khóa.</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE4D7]">
                <button
                  type="button"
                  onClick={() => setRequestSampleModalProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7D715E] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#EBD08C] hover:bg-[#DEC07A] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {submittingSample && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Gửi Cam Kết &amp; Xin Mẫu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SUBMIT VIDEO REVIEW NGHIỆM THU */}
              {submitVideoSample && (
                <SubmitKolVideoModal
                  isOpen={!!submitVideoSample}
                  initialProductId={submitVideoSample.product?.id}
                  initialProductTitle={submitVideoSample.product?.title || 'Sản phẩm mẫu'}
                  sampleRequestId={submitVideoSample.id}
          onClose={() => setSubmitVideoSample(null)}
          onSuccess={() => {
            setSubmitVideoSample(null);
            loadStoreSamples(selectedStore.id);
          }}
        />
      )}

      {/* MODAL 4: KHÁM PHÁ GIAN HÀNG */}
      {showDiscoverModal && (
        <div
          className="kol-shop-directory-overlay fixed inset-0 flex items-center justify-center p-4 z-50"
          onClick={() => setShowDiscoverModal(false)}
        >
          <div
            className="kol-shop-directory bg-white w-full flex flex-col overflow-hidden text-left"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-directory-title"
            aria-describedby="shop-directory-description"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="kol-shop-directory-heading">
              <div className="flex items-center gap-3">
                <div className="kol-shop-directory-icon">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="shop-directory-title">
                    Shop đối tác SCANMS
                  </h3>
                  <p id="shop-directory-description">
                    Trao đổi hoa hồng riêng và xin mẫu thử từ Shop.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Đóng danh bạ Shop"
                onClick={() => setShowDiscoverModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#7D715E] hover:bg-[#F3EFE6] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="kol-shop-directory-search">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7D715E]" />
                <input
                  type="text"
                  aria-label="Tìm Shop theo tên hoặc ngành hàng"
                  autoFocus
                  placeholder="Tìm tên Shop, ngành hàng..."
                  value={discoverSearch}
                  onChange={(e) => setDiscoverSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl text-xs font-medium text-[#1A1612] outline-none focus:bg-white focus:border-[#C59B58] transition"
                />
              </div>
            </div>

            <div className="kol-shop-directory-list">
              {loadingMarketplace ? (
                <div className="py-16 text-center text-xs font-bold text-[#7D715E] flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-[#C59B58] border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải danh bạ gian hàng chính hãng...</span>
                </div>
              ) : discoveredStores.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#7D715E]">
                  Không tìm thấy gian hàng nào.
                </div>
              ) : (
                discoveredStores.map((ms) => {
                    const isAlreadyConnected = stores.some((st) => st.id === ms.id);
                    return (
                      <div
                        key={ms.id}
                        className="kol-shop-directory-row"
                      >
                        <div className="kol-shop-directory-identity">
                          <StoreAvatar
                            name={ms.name}
                            logoUrl={getShopLogoUrl(ms.logoUrl)}
                            className="kol-shop-directory-avatar"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 title={ms.name}>{ms.name}</h4>
                              <span className="kol-shop-directory-verified" title="Gian hàng chính hãng">
                                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                Chính hãng
                              </span>
                            </div>
                            <details className="kol-shop-directory-about">
                              <summary>Giới thiệu Shop <ChevronDown size={12} aria-hidden="true" /></summary>
                              <p>{ms.description || 'Gian hàng đối tác trên sàn SCANMS.'}</p>
                            </details>
                          </div>
                        </div>

                        <div className="kol-shop-directory-actions">
                          {isAlreadyConnected && <span className="kol-shop-directory-connected">Đã kết nối</span>}
                          {isAlreadyConnected ? (
                            <button
                              type="button"
                              onClick={() => {
                                setShowDiscoverModal(false);
                                setSelectedStoreId(ms.id);
                                setActiveTab('messages');
                                updateUrl(ms.id, 'messages');
                              }}
                              className="kol-shop-directory-chat"
                            >
                              <MessageSquare size={13} aria-hidden="true" /> Mở chat
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={connectingStoreId === ms.id}
                              onClick={() => handleConnectStore(ms)}
                              className="kol-shop-directory-connect"
                            >
                              {connectingStoreId === ms.id ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                              <span>{connectingStoreId === ms.id ? 'Đang kết nối' : 'Kết nối'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
            <div className="kol-shop-directory-footer" aria-live="polite">
              {loadingMarketplace ? 'Đang tải danh bạ…' : `${discoveredStores.length} gian hàng`}
              <span>Mở giới thiệu để xem chi tiết.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
