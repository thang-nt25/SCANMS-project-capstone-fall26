import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import api from '../../services/api';
import {
  Link2,
  Plus,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  PauseCircle,
  PlayCircle,
  Trash2,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  MousePointerClick,
  ShoppingBag,
  Layers,
  Sparkles,
  X,
  Loader2,
  Store,
  Download,
  ShieldAlert,
  ChevronDown,
  Clock,
  Flame,
  RotateCcw,
  PackageSearch,
  Lightbulb,
  Globe,
  Share2,
  Target,
  Tag,
  FileText,
  SlidersHorizontal,
  HelpCircle,
} from 'lucide-react';
import { referralLinksService } from '../../services/referralLinksService';
import type {
  ReferralLinkItem,
  EligibleProduct,
} from '../../services/referralLinksService';

type BrowserQrCode = {
  addData: (value: string) => void;
  make: () => void;
  createDataURL: (cellSize?: number, margin?: number) => string;
};

declare global {
  interface Window {
    qrcode?: (typeNumber: number, errorCorrectionLevel: string) => BrowserQrCode;
  }
}

let qrLibraryPromise: Promise<void> | null = null;

function loadQrLibrary(): Promise<void> {
  if (window.qrcode) return Promise.resolve();
  if (qrLibraryPromise) return qrLibraryPromise;

  qrLibraryPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-scanms-qrcode]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Không tải được thư viện QR')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = '/reference/vendor/qrcode.js';
    script.async = true;
    script.dataset.scanmsQrcode = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Không tải được thư viện QR'));
    document.head.appendChild(script);
  });

  return qrLibraryPromise;
}

function useQrDataUrl(value?: string | null) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    let active = true;
    setDataUrl('');
    if (!value) return () => { active = false; };

    loadQrLibrary()
      .then(() => {
        if (!active || !window.qrcode) return;
        const qr = window.qrcode(0, 'M');
        qr.addData(value);
        qr.make();
        setDataUrl(qr.createDataURL(8, 4));
      })
      .catch(() => {
        if (active) setDataUrl('');
      });

    return () => { active = false; };
  }, [value]);

  return dataUrl;
}

export default function ReferralLinksPage() {
  const [links, setLinks] = useState<ReferralLinkItem[]>([]);
  const [totalLinks, setTotalLinks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Bộ lọc và tìm kiếm
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLinkForQr, setSelectedLinkForQr] = useState<ReferralLinkItem | null>(null);
  const [selectedLinkForDelete, setSelectedLinkForDelete] = useState<ReferralLinkItem | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // State tạo link mới
  const [eligibleProducts, setEligibleProducts] = useState<EligibleProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadProductsError, setLoadProductsError] = useState<string | null>(null);
  const [availableCampaigns, setAvailableCampaigns] = useState<any[]>([]);
  const [modalProductSearch, setModalProductSearch] = useState('');
  const [modalShopFilter, setModalShopFilter] = useState('ALL');
  const [modalCategoryFilter, setModalCategoryFilter] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState<EligibleProduct | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [customExpiresAt, setCustomExpiresAt] = useState<string>('');
  const [formChannel, setFormChannel] = useState<string>('TIKTOK');
  const [formLabel, setFormLabel] = useState('');
  const [formCoupon, setFormCoupon] = useState('');
  const [formTouched, setFormTouched] = useState<{ product?: boolean; label?: boolean; coupon?: boolean }>({});
  const [showAdvancedUtm, setShowAdvancedUtm] = useState(false);
  const [showUtmGuide, setShowUtmGuide] = useState(false);
  const [isChangingProduct, setIsChangingProduct] = useState(false);
  const [utmSource, setUtmSource] = useState('tiktok');
  const [utmMedium, setUtmMedium] = useState('creator');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmContent, setUtmContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSuccessLink, setCreatedSuccessLink] = useState<ReferralLinkItem | null>(null);
  const createdQrDataUrl = useQrDataUrl(createdSuccessLink?.shortUrl);
  const selectedQrDataUrl = useQrDataUrl(selectedLinkForQr?.shortUrl);
  // Chỉ mở toàn màn hình (ẩn shell) cho Modal Tạo Link và Modal QR lớn; Modal Xác Nhận Xóa giữ nguyên màn hình
  const hasOpenModal = isCreateModalOpen || isQrModalOpen;

  // Danh sách các Cửa hàng khả dụng từ danh mục sản phẩm
  const availableShops = useMemo(() => {
    const shopMap = new Map<string, { id: string; name: string }>();
    eligibleProducts.forEach((p) => {
      if (p.store?.id) {
        shopMap.set(p.store.id, { id: p.store.id, name: p.store.name });
      }
    });
    return Array.from(shopMap.values());
  }, [eligibleProducts]);

  // Danh sách các Ngành hàng khả dụng
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    eligibleProducts.forEach((p) => {
      if (p.categoryName && p.categoryName.trim()) {
        cats.add(p.categoryName.trim());
      }
    });
    return Array.from(cats);
  }, [eligibleProducts]);

  // Danh sách sản phẩm sau lọc và tìm kiếm real-time
  const filteredEligibleProducts = useMemo(() => {
    return eligibleProducts.filter((p) => {
      if (modalShopFilter !== 'ALL' && p.store?.id !== modalShopFilter) {
        return false;
      }
      if (modalCategoryFilter !== 'ALL' && p.categoryName !== modalCategoryFilter) {
        return false;
      }
      if (modalProductSearch.trim()) {
        const q = modalProductSearch.trim().toLowerCase();
        const matchTitle = p.title?.toLowerCase().includes(q);
        const matchSku = p.sku?.toLowerCase().includes(q);
        const matchCat = p.categoryName?.toLowerCase().includes(q);
        const matchStore = p.store?.name?.toLowerCase().includes(q);
        if (!matchTitle && !matchSku && !matchCat && !matchStore) {
          return false;
        }
      }
      return true;
    });
  }, [eligibleProducts, modalShopFilter, modalCategoryFilter, modalProductSearch]);

  // Đếm số link KOL đã tạo cho sản phẩm này (tối đa 20 link/sản phẩm theo backend)
  const productLinksCount = useMemo(() => {
    if (!selectedProduct) return 0;
    return links.filter(
      (l) => l.productId === selectedProduct.id && l.status !== 'BLOCKED'
    ).length;
  }, [selectedProduct, links]);

  // Hạn mức còn lại
  const productRemainingQuota = Math.max(0, 20 - productLinksCount);

  // Danh sách chiến dịch hợp lệ của Shop cho sản phẩm đang chọn
  const eligibleCampaignsForProduct = useMemo(() => {
    if (!selectedProduct) return [];
    return availableCampaigns.filter((item: any) => {
      const camp = item.campaign;
      if (!camp || !camp.isActive) return false;
      if (item.status !== 'ACCEPTED') return false;
      const isMatchingStore =
        camp.storeId === selectedProduct.store?.id ||
        camp.store?.id === selectedProduct.store?.id;
      return isMatchingStore;
    });
  }, [selectedProduct, availableCampaigns]);

  // Chiến dịch hiện đang được chọn
  const activeSelectedCampaign = useMemo(() => {
    if (!selectedCampaignId) return null;
    const found = eligibleCampaignsForProduct.find(
      (item: any) => item.campaign?.id === selectedCampaignId
    );
    return found?.campaign || null;
  }, [selectedCampaignId, eligibleCampaignsForProduct]);

  // Lỗi validation theo thời gian thực
  const formValidationErrors = useMemo(() => {
    const errors: { product?: string; label?: string; coupon?: string } = {};
    if (formTouched.product && !selectedProduct) {
      errors.product = 'Vui lòng chọn một sản phẩm tiếp thị.';
    }
    if (formTouched.label) {
      if (!formLabel.trim()) {
        errors.label = 'Nhãn gợi nhớ là bắt buộc (từ 2 đến 150 ký tự).';
      } else if (formLabel.trim().length < 2) {
        errors.label = 'Nhãn gợi nhớ quá ngắn (tối thiểu 2 ký tự).';
      } else if (formLabel.trim().length > 150) {
        errors.label = 'Nhãn gợi nhớ tối đa 150 ký tự.';
      }
    }
    if (formTouched.coupon && formCoupon.trim()) {
      if (!/^[a-zA-Z0-9_-]{3,50}$/.test(formCoupon.trim())) {
        errors.coupon = 'Mã coupon chỉ gồm chữ cái, số (từ 3 đến 50 ký tự).';
      }
    }
    return errors;
  }, [formTouched, selectedProduct, formLabel, formCoupon]);

  // Cấu trúc URL xem trước của UTM tham số
  const livePreviewUrl = useMemo(() => {
    const base = 'https://scanms.vn/r/ABC12345';
    const params = new URLSearchParams();
    if (utmSource.trim()) params.append('utm_source', utmSource.trim());
    if (utmMedium.trim()) params.append('utm_medium', utmMedium.trim());
    if (utmCampaign.trim()) params.append('utm_campaign', utmCampaign.trim());
    if (utmContent.trim()) params.append('utm_content', utmContent.trim());
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  }, [utmSource, utmMedium, utmCampaign, utmContent]);

  // Kiểm tra xem người dùng có tùy biến UTM ngoài mặc định không
  const hasCustomUtm = useMemo(() => {
    const isDefaultSource = utmSource.trim().toLowerCase() === formChannel.toLowerCase();
    const isDefaultMedium = utmMedium.trim().toLowerCase() === 'creator';
    return !isDefaultSource || !isDefaultMedium || !!utmCampaign.trim() || !!utmContent.trim();
  }, [utmSource, utmMedium, utmCampaign, utmContent, formChannel]);

  // Kiểm tra điều kiện vô hiệu hóa nút submit
  const isSubmitDisabled = useMemo(() => {
    if (!selectedProduct) return true;
    if (!formLabel.trim()) return true;
    if (productRemainingQuota <= 0) return true;
    if (isSubmitting) return true;
    if (formCoupon.trim() && !/^[a-zA-Z0-9_-]{3,50}$/.test(formCoupon.trim())) return true;
    return false;
  }, [selectedProduct, formLabel, productRemainingQuota, isSubmitting, formCoupon]);

  useEffect(() => {
    if (window.self === window.top) return;

    window.parent.postMessage(
      { type: 'SCANMS_REFERRAL_MODAL_STATE', open: hasOpenModal },
      window.location.origin,
    );

    return () => {
      if (hasOpenModal) {
        window.parent.postMessage(
          { type: 'SCANMS_REFERRAL_MODAL_STATE', open: false },
          window.location.origin,
        );
      }
    };
  }, [hasOpenModal]);

  // Tải danh sách link của KOL
  const fetchLinks = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await referralLinksService.getMyLinks({
        page,
        limit,
        status: selectedStatus || undefined,
        channel: selectedChannel || undefined,
        search: searchQuery.trim() || undefined,
      });
      setLinks(res.data);
      setTotalLinks(res.meta.total);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tải danh sách liên kết tiếp thị');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [page, selectedStatus, selectedChannel]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLinks();
  };

  // Tải danh sách sản phẩm hợp lệ & chiến dịch
  const loadEligibleProductsAndCampaigns = async () => {
    setLoadingProducts(true);
    setLoadProductsError(null);
    try {
      const [prodsRes, campaignsRes] = await Promise.allSettled([
        referralLinksService.getEligibleProducts(),
        api.get('/campaigns/my-invitations'),
      ]);

      if (prodsRes.status === 'fulfilled') {
        setEligibleProducts(prodsRes.value || []);
      } else {
        const err = prodsRes.reason;
        setLoadProductsError(
          err?.response?.data?.message || err?.message || 'Không thể tải danh mục sản phẩm từ Cửa hàng'
        );
      }

      if (campaignsRes.status === 'fulfilled') {
        const list = campaignsRes.value?.data || [];
        setAvailableCampaigns(Array.isArray(list) ? list : []);
      }
    } catch (err: any) {
      setLoadProductsError(err?.message || 'Lỗi không xác định khi tải dữ liệu tiếp thị');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Mở modal tạo link & nạp dữ liệu
  const handleOpenCreateModal = async () => {
    setIsCreateModalOpen(true);
    setCreatedSuccessLink(null);
    setSelectedProduct(null);
    setIsChangingProduct(false);
    setSelectedCampaignId('');
    setCustomExpiresAt('');
    setModalProductSearch('');
    setModalShopFilter('ALL');
    setModalCategoryFilter('ALL');
    setFormLabel('');
    setFormCoupon('');
    setUtmCampaign('');
    setUtmContent('');
    setFormTouched({});
    await loadEligibleProductsAndCampaigns();
  };

  // Chọn sản phẩm tiếp thị
  const handleSelectProduct = (prod: EligibleProduct) => {
    setSelectedProduct(prod);
    setIsChangingProduct(false);
    setSelectedCampaignId('');
    setCustomExpiresAt('');
    setUtmCampaign('');
    setFormTouched((prev) => ({ ...prev, product: true }));
    if (!formLabel.trim()) {
      setFormLabel(`Chia sẻ: ${prod.title.slice(0, 45)}`);
    }
  };

  // Chọn chiến dịch áp dụng
  const handleSelectCampaign = (campId: string) => {
    setSelectedCampaignId(campId);
    if (!campId) {
      setCustomExpiresAt('');
      setUtmCampaign('');
    } else {
      const camp = eligibleCampaignsForProduct.find((item: any) => item.campaign?.id === campId)?.campaign;
      if (camp) {
        setCustomExpiresAt(camp.endDate ? format(new Date(camp.endDate), 'yyyy-MM-dd') : '');
        setUtmCampaign(camp.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 50));
      }
    }
  };

  // Submit tạo link mới có bảo vệ chống submit nhiều lần
  const handleCreateSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    console.log('[ReferralLinksPage] handleCreateSubmit called. selectedProduct:', selectedProduct?.id, 'label:', formLabel, 'isSubmitting:', isSubmitting);
    if (isSubmitting) return;

    setFormTouched({ product: true, label: true, coupon: true });

    if (!selectedProduct) {
      console.log('[ReferralLinksPage] Rejected: No selectedProduct');
      return;
    }
    if (!formLabel.trim()) {
      console.log('[ReferralLinksPage] Rejected: No formLabel');
      return;
    }
    if (formCoupon.trim() && !/^[a-zA-Z0-9_-]{3,50}$/.test(formCoupon.trim())) {
      console.log('[ReferralLinksPage] Rejected: Invalid coupon');
      return;
    }
    if (productRemainingQuota <= 0) {
      alert('Bạn đã đạt giới hạn tối đa 20 liên kết cho sản phẩm này.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      console.log('[ReferralLinksPage] Calling referralLinksService.createLink...');
      const newLink = await referralLinksService.createLink({
        productId: selectedProduct.id,
        campaignId: selectedCampaignId || undefined,
        channel: formChannel,
        label: formLabel.trim(),
        customCouponCode: formCoupon.trim() || undefined,
        expiresAt: selectedCampaignId ? undefined : (customExpiresAt ? new Date(customExpiresAt).toISOString() : undefined),
        utmSource: utmSource.trim() || undefined,
        utmMedium: utmMedium.trim() || undefined,
        utmCampaign: utmCampaign.trim() || undefined,
        utmContent: utmContent.trim() || undefined,
      });

      console.log('[ReferralLinksPage] createLink success! newLink:', newLink);
      setCreatedSuccessLink(newLink);
      fetchLinks();
    } catch (err: any) {
      console.error('[ReferralLinksPage] createLink failed:', err);
      alert(err.response?.data?.message || err.message || 'Lỗi khi tạo liên kết tiếp thị');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý sao chép link
  const handleCopyLink = (url: string, code: string) => {
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  // Chuyển đổi trạng thái Bật / Tạm ngừng
  const handleToggleStatus = async (link: ReferralLinkItem) => {
    if (link.status === 'BLOCKED') {
      alert(`Liên kết này đã bị Cửa hàng khóa với lý do: "${link.disabledReason || 'Vi phạm chính sách'}". Bạn không thể tự mở lại.`);
      return;
    }
    try {
      await referralLinksService.toggleStatus(link.id);
      fetchLinks();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi thay đổi trạng thái');
    }
  };

  // Xác nhận xóa mềm link
  const handleConfirmDelete = async () => {
    if (!selectedLinkForDelete) return;
    try {
      await referralLinksService.deleteLink(selectedLinkForDelete.id);
      setIsDeleteModalOpen(false);
      setSelectedLinkForDelete(null);
      fetchLinks();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa liên kết');
    }
  };

  // Tính toán số liệu thống kê tổng hợp
  const totalClicks = links.reduce((sum, l) => sum + (l.totalClicks || 0), 0);
  const totalUniqueClicks = links.reduce((sum, l) => sum + (l.uniqueClicks || 0), 0);
  const totalOrders = links.reduce((sum, l) => sum + (l.totalOrders || 0), 0);

  // Helper hiển thị tên trạng thái tiếng Việt chuẩn
  const renderStatusBadge = (link: ReferralLinkItem) => {
    switch (link.status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Đang hoạt động
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            <PauseCircle className="w-4 h-4" />
            Tạm ngừng
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 shadow-2xs">
            Đã hết hạn
          </span>
        );
      case 'BLOCKED':
        return (
          <div className="relative group inline-block">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 cursor-help shadow-2xs">
              <ShieldAlert className="w-4 h-4" />
              Đã bị khóa
            </span>
            {link.disabledReason && (
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-20 w-64 p-2.5 bg-gray-900 text-white text-xs rounded-xl shadow-xl">
                <div className="font-semibold text-rose-300 mb-0.5">Lý do khóa:</div>
                <div className="text-gray-200">{link.disabledReason}</div>
                {link.disabledBy && (
                  <div className="text-[10px] text-gray-400 mt-1">
                    Người thực hiện khóa: {link.disabledBy}
                  </div>
                )}
                {link.disabledAt && (
                  <div className="text-[10px] text-gray-400">
                    Thời điểm khóa: {new Date(link.disabledAt).toLocaleDateString('vi-VN')}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      default:
        return (
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 shadow-2xs">
            {link.status}
          </span>
        );
    }
  };

  // Helper hiển thị tên kênh tiếng Việt
  const getChannelLabel = (channel: string | null) => {
    switch (channel) {
      case 'TIKTOK':
        return 'TikTok';
      case 'YOUTUBE':
        return 'YouTube';
      case 'FACEBOOK':
        return 'Facebook';
      case 'INSTAGRAM':
        return 'Instagram';
      case 'THREADS':
        return 'Threads';
      case 'ZALO':
        return 'Zalo';
      case 'SHOPEE_VIDEO':
        return 'Shopee Video';
      default:
        return 'Đa kênh / Khác';
    }
  };

  return (
    <div className="space-y-6 text-[#1A1612] font-sans pb-12">
      {/* 1. Header Card - Chuẩn tone màu SCANMS Luxury Gold & Sand */}
      <div className="bg-white rounded-2xl border border-[#E8DAC4] p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {/* Glow hạt sáng nhẹ góc */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#C59B58]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F5E7CC] text-[#9E7933] border border-[#DEBE85]">
                <Sparkles className="w-3.5 h-3.5 text-[#C59B58]" />
                DÀNH CHO KOL / CTV (FR-10)
              </span>
              <span className="text-xs bg-[#FAF6F0] text-[#7D6D55] border border-[#E8DAC4] px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#B88E4F]" />
                Chính sách Last Click 30 ngày
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1A1612] flex items-center gap-3">
              Liên Kết Tiếp Thị Của Bạn
            </h1>
            <p className="mt-1.5 text-sm text-[#7D6D55] max-w-2xl leading-relaxed">
              Tạo mã rút gọn độc quyền, gắn nhãn kênh (TikTok, YouTube, Facebook...) để đo lường chính xác hiệu quả từng chiến dịch và tối ưu doanh số.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#C59B58] via-[#B88E4F] to-[#9E7933] hover:from-[#B88E4F] hover:to-[#8C682A] text-white font-bold shadow-md shadow-[#9E7933]/20 border border-[#DEBE85] active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" />
              Tạo link tiếp thị mới
            </button>
          </div>
        </div>

        {/* 2. Thống kê tổng hợp 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#E8DAC4]/60">
          <div className="bg-[#FAF8F5] border border-[#E8DAC4] hover:border-[#DEBE85] rounded-xl p-4 transition-all hover:shadow-sm">
            <div className="flex items-center justify-between text-[#7D6D55] text-xs font-semibold mb-1">
              <span>Tổng link đang dùng</span>
              <div className="w-7 h-7 rounded-lg bg-[#F5E7CC] flex items-center justify-center">
                <Layers className="w-4 h-4 text-[#9E7933]" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#1A1612]">
              {totalLinks} <span className="text-xs font-normal text-[#A49B8B]">/ 500 tối đa</span>
            </div>
            <div className="text-[11px] text-[#7D6D55] mt-1">Đảm bảo quota không vượt hạn mức</div>
          </div>

          <div className="bg-[#FAF8F5] border border-[#E8DAC4] hover:border-[#DEBE85] rounded-xl p-4 transition-all hover:shadow-sm">
            <div className="flex items-center justify-between text-[#7D6D55] text-xs font-semibold mb-1">
              <span>Tổng lượt nhấp (Clicks)</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <MousePointerClick className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#1A1612]">{totalClicks.toLocaleString('vi-VN')}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">Bao gồm tất cả các nguồn truy cập</div>
          </div>

          <div className="bg-[#FAF8F5] border border-[#E8DAC4] hover:border-[#DEBE85] rounded-xl p-4 transition-all hover:shadow-sm">
            <div className="flex items-center justify-between text-[#7D6D55] text-xs font-semibold mb-1">
              <span>Lượt nhấp duy nhất (Unique)</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#1A1612]">{totalUniqueClicks.toLocaleString('vi-VN')}</div>
            <div className="text-[11px] text-amber-600 font-medium mt-1">Chống click ảo trong 30 giây</div>
          </div>

          <div className="bg-[#FAF8F5] border border-[#E8DAC4] hover:border-[#DEBE85] rounded-xl p-4 transition-all hover:shadow-sm">
            <div className="flex items-center justify-between text-[#7D6D55] text-xs font-semibold mb-1">
              <span>Đơn hàng chuyển đổi</span>
              <div className="w-7 h-7 rounded-lg bg-[#F5E7CC] flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-[#9E7933]" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#1A1612]">{totalOrders.toLocaleString('vi-VN')}</div>
            <div className="text-[11px] text-[#9E7933] font-medium mt-1">Ghi nhận hoa hồng theo Last Click</div>
          </div>
        </div>
      </div>

      {/* 3. Bộ lọc và Tìm kiếm */}
      <div className="bg-white rounded-2xl border border-[#E8DAC4] p-5 sm:p-6 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#A49B8B]" />
            <input
              type="text"
              placeholder="Tìm theo mã rút gọn, tên sản phẩm hoặc nhãn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-[#E8DAC4] bg-[#FAF8F5] focus:bg-white focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 text-sm sm:text-[15px] text-[#1A1612] outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4.5 h-4.5 text-[#A49B8B]" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-[#E8DAC4] bg-[#FAF8F5] text-sm sm:text-[15px] text-[#1A1612] focus:border-[#C59B58] focus:bg-white outline-none cursor-pointer transition-all"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="PAUSED">Tạm ngừng</option>
                <option value="EXPIRED">Đã hết hạn</option>
                <option value="BLOCKED">Đã bị khóa</option>
              </select>
            </div>

            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="px-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-[#E8DAC4] bg-[#FAF8F5] text-sm sm:text-[15px] text-[#1A1612] focus:border-[#C59B58] focus:bg-white outline-none cursor-pointer transition-all"
            >
              <option value="">Tất cả kênh</option>
              <option value="TIKTOK">TikTok</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="ZALO">Zalo</option>
              <option value="OTHER">Kênh khác</option>
            </select>

            <button
              type="submit"
              className="px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#C59B58] via-[#B88E4F] to-[#9E7933] hover:from-[#B88E4F] hover:to-[#8C682A] text-white font-bold text-sm sm:text-[15px] shadow-sm shadow-[#9E7933]/20 transition-all active:scale-95"
            >
              Áp dụng
            </button>
          </div>
        </form>
      </div>

      {/* 4. Danh sách Link Table */}
      <div className="bg-white rounded-2xl border border-[#E8DAC4] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-[#7D6D55]">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#C59B58]" />
            <p className="text-sm font-medium">Đang tải danh sách liên kết tiếp thị...</p>
          </div>
        ) : errorMsg ? (
          <div className="p-12 text-center text-rose-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p className="text-sm font-semibold">{errorMsg}</p>
            <button
              onClick={fetchLinks}
              className="mt-4 px-4 py-2 bg-[#FAF8F5] hover:bg-[#F5E7CC] text-[#7D6D55] text-xs font-semibold rounded-lg border border-[#E8DAC4]"
            >
              Thử lại
            </button>
          </div>
        ) : links.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-[#F5E7CC] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#9E7933]">
              <Link2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-[#1A1612] mb-1">Bạn chưa tạo liên kết tiếp thị nào</h3>
            <p className="text-sm text-[#7D6D55] max-w-md mx-auto mb-6">
              Hãy chọn sản phẩm từ các Cửa hàng uy tín trên sàn để bắt đầu tạo link rút gọn và chia sẻ tới người theo dõi của bạn.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B58] via-[#B88E4F] to-[#9E7933] hover:from-[#B88E4F] hover:to-[#8C682A] text-white font-bold text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tạo link đầu tiên ngay
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E8DAC4] text-xs font-bold text-[#7D6D55] uppercase tracking-wider">
                  <th className="py-4 px-5 sm:px-6">Sản phẩm &amp; Cửa hàng</th>
                  <th className="py-4 px-5">Mã rút gọn &amp; Kênh</th>
                  <th className="py-4 px-5">Trạng thái</th>
                  <th className="py-4 px-5 text-center">Lượt nhấp (Clicks)</th>
                  <th className="py-4 px-5 text-center">Đơn hàng</th>
                  <th className="py-4 px-5">Ngày tạo</th>
                  <th className="py-4 px-5 sm:px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DAC4]/60 text-sm">
                {links.map((link) => {
                  const isCopied = copiedCode === link.shortCode;
                  return (
                    <tr key={link.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                      {/* Cột 1: Sản phẩm & Shop */}
                      <td className="py-5 px-5 sm:px-6">
                        <div className="flex items-center gap-3.5 max-w-sm">
                          <img
                            src={
                              link.product?.imageUrl ||
                              'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100'
                            }
                            alt={link.product?.title}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover border border-[#E8DAC4] flex-shrink-0 bg-[#FAF8F5] shadow-xs"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-[#1A1612] text-sm sm:text-[15px] truncate" title={link.product?.title}>
                              {link.product?.title}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#7D6D55] mt-1">
                              <Store className="w-3.5 h-3.5 text-[#A49B8B]" />
                              <span className="truncate">{link.store?.name}</span>
                            </div>
                            <div className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-2">
                              <span>{Number(link.product?.price || 0).toLocaleString('vi-VN')} đ</span>
                              {link.commissionRate && (
                                <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-md font-bold">
                                  HH: {link.commissionRate}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Mã rút gọn & Kênh */}
                      <td className="py-5 px-5">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#9E7933] bg-[#FDF8EE] border border-[#DEBE85] px-3 py-1 rounded-xl text-xs sm:text-sm shadow-2xs">
                              {link.shortCode}
                            </span>
                            <button
                              onClick={() => handleCopyLink(link.shortUrl, link.shortCode)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                                isCopied
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-[#FAF8F5] hover:bg-[#F5E7CC] text-[#7D6D55] hover:text-[#9E7933] border border-[#E8DAC4]'
                              }`}
                              title="Sao chép link"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{isCopied ? 'Đã chép' : 'Sao chép'}</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#7D6D55]">
                            <span className="font-semibold text-[#1A1612]">{getChannelLabel(link.channel)}</span>
                            {link.label && (
                              <>
                                <span className="text-[#DEBE85]">•</span>
                                <span className="text-[#A49B8B] italic truncate max-w-[160px]" title={link.label}>
                                  "{link.label}"
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cột 3: Trạng thái */}
                      <td className="py-5 px-5">{renderStatusBadge(link)}</td>

                      {/* Cột 4: Clicks */}
                      <td className="py-5 px-5 text-center">
                        <div className="text-base sm:text-lg font-extrabold text-[#1A1612]">{link.totalClicks}</div>
                        <div className="text-xs text-[#A49B8B]">
                          {link.uniqueClicks} unique
                        </div>
                      </td>

                      {/* Cột 5: Đơn hàng */}
                      <td className="py-5 px-5 text-center">
                        <span className="font-bold text-[#9E7933] bg-[#FDF8EE] border border-[#DEBE85] px-3.5 py-1 rounded-full text-xs sm:text-sm shadow-2xs">
                          {link.totalOrders} đơn
                        </span>
                      </td>

                      {/* Cột 6: Ngày tạo */}
                      <td className="py-5 px-5 text-xs sm:text-sm text-[#7D6D55]">
                        {new Date(link.createdAt).toLocaleDateString('vi-VN')}
                      </td>

                      {/* Cột 7: Thao tác */}
                      <td className="py-5 px-5 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Mở link thử nghiệm */}
                          <a
                            href={link.shortUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-[#7D6D55] hover:text-[#C59B58] hover:bg-[#FAF8F5] rounded-xl transition-colors"
                            title="Mở thử link"
                          >
                            <ExternalLink className="w-4.5 h-4.5" />
                          </a>

                          {/* Xem QR Code */}
                          <button
                            onClick={() => {
                              setSelectedLinkForQr(link);
                              setIsQrModalOpen(true);
                            }}
                            className="p-2 text-[#7D6D55] hover:text-[#C59B58] hover:bg-[#FAF8F5] rounded-xl transition-colors"
                            title="Mã QR Code"
                          >
                            <QrCode className="w-4.5 h-4.5" />
                          </button>

                          {/* Tạm ngừng / Kích hoạt lại */}
                          <button
                            onClick={() => handleToggleStatus(link)}
                            disabled={link.status === 'BLOCKED'}
                            className={`p-2 rounded-xl transition-colors ${
                              link.status === 'ACTIVE'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            } ${link.status === 'BLOCKED' ? 'opacity-40 cursor-not-allowed' : ''}`}
                            title={link.status === 'ACTIVE' ? 'Tạm ngừng link' : 'Tiếp tục kích hoạt link'}
                          >
                            {link.status === 'ACTIVE' ? (
                              <PauseCircle className="w-4.5 h-4.5" />
                            ) : (
                              <PlayCircle className="w-4.5 h-4.5" />
                            )}
                          </button>

                          {/* Xóa mềm */}
                          <button
                            onClick={() => {
                              setSelectedLinkForDelete(link);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 text-[#A49B8B] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            title="Xóa mềm link"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* 5. MODAL TẠO LINK TIẾP THỊ MỚI (THIẾT KẾ THON GỌN & CÂN ĐỐI) */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E8DAC4] w-full max-w-[590px] max-h-[92vh] flex flex-col overflow-hidden">
            {/* 1. Header modal (Cố định, sang trọng, thanh mảnh) */}
            <div className="px-4 sm:px-5 py-2.5 border-b border-[#E8DAC4] flex items-center justify-between bg-gradient-to-r from-white via-[#FAF8F5]/80 to-white flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#FAF3E8] border border-[#DEBE85]/50 flex items-center justify-center text-[#9E7933] shadow-2xs flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-[#C59B58]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1A1612] leading-tight flex items-center gap-1.5">
                    Tạo Link Tiếp Thị Rút Gọn (FR-10)
                  </h3>
                  <p className="text-[11px] text-[#7D6D55] mt-0.5">
                    Chọn sản phẩm, kênh truyền thông và tùy chỉnh liên kết rút gọn.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-[#A49B8B] hover:text-[#1A1612] rounded-lg hover:bg-[#FAF8F5] transition-colors"
                title="Đóng modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nội dung form hoặc màn hình thành công */}
            {createdSuccessLink ? (
              <div className="p-5 sm:p-6 text-center overflow-y-auto custom-scrollbar flex-1">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2.5 shadow-sm">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-[#1A1612] mb-1">Tạo Link Tiếp Thị Thành Công!</h4>
                <p className="text-xs text-[#7D6D55] mb-4">
                  Đường dẫn rút gọn của bạn đã sẵn sàng hoạt động với thời hạn ghi nhận cookie 30 ngày (Last Click Attribution).
                </p>

                {/* Khung link rút gọn */}
                <div className="bg-[#FAF8F5] border border-[#E8DAC4] rounded-xl p-3 mb-4 text-left">
                  <div className="text-[10px] font-semibold text-[#7D6D55] uppercase tracking-wider mb-1">
                    Đường dẫn tiếp thị rút gọn:
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-[#9E7933] text-xs sm:text-sm break-all">
                      {createdSuccessLink.shortUrl}
                    </span>
                    <button
                      onClick={() => handleCopyLink(createdSuccessLink.shortUrl, createdSuccessLink.shortCode)}
                      className="px-2.5 py-1 bg-gradient-to-r from-[#C59B58] via-[#B88E4F] to-[#9E7933] hover:from-[#B88E4F] hover:to-[#8C682A] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 shadow-sm transition-all cursor-pointer"
                    >
                      {copiedCode === createdSuccessLink.shortCode ? (
                        <>
                          <Check className="w-3 h-3" /> Đã chép
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Sao chép
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Xem trước QR */}
                {(createdQrDataUrl || createdSuccessLink.qrCodeUrl) && (
                  <div className="flex flex-col items-center justify-center mb-4">
                    <img
                      src={createdQrDataUrl || createdSuccessLink.qrCodeUrl || ''}
                      alt="QR Code"
                      className="w-24 h-24 border border-[#E8DAC4] rounded-xl p-1 bg-white shadow-2xs"
                    />
                    <a
                      href={createdQrDataUrl || createdSuccessLink.qrCodeUrl || ''}
                      download={`QR-${createdSuccessLink.shortCode}.png`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 text-[11px] text-[#9E7933] hover:text-[#7D6D55] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Download className="w-3 h-3" />
                      Tải ảnh QR Code
                    </a>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2.5">
                  <button
                    onClick={() => {
                      setCreatedSuccessLink(null);
                      setSelectedProduct(null);
                      setSelectedCampaignId('');
                      setCustomExpiresAt('');
                      setFormLabel('');
                      setFormCoupon('');
                      setFormTouched({});
                    }}
                    className="px-3.5 py-1.5 border border-[#E8DAC4] hover:bg-[#FAF8F5] rounded-xl text-xs font-semibold text-[#7D6D55] transition-colors cursor-pointer"
                  >
                    Tạo thêm link khác
                  </button>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-1.5 bg-gradient-to-r from-[#C59B58] via-[#B88E4F] to-[#9E7933] hover:from-[#B88E4F] hover:to-[#8C682A] text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
                  >
                    Xem danh sách link
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleCreateSubmit}
                className={`flex flex-col flex-1 min-h-0 overflow-hidden ${isSubmitting ? 'pointer-events-none opacity-90' : ''}`}
              >
                {/* 2. Scrollable Form Body */}
                <div className="p-4 sm:p-5 overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 space-y-2.5">
                  {/* ======================================================== */}
                  {/* 1. CHỌN SẢN PHẨM TIẾP THỊ                                */}
                  {/* ======================================================== */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[#7D6D55] uppercase tracking-wider flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-[#C59B58]" />
                        <span>1. Sản phẩm tiếp thị *</span>
                      </label>
                      {selectedProduct && !isChangingProduct ? (
                        <button
                          type="button"
                          onClick={() => setIsChangingProduct(true)}
                          className="text-[11px] font-semibold text-[#9E7933] hover:text-[#7D6D55] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Đổi sản phẩm khác</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#A49B8B]">
                          Khả dụng: {filteredEligibleProducts.length}/{eligibleProducts.length} sản phẩm
                        </span>
                      )}
                    </div>

                    {selectedProduct && !isChangingProduct ? (
                      /* Card sản phẩm đã chọn siêu gọn gàng, cân đối */
                      <div className="p-2 bg-[#FDF8EE] border border-[#DEBE85] rounded-xl flex items-center justify-between gap-2.5 shadow-2xs animate-fadeIn">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={selectedProduct.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100'}
                            alt={selectedProduct.title}
                            className="w-9 h-9 rounded-lg object-cover border border-[#E8DAC4] flex-shrink-0 bg-white"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-[#1A1612] truncate" title={selectedProduct.title}>
                              {selectedProduct.title}
                            </div>
                            <div className="text-[11px] text-[#7D6D55] flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="font-medium text-[#1A1612]">{selectedProduct.store?.name}</span>
                              <span>•</span>
                              <span className="font-semibold text-emerald-600">
                                {Number(selectedProduct.price).toLocaleString('vi-VN')} đ
                              </span>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                                HH: {selectedProduct.estimatedCommissionRate}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              productRemainingQuota > 0
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            Còn {productRemainingQuota}/20 link
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Khi chưa chọn hoặc đang bấm Đổi sản phẩm: hiển thị tìm kiếm & danh sách gọn gàng */
                      <div className="space-y-1.5 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                          <div className="sm:col-span-6 relative">
                            <Search className="w-3.5 h-3.5 text-[#A49B8B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={modalProductSearch}
                              onChange={(e) => setModalProductSearch(e.target.value)}
                              placeholder="Tìm sản phẩm, SKU..."
                              className="w-full pl-7 pr-6 py-1.5 rounded-lg border border-[#E8DAC4] bg-[#FAF8F5] text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] outline-none transition-all"
                            />
                            {modalProductSearch && (
                              <button
                                type="button"
                                onClick={() => setModalProductSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A49B8B] hover:text-[#1A1612] p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="sm:col-span-3">
                            <select
                              value={modalShopFilter}
                              onChange={(e) => setModalShopFilter(e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg border border-[#E8DAC4] bg-[#FAF8F5] text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] outline-none truncate cursor-pointer"
                            >
                              <option value="ALL">Tất cả Shop ({availableShops.length})</option>
                              {availableShops.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-3">
                            <select
                              value={modalCategoryFilter}
                              onChange={(e) => setModalCategoryFilter(e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg border border-[#E8DAC4] bg-[#FAF8F5] text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] outline-none truncate cursor-pointer"
                            >
                              <option value="ALL">Ngành ({availableCategories.length})</option>
                              {availableCategories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Thông báo lỗi khi tải sản phẩm */}
                        {loadProductsError && (
                          <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between gap-2 text-xs text-rose-700 animate-fadeIn">
                            <div className="flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                              <span>{loadProductsError}</span>
                            </div>
                            <button
                              type="button"
                              onClick={loadEligibleProductsAndCampaigns}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold transition-colors flex-shrink-0"
                            >
                              Thử lại
                            </button>
                          </div>
                        )}

                        {/* Danh sách cuộn gọn gàng */}
                        {loadingProducts ? (
                          <div className="p-3 text-center text-[#7D6D55] bg-[#FAF8F5] rounded-lg border border-[#E8DAC4]">
                            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-[#C59B58]" />
                            <p className="text-xs">Đang tải danh mục sản phẩm...</p>
                          </div>
                        ) : filteredEligibleProducts.length === 0 ? (
                          <div className="p-3 text-center text-[#7D6D55] bg-[#FAF8F5] rounded-lg border border-dashed border-[#E8DAC4]">
                            <PackageSearch className="w-6 h-6 text-[#C59B58]/60 mx-auto mb-1" />
                            <p className="text-xs font-bold text-[#1A1612]">Không tìm thấy sản phẩm phù hợp</p>
                            <p className="text-[10px] text-[#A49B8B] mt-0.5">Hãy thử tìm từ khóa khác hoặc liên hệ Shop để được duyệt tiếp thị.</p>
                          </div>
                        ) : (
                          <div className="max-h-32 overflow-y-auto divide-y divide-[#E8DAC4]/60 border border-[#E8DAC4] rounded-lg bg-white custom-scrollbar">
                            {filteredEligibleProducts.map((p) => {
                              const isSelected = selectedProduct?.id === p.id;
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => handleSelectProduct(p)}
                                  className={`p-1.5 px-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                    isSelected ? 'bg-[#FDF8EE] border-l-4 border-[#C59B58]' : 'hover:bg-[#FAF8F5]'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={p.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100'}
                                      alt={p.title}
                                      className="w-7 h-7 rounded object-cover border border-[#E8DAC4] flex-shrink-0 bg-[#FAF8F5]"
                                    />
                                    <div className="min-w-0">
                                      <div className="font-semibold text-[#1A1612] text-xs truncate">{p.title}</div>
                                      <div className="text-[10px] text-[#7D6D55] flex items-center gap-1 mt-0.5">
                                        <span className="font-medium text-[#1A1612]">{p.store.name}</span>
                                        <span>•</span>
                                        <span className="font-semibold text-emerald-600">
                                          {Number(p.price).toLocaleString('vi-VN')} đ
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded flex-shrink-0">
                                    HH: {p.estimatedCommissionRate}%
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {formValidationErrors.product && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium animate-fadeIn">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {formValidationErrors.product}
                      </p>
                    )}
                  </div>

                  {/* ======================================================== */}
                  {/* 1.5. CHIẾN DỊCH THƯỞNG THÊM (NẾU CÓ - DẠNG CHỌN GỌN)    */}
                  {/* ======================================================== */}
                  {selectedProduct && eligibleCampaignsForProduct.length > 0 && (
                    <div className="p-2 bg-[#FAF8F5] rounded-xl border border-[#E8DAC4] space-y-1 animate-fadeIn">
                      <div className="flex items-center justify-between text-[11px]">
                        <label className="font-bold text-[#7D6D55] uppercase tracking-wider flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-[#C59B58]" />
                          <span>Chiến dịch thưởng thêm</span>
                        </label>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200">
                          {eligibleCampaignsForProduct.length} khả dụng
                        </span>
                      </div>
                      <select
                        value={selectedCampaignId}
                        onChange={(e) => handleSelectCampaign(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8DAC4] bg-white text-xs font-medium text-[#1A1612] focus:border-[#C59B58] outline-none transition-all cursor-pointer"
                      >
                        <option value="">
                          Không gắn chiến dịch (Hoa hồng Shop chuẩn {selectedProduct.estimatedCommissionRate}%)
                        </option>
                        {eligibleCampaignsForProduct.map((item: any) => {
                          const camp = item.campaign;
                          const totalRate =
                            Number(selectedProduct.estimatedCommissionRate) +
                            Number(camp.bonusCommissionRate || 0);
                          return (
                            <option key={camp.id} value={camp.id}>
                              🔥 {camp.name} — Tổng HH {totalRate.toFixed(1)}% (+{camp.bonusCommissionRate}%)
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* 2. KÊNH QUẢNG BÁ & MÃ COUPON (2 CỘT CÂN ĐỐI)              */}
                  {/* ======================================================== */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-[#7D6D55] uppercase tracking-wider mb-1">
                        2. Kênh quảng bá *
                      </label>
                      <select
                        value={formChannel}
                        onChange={(e) => {
                          setFormChannel(e.target.value);
                          setUtmSource(e.target.value.toLowerCase());
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#E8DAC4] bg-[#FAF8F5] text-xs font-medium text-[#1A1612] focus:bg-white focus:border-[#C59B58] outline-none transition-all cursor-pointer"
                      >
                        <option value="TIKTOK">TikTok (Bio / Video / Livestream)</option>
                        <option value="YOUTUBE">YouTube (Mô tả / Shorts)</option>
                        <option value="FACEBOOK">Facebook (Post / Story / Group)</option>
                        <option value="INSTAGRAM">Instagram (Story / Bio)</option>
                        <option value="THREADS">Threads</option>
                        <option value="ZALO">Zalo</option>
                        <option value="OTHER">Kênh khác / Livestream</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#7D6D55] uppercase tracking-wider mb-1">
                        Mã coupon riêng (Tùy chọn)
                      </label>
                      <div className="relative flex items-center group">
                        <Tag className="w-3.5 h-3.5 text-[#A49B8B] group-focus-within:text-[#9E7933] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
                        <input
                          type="text"
                          placeholder="VD: KOLTHANG10"
                          value={formCoupon}
                          onBlur={() => setFormTouched((prev) => ({ ...prev, coupon: true }))}
                          onChange={(e) => setFormCoupon(e.target.value.toUpperCase())}
                          maxLength={50}
                          className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs text-[#1A1612] outline-none uppercase font-mono transition-all ${
                            formValidationErrors.coupon
                              ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                              : 'border-[#E8DAC4] bg-[#FAF8F5] focus:bg-white focus:border-[#C59B58]'
                          }`}
                        />
                      </div>
                      {formValidationErrors.coupon && (
                        <p className="text-[10px] text-rose-600 mt-0.5 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          {formValidationErrors.coupon}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* 3. NHÃN GỢI NHỚ (LABEL)                                  */}
                  {/* ======================================================== */}
                  <div>
                    <label className="block text-xs font-bold text-[#7D6D55] uppercase tracking-wider mb-1">
                      3. Nhãn gợi nhớ (Label) *
                    </label>
                    <div className="relative flex items-center group">
                      <Sparkles className="w-3.5 h-3.5 text-[#A49B8B] group-focus-within:text-[#9E7933] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
                      <input
                        type="text"
                        placeholder="VD: Video review 9.9, Bio cá nhân, Livestream tối..."
                        value={formLabel}
                        onBlur={() => setFormTouched((prev) => ({ ...prev, label: true }))}
                        onChange={(e) => setFormLabel(e.target.value)}
                        maxLength={150}
                        className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs text-[#1A1612] outline-none transition-all ${
                          formValidationErrors.label
                            ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                            : 'border-[#E8DAC4] bg-[#FAF8F5] focus:bg-white focus:border-[#C59B58]'
                        }`}
                      />
                    </div>
                    {formValidationErrors.label && (
                      <p className="text-[10px] text-rose-600 mt-0.5 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        {formValidationErrors.label}
                      </p>
                    )}
                  </div>

                  {/* ======================================================== */}
                  {/* 4. TÙY CHỈNH THAM SỐ UTM NÂNG CAO (SIÊU THON GỌN & ICON) */}
                  {/* ======================================================== */}
                  <div className="pt-1.5 border-t border-[#E8DAC4]/60">
                    {/* Header Accordion Compact */}
                    <div className="flex items-center justify-between py-0.5">
                      <button
                        type="button"
                        onClick={() => setShowAdvancedUtm(!showAdvancedUtm)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7D6D55] hover:text-[#9E7933] transition-colors group select-none cursor-pointer"
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center transition-transform duration-200 ${
                            showAdvancedUtm
                              ? 'rotate-180 text-[#9E7933] bg-[#F5E7CC]'
                              : 'text-[#A49B8B] bg-[#FAF8F5]'
                          }`}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </div>
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#C59B58]" />
                        <span>Tham số UTM theo dõi nâng cao</span>
                        {hasCustomUtm ? (
                          <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Đang tùy chỉnh
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#A49B8B] font-normal">
                            (Tùy chọn)
                          </span>
                        )}
                      </button>

                      {showAdvancedUtm && (
                        <button
                          type="button"
                          onClick={() => setShowUtmGuide(!showUtmGuide)}
                          className="inline-flex items-center gap-1 text-[11px] text-[#9E7933] hover:text-[#7D6D55] font-medium transition-colors cursor-pointer"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-[#C59B58]" />
                          <span>{showUtmGuide ? 'Ẩn HD' : 'Hướng dẫn sử dụng'}</span>
                        </button>
                      )}
                    </div>

                    {/* Expanded Content */}
                    {showAdvancedUtm && (
                      <div className="mt-1 space-y-2 p-2.5 bg-gradient-to-b from-[#FAF8F5] to-white rounded-xl border border-[#E8DAC4] shadow-2xs animate-fadeIn text-xs">
                        {/* Hướng Dẫn Sử Dụng Gọn Gàng */}
                        {showUtmGuide && (
                          <div className="p-2.5 bg-white rounded-lg border border-[#DEBE85]/60 text-[10px] text-[#7D6D55] space-y-1 animate-fadeIn leading-relaxed shadow-2xs">
                            <p className="flex items-center gap-1 font-medium text-[#1A1612]">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                              <span>UTM là gì? Thẻ định danh gắn vào link giúp theo dõi nguồn đơn hàng chính xác.</span>
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1.5 border-t border-[#E8DAC4]/50 text-[9px]">
                              <div><strong className="text-[#1A1612]">🌐 source:</strong> Nền tảng (tiktok, fb...)</div>
                              <div><strong className="text-[#1A1612]">📡 medium:</strong> Định dạng (bio, video...)</div>
                              <div><strong className="text-[#1A1612]">🎯 campaign:</strong> Tên sự kiện/sale</div>
                              <div><strong className="text-[#1A1612]">📄 content:</strong> Vị trí bài đăng</div>
                            </div>
                          </div>
                        )}

                        {/* Grid 4 Ô Nhập Liệu Thon Gọn với INNER ICON */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* utm_source */}
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <label className="font-bold text-[#1A1612] text-[10px] flex items-center gap-1">
                                <Globe className="w-3 h-3 text-[#C59B58]" />
                                <span>Nguồn (source)</span>
                              </label>
                              <div className="flex items-center gap-1">
                                {[
                                  { label: 'tiktok', val: 'tiktok' },
                                  { label: 'youtube', val: 'youtube' },
                                  { label: 'fb', val: 'facebook' },
                                ].map((item) => (
                                  <button
                                    key={item.val}
                                    type="button"
                                    onClick={() => setUtmSource(item.val)}
                                    className={`text-[8px] px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                                      utmSource.toLowerCase() === item.val
                                        ? 'bg-[#9E7933] text-white font-bold shadow-2xs'
                                        : 'bg-white text-[#7D6D55] hover:bg-[#FAF3E8] hover:text-[#9E7933] border border-[#E8DAC4]'
                                    }`}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="relative flex items-center group">
                              <Globe className="w-3.5 h-3.5 text-[#A49B8B] group-focus-within:text-[#9E7933] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
                              <input
                                type="text"
                                value={utmSource}
                                onChange={(e) => setUtmSource(e.target.value)}
                                placeholder="tiktok, facebook, youtube..."
                                className="w-full pl-7.5 pr-6 py-1 rounded-md border border-[#E8DAC4] bg-white text-[#1A1612] text-xs focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58]/30 outline-none transition-all shadow-2xs"
                              />
                              {utmSource && (
                                <button
                                  type="button"
                                  onClick={() => setUtmSource('')}
                                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#A49B8B] hover:text-[#1A1612] p-0.5 cursor-pointer"
                                  title="Xóa"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* utm_medium */}
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <label className="font-bold text-[#1A1612] text-[10px] flex items-center gap-1">
                                <Share2 className="w-3 h-3 text-[#C59B58]" />
                                <span>Kênh (medium)</span>
                              </label>
                              <div className="flex items-center gap-1">
                                {[
                                  { label: 'creator', val: 'creator' },
                                  { label: 'bio', val: 'bio_link' },
                                  { label: 'video', val: 'video' },
                                ].map((item) => (
                                  <button
                                    key={item.val}
                                    type="button"
                                    onClick={() => setUtmMedium(item.val)}
                                    className={`text-[8px] px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                                      utmMedium.toLowerCase() === item.val
                                        ? 'bg-[#9E7933] text-white font-bold shadow-2xs'
                                        : 'bg-white text-[#7D6D55] hover:bg-[#FAF3E8] hover:text-[#9E7933] border border-[#E8DAC4]'
                                    }`}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="relative flex items-center group">
                              <Share2 className="w-3.5 h-3.5 text-[#A49B8B] group-focus-within:text-[#9E7933] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
                              <input
                                type="text"
                                value={utmMedium}
                                onChange={(e) => setUtmMedium(e.target.value)}
                                placeholder="creator, bio_link, video..."
                                className="w-full pl-7.5 pr-6 py-1 rounded-md border border-[#E8DAC4] bg-white text-[#1A1612] text-xs focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58]/30 outline-none transition-all shadow-2xs"
                              />
                              {utmMedium && (
                                <button
                                  type="button"
                                  onClick={() => setUtmMedium('')}
                                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#A49B8B] hover:text-[#1A1612] p-0.5 cursor-pointer"
                                  title="Xóa"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* utm_campaign */}
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <label className="font-bold text-[#1A1612] text-[10px] flex items-center gap-1">
                                <Target className="w-3 h-3 text-[#C59B58]" />
                                <span>Chiến dịch</span>
                              </label>
                              <div className="flex items-center gap-1">
                                {activeSelectedCampaign ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setUtmCampaign(
                                        activeSelectedCampaign.name
                                          .toLowerCase()
                                          .replace(/[^a-z0-9]+/g, '_')
                                          .slice(0, 50)
                                      )
                                    }
                                    className="text-[8px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold cursor-pointer"
                                    title="Lấy tên từ chiến dịch đang chọn"
                                  >
                                    ⚡ Theo CD
                                  </button>
                                ) : (
                                  ['sale_9_9', 'deal_hot'].map((cmp) => (
                                    <button
                                      key={cmp}
                                      type="button"
                                      onClick={() => setUtmCampaign(cmp)}
                                      className={`text-[8px] px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                                        utmCampaign.toLowerCase() === cmp
                                          ? 'bg-[#9E7933] text-white font-bold shadow-2xs'
                                          : 'bg-white text-[#7D6D55] hover:bg-[#FAF3E8] hover:text-[#9E7933] border border-[#E8DAC4]'
                                      }`}
                                    >
                                      {cmp}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                            <div className="relative flex items-center group">
                              <Target className="w-3.5 h-3.5 text-[#A49B8B] group-focus-within:text-[#9E7933] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
                              <input
                                type="text"
                                placeholder="VD: autumn_sale_2026"
                                value={utmCampaign}
                                onChange={(e) => setUtmCampaign(e.target.value)}
                                className="w-full pl-7.5 pr-6 py-1 rounded-md border border-[#E8DAC4] bg-white text-[#1A1612] text-xs focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58]/30 outline-none transition-all shadow-2xs"
                              />
                              {utmCampaign && (
                                <button
                                  type="button"
                                  onClick={() => setUtmCampaign('')}
                                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#A49B8B] hover:text-[#1A1612] p-0.5 cursor-pointer"
                                  title="Xóa"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* utm_content */}
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <label className="font-bold text-[#1A1612] text-[10px] flex items-center gap-1">
                                <FileText className="w-3 h-3 text-[#C59B58]" />
                                <span>Nội dung</span>
                              </label>
                              <div className="flex items-center gap-1">
                                {[
                                  { label: 'bio', val: 'bio_link' },
                                  { label: 'video', val: 'video_01' },
                                  { label: 'cmt', val: 'comment' },
                                ].map((item) => (
                                  <button
                                    key={item.val}
                                    type="button"
                                    onClick={() => setUtmContent(item.val)}
                                    className={`text-[8px] px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                                      utmContent.toLowerCase() === item.val
                                        ? 'bg-[#9E7933] text-white font-bold shadow-2xs'
                                        : 'bg-white text-[#7D6D55] hover:bg-[#FAF3E8] hover:text-[#9E7933] border border-[#E8DAC4]'
                                    }`}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="relative flex items-center group">
                              <FileText className="w-3.5 h-3.5 text-[#A49B8B] group-focus-within:text-[#9E7933] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
                              <input
                                type="text"
                                placeholder="VD: review_banner_01"
                                value={utmContent}
                                onChange={(e) => setUtmContent(e.target.value)}
                                className="w-full pl-7.5 pr-6 py-1 rounded-md border border-[#E8DAC4] bg-white text-[#1A1612] text-xs focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58]/30 outline-none transition-all shadow-2xs"
                              />
                              {utmContent && (
                                <button
                                  type="button"
                                  onClick={() => setUtmContent('')}
                                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#A49B8B] hover:text-[#1A1612] p-0.5 cursor-pointer"
                                  title="Xóa"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Link Preview Thon Gọn với Icon và Copy */}
                        <div className="pt-1.5 border-t border-[#E8DAC4]/60 flex items-center justify-between gap-2 text-[10px]">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-[#7D6D55] font-semibold flex items-center gap-1 flex-shrink-0">
                              <Link2 className="w-3 h-3 text-[#C59B58]" />
                              <span>Xem trước:</span>
                            </span>
                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-[#E8DAC4] min-w-0 flex-1 shadow-2xs">
                              <span className="font-mono text-[9px] text-[#9E7933] truncate flex-1 select-all font-medium">
                                {livePreviewUrl}
                              </span>
                            </div>
                          </div>
                          {hasCustomUtm && (
                            <button
                              type="button"
                              onClick={() => {
                                setUtmSource(formChannel.toLowerCase());
                                setUtmMedium('creator');
                                setUtmCampaign('');
                                setUtmContent('');
                              }}
                              className="text-[9px] font-semibold text-[#7D6D55] hover:text-[#9E7933] bg-white hover:bg-[#FAF8F5] px-2 py-1 rounded-lg border border-[#E8DAC4] flex items-center gap-1 flex-shrink-0 transition-colors shadow-2xs cursor-pointer"
                              title="Khôi phục UTM về mặc định"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Mặc định</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Sticky Footer Cố Định */}
                <div className="px-4 sm:px-5 py-2.5 border-t border-[#E8DAC4] bg-[#FAF8F5] flex items-center justify-between gap-3 flex-shrink-0">
                  <div className="text-xs text-[#7D6D55] truncate max-w-[180px] sm:max-w-xs">
                    {!selectedProduct ? (
                      <span className="text-[#A49B8B] italic">Chưa chọn sản phẩm</span>
                    ) : !formLabel.trim() ? (
                      <span className="text-amber-700 font-medium">Cần nhập nhãn gợi nhớ</span>
                    ) : productRemainingQuota <= 0 ? (
                      <span className="text-rose-600 font-medium">Hết hạn mức 20 link</span>
                    ) : (
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span className="truncate">Sẵn sàng tạo link</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-3 py-1.5 rounded-lg border border-[#E8DAC4] text-xs font-semibold text-[#7D6D55] hover:bg-white transition-colors cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitDisabled}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-all ${
                        isSubmitDisabled
                          ? 'bg-[#DEBE85] cursor-not-allowed opacity-60'
                          : 'bg-gradient-to-r from-[#C59B58] via-[#B88E4F] to-[#9E7933] hover:from-[#B88E4F] hover:to-[#8C682A] cursor-pointer active:scale-95'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang tạo...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Sinh Link Tiếp Thị Ngay</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL XEM MÃ QR                                       */}
      {/* ======================================================== */}
      {isQrModalOpen && selectedLinkForQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E8DAC4] w-full max-w-sm p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#1A1612] flex items-center gap-1.5">
                <QrCode className="w-5 h-5 text-[#C59B58]" />
                Mã QR Tiếp Thị (FR-11)
              </h3>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 text-[#A49B8B] hover:text-[#1A1612] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E8DAC4] inline-block mb-3">
              <img
                src={selectedQrDataUrl || selectedLinkForQr.qrCodeUrl || ''}
                alt="QR Code"
                className="w-48 h-48 rounded-xl object-contain bg-white"
              />
            </div>

            <div className="text-xs font-semibold text-[#1A1612] mb-1">
              {selectedLinkForQr.product?.title}
            </div>
            <div className="font-mono text-xs text-[#9E7933] font-bold mb-4">
              Mã: {selectedLinkForQr.shortCode}
            </div>

            <div className="flex items-center justify-center gap-2">
              <a
                href={selectedQrDataUrl || selectedLinkForQr.qrCodeUrl || ''}
                download={`QR-${selectedLinkForQr.shortCode}.png`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 bg-gradient-to-r from-[#C59B58] via-[#B88E4F] to-[#9E7933] hover:from-[#B88E4F] hover:to-[#8C682A] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <Download className="w-4 h-4" />
                Tải ảnh QR
              </a>
              <button
                onClick={() => handleCopyLink(selectedLinkForQr.shortUrl, selectedLinkForQr.shortCode)}
                className="py-2.5 px-3 bg-[#FAF8F5] hover:bg-[#F5E7CC] text-[#7D6D55] hover:text-[#9E7933] border border-[#E8DAC4] rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Sao chép link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. MODAL XÁC NHẬN XÓA MỀM LINK (Giữ nguyên màn hình phía sau) */}
      {/* ======================================================== */}
      {isDeleteModalOpen && selectedLinkForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-[1.5px] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E8DAC4] w-full max-w-sm p-5 sm:p-6 text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3.5">
              <div className="w-10 h-10 bg-rose-50 border border-rose-200/60 rounded-xl flex items-center justify-center flex-shrink-0 text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#1A1612] m-0">Xác nhận xóa liên kết</h3>
                <p className="text-[11px] text-[#7D715E] m-0 mt-0.5">Hành động này sẽ thực hiện Xóa mềm (Soft Delete)</p>
              </div>
            </div>

            <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E8DAC4] text-xs text-[#7D6D55] space-y-1.5 mb-5">
              <div className="truncate">• <strong>Sản phẩm:</strong> {selectedLinkForDelete.product?.title}</div>
              <div>• <strong>Mã link:</strong> <span className="font-mono font-bold text-[#B88E4F]">{selectedLinkForDelete.shortCode}</span></div>
              <div className="text-[11px] text-[#A49B8B] pt-1 border-t border-[#E8DAC4]/50 leading-relaxed">
                * Lưu ý: Lịch sử lượt click và các đơn hàng phát sinh trước đây vẫn được lưu trữ toàn vẹn để đối soát hoa hồng.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-[#7D715E] bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
