import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { referralLinksService } from '../../services/referralLinksService';
import type {
  ReferralLinkItem,
  EligibleProduct,
} from '../../services/referralLinksService';

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
  const [selectedProduct, setSelectedProduct] = useState<EligibleProduct | null>(null);
  const [formChannel, setFormChannel] = useState<string>('TIKTOK');
  const [formLabel, setFormLabel] = useState('');
  const [formCoupon, setFormCoupon] = useState('');
  const [showAdvancedUtm, setShowAdvancedUtm] = useState(false);
  const [utmSource, setUtmSource] = useState('tiktok');
  const [utmMedium, setUtmMedium] = useState('creator');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmContent, setUtmContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSuccessLink, setCreatedSuccessLink] = useState<ReferralLinkItem | null>(null);

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

  // Mở modal tạo link & tải sản phẩm
  const handleOpenCreateModal = async () => {
    setIsCreateModalOpen(true);
    setCreatedSuccessLink(null);
    setSelectedProduct(null);
    setFormLabel('');
    setFormCoupon('');
    setUtmCampaign('');
    setUtmContent('');
    setLoadingProducts(true);
    try {
      const prods = await referralLinksService.getEligibleProducts();
      setEligibleProducts(prods);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi tải sản phẩm');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Submit tạo link mới
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      alert('Vui lòng chọn sản phẩm tiếp thị.');
      return;
    }
    if (!formLabel.trim()) {
      alert('Vui lòng nhập nhãn gợi nhớ (Label) cho liên kết.');
      return;
    }
    if (!formChannel) {
      alert('Vui lòng chọn kênh quảng bá (Channel).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const newLink = await referralLinksService.createLink({
        productId: selectedProduct.id,
        channel: formChannel,
        label: formLabel.trim(),
        customCouponCode: formCoupon.trim() || undefined,
        utmSource: utmSource.trim() || undefined,
        utmMedium: utmMedium.trim() || undefined,
        utmCampaign: utmCampaign.trim() || undefined,
        utmContent: utmContent.trim() || undefined,
      });

      setCreatedSuccessLink(newLink);
      fetchLinks();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo liên kết tiếp thị');
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Đang hoạt động
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <PauseCircle className="w-3.5 h-3.5" />
            Tạm ngừng
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            Đã hết hạn
          </span>
        );
      case 'BLOCKED':
        return (
          <div className="relative group inline-block">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 cursor-help">
              <ShieldAlert className="w-3.5 h-3.5" />
              Đã bị khóa
            </span>
            {link.disabledReason && (
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-20 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl">
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
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white border-b border-indigo-700 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 text-sm font-medium mb-1">
                <Link2 className="w-4 h-4" />
                <span>Tiếp Thị Liên Kết &amp; Đo Lường Đa Kênh (FR-10)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                Liên Kết Tiếp Thị Của Bạn
                <span className="text-xs bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2.5 py-0.5 rounded-full font-normal">
                  Chính sách Last Click 30 ngày
                </span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200 max-w-2xl">
                Tạo mã rút gọn độc quyền, gắn nhãn kênh (TikTok, YouTube, Facebook...) để đo lường chính xác hiệu quả từng chiến dịch và tối ưu doanh số.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
              >
                <Plus className="w-5 h-5" />
                Tạo link tiếp thị mới
              </button>
            </div>
          </div>

          {/* 2. Thống kê tổng hợp */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between text-indigo-200 text-xs font-medium mb-1">
                <span>Tổng link đang dùng</span>
                <Layers className="w-4 h-4 text-indigo-300" />
              </div>
              <div className="text-2xl font-bold text-white">
                {totalLinks} <span className="text-xs font-normal text-indigo-300">/ 500 tối đa</span>
              </div>
              <div className="text-[11px] text-indigo-200/80 mt-1">Đảm bảo quota không vượt hạn mức</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between text-indigo-200 text-xs font-medium mb-1">
                <span>Tổng lượt nhấp (Clicks)</span>
                <MousePointerClick className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">{totalClicks.toLocaleString('vi-VN')}</div>
              <div className="text-[11px] text-emerald-300 mt-1">Bao gồm tất cả các nguồn truy cập</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between text-indigo-200 text-xs font-medium mb-1">
                <span>Lượt nhấp duy nhất (Unique)</span>
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white">{totalUniqueClicks.toLocaleString('vi-VN')}</div>
              <div className="text-[11px] text-amber-200 mt-1">Chống click ảo trong 30 giây</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between text-indigo-200 text-xs font-medium mb-1">
                <span>Đơn hàng chuyển đổi</span>
                <ShoppingBag className="w-4 h-4 text-purple-300" />
              </div>
              <div className="text-2xl font-bold text-white">{totalOrders.toLocaleString('vi-VN')}</div>
              <div className="text-[11px] text-purple-200 mt-1">Ghi nhận hoa hồng theo Last Click</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Bộ lọc và Tìm kiếm */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo mã rút gọn, tên sản phẩm hoặc nhãn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm outline-none transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white outline-none cursor-pointer"
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
                className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white outline-none cursor-pointer"
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
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm"
              >
                Áp dụng
              </button>
            </div>
          </form>
        </div>

        {/* 4. Danh sách Link Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
              <p className="text-sm font-medium">Đang tải danh sách liên kết tiếp thị...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-12 text-center text-rose-600">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
              <p className="text-sm font-semibold">{errorMsg}</p>
              <button
                onClick={fetchLinks}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Thử lại
              </button>
            </div>
          ) : links.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
                <Link2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Bạn chưa tạo liên kết tiếp thị nào</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                Hãy chọn sản phẩm từ các Cửa hàng uy tín trên sàn để bắt đầu tạo link rút gọn và chia sẻ tới người theo dõi của bạn.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Tạo link đầu tiên ngay
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Sản phẩm &amp; Cửa hàng</th>
                    <th className="py-3.5 px-4">Mã rút gọn &amp; Kênh</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4 text-center">Lượt nhấp (Clicks)</th>
                    <th className="py-3.5 px-4 text-center">Đơn hàng</th>
                    <th className="py-3.5 px-4">Ngày tạo</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {links.map((link) => {
                    const isCopied = copiedCode === link.shortCode;
                    return (
                      <tr key={link.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Cột 1: Sản phẩm & Shop */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3 max-w-xs">
                            <img
                              src={
                                link.product?.imageUrl ||
                                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100'
                              }
                              alt={link.product?.title}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0 bg-slate-100"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate" title={link.product?.title}>
                                {link.product?.title}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                <Store className="w-3 h-3 text-slate-400" />
                                <span className="truncate">{link.store?.name}</span>
                              </div>
                              <div className="text-xs font-semibold text-emerald-600 mt-0.5">
                                {Number(link.product?.price || 0).toLocaleString('vi-VN')} đ
                                {link.commissionRate && (
                                  <span className="ml-1.5 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-medium">
                                    HH: {link.commissionRate}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Cột 2: Mã rút gọn & Kênh */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-xs">
                                {link.shortCode}
                              </span>
                              <button
                                onClick={() => handleCopyLink(link.shortUrl, link.shortCode)}
                                className={`p-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                                  isCopied
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                                title="Sao chép link"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span className="text-[11px]">{isCopied ? 'Đã sao chép' : 'Sao chép'}</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <span className="font-medium text-slate-700">{getChannelLabel(link.channel)}</span>
                              {link.label && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-slate-500 italic truncate max-w-[150px]" title={link.label}>
                                    "{link.label}"
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cột 3: Trạng thái */}
                        <td className="py-4 px-4">{renderStatusBadge(link)}</td>

                        {/* Cột 4: Clicks */}
                        <td className="py-4 px-4 text-center">
                          <div className="font-bold text-slate-900">{link.totalClicks}</div>
                          <div className="text-[11px] text-slate-400">
                            {link.uniqueClicks} unique
                          </div>
                        </td>

                        {/* Cột 5: Đơn hàng */}
                        <td className="py-4 px-4 text-center">
                          <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full text-xs">
                            {link.totalOrders} đơn
                          </span>
                        </td>

                        {/* Cột 6: Ngày tạo */}
                        <td className="py-4 px-4 text-xs text-slate-500">
                          {new Date(link.createdAt).toLocaleDateString('vi-VN')}
                        </td>

                        {/* Cột 7: Thao tác */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Mở link thử nghiệm */}
                            <a
                              href={link.shortUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Mở thử link"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>

                            {/* Xem QR Code */}
                            <button
                              onClick={() => {
                                setSelectedLinkForQr(link);
                                setIsQrModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Mã QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>

                            {/* Tạm ngừng / Kích hoạt lại */}
                            <button
                              onClick={() => handleToggleStatus(link)}
                              disabled={link.status === 'BLOCKED'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                link.status === 'ACTIVE'
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              } ${link.status === 'BLOCKED' ? 'opacity-40 cursor-not-allowed' : ''}`}
                              title={link.status === 'ACTIVE' ? 'Tạm ngừng link' : 'Tiếp tục kích hoạt link'}
                            >
                              {link.status === 'ACTIVE' ? (
                                <PauseCircle className="w-4 h-4" />
                              ) : (
                                <PlayCircle className="w-4 h-4" />
                              )}
                            </button>

                            {/* Xóa mềm */}
                            <button
                              onClick={() => {
                                setSelectedLinkForDelete(link);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Xóa mềm link"
                            >
                              <Trash2 className="w-4 h-4" />
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
      </div>

      {/* ======================================================== */}
      {/* 5. MODAL TẠO LINK TIẾP THỊ MỚI                           */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header modal */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  Tạo Link Tiếp Thị Rút Gọn (FR-10)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chọn sản phẩm và kênh truyền thông để sinh mã rút gọn 8 ký tự duy nhất.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nội dung form hoặc màn hình thành công */}
            {createdSuccessLink ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-1">Tạo Link Tiếp Thị Thành Công!</h4>
                <p className="text-sm text-slate-600 mb-6">
                  Đường dẫn rút gọn của bạn đã sẵn sàng hoạt động với thời hạn ghi nhận cookie 30 ngày (Last Click).
                </p>

                {/* Khung link rút gọn */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-left">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Đường dẫn tiếp thị:
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-indigo-700 text-base break-all">
                      {createdSuccessLink.shortUrl}
                    </span>
                    <button
                      onClick={() => handleCopyLink(createdSuccessLink.shortUrl, createdSuccessLink.shortCode)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                      Sao chép
                    </button>
                  </div>
                </div>

                {/* Xem trước QR */}
                {createdSuccessLink.qrCodeUrl && (
                  <div className="flex flex-col items-center justify-center mb-6">
                    <img
                      src={createdSuccessLink.qrCodeUrl}
                      alt="QR Code"
                      className="w-36 h-36 border border-slate-200 rounded-xl p-2 bg-white shadow-sm"
                    />
                    <a
                      href={createdSuccessLink.qrCodeUrl}
                      download={`QR-${createdSuccessLink.shortCode}.png`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 text-xs text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Tải ảnh QR Code
                    </a>
                  </div>
                )}

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setCreatedSuccessLink(null);
                      setSelectedProduct(null);
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-700"
                  >
                    Tạo thêm link khác
                  </button>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow"
                  >
                    Xem danh sách link
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} className="p-5 space-y-5">
                {/* Bước 1: Chọn sản phẩm */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    1. Chọn sản phẩm tiếp thị *
                  </label>
                  {loadingProducts ? (
                    <div className="p-8 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                      <p className="text-xs">Đang tải danh mục sản phẩm của Shop...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                        {eligibleProducts.map((p) => {
                          const isSelected = selectedProduct?.id === p.id;
                          return (
                            <div
                              key={p.id}
                              onClick={() => setSelectedProduct(p)}
                              className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                                isSelected ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={p.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100'}
                                  alt={p.title}
                                  className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                                />
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-800 text-xs truncate">{p.title}</div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                    <span>{p.store.name}</span>
                                    <span>•</span>
                                    <span className="font-semibold text-emerald-600">
                                      {Number(p.price).toLocaleString('vi-VN')} đ
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                  Hoa hồng: {p.estimatedCommissionRate}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {selectedProduct && (
                        <div className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã chọn: <strong>{selectedProduct.title}</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bước 2: Kênh & Nhãn */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      2. Kênh quảng bá *
                    </label>
                    <select
                      value={formChannel}
                      onChange={(e) => {
                        setFormChannel(e.target.value);
                        setUtmSource(e.target.value.toLowerCase());
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none"
                    >
                      <option value="TIKTOK">TikTok (Bio / Video)</option>
                      <option value="YOUTUBE">YouTube (Mô tả / Shorts)</option>
                      <option value="FACEBOOK">Facebook (Post / Story / Group)</option>
                      <option value="INSTAGRAM">Instagram (Story / Bio)</option>
                      <option value="THREADS">Threads</option>
                      <option value="ZALO">Zalo</option>
                      <option value="OTHER">Kênh khác / Livestream</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      3. Nhãn gợi nhớ (Label) *
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Video review 9.9, Livestream tối..."
                      value={formLabel}
                      onChange={(e) => setFormLabel(e.target.value)}
                      required
                      maxLength={150}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* Bước 3: Mã giảm giá riêng (tùy chọn) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mã giảm giá cá nhân (Custom Coupon) - Tùy chọn
                  </label>
                  <input
                    type="text"
                    placeholder="VD: KOLTHANG10"
                    value={formCoupon}
                    onChange={(e) => setFormCoupon(e.target.value)}
                    maxLength={50}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none uppercase font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Khách hàng bấm link sẽ tự động nhận mã này tại trang thanh toán (nếu Shop có kích hoạt).
                  </p>
                </div>

                {/* Bước 4: Tùy chỉnh UTM nâng cao */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedUtm(!showAdvancedUtm)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <span>{showAdvancedUtm ? '▲ Ẩn tham số UTM nâng cao' : '▼ Tùy chỉnh tham số UTM nâng cao (Tùy chọn)'}</span>
                  </button>

                  {showAdvancedUtm && (
                    <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <span className="text-slate-500">utm_source:</span>
                        <input
                          type="text"
                          value={utmSource}
                          onChange={(e) => setUtmSource(e.target.value)}
                          className="w-full mt-1 px-2.5 py-1.5 border rounded bg-white"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500">utm_medium:</span>
                        <input
                          type="text"
                          value={utmMedium}
                          onChange={(e) => setUtmMedium(e.target.value)}
                          className="w-full mt-1 px-2.5 py-1.5 border rounded bg-white"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500">utm_campaign:</span>
                        <input
                          type="text"
                          placeholder="sunscreen_sep"
                          value={utmCampaign}
                          onChange={(e) => setUtmCampaign(e.target.value)}
                          className="w-full mt-1 px-2.5 py-1.5 border rounded bg-white"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500">utm_content:</span>
                        <input
                          type="text"
                          placeholder="review_01"
                          value={utmContent}
                          onChange={(e) => setUtmContent(e.target.value)}
                          className="w-full mt-1 px-2.5 py-1.5 border rounded bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Nút bấm hành động */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedProduct || isSubmitting}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-md flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang sinh mã rút gọn...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Sinh Link Tiếp Thị Ngay</span>
                      </>
                    )}
                  </button>
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
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <QrCode className="w-5 h-5 text-indigo-600" />
                Mã QR Tiếp Thị (FR-11)
              </h3>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block mb-3">
              <img
                src={selectedLinkForQr.qrCodeUrl || ''}
                alt="QR Code"
                className="w-48 h-48 rounded-xl object-contain bg-white"
              />
            </div>

            <div className="text-xs font-semibold text-slate-800 mb-1">
              {selectedLinkForQr.product?.title}
            </div>
            <div className="font-mono text-xs text-indigo-600 font-bold mb-4">
              Mã: {selectedLinkForQr.shortCode}
            </div>

            <div className="flex items-center justify-center gap-2">
              <a
                href={selectedLinkForQr.qrCodeUrl || ''}
                download={`QR-${selectedLinkForQr.shortCode}.png`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow"
              >
                <Download className="w-4 h-4" />
                Tải ảnh QR
              </a>
              <button
                onClick={() => handleCopyLink(selectedLinkForQr.shortUrl, selectedLinkForQr.shortCode)}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1"
              >
                <Copy className="w-4 h-4" />
                Sao chép link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. MODAL XÁC NHẬN XÓA MỀM LINK                           */}
      {/* ======================================================== */}
      {isDeleteModalOpen && selectedLinkForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa liên kết tiếp thị</h3>
                <p className="text-xs text-slate-500">Hành động này sẽ thực hiện Xóa mềm (Soft Delete)</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1 mb-6">
              <div>• <strong>Sản phẩm:</strong> {selectedLinkForDelete.product?.title}</div>
              <div>• <strong>Mã link:</strong> {selectedLinkForDelete.shortCode}</div>
              <div className="text-slate-400 mt-2">
                * Lưu ý: Lịch sử lượt click và các đơn hàng phát sinh trước đây vẫn được lưu trữ toàn vẹn để đối soát hoa hồng.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow"
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
