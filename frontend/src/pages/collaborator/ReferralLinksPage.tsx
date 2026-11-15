import { ExclusiveOfferModal } from '../../components/chat/ExclusiveOfferModal';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DealKpiProgress } from '@/components/affiliate/DealKpiProgress';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import {
  Link2,
  Plus,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  PauseCircle,
  Trash2,
  Search,
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
  ChevronRight,
  Clock,
  RotateCcw,
  PackageSearch,
  Music2,
  Video,
  Camera,
  Globe,
} from 'lucide-react';
import { referralLinksService } from '../../services/referral-links.service';
import type {
  ReferralLinkItem,
  EligibleProduct,
} from '../../services/referral-links.service';
import { SubmitKolVideoModal } from '../../components/media/SubmitKolVideoModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Select } from '../../components/ui/Select';
import { toast } from '../../utils/toast';
import { ReferralLinkActions } from './ReferralLinkActions';
import { Modal } from '../../components/ui/Modal';
import './kol-referral-links.css';
import { ReferralShareDialog } from './ReferralShareDialog';
import { ReferralAnalyticsDialog } from './ReferralAnalyticsDialog';
import { ReferralLinkSetup } from './ReferralLinkSetup';
import { getSafeProductImageUrl, handleProductImageError } from '@/utils/marketplace.utils';

import QRCode from 'qrcode';

function useQrDataUrl(value?: string | null) {
  const [dataUrl, setDataUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setDataUrl('');
    setQrError(false);

    if (!value) {
      setQrLoading(false);
      return () => {
        active = false;
      };
    }

    setQrLoading(true);
    QRCode.toDataURL(value, {
      margin: 4,
      width: 512,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1A1612',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) {
          setDataUrl(url);
          setQrLoading(false);
        }
      })
      .catch((err) => {
        console.error('Lỗi sinh ảnh QR nội bộ:', err);
        if (active) {
          setDataUrl('');
          setQrLoading(false);
          setQrError(true);
        }
      });

    return () => {
      active = false;
    };
  }, [value, retryCount]);

  return { dataUrl, qrLoading, qrError, retry };
}

export default function ReferralLinksPage({
  modalOnly = false,
  view = 'all',
  onCreateClose,
}: {
  modalOnly?: boolean;
  view?: 'all' | 'links' | 'deals';
  onCreateClose?: () => void;
} = {}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [links, setLinks] = useState<ReferralLinkItem[]>([]);
  const [totalLinks, setTotalLinks] = useState(0);
  const [linkSummary, setLinkSummary] = useState<{ totalClicks: number; uniqueClicks: number; totalOrders: number } | null>(null);
  const [linkDetails, setLinkDetails] = useState<ReferralLinkItem | null>(null);
  const requestVersion = useRef(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [selectedRemuneration, setSelectedRemuneration] = useState<string>('ALL');

  const displayLinks = links;
  const [page, setPage] = useState(1);
  const limit = 10;
  useEffect(() => {
    const timer = window.setTimeout(() => { setAppliedSearch(searchQuery.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);


  const [isCreateModalOpen, setIsCreateModalOpen] = useState(modalOnly);
  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    if (modalOnly) {
      onCreateClose?.();
    }
  };
  const [createLinkStep, setCreateLinkStep] = useState<1 | 2>(1);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [selectedLinkForAnalytics, setSelectedLinkForAnalytics] = useState<ReferralLinkItem | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [selectedLinkForQr, setSelectedLinkForQr] = useState<ReferralLinkItem | null>(null);
  const [selectedLinkForDelete, setSelectedLinkForDelete] = useState<ReferralLinkItem | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isSubmitVideoModalOpen, setIsSubmitVideoModalOpen] = useState(false);
  const [selectedProductForVideo, setSelectedProductForVideo] = useState<{ id: string; title: string } | null>(null);


  const [eligibleProducts, setEligibleProducts] = useState<EligibleProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [eligibleProductsPage, setEligibleProductsPage] = useState(1);
  const [hasMoreEligibleProducts, setHasMoreEligibleProducts] = useState(false);
  const [loadProductsError, setLoadProductsError] = useState<string | null>(null);
  const [modalProductSearch, setModalProductSearch] = useState('');
  const [modalShopFilter, setModalShopFilter] = useState('ALL');
  const [modalCategoryFilter, setModalCategoryFilter] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState<EligibleProduct | null>(null);
  const [createFromDealId, setCreateFromDealId] = useState<string | null>(null);
  const [dealProposals, setDealProposals] = useState<any[]>([]);
  const [dealFilter, setDealFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING'>('ALL');
  const [dealSearch, setDealSearch] = useState('');
  const [dealProposalProduct, setDealProposalProduct] = useState<EligibleProduct | null>(null);
  const [dealPickerOpen, setDealPickerOpen] = useState(false);
  const [dealProductSearch, setDealProductSearch] = useState('');
  const [loadingDealProposals, setLoadingDealProposals] = useState(false);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);
  const [dealToDelete, setDealToDelete] = useState<any | null>(null);

  const dealStats = useMemo(() => {
    const total = dealProposals.length;
    const approved = dealProposals.filter((d) => d.status === 'APPROVED' && d.isCurrentDeal && !d.closedAt).length;
    const pending = dealProposals.filter((d) => d.status === 'PENDING' || d.status === 'PENDING_ADMIN_APPROVAL').length;
    const rejected = dealProposals.filter((d) => d.status === 'REJECTED').length;
    return { total, approved, pending, rejected };
  }, [dealProposals]);
  const visibleDeals = useMemo(() => {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    const search = normalize(dealSearch.trim());
    return dealProposals.filter(deal => {
      const matchesGroup = dealFilter === 'ALL'
        || dealFilter === 'ACTIVE' && deal.status === 'APPROVED' && deal.isCurrentDeal && !deal.closedAt
        || dealFilter === 'PENDING' && (deal.status === 'PENDING' || deal.status === 'PENDING_ADMIN_APPROVAL');
      return matchesGroup && normalize(`${deal.product?.title ?? ''} ${deal.store?.name ?? ''}`).includes(search);
    });
  }, [dealProposals, dealFilter, dealSearch]);
  const [customExpiresAt, setCustomExpiresAt] = useState<string>('');
  const [formChannel, setFormChannel] = useState<string>('TIKTOK');
  const [formLabel, setFormLabel] = useState('');
  const [formTouched, setFormTouched] = useState<{ product?: boolean; label?: boolean }>({});
  const [isChangingProduct, setIsChangingProduct] = useState(false);
  const [utmSource, setUtmSource] = useState('tiktok');
  const [utmMedium, setUtmMedium] = useState('creator');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmContent, setUtmContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSuccessLink, setCreatedSuccessLink] = useState<ReferralLinkItem | null>(null);
  const createdQrTargetUrl = useMemo(() => {
    if (!createdSuccessLink?.shortUrl) return '';
    return createdSuccessLink.shortUrl.includes('?')
      ? `${createdSuccessLink.shortUrl}&via=qr`
      : `${createdSuccessLink.shortUrl}?via=qr`;
  }, [createdSuccessLink?.shortUrl]);

  const selectedQrTargetUrl = useMemo(() => {
    if (!selectedLinkForQr?.shortUrl) return '';
    return selectedLinkForQr.shortUrl.includes('?')
      ? `${selectedLinkForQr.shortUrl}&via=qr`
      : `${selectedLinkForQr.shortUrl}?via=qr`;
  }, [selectedLinkForQr?.shortUrl]);

  const {
    dataUrl: createdQrDataUrl,
    qrLoading: createdQrLoading,
    qrError: createdQrError,
    retry: retryCreatedQr,
  } = useQrDataUrl(createdQrTargetUrl);

  const {
    dataUrl: selectedQrDataUrl,
    qrLoading: selectedQrLoading,
    qrError: selectedQrError,
    retry: retrySelectedQr,
  } = useQrDataUrl(selectedQrTargetUrl);

  const [qrPngSize, setQrPngSize] = useState<512 | 1024 | 2048>(1024);
  const [isDownloadingQr, setIsDownloadingQr] = useState<boolean>(false);
  const [qrDownloadError, setQrDownloadError] = useState<string | null>(null);
  const [isDownloadingSuccessQr, setIsDownloadingSuccessQr] = useState<boolean>(false);
  const [successQrDownloadError, setSuccessQrDownloadError] = useState<string | null>(null);


  const handleDownloadQr = async (format: 'png' | 'svg') => {
    if (!selectedLinkForQr) return;
    try {
      setIsDownloadingQr(true);
      setQrDownloadError(null);
      await referralLinksService.downloadQrCode(
        selectedLinkForQr.id,
        selectedLinkForQr.shortCode,
        format,
        qrPngSize,
      );

      setSelectedLinkForQr((prev) =>
        prev ? { ...prev, qrDownloadCount: (prev.qrDownloadCount || 0) + 1 } : null
      );
      setLinks((prev) =>
        prev.map((l) =>
          l.id === selectedLinkForQr.id
            ? { ...l, qrDownloadCount: (l.qrDownloadCount || 0) + 1 }
            : l
        )
      );
    } catch (err: any) {
      console.error('Lỗi khi tải mã QR từ máy chủ:', err);
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 429
          ? 'Vượt quá giới hạn tải mã QR (tối đa 20 lượt tải/phút). Vui lòng thử lại sau.'
          : 'Không thể tải mã QR từ máy chủ. Vui lòng kiểm tra quyền và trạng thái liên kết.');
      setQrDownloadError(msg);
    } finally {
      setIsDownloadingQr(false);
    }
  };


  const handleDownloadSuccessQr = async (linkItem: ReferralLinkItem) => {
    try {
      setIsDownloadingSuccessQr(true);
      setSuccessQrDownloadError(null);
      await referralLinksService.downloadQrCode(
        linkItem.id,
        linkItem.shortCode,
        'png',
        1024,
      );
      setLinks((prev) =>
        prev.map((l) =>
          l.id === linkItem.id
            ? { ...l, qrDownloadCount: (l.qrDownloadCount || 0) + 1 }
            : l
        )
      );
    } catch (err: any) {
      console.error('Lỗi khi tải mã QR sau khi tạo:', err);
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 429
          ? 'Vượt quá giới hạn tải mã QR (tối đa 20 lượt tải/phút). Vui lòng thử lại sau.'
          : 'Không thể tải mã QR chuẩn 1024×1024 từ máy chủ. Vui lòng thử lại.');
      setSuccessQrDownloadError(msg);
    } finally {
      setIsDownloadingSuccessQr(false);
    }
  };


  const hasOpenModal = isCreateModalOpen || isQrModalOpen || isAnalyticsModalOpen;


  const handleOpenAnalytics = async (link: ReferralLinkItem) => {
    setSelectedLinkForAnalytics(link);
    setIsAnalyticsModalOpen(true);
    setLoadingAnalytics(true);
    setAnalyticsError(null);
    setAnalyticsData(null);
    try {
      const res = await api.get(`/collaborator/referral-links/${link.id}/analytics`);
      if (res.data?.analytics) {
        setAnalyticsData(res.data.analytics);
      } else {
        setAnalyticsData(res.data);
      }
    } catch (err: any) {
      setAnalyticsError(err?.response?.data?.message || 'Không thể tải thống kê cho liên kết tiếp thị này.');
    } finally {
      setLoadingAnalytics(false);
    }
  };


  const availableShops = useMemo(() => {
    const shopMap = new Map<string, { id: string; name: string }>();
    eligibleProducts.forEach((p) => {
      if (p.store?.id) {
        shopMap.set(p.store.id, { id: p.store.id, name: p.store.name });
      }
    });
    return Array.from(shopMap.values());
  }, [eligibleProducts]);


  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    eligibleProducts.forEach((p) => {
      if (p.categoryName && p.categoryName.trim()) {
        cats.add(p.categoryName.trim());
      }
    });
    return Array.from(cats);
  }, [eligibleProducts]);


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


  const productLinksCount = useMemo(() => {
    if (!selectedProduct) return 0;
    return links.filter(
      (l) => l.productId === selectedProduct.id && l.status !== 'BLOCKED'
    ).length;
  }, [selectedProduct, links]);


  const productRemainingQuota = Math.max(0, 20 - productLinksCount);


  const formValidationErrors = useMemo(() => {
    const errors: { product?: string; label?: string } = {};
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
    return errors;
  }, [formTouched, selectedProduct, formLabel]);


  const isSubmitDisabled = useMemo(() => {
    if (!selectedProduct) return true;
    if (!formLabel.trim()) return true;
    if (productRemainingQuota <= 0) return true;
    if (isSubmitting) return true;
    return false;
  }, [selectedProduct, formLabel, productRemainingQuota, isSubmitting]);

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


  const fetchLinks = useCallback(async (silent = false) => {
    const version = ++requestVersion.current;
    if (!silent && links.length === 0) {
      setLoading(true);
      setErrorMsg(null);
    }
    try {
      const res = await referralLinksService.getMyLinks({
        page,
        limit,
        status: selectedStatus || undefined,
        channel: selectedChannel || undefined,
        search: appliedSearch || undefined,
        remuneration: selectedRemuneration,
      });
      if (version !== requestVersion.current) return;
      setLinks(res.data);
      setTotalLinks(res.meta.total);
      if (page > Math.max(1, res.meta.totalPages)) setPage(Math.max(1, res.meta.totalPages));
      setLinkSummary(res.summary || null);
      setErrorMsg(null);
    } catch (err: any) {
      if (!silent && version === requestVersion.current) setErrorMsg(err.message || 'Không thể tải danh sách liên kết tiếp thị');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [page, limit, selectedStatus, selectedChannel, selectedRemuneration, appliedSearch]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  useEffect(() => {
    const refreshVisibleLinks = () => {
      if (document.visibilityState === 'visible') void fetchLinks(true);
    };
    const timer = window.setInterval(refreshVisibleLinks, 10000);
    document.addEventListener('visibilitychange', refreshVisibleLinks);
    window.addEventListener('focus', refreshVisibleLinks);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshVisibleLinks);
      window.removeEventListener('focus', refreshVisibleLinks);
    };
  }, [fetchLinks]);

  const fetchDealProposals = useCallback(async () => {
    setLoadingDealProposals(true);
    try {
      setDealProposals(await referralLinksService.getMyExclusiveDeals());
    } catch (err) {
      console.error('Không thể tải trạng thái Exclusive Deal:', err);
    } finally {
      setLoadingDealProposals(false);
    }
  }, []);

  useEffect(() => {
    fetchDealProposals();
  }, [fetchDealProposals]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchQuery.trim());
  };


  const loadEligibleProductsAndCampaigns = async () => {
    setLoadingProducts(true);
    setLoadingMoreProducts(false);
    setEligibleProductsPage(1);
    setHasMoreEligibleProducts(false);
    setLoadProductsError(null);
    try {
      const [prodsRes] = await Promise.allSettled([
        referralLinksService.getEligibleProducts({ page: 1, limit: 100 }),
      ]);

      if (prodsRes.status === 'fulfilled') {
        setEligibleProducts(prodsRes.value || []);
        setHasMoreEligibleProducts(prodsRes.value.length === 100);
      } else {
        const err = prodsRes.reason;
        setLoadProductsError(
          err?.response?.data?.message || err?.message || 'Không thể tải danh mục sản phẩm từ Cửa hàng'
        );
      }

    } catch (err: any) {
      setLoadProductsError(err?.message || 'Lỗi không xác định khi tải dữ liệu tiếp thị');
    } finally {
      setLoadingProducts(false);
    }
  };


  const handleOpenCreateModal = async () => {
    setCreateFromDealId(null);
    setCreateLinkStep(1);
    setIsCreateModalOpen(true);
    setCreatedSuccessLink(null);
    setSelectedProduct(null);
    setIsChangingProduct(false);
    setCustomExpiresAt('');
    setModalProductSearch('');
    setModalShopFilter('ALL');
    setModalCategoryFilter('ALL');
    setFormLabel('');
    setUtmCampaign('');
    setUtmContent('');
    setFormTouched({});
    await loadEligibleProductsAndCampaigns();
  };

  useEffect(() => {
    const handleOpenCreateLinkEvent = () => {
      handleOpenCreateModal();
    };
    const handleOpenSubmitVideoEvent = () => {
      setSelectedProductForVideo(null);
      setIsSubmitVideoModalOpen(true);
    };

    window.addEventListener('scanms_open_create_link', handleOpenCreateLinkEvent);
    window.addEventListener('scanms_open_submit_video', handleOpenSubmitVideoEvent);

    return () => {
      window.removeEventListener('scanms_open_create_link', handleOpenCreateLinkEvent);
      window.removeEventListener('scanms_open_submit_video', handleOpenSubmitVideoEvent);
    };
  }, []);

  useEffect(() => {
    const campId = searchParams.get('campaignId');
    const storeId = searchParams.get('storeId');
    const shouldCreate = searchParams.get('create') === '1' || Boolean(campId);

    if (shouldCreate) {
      const openWithContext = async () => {
        setCreateFromDealId(null);
        setCreateLinkStep(1);
        setIsCreateModalOpen(true);
        setCreatedSuccessLink(null);
        setSelectedProduct(null);
        setIsChangingProduct(false);
        setCustomExpiresAt('');
        setModalProductSearch('');
        setModalCategoryFilter('ALL');
        setFormLabel('');
        setUtmCampaign('');
        setUtmContent('');
        setFormTouched({});
        if (storeId) {
          setModalShopFilter(storeId);
        }
        await loadEligibleProductsAndCampaigns();
      };
      openWithContext();
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('openCreate');
        next.delete('storeId');
        next.delete('productId');
        next.delete('campId');
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);


  const handleSelectProduct = (prod: EligibleProduct) => {
    setCreateFromDealId(null);
    setSelectedProduct(prod);
    setIsChangingProduct(true);
    setCustomExpiresAt('');
    setUtmCampaign('');
    setFormTouched((prev) => ({ ...prev, product: true }));
    if (!formLabel.trim()) {
      setFormLabel(`Chia sẻ: ${prod.title.slice(0, 45)}`);
    }
  };

  const loadMoreEligibleProducts = async () => {
    if (loadingMoreProducts || !hasMoreEligibleProducts) return;
    const nextPage = eligibleProductsPage + 1;
    setLoadingMoreProducts(true);
    setLoadProductsError(null);
    try {
      const nextProducts = await referralLinksService.getEligibleProducts({ page: nextPage, limit: 100 });
      setEligibleProducts((current) => {
        const seen = new Set(current.map((product) => product.id));
        return [...current, ...nextProducts.filter((product) => !seen.has(product.id))];
      });
      setEligibleProductsPage(nextPage);
      setHasMoreEligibleProducts(nextProducts.length === 100);
    } catch (err: any) {
      setLoadProductsError(
        err?.response?.data?.message || err?.message || 'Không thể tải thêm sản phẩm',
      );
    } finally {
      setLoadingMoreProducts(false);
    }
  };

  const openExclusiveDealDialog = (product: EligibleProduct) => { setDealProposalProduct(product); };

  const handleCreateFromDeal = async (deal: any) => {
    await handleOpenCreateModal();
    try {
      const products = await referralLinksService.getEligibleProducts({ storeId: deal.storeId, search: deal.product?.title, page: 1, limit: 100 });
      const product = products.find((item) => item.id === deal.productId);
      if (!product) {
        setLoadProductsError('Sản phẩm của deal chưa đủ điều kiện tạo link. Vui lòng kiểm tra với Shop.');
        return;
      }
      const dealRate = Number(deal.approvedCommissionRate);
      setSelectedProduct({ ...product,
        estimatedCommissionRate: Number.isFinite(dealRate) && dealRate > 0 ? dealRate : product.estimatedCommissionRate,
      });
      setCreateFromDealId(deal.id);
        setFormLabel(`VIP: ${product.title}`);
      setCreateLinkStep(2);
    } catch {
      setLoadProductsError('Chưa tải được sản phẩm của deal. Vui lòng thử lại.');
    }
  };

  const openDealRevision = (deal: any) => {
    const existingProduct = eligibleProducts.find((product) => product.id === deal.productId);
    const product: EligibleProduct = existingProduct ?? {
      id: deal.productId,
      title: deal.product?.title || 'Sản phẩm',
      sku: '',
      categoryName: null,
      imageUrl: deal.product?.imageUrl || null,
      originalPrice: null,
      price: deal.product?.price ?? 0,
      customCommissionRate: deal.publicCommissionRate ?? null,
      stockQuantity: 0,
      store: {
        id: deal.storeId,
        name: deal.store?.name || 'Shop',
        slug: '',
        defaultCommissionRate: deal.publicCommissionRate ?? 0,
      },
      estimatedCommissionRate: Number(deal.publicCommissionRate ?? 0),
      estimatedCommissionAmount: 0,
    };
    openExclusiveDealDialog(product);
  };

  const handleDeleteDeal = (deal: any) => {
    if (deal.status === 'APPROVED' || deal.closedAt) {
      toast.error('Deal đã duyệt được giữ làm lịch sử đối soát. Hãy trao đổi với Shop để xem xét KPI thay vì xoá.');
      return;
    }
    setDealToDelete(deal);
  };

  const handleConfirmDeleteDeal = async () => {
    if (!dealToDelete) return;
    setDeletingDealId(dealToDelete.id);
    try {
      await referralLinksService.deleteExclusiveDeal(dealToDelete.id);
      setDealProposals((prev) => prev.filter((d) => d.id !== dealToDelete.id));
      toast.success(
        dealToDelete.status === 'PENDING'
          ? 'Đã hủy và thu hồi đề xuất deal thành công!'
          : 'Đã gỡ bỏ deal thành công!'
      );
      setDealToDelete(null);
      void fetchLinks(true);
    } catch (err: any) {
      console.error('Lỗi khi xóa đề xuất deal:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Không thể xóa đề xuất deal lúc này.');
    } finally {
      setDeletingDealId(null);
    }
  };


  const handleCreateSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    console.log('[ReferralLinksPage] handleCreateSubmit called. selectedProduct:', selectedProduct?.id, 'label:', formLabel, 'isSubmitting:', isSubmitting);
    if (isSubmitting) return;

    setFormTouched({ product: true, label: true });

    if (!selectedProduct) {
      console.log('[ReferralLinksPage] Rejected: No selectedProduct');
      return;
    }
    if (!formLabel.trim()) {
      console.log('[ReferralLinksPage] Rejected: No formLabel');
      return;
    }
    if (productRemainingQuota <= 0) {
      toast.warning('Bạn đã đạt giới hạn tối đa 20 liên kết cho sản phẩm này.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      console.log('[ReferralLinksPage] Calling referralLinksService.createLink...');
      const newLink = await referralLinksService.createLink({
        productId: selectedProduct.id,
        exclusiveDealId: createFromDealId || undefined,
        channel: formChannel,
        label: formLabel.trim(),
        expiresAt: customExpiresAt ? new Date(customExpiresAt).toISOString() : undefined,
        utmSource: utmSource.trim() || undefined,
        utmMedium: utmMedium.trim() || undefined,
        utmCampaign: utmCampaign.trim() || undefined,
        utmContent: utmContent.trim() || undefined,
      });

      console.log('[ReferralLinksPage] createLink success! newLink:', newLink);
      setCreatedSuccessLink(newLink);
      toast.success('Tạo liên kết tiếp thị thành công!');
      fetchLinks();
    } catch (err: any) {
      console.error('[ReferralLinksPage] createLink failed:', err);
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi tạo liên kết tiếp thị');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = (url: string, code: string) => {
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    toast.success('Đã sao chép liên kết vào bộ nhớ tạm!');
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  const handleToggleStatus = async (link: ReferralLinkItem) => {
    if (link.status === 'BLOCKED') {
      toast.error(`Liên kết này đã bị Cửa hàng khóa với lý do: "${link.disabledReason || 'Vi phạm chính sách'}". Bạn không thể tự mở lại.`);
      return;
    }
    try {
      await referralLinksService.toggleStatus(link.id);
      toast.success(link.status === 'ACTIVE' ? 'Đã tạm dừng liên kết' : 'Đã kích hoạt lại liên kết');
      fetchLinks();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi thay đổi trạng thái');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedLinkForDelete) return;
    try {
      await referralLinksService.deleteLink(selectedLinkForDelete.id);
      setIsDeleteModalOpen(false);
      setSelectedLinkForDelete(null);
      toast.success('Đã xóa liên kết tiếp thị');
      fetchLinks();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa liên kết');
    }
  };


  const totalClicks = linkSummary?.totalClicks;
  const totalUniqueClicks = linkSummary?.uniqueClicks;
  const totalOrders = linkSummary?.totalOrders;


  const renderStatusBadge = (link: ReferralLinkItem) => {
    switch (link.status) {
      case 'ACTIVE':
        return (
          <span className="kol-link-status inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold bg-white text-[#1A1612] border border-[#EAE4D7] whitespace-nowrap">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] shrink-0" />
            <span>Hoạt động</span>
          </span>
        );
      case 'PAUSED':
        return (
          <span className="kol-link-status inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold bg-white text-[#7D715E] border border-[#EAE4D7] whitespace-nowrap">
            <PauseCircle className="w-3.5 h-3.5 text-[#B88E4F] flex-shrink-0" />
            <span>Tạm ngừng</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="kol-link-status is-expired inline-flex items-center gap-1.5 px-2 py-1 border whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>Đã hết hạn</span>
          </span>
        );
      case 'BLOCKED':
        return (
          <div className="relative group inline-block whitespace-nowrap">
            <span className="kol-link-status is-blocked inline-flex items-center gap-1.5 px-2 py-1 border cursor-help whitespace-nowrap">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
              <span>Đã bị khóa</span>
            </span>
            {link.disabledReason && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-20 w-64 p-2.5 bg-white text-[#1A1612] border border-[#EEDFC6] text-xs rounded-xl shadow-xl text-left">
                <div className="font-semibold text-[#DC2626] mb-0.5">Lý do khóa:</div>
                <div className="text-[#7D715E]">{link.disabledReason}</div>
                {link.disabledBy && (
                  <div className="text-[10px] text-[#7D715E] mt-1">
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
          <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 whitespace-nowrap">
            {link.status}
          </span>
        );
    }
  };


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
    <div className={modalOnly ? "contents" : "kol-referral-page space-y-4"}>
      {!modalOnly && (<>
      {/* 4 Thẻ Thống Kê Chuẩn Warm Sand & Brand Gold */}

      {view !== 'deals' && <>
      <div className="kol-link-metrics grid grid-cols-2 lg:grid-cols-4 gap-3.5" aria-label="Thống kê liên kết tiếp thị">
        {[
          { label: 'Liên kết tiếp thị', value: totalLinks, icon: Layers, suffix: 'liên kết' },
          { label: 'Lượt nhấp ghi nhận', value: totalClicks, icon: MousePointerClick, suffix: 'lượt' },
          { label: 'Nhấp duy nhất theo link', value: totalUniqueClicks, icon: TrendingUp, suffix: 'lượt' },
          { label: 'Đơn hàng chuyển đổi', value: totalOrders, icon: ShoppingBag, suffix: 'đơn' },
        ].map(({ label, value, icon: Icon, suffix }) => (
          <div
            key={label}
            title="Tổng trên các liên kết khớp bộ lọc, không chỉ trang hiện tại. Lượt nhấp duy nhất được đếm riêng cho từng liên kết."
            className="group relative flex min-h-[128px] min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-[#EEDFC6] bg-gradient-to-b from-[#FBF5EB]/60 to-white p-4 shadow-2xs hover:border-[#C59B58]/60 hover:shadow-sm transition-all text-left"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Icon className="w-4 h-4 text-[#B88E4F]" />
                <span className="text-xs font-medium text-[#1A1612]">{label}</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[32px] leading-tight font-bold tracking-tight text-[#1A1612] tabular-nums">
                {value !== undefined ? value.toLocaleString('vi-VN') : '—'}
              </span>
              {suffix && (
                <span className="text-xs font-semibold text-[#7D715E]">{suffix}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      </>}
      {view !== 'links' && (
      <section
        className="kol-exclusive-deals w-full min-w-0 rounded-2xl border border-[#EAE4D7] bg-white p-3 sm:p-4"
        aria-label="Deal"
      >
        <div className="kol-deal-summary" role="group" aria-label="Lọc đề xuất Deal">
          {([{ key: 'ALL', label: 'Tổng đề xuất', value: dealStats.total }, { key: 'ACTIVE', label: 'Đang áp dụng', value: dealStats.approved }, { key: 'PENDING', label: 'Chờ duyệt', value: dealStats.pending }] as const).map(item => <button key={item.key} type="button" aria-pressed={dealFilter === item.key} onClick={() => setDealFilter(item.key)}><span>{item.label}</span><strong>{loadingDealProposals ? '—' : item.value}</strong></button>)}
        </div>
        <div className="kol-deals-heading kol-deals-toolbar">
          <label className="kol-deals-search"><Search size={17} aria-hidden="true" /><input aria-label="Tìm Deal theo sản phẩm hoặc cửa hàng" placeholder="Tìm sản phẩm, cửa hàng…" value={dealSearch} onChange={event => setDealSearch(event.target.value)} /></label>
            <button type="button" className="kol-create-link-button" onClick={() => { setDealProductSearch(''); setDealPickerOpen(true); void loadEligibleProductsAndCampaigns(); }}><Plus size={15} />Đề xuất Deal</button>
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-semibold text-[#1A1612] hover:bg-[#FAF8F5] hover:border-[#C59B58] transition-colors cursor-pointer select-none"
              title="Mở hộp chat trao đổi với Shop"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[#B88E4F]" />
              <span>Mở Chat</span>
            </button>
        </div>

        {(
          <div id="kol-deal-list" className="kol-deal-content mt-4">
            {loadingDealProposals ? (
              <div className="py-4 flex items-center justify-center gap-2 text-sm text-[#7D715E]">
                <Loader2 className="h-4 w-4 animate-spin text-[#B88E4F]" />
                <span>Đang tải danh sách đề xuất Exclusive Deal...</span>
              </div>
            ) : dealProposals.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#EAE4D7] bg-[#FAF8F5] p-4 text-center text-xs text-[#7D715E]">
                Chưa có đề xuất. Bấm “Đề xuất Deal” để chọn sản phẩm.
              </p>
            ) : visibleDeals.length === 0 ? (
              <p className="rounded-xl border border-[#EAE4D7] p-6 text-center text-sm text-[#7D715E]">{dealSearch.trim() ? 'Không có Deal phù hợp với tìm kiếm trong nhóm này.' : 'Chưa có Deal trong nhóm này.'}</p>
            ) : (
              <div className="kol-deal-grid grid grid-cols-1 gap-4 md:grid-cols-2">
                {visibleDeals.map((deal) => (
                  <div
                    key={deal.id}
                    data-deal-status={deal.status}
                    className="kol-deal-card min-w-0 rounded-xl border border-[#EAE4D7] bg-white p-3.5 transition-colors hover:border-[#C59B58]/60 flex flex-col"
                  >
                    <div className="kol-deal-main space-y-3 pb-3">
                      {/* Tiêu đề Sản phẩm & Trạng thái thẩm định */}
                      <div className="kol-deal-card-heading flex min-w-0 flex-col gap-2">
                        <img src={getSafeProductImageUrl(deal.product?.imageUrl)} onError={handleProductImageError} alt={deal.product?.title || 'Sản phẩm'} className="kol-deal-image" />
                        <div className="min-w-0 flex-1">
                          <h3 className="kol-deal-product text-sm leading-5 font-bold text-[#1A1612] line-clamp-2 min-h-10" title={deal.product?.title || 'Sản phẩm'}>
                            {deal.product?.title || 'Sản phẩm'}
                          </h3>
                          <div className="mt-1 text-[11px] text-[#7D715E] flex min-w-0 items-center gap-1.5">
                            <span className="truncate" title={deal.store?.name || 'Shop'}>{deal.store?.name || 'Shop'}</span>
                            <span>•</span>
                            <span className="shrink-0">{new Date(deal.createdAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                              deal.status === 'APPROVED'
                                ? 'bg-[#FBF5EB] text-[#B88E4F] border-[#EEDFC6]'
                                : deal.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                            }`}
                          >
                            {deal.status === 'APPROVED'
                              ? (deal.isCurrentDeal ? 'Đang áp dụng' : 'Đã thay thế')
                              : deal.status === 'REJECTED'
                              ? 'Bị từ chối'
                              : deal.status === 'PENDING_ADMIN_APPROVAL'
                              ? 'Chờ Admin phê duyệt'
                              : 'Chờ Shop chấp thuận'}
                          </span>
                        </div>
                      </div>

                      {/* Các chỉ số hoa hồng chuẩn Business */}
                      {deal.status === 'PENDING' && Number(deal.proposedCommissionRate) > 16 && <p className="kol-deal-approval-note">Sau đó cần Admin duyệt</p>}
                      <div className="kol-deal-rates">
                        <div>
                          <span>Theo bậc</span>
                          <strong>{deal.publicCommissionRate != null ? `${deal.publicCommissionRate}%` : '—'}</strong>
                        </div>
                        <div>
                          <span>{deal.status === 'APPROVED' ? (deal.isCurrentDeal ? 'Deal áp dụng' : 'Deal đã duyệt') : 'Deal đề xuất'}</span>
                          <strong>
                            {deal.approvedCommissionRate ?? deal.proposedCommissionRate}%
                          </strong>
                        </div>
                      </div>
                        {deal.status === 'PENDING' && deal.currentCommissionRate != null && (
                          <p className="kol-deal-current">Đang áp dụng {deal.currentCommissionRate}%</p>
                        )}

                      {deal.status === 'REJECTED' && deal.shopResponse && (
                        <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                          Phản hồi từ Shop: {deal.shopResponse}
                        </p>
                      )}
                    </div>

                    {/* Dòng link tiếp thị độc quyền và nút điều chỉnh / hủy / gỡ deal */}
                    <div className="kol-deal-footer mt-auto pt-3 [&>div]:mt-3 border-t border-[#EAE4D7] [&_button]:min-h-9 [&_button]:justify-center [&_button]:rounded-lg">
                      <DealKpiProgress id={deal.id} product={deal.product} storeName={deal.store?.name} />
                      {deal.status === 'APPROVED' && deal.shortUrl ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="kol-deal-link w-full min-w-0 flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] text-xs">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <Link2 size={14} className="shrink-0 text-[#B88E4F]" aria-hidden="true" />
                              <a
                                href={deal.shortUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono font-medium text-[#B88E4F] hover:underline text-xs min-w-0 break-all"
                                title={deal.shortUrl}
                              >
                                {deal.shortUrl}
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(deal.shortUrl!, deal.shortCode || deal.id)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                                copiedCode === (deal.shortCode || deal.id)
                                  ? 'bg-[#FBF5EB] text-[#1A1612] border border-[#EEDFC6]'
                                  : 'bg-[#FAF8F5] text-[#1A1612] hover:bg-[#F3EFE6] border border-[#EAE4D7]'
                              }`}
                              title="Sao chép link tiếp thị độc quyền"
                            >
                              {copiedCode === (deal.shortCode || deal.id) ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-600" />
                                  <span>Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 text-[#B88E4F]" />
                                  <span>Sao chép</span>
                                </>
                              )}
                            </button>
                          </div>

                          {deal.isCurrentDeal && !dealProposals.some((item) => item.productId === deal.productId && item.status === 'PENDING') && (
                            <button
                              type="button"
                              onClick={() => openDealRevision(deal)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EEDFC6] bg-white text-xs font-bold text-[#B88E4F] hover:bg-[#FBF5EB] shadow-2xs transition shrink-0 cursor-pointer"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-[#B88E4F]" />
                              <span>Điều chỉnh</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteDeal(deal)}
                            disabled={deletingDealId === deal.id}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[#EAE4D7] bg-white text-xs font-semibold text-[#7D715E] hover:text-[#DC2626] hover:border-rose-200 hover:bg-rose-50 shadow-2xs transition shrink-0 cursor-pointer"
                            title="Gỡ bỏ deal độc quyền (sản phẩm hết hạn, hết hàng hoặc không muốn chạy deal nữa)"
                          >
                            {deletingDealId === deal.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            )}
                            <span>Gỡ deal</span>
                          </button>
                        </div>
                      ) : deal.status === 'APPROVED' ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {deal.isCurrentDeal && !deal.closedAt && (
                            <button type="button" onClick={() => void handleCreateFromDeal(deal)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 text-xs font-semibold text-[#1A1612] hover:border-[#C59B58] cursor-pointer"><Plus className="h-3.5 w-3.5 text-[#B88E4F]" />Tạo link từ deal</button>
                          )}
                          {deal.isCurrentDeal && !dealProposals.some((item) => item.productId === deal.productId && item.status === 'PENDING') ? (
                            <button
                              type="button"
                              onClick={() => openDealRevision(deal)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EEDFC6] bg-white text-xs font-bold text-[#B88E4F] hover:bg-[#FBF5EB] shadow-2xs transition cursor-pointer"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-[#B88E4F]" />
                            <span>Điều chỉnh</span>
                            </button>
                          ) : deal.isCurrentDeal && dealProposals.some((item) => item.productId === deal.productId && item.status === 'PENDING') ? (
                            <p className="text-[11px] font-semibold text-[#B88E4F] flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#B88E4F]" />
                              <span>Đang có đề xuất thay đổi chờ Shop phản hồi.</span>
                            </p>
                          ) : (
                            <span className="text-[11px] text-[#7D715E] italic">Deal đã hoàn tất hoặc được thay thế.</span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteDeal(deal)}
                            disabled={deletingDealId === deal.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white text-xs font-semibold text-rose-600 hover:bg-rose-50 shadow-2xs transition cursor-pointer"
                            title="Gỡ bỏ deal này"
                          >
                            {deletingDealId === deal.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            )}
                            <span>Gỡ deal</span>
                          </button>
                        </div>
                      ) : deal.status === 'PENDING' ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteDeal(deal)}
                            disabled={deletingDealId === deal.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white text-xs font-semibold text-rose-600 hover:bg-rose-50 shadow-2xs transition cursor-pointer"
                            title="Hủy và rút lại đề xuất gửi đến Shop"
                          >
                            {deletingDealId === deal.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            )}
                            <span>Hủy đề xuất</span>
                          </button>
                        </div>
                      ) : deal.status === 'REJECTED' ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] text-[#7D715E] italic">
                            Shop không chấp thuận đề xuất này.
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteDeal(deal)}
                            disabled={deletingDealId === deal.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white text-xs font-semibold text-rose-600 hover:bg-rose-50 shadow-2xs transition cursor-pointer"
                            title="Xóa đề xuất này khỏi danh sách"
                          >
                            {deletingDealId === deal.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            )}
                            <span>Xóa</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
      )}

      {view !== 'deals' && <section className="space-y-3" aria-label="Danh sách liên kết tiếp thị">
      <form onSubmit={handleSearchSubmit} className="kol-links-toolbar p-3 bg-white rounded-2xl border border-[#EAE4D7]">
        <div className="relative flex-1 w-full min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7D715E]" />
          <input
            type="text"
            aria-label="Tìm liên kết tiếp thị"
            placeholder="Tìm mã link, tên sản phẩm hoặc nhãn liên kết..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] focus:bg-white focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 text-xs sm:text-sm text-[#1A1612] outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-nowrap">
          <div className="flex-1 sm:w-40">
            <Select
              value={selectedRemuneration}
              selectedLabel={selectedRemuneration === 'ALL' ? 'Loại thù lao' : undefined}
              aria-label="Lọc loại thù lao"
              onChange={(e) => { setSelectedRemuneration(e.target.value); setPage(1); }}
              className="w-full text-xs sm:text-sm font-medium"
            >
              <option value="ALL">Tất cả</option>
              <option value="DEAL">Deal độc quyền</option>
              <option value="STANDARD">Theo bậc</option>
            </Select>
          </div>

          <div className="flex-1 sm:w-40">
            <Select
              value={selectedStatus}
              selectedLabel={!selectedStatus ? 'Trạng thái' : undefined}
              aria-label="Lọc trạng thái liên kết"
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              className="w-full text-xs sm:text-sm font-medium"
            >
              <option value="">Tất cả</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="PAUSED">Tạm ngừng</option>
              <option value="EXPIRED">Đã hết hạn</option>
              <option value="BLOCKED">Đã bị khóa</option>
            </Select>
          </div>

          <div className="flex-1 sm:w-40">
            <Select
              value={selectedChannel}
              selectedLabel={!selectedChannel ? 'Kênh chia sẻ' : undefined}
              aria-label="Lọc kênh chia sẻ"
              onChange={(e) => { setSelectedChannel(e.target.value); setPage(1); }}
              className="w-full text-xs sm:text-sm font-medium"
            >
              <option value="">Tất cả</option>
              <option value="TIKTOK">TikTok</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="ZALO">Zalo</option>
              <option value="OTHER">Kênh khác</option>
            </Select>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="kol-create-link-button"
          >
            <Plus size={16} /> Tạo link
          </button>
        </div>
      </form>


      <div className="kol-link-table bg-white rounded-2xl border border-[#EAE4D7] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-[#7D715E]">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#B88E4F]" />
            <p className="text-sm font-medium">Đang tải danh sách liên kết tiếp thị...</p>
          </div>
        ) : errorMsg ? (
          <div className="p-12 text-center text-rose-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p className="text-sm font-semibold">{errorMsg}</p>
            <button
              onClick={() => void fetchLinks()}
              className="mt-4 px-4 py-2 bg-[#FAF8F5] hover:bg-[#ECE1CD] text-[#7D715E] text-xs font-semibold rounded-lg border border-[#EAE4D7]"
            >
              Thử lại
            </button>
          </div>
        ) : links.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-[#ECE1CD] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#B88E4F]">
              <Link2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-[#1A1612] mb-1">{appliedSearch || selectedStatus || selectedChannel || selectedRemuneration !== 'ALL' ? 'Không có liên kết khớp bộ lọc' : 'Bạn chưa tạo liên kết tiếp thị nào'}</h3>
            <p className="text-sm text-[#7D715E] max-w-md mx-auto mb-6">
              Thử thay đổi bộ lọc hoặc tạo liên kết tiếp thị mới.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white font-bold text-sm shadow-xs active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tạo link đầu tiên ngay
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] table-fixed text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-[#EAE4D7] text-xs font-semibold text-[#7D715E]">
                  <th className="w-[24%] py-3 px-3">
                    Sản phẩm &amp; Cửa hàng
                  </th>
                  <th className="w-[20%] py-3 px-3">Link &amp; Kênh</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">Ngày tạo</th>
                  <th className="w-[13%] py-3 px-2 text-center whitespace-nowrap">Trạng thái</th>
                  <th className="w-[10%] py-3 px-2 text-center whitespace-nowrap">Lượt nhấp</th>
                  <th className="w-[7%] py-3 px-2 text-center whitespace-nowrap">Đơn hàng</th>
                  <th className="w-[16%] py-3 px-3 text-center whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE4D7]/60 text-sm">
                {displayLinks.map((link) => {
                  const isCopied = copiedCode === link.shortCode;
                  const ChannelIcon = link.channel === 'TIKTOK' ? Music2 : link.channel === 'YOUTUBE' ? Video : link.channel === 'INSTAGRAM' ? Camera : Globe;
                  return (
                    <tr key={link.id} data-link-id={link.id} className="hover:bg-[#FAF8F5]/60 transition-colors">

                      <td data-label="Sản phẩm & Cửa hàng" className="py-2.5 px-3 overflow-hidden">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={getSafeProductImageUrl(link.product?.imageUrl)}
                            onError={handleProductImageError}
                            alt={link.product?.title}
                            className="w-14 h-14 rounded-xl object-contain p-1 border border-[#EAE4D7] flex-shrink-0 bg-white"
                          />
                          <div className="min-w-0">
                            <Link to={`/products/${link.product?.id || link.productId}`} className="kol-link-product-name font-semibold text-[#1A1612] text-xs line-clamp-2" title={link.product?.title}>
                              {link.product?.title}
                            </Link>
                            <div className="flex items-center gap-1 text-[11px] text-[#7D715E] mt-0.5 min-w-0">
                              <Store className="w-3 h-3 text-[#7D715E] flex-shrink-0" />
                              <span className="truncate">{link.store?.name}</span>
                            </div>
                            <div className="kol-link-price text-xs font-bold text-[#1A1612] mt-0.5 flex items-center gap-1.5">
                              <span>{Number(link.product?.price || 0).toLocaleString('vi-VN')} đ</span>
                              <span aria-hidden="true" className="kol-link-price-dot">·</span>
                              <span className={`kol-link-rate ${link.exclusiveDealId ? 'is-deal' : ''}`}>
                                {link.exclusiveDealId ? 'Deal' : link.campaignId ? 'Chiến dịch cũ' : 'Theo bậc'}{link.commissionRate != null ? ` ${link.commissionRate}%` : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>


                      <td data-label="Mã rút gọn & Kênh" className="py-2.5 px-3 overflow-hidden">
                        <div className="flex flex-col gap-1.5 text-left">
                          <div className="inline-flex max-w-full items-center gap-1.5 w-fit">
                            <span className="truncate font-mono font-semibold text-xs text-[#8F682E]" title={link.shortCode}>
                              {link.shortCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(link.shortUrl, link.shortCode)}
                              className="p-1 rounded hover:bg-white text-[#7D715E] hover:text-[#1A1612] transition cursor-pointer"
                              title={isCopied ? 'Đã sao chép' : 'Sao chép liên kết'}
                              aria-label={`${isCopied ? 'Đã sao chép' : 'Sao chép liên kết'} ${link.shortCode}`}
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-[#7D715E]">
                            <span className="kol-link-channel"><ChannelIcon size={13} aria-hidden="true" />{getChannelLabel(link.channel)}</span>
                          </div>
                        </div>
                      </td>


                      <td data-label="Ngày tạo" className="py-2.5 px-2 text-center text-[11px] text-[#7D715E] whitespace-nowrap">
                        <time dateTime={link.createdAt}>{new Date(link.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time>
                      </td>
                      <td data-label="Trạng thái" className="py-2.5 px-2 text-center whitespace-nowrap">
                        {renderStatusBadge(link)}
                      </td>


                      <td data-label="Lượt nhấp" className="py-2.5 px-2 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center text-center tabular-nums">
                          <div>
                            <div className="text-xs font-extrabold text-[#1A1612] leading-none">
                              {link.totalClicks}
                            </div>
                            <div className="text-[10px] font-medium text-[#7D715E] leading-none mt-0.5">
                              {link.uniqueClicks} duy nhất
                            </div>
                          </div>
                        </div>
                      </td>


                      <td data-label="Đơn hàng" className="py-2.5 px-2 text-center whitespace-nowrap">
                        <div className="text-xs font-semibold tabular-nums text-[#1A1612]">
                          <span>{link.totalOrders}</span>
                        </div>
                      </td>


                      <td data-label="Thao tác" className="py-2.5 px-3 text-right">
                        <ReferralLinkActions
                          link={link}
                          onDetails={() => setLinkDetails(link)}
                          onQr={() => { setSelectedLinkForQr(link); setIsQrModalOpen(true); }}
                          onAnalytics={() => handleOpenAnalytics(link)}
                          onVideo={() => {
                            setSelectedProductForVideo({ id: link.product?.id || link.productId, title: link.product?.title || 'Sản phẩm tiếp thị' });
                            setIsSubmitVideoModalOpen(true);
                          }}
                          onToggle={() => { void handleToggleStatus(link); }}
                          onDelete={() => { setSelectedLinkForDelete(link); setIsDeleteModalOpen(true); }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      {totalLinks > 0 && <nav aria-label="Phân trang liên kết" className="kol-link-pagination">
        <span>{(page - 1) * limit + 1}–{Math.min(page * limit, totalLinks)} / {totalLinks.toLocaleString('vi-VN')} liên kết</span>
        <div><button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</button>
          <span>Trang {page} / {Math.max(1, Math.ceil(totalLinks / limit))}</span>
          <button type="button" disabled={page * limit >= totalLinks} onClick={() => setPage(p => p + 1)}>Sau</button></div>
      </nav>}
      </div>
      </section>}
      </>)}

      <Modal isOpen={!!linkDetails} onClose={() => setLinkDetails(null)} title="Chi tiết liên kết" maxWidth="xl">
        {linkDetails && <div className="kol-link-detail">
          <div className="flex items-center gap-3"><img src={getSafeProductImageUrl(linkDetails.product?.imageUrl)} onError={handleProductImageError} alt="" className="w-14 h-14 rounded-xl object-contain border border-[#EAE4D7]" /><div><strong>{linkDetails.product?.title}</strong><p>{linkDetails.store?.name}</p></div></div>
          <dl><div><dt>Mã liên kết</dt><dd>{linkDetails.shortCode}</dd></div><div><dt>Kênh</dt><dd>{getChannelLabel(linkDetails.channel)}</dd></div><div><dt>Nhãn</dt><dd>{linkDetails.label || 'Chưa đặt nhãn'}</dd></div><div><dt>Trạng thái</dt><dd>{renderStatusBadge(linkDetails)}</dd></div><div><dt>Ngày tạo</dt><dd>{new Date(linkDetails.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</dd></div><div><dt>Liên kết đầy đủ</dt><dd className="break-all">{linkDetails.shortUrl}</dd></div></dl>
          <button type="button" onClick={() => handleCopyLink(linkDetails.shortUrl, linkDetails.shortCode)} className="kol-create-link-button"><Copy size={16} /> Sao chép liên kết</button>
        </div>}
      </Modal>
      {isCreateModalOpen && (
        <div className="kol-create-link-overlay fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 bg-[#231D15]/45 backdrop-blur-sm animate-fadeIn">
          <div role="dialog" aria-modal="true" aria-labelledby="create-link-title" className={`kol-create-link-modal ${createdSuccessLink ? 'kol-link-success-modal' : ''} bg-white rounded-2xl shadow-2xl border border-[#EAE4D7] w-full max-w-[820px] max-h-[94dvh] sm:max-h-[min(92dvh,920px)] flex flex-col overflow-hidden`}>

            <div className="kol-create-link-heading gap-4 px-4 sm:px-6 py-4 sm:py-5 border-b border-[#EAE4D7] flex items-center justify-between bg-gradient-to-r from-white via-[#FAF8F5]/80 to-white flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#F6EFE3] border border-[#DEBE85]/50 flex items-center justify-center text-[#B88E4F] shadow-2xs flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-[#B88E4F]" />
                </div>
                <div>
                  <h3 id="create-link-title" className="text-base sm:text-lg font-bold text-[#1A1612] leading-tight flex items-center gap-1.5">
                    {createdSuccessLink ? 'Link tiếp thị đã sẵn sàng' : 'Tạo link tiếp thị'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                aria-label="Đóng cửa sổ tạo link"
                className="p-1.5 text-[#7D715E] hover:text-[#1A1612] rounded-lg hover:bg-[#FAF8F5] transition-colors"
                title="Đóng modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>


            {createdSuccessLink ? (
              <div className="kol-link-success-body flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain p-4 text-[#1A1612] sm:p-6">
                <div className="kol-link-success-status flex items-start gap-3 sm:items-center sm:gap-3.5 [&>svg]:size-12 [&>svg]:shrink-0 [&>svg]:rounded-2xl [&>svg]:border [&>svg]:border-[#EEDFC6] [&>svg]:bg-[#FBF5EB] [&>svg]:p-2.5 [&>svg]:text-[#B88E4F] [&_strong]:block [&_strong]:text-lg [&_strong]:font-bold [&_strong]:sm:text-xl [&_p]:mt-1 [&_p]:text-xs [&_p]:leading-7 [&_p]:text-[#7D715E]"><CheckCircle2 /><div><strong>Tạo link thành công</strong><p>Liên kết đã được lưu vào danh sách của bạn.</p></div></div>
                {createdSuccessLink.product?.title && <div className="kol-link-success-product flex items-center gap-3.5 rounded-2xl border border-[#EAE4D7] bg-[#FAF8F5] p-3.5 [&>img]:size-14 [&>img]:shrink-0 [&>img]:rounded-xl [&>img]:border [&>img]:border-[#EAE4D7] [&>img]:bg-white [&>img]:object-contain [&>div]:min-w-0 [&_span]:mb-1 [&_span]:block [&_span]:text-[11px] [&_span]:text-[#7D715E] [&_p]:text-[13px] [&_p]:font-semibold [&_p]:leading-7 [&_p]:wrap-anywhere">
                  {createdSuccessLink.product.imageUrl && <img src={createdSuccessLink.product.imageUrl} onError={handleProductImageError} alt="" />}
                  <div><span>Sản phẩm tiếp thị</span><p>{createdSuccessLink.product.title}</p></div>
                </div>}

                <div className="kol-link-success-url rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 sm:p-5">
                  <div className="text-[10px] font-semibold text-[#7D715E] uppercase tracking-wider mb-1">
                    Link chia sẻ
                  </div>
                  <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <span className="min-w-0 font-mono font-bold leading-7 text-[#8C6226] text-sm break-all">
                      {createdSuccessLink.shortUrl}
                    </span>
                    <button
                      onClick={() => handleCopyLink(createdSuccessLink.shortUrl, createdSuccessLink.shortCode)}
                      className="min-h-10 self-start border border-[#B88E4F] bg-[#C59B58] px-3.5 py-2.5 text-[#231D15] hover:bg-[#B88E4F] rounded-xl text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B58]"
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


                <details className="kol-link-success-qr group rounded-2xl border border-[#EAE4D7] bg-white">
                  <summary className="flex min-h-13 cursor-pointer list-none items-center gap-2.5 px-4 py-3.5 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-[#C59B58] [&::-webkit-details-marker]:hidden"><QrCode className="w-4 h-4 shrink-0 text-[#B88E4F]" /><span>Mã QR &amp; tải ảnh PNG</span><ChevronDown className="ml-auto w-4 h-4 shrink-0 text-[#B88E4F] transition group-open:rotate-180" /></summary>
                  <div className="kol-link-success-qr-content flex flex-wrap items-center justify-center gap-5 rounded-b-2xl border-t border-[#EAE4D7] bg-[#FAF8F5] p-5">
                  <div className="w-40 h-40 shrink-0 border border-[#EAE4D7] rounded-xl p-2.5 bg-white shadow-xs flex items-center justify-center">
                    {createdQrLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#B88E4F]" />
                    ) : createdQrError ? (
                      <div className="flex flex-col items-center p-1 text-center">
                        <AlertCircle className="w-4 h-4 text-rose-500 mb-0.5" />
                        <span className="text-[10px] text-rose-600 font-medium">Lỗi QR</span>
                        <button
                          type="button"
                          onClick={retryCreatedQr}
                          className="text-[9px] text-[#B88E4F] underline mt-0.5 font-semibold cursor-pointer"
                        >
                          Thử lại
                        </button>
                      </div>
                    ) : createdQrDataUrl ? (
                      <img
                        src={createdQrDataUrl}
                        alt={`Mã QR tiếp thị cho ${createdSuccessLink.product?.title || 'sản phẩm'}`}
                        className="w-full h-full rounded-lg object-contain"
                      />
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={isDownloadingSuccessQr}
                    onClick={() => handleDownloadSuccessQr(createdSuccessLink)}
                    className="min-h-11 rounded-xl border border-[#EEDFC6] bg-white px-3.5 py-2.5 text-xs text-[#8C6226] hover:bg-[#FBF5EB] flex items-center gap-1.5 font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {isDownloadingSuccessQr ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang tải PNG 1024×1024...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải mã QR (PNG 1024×1024)</span>
                      </>
                    )}
                  </button>
                  {successQrDownloadError && (
                    <p className="text-[10px] text-rose-600 mt-1 font-medium">{successQrDownloadError}</p>
                  )}
                  </div>
                </details>
                <p className="kol-link-success-note border-l-[3px] border-[#EEDFC6] pl-3 text-xs leading-7 text-[#7D715E]">Ghi nhận tiếp thị trong 30 ngày theo lượt nhấp cuối cùng.</p>
                <div className="kol-link-success-actions flex flex-wrap justify-end gap-2.5 border-t border-[#EAE4D7] pt-5 [&>button]:min-h-11 [&>button]:px-4 [&>button]:py-2.5 [&>button]:max-sm:flex-[1_1_140px]">
                  <button
                    onClick={() => {
                      setCreateLinkStep(1);
                      setCreatedSuccessLink(null);
                      setCreateFromDealId(null);
                      setSelectedProduct(null);
                                        setCustomExpiresAt('');
                      setFormLabel('');
                      setFormTouched({});
                    }}
                    className="px-3.5 py-1.5 border border-[#EAE4D7] hover:bg-[#FAF8F5] rounded-xl text-xs font-semibold text-[#7D715E] transition-colors cursor-pointer"
                  >
                    Tạo thêm link khác
                  </button>
                  <button
                    onClick={closeCreateModal}
                    className="px-4 py-2.5 bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Xem danh sách link
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(event) => { if (createLinkStep === 1) { event.preventDefault(); if (selectedProduct) setCreateLinkStep(2); } else { void handleCreateSubmit(event); } }}
                className={`flex flex-col flex-1 min-h-0 overflow-hidden ${isSubmitting ? 'pointer-events-none opacity-90' : ''}`}
              >

                <nav className="flex items-center justify-between border-b border-[#EAE4D7] bg-[#FAF8F5]/60 px-5 py-2.5" aria-label="Các bước tạo link">
                  <div className="flex items-center gap-4 w-full">
                    <button
                      type="button"
                      aria-current={createLinkStep === 1 ? 'step' : undefined}
                      onClick={() => setCreateLinkStep(1)}
                      className={`flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
                        createLinkStep === 1 ? 'text-[#B88E4F]' : 'text-[#7D715E] hover:text-[#1A1612]'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        createLinkStep === 1 ? 'bg-[#C59B58] text-white shadow-xs' : 'bg-[#EAE4D7] text-[#7D715E]'
                      }`}>
                        1
                      </span>
                      <span>Chọn sản phẩm</span>
                    </button>
                    <div className="flex-1 h-[1px] bg-[#EAE4D7]" />
                    <button
                      type="button"
                      disabled={!selectedProduct}
                      aria-current={createLinkStep === 2 ? 'step' : undefined}
                      onClick={() => setCreateLinkStep(2)}
                      className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                        !selectedProduct ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        createLinkStep === 2 ? 'text-[#B88E4F]' : 'text-[#7D715E] hover:text-[#1A1612]'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        createLinkStep === 2 ? 'bg-[#C59B58] text-white shadow-xs' : 'bg-[#EAE4D7] text-[#7D715E]'
                      }`}>
                        2
                      </span>
                      <span>Thiết lập liên kết</span>
                    </button>
                  </div>
                </nav>
                <div data-step={createLinkStep} className="kol-create-link-body p-4 sm:p-6 overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 space-y-2.5">
                  {createLinkStep === 1 && (<>



                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[#7D715E] uppercase tracking-wider flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-[#B88E4F]" />
                        <span>Sản phẩm tiếp thị</span>
                      </label>
                      {selectedProduct && !isChangingProduct ? (
                        <button
                          type="button"
                          onClick={() => setIsChangingProduct(true)}
                          className="text-[11px] font-semibold text-[#B88E4F] hover:text-[#7D715E] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Đổi sản phẩm khác</span>
                        </button>
                      ) : (
                          <span className="text-[11px] text-[#7D715E]">
                            {filteredEligibleProducts.length}{hasMoreEligibleProducts ? '+' : ''} sản phẩm
                          </span>
                      )}
                    </div>

                    {selectedProduct && !isChangingProduct ? (

                      <div className="p-2 bg-[#FAF8F5] border border-[#DEBE85] rounded-xl flex items-center justify-between gap-2.5 shadow-2xs animate-fadeIn">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={selectedProduct.imageUrl || '/assets/product-placeholder.svg'} onError={handleProductImageError}
                            alt={selectedProduct.title}
                            className="w-9 h-9 rounded-lg object-cover border border-[#EAE4D7] flex-shrink-0 bg-white"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-[#1A1612] truncate" title={selectedProduct.title}>
                              {selectedProduct.title}
                            </div>
                            <div className="text-[11px] text-[#7D715E] flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="font-medium text-[#1A1612]">{selectedProduct.store?.name}</span>
                              <span>•</span>
                              <span className="font-semibold text-[#1A1612]">
                                {Number(selectedProduct.price).toLocaleString('vi-VN')} đ
                              </span>
                              <span className="text-[10px] bg-[#FBF5EB] text-[#B88E4F] font-bold px-1.5 py-0.2 rounded border border-[#EEDFC6]">
                                Thù lao {selectedProduct.estimatedCommissionRate}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${productRemainingQuota > 0
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                              }`}
                          >
                            Còn {productRemainingQuota}/20 link
                          </span>
                        </div>
                      </div>
                    ) : (

                      <div className="kol-product-choices space-y-1.5 animate-fadeIn">
                        <div className="kol-create-link-filters grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                          <div className="sm:col-span-6 relative">
                            <Search className="w-3.5 h-3.5 text-[#7D715E] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={modalProductSearch}
                              onChange={(e) => setModalProductSearch(e.target.value)}
                              placeholder="Tìm sản phẩm, SKU..."
                              aria-label="Tìm sản phẩm để tạo link"
                              className="w-full pl-7 pr-6 py-1.5 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] outline-none transition-all"
                            />
                            {modalProductSearch && (
                              <button
                                type="button"
                                onClick={() => setModalProductSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7D715E] hover:text-[#1A1612] p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="sm:col-span-3">
                            <Select
                              value={modalShopFilter}
                              aria-label="Lọc cửa hàng sản phẩm"
                              onChange={(e) => setModalShopFilter(e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] outline-none truncate cursor-pointer"
                            >
                              <option value="ALL">Cửa hàng ({availableShops.length})</option>
                              {availableShops.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </Select>
                          </div>
                          <div className="sm:col-span-3">
                            <Select
                              value={modalCategoryFilter}
                              aria-label="Lọc ngành hàng sản phẩm"
                              onChange={(e) => setModalCategoryFilter(e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] text-xs text-[#1A1612] focus:bg-white focus:border-[#C59B58] outline-none truncate cursor-pointer"
                            >
                              <option value="ALL">Ngành ({availableCategories.length})</option>
                              {availableCategories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </Select>
                          </div>
                        </div>


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


                        {loadingProducts ? (
                          <div className="p-3 text-center text-[#7D715E] bg-[#FAF8F5] rounded-lg border border-[#EAE4D7]">
                            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-[#B88E4F]" />
                            <p className="text-xs">Đang tải danh mục sản phẩm...</p>
                          </div>
                        ) : filteredEligibleProducts.length === 0 ? (
                          <div className="p-3 text-center text-[#7D715E] bg-[#FAF8F5] rounded-lg border border-dashed border-[#EAE4D7]">
                            <PackageSearch className="w-6 h-6 text-[#B88E4F]/60 mx-auto mb-1" />
                            <p className="text-xs font-bold text-[#1A1612]">Không tìm thấy sản phẩm phù hợp</p>
                            <p className="text-[10px] text-[#7D715E] mt-0.5">Hãy thử tìm từ khóa khác hoặc liên hệ Shop để được duyệt tiếp thị.</p>
                          </div>
                        ) : (
                          <div role="group" aria-label="Chọn sản phẩm tiếp thị" className="kol-create-link-products max-h-[min(38dvh,340px)] overflow-y-auto divide-y divide-[#EAE4D7]/60 border border-[#EAE4D7] rounded-lg bg-white custom-scrollbar">
                            {filteredEligibleProducts.map((p) => {
                              const isSelected = selectedProduct?.id === p.id;
                              return (
                                <button
                                  type="button"
                                  aria-pressed={isSelected}
                                  key={p.id}
                                  onClick={() => handleSelectProduct(p)}
                                  className={`kol-create-product-row p-2 px-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-[#FBF5EB]' : 'hover:bg-[#FAF8F5]'
                                    }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img
                                      src={p.imageUrl || '/assets/product-placeholder.svg'} onError={handleProductImageError}
                                      alt={p.title}
                                      className="w-8 h-8 rounded-lg object-cover border border-[#EAE4D7] flex-shrink-0 bg-[#FAF8F5]"
                                    />
                                    <div className="min-w-0">
                                      <div className="kol-create-product-title font-semibold text-[#1A1612] text-xs line-clamp-2">{p.title}</div>
                                      <div className="text-[11px] text-[#7D715E] flex items-center gap-1.5 mt-0.5">
                                        <span className="font-medium text-[#1A1612]">{p.store.name}</span>
                                        <span>•</span>
                                        <span className="font-semibold text-[#1A1612]">
                                          {Number(p.price).toLocaleString('vi-VN')} đ
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <span className="kol-create-product-rate"><span>Thù lao {p.estimatedCommissionRate}%</span><span className="kol-create-product-check" aria-hidden="true">{isSelected && <Check size={14} />}</span></span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {hasMoreEligibleProducts && !loadingProducts && (
                          <button
                            type="button"
                            onClick={loadMoreEligibleProducts}
                            disabled={loadingMoreProducts}
                            className="w-full rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-xs font-semibold text-[#B88E4F] hover:bg-[#F3EFE6] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {loadingMoreProducts ? 'Đang tải thêm…' : 'Tải thêm sản phẩm'}
                          </button>
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




                  </>)}
                  {createLinkStep === 2 && selectedProduct && <ReferralLinkSetup
                    product={selectedProduct} deal={!!createFromDealId}
                    channel={formChannel} label={formLabel}
                    onChannel={value => { setFormChannel(value); setUtmSource(value.toLowerCase()); }}
                    onLabel={setFormLabel}
                    onChangeProduct={() => { setIsChangingProduct(true); setCreateLinkStep(1); }}
                    source={utmSource} medium={utmMedium} campaign={utmCampaign} content={utmContent}
                    onSource={setUtmSource} onMedium={setUtmMedium} onCampaign={setUtmCampaign} onContent={setUtmContent}
                  />}
                </div>


                <div className="kol-create-link-footer px-4 sm:px-6 py-4 border-t border-[#EAE4D7] bg-[#FAF8F5] flex flex-wrap items-center justify-between gap-3 flex-shrink-0 [&_button]:min-h-10 [&>div:last-child]:ml-auto">
                  <div className="text-xs text-[#7D715E] truncate max-w-[180px] sm:max-w-xs">
                    {createLinkStep === 1 && selectedProduct ? (<span className="kol-create-selected"><img src={getSafeProductImageUrl(selectedProduct.imageUrl)} onError={handleProductImageError} alt="" /><span title={selectedProduct.title}>{selectedProduct.title}</span></span>) : !selectedProduct ? (
                      <span className="text-[#7D715E] italic">Chưa chọn sản phẩm</span>
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
                      onClick={() => (createLinkStep === 2 ? setCreateLinkStep(1) : closeCreateModal())}
                      className="px-3 py-1.5 rounded-lg border border-[#EAE4D7] text-xs font-semibold text-[#7D715E] hover:bg-white transition-colors cursor-pointer"
                    >
                      {createLinkStep === 2 ? 'Quay lại' : 'Hủy bỏ'}
                    </button>
                    {createLinkStep === 1 ? (
                      <button
                        type="button"
                        disabled={!selectedProduct}
                        onClick={() => setCreateLinkStep(2)}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#C59B58] hover:bg-[#B88E4F] shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <span>Tiếp tục</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isSubmitDisabled}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#C59B58] hover:bg-[#B88E4F] shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang tạo...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Tạo link tiếp thị</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}




      {isQrModalOpen && selectedLinkForQr && <ReferralShareDialog
        key={selectedLinkForQr.id}
        link={selectedLinkForQr}
        targetUrl={selectedQrTargetUrl}
        qrDataUrl={selectedQrDataUrl}
        qrLoading={selectedQrLoading}
        qrError={selectedQrError}
        retryQr={retrySelectedQr}
        pngSize={qrPngSize}
        onSizeChange={setQrPngSize}
        downloading={isDownloadingQr}
        downloadError={qrDownloadError}
        onDownload={format => { void handleDownloadQr(format); }}
        onClose={() => setIsQrModalOpen(false)}
      />}

      {isAnalyticsModalOpen && selectedLinkForAnalytics && <ReferralAnalyticsDialog
        link={selectedLinkForAnalytics}
        data={analyticsData}
        loading={loadingAnalytics}
        error={analyticsError}
        channelLabel={getChannelLabel(selectedLinkForAnalytics.channel)}
        onClose={() => setIsAnalyticsModalOpen(false)}
      />}

      {isDeleteModalOpen && selectedLinkForDelete && (
        <div className="kol-link-delete-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-[1.5px] animate-fadeIn">
          <div role="dialog" aria-modal="true" aria-labelledby="kol-link-delete-title" aria-describedby="kol-link-delete-note" className="kol-link-delete-dialog bg-white rounded-2xl shadow-xl border border-[#EAE4D7] w-full max-w-sm text-left animate-in zoom-in-95 duration-150">
            <div className="kol-link-delete-heading">
              <div className="kol-link-delete-icon"><AlertCircle /></div>
              <div>
                <h3 id="kol-link-delete-title">Xóa link tiếp thị?</h3>
                <p>Link sẽ ngừng hoạt động sau khi xóa.</p>
              </div>
            </div>

            <div className="kol-link-delete-details">
              <div><span>Sản phẩm</span><strong title={selectedLinkForDelete.product?.title}>{selectedLinkForDelete.product?.title || 'Sản phẩm'}</strong></div>
              <div><span>Mã link</span><strong className="kol-link-delete-code">{selectedLinkForDelete.shortCode}</strong></div>
            </div>

            <p id="kol-link-delete-note" className="kol-link-delete-note">
              <CheckCircle2 /> Lịch sử lượt nhấp và đơn hàng đã phát sinh vẫn được giữ để đối soát hoa hồng.
            </p>

            <div className="kol-link-delete-actions">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="kol-link-delete-cancel"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="kol-link-delete-confirm"
              >
                Xóa liên kết
              </button>
            </div>
          </div>
        </div>
      )}


      {dealProposalProduct && <ExclusiveOfferModal mode="proposal" productId={dealProposalProduct.id} storeId={dealProposalProduct.store.id} onClose={() => setDealProposalProduct(null)} onSuccess={conversationId => { setDealProposalProduct(null); navigate('/chat?conversationId=' + conversationId); }} />}

      <SubmitKolVideoModal
        isOpen={isSubmitVideoModalOpen}
        initialProductId={selectedProductForVideo?.id}
        initialProductTitle={selectedProductForVideo?.title}
        onClose={() => {
          setIsSubmitVideoModalOpen(false);
          setSelectedProductForVideo(null);
        }}
        onSuccess={() => {
          setIsSubmitVideoModalOpen(false);
          setSelectedProductForVideo(null);
        }}
      />

      <Modal isOpen={dealPickerOpen} onClose={() => setDealPickerOpen(false)} title="Chọn sản phẩm đề xuất Deal" stickyHeader maxWidth="2xl" className="kol-deal-product-picker">
        <input aria-label="Tìm sản phẩm đề xuất Deal" placeholder="Tìm sản phẩm, SKU, cửa hàng…" value={dealProductSearch} onChange={e => setDealProductSearch(e.target.value)} className="w-full h-11 px-3 mb-3 rounded-xl border border-[#EAE4D7] text-sm outline-none focus:border-[#C59B58]" />
        {loadingProducts ? <p className="text-sm text-[#7D715E] py-6 text-center">Đang tải sản phẩm…</p> : loadProductsError ? <p role="alert" className="text-sm text-red-600">{loadProductsError}</p> : <div className="kol-deal-picker-list overflow-y-auto rounded-xl border border-[#EAE4D7] divide-y divide-[#EAE4D7]">
          {eligibleProducts.filter(product => `${product.title} ${product.sku} ${product.store.name}`.toLocaleLowerCase('vi-VN').includes(dealProductSearch.trim().toLocaleLowerCase('vi-VN'))).map(product => <button key={product.id} type="button" className="w-full flex items-center gap-3 p-3 text-left hover:bg-[#FBF5EB]" onClick={() => { setDealPickerOpen(false); openExclusiveDealDialog(product); }}>
            <img src={getSafeProductImageUrl(product.imageUrl)} onError={handleProductImageError} alt="" className="size-12 shrink-0 rounded-lg border border-[#EAE4D7] object-contain" /><span className="min-w-0 flex-1"><strong className="block text-sm font-semibold line-clamp-2">{product.title}</strong><span className="block text-xs text-[#7D715E] mt-1">{product.store.name}</span></span><ChevronRight size={16} className="text-[#B88E4F] shrink-0" />
          </button>)}
          {!eligibleProducts.length && <p className="text-sm text-[#7D715E] p-6 text-center">Chưa có sản phẩm phù hợp.</p>}
        </div>}
        {hasMoreEligibleProducts && <button type="button" disabled={loadingMoreProducts} onClick={() => void loadMoreEligibleProducts()} className="kol-create-link-button mt-3 w-full">{loadingMoreProducts ? 'Đang tải…' : 'Tải thêm sản phẩm'}</button>}
      </Modal>
      {/* Modal xác nhận xóa / hủy / gỡ deal độc quyền chuẩn thương hiệu */}
      <ConfirmModal
        isOpen={Boolean(dealToDelete)}
        onClose={() => !deletingDealId && setDealToDelete(null)}
        onConfirm={handleConfirmDeleteDeal}
        isLoading={Boolean(deletingDealId)}
        title={
          dealToDelete?.status === 'PENDING'
            ? 'Xác nhận hủy đề xuất Exclusive Deal'
            : dealToDelete?.status === 'APPROVED'
            ? 'Xác nhận gỡ bỏ deal độc quyền'
            : 'Xác nhận xóa đề xuất deal'
        }
        message={
          dealToDelete?.status === 'PENDING'
            ? `Bạn có chắc chắn muốn hủy và thu hồi đề xuất Exclusive Deal cho sản phẩm "${dealToDelete?.product?.title || 'này'}"? Shop sẽ không còn nhận được yêu cầu này nữa.`
            : dealToDelete?.status === 'APPROVED'
            ? `Bạn có chắc chắn muốn gỡ bỏ deal độc quyền cho sản phẩm "${dealToDelete?.product?.title || 'này'}"? Link tiếp thị sẽ quay về mức thù lao gốc cơ bản (10%) nếu bạn tiếp tục sử dụng.`
            : `Xóa vĩnh viễn đề xuất deal cho sản phẩm "${dealToDelete?.product?.title || 'này'}" khỏi danh sách của bạn?`
        }
        confirmText={
          dealToDelete?.status === 'PENDING'
            ? 'Hủy đề xuất'
            : dealToDelete?.status === 'APPROVED'
            ? 'Gỡ deal'
            : 'Xóa'
        }
        variant="danger"
      />
    </div>
  );
}
