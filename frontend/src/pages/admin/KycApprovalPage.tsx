import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  CreditCard,
  Search,
  CheckCircle2,
  Eye,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Clock,
  AlertCircle,
  X,
  Sparkles,
  FileText,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import { kycService } from '../../services/kyc.service';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';

function readKycMetadata(value: unknown): Record<string, any> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function formatKycDate(value?: string | Date | null): string {
  if (!value) return 'Chưa có thông tin';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa có thông tin' : date.toLocaleString('vi-VN');
}

function normalizeVietnameseName(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .toUpperCase();
}

export default function KycApprovalPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UNVERIFIED' | 'VERIFIED' | 'REJECTED'>('UNVERIFIED');

  // Inspect modal
  const [inspectProfile, setInspectProfile] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // TanStack Query: Caching danh sách hồ sơ nâng cấp
  const {
    data: applicationsData,
    isLoading: loading,
    refetch: loadApplications,
  } = useQuery({
    queryKey: ['upgrade-applications'],
    queryFn: async () => {
      const res = await kycService.getUpgradeApplications();
      return res || { kolApplications: [], shopApplications: [] };
    },
    staleTime: 1000 * 60 * 3,
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    showToast(`Đã sao chép ${label}`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Mutation: Duyệt/Từ chối KOL
  const reviewKolMutation = useMutation({
    mutationFn: async ({
      profileId,
      status,
      reason,
    }: {
      profileId: string;
      status: 'VERIFIED' | 'REJECTED';
      reason?: string;
    }) => {
      return kycService.reviewKolApplication(profileId, status, reason);
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['upgrade-applications'] });
      showToast(
        status === 'VERIFIED'
          ? 'Đã phê duyệt Đối tác, kích hoạt Hạng Đồng (10%) và cấp Tích Xanh kênh!'
          : 'Đã từ chối hồ sơ và gửi thông báo yêu cầu cập nhật.',
      );
      setInspectProfile(null);
      setShowRejectInput(false);
      setRejectReason('');
    },
    onError: (err: any) => {
      showToast(err.message || 'Thao tác phê duyệt thất bại', 'error');
    },
  });

  const handleReviewKol = async (profileId: string, status: 'VERIFIED' | 'REJECTED') => {
    if (status === 'REJECTED' && !showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    if (status === 'REJECTED' && !rejectReason.trim()) {
      showToast('Vui lòng nêu rõ lý do cần bổ sung hoặc chỉnh sửa để đối tác cập nhật.', 'error');
      return;
    }
    reviewKolMutation.mutate({ profileId, status, reason: rejectReason.trim() || undefined });
  };

  // Chuẩn hóa danh sách KOL
  const rawKols = applicationsData?.kolApplications || [];
  const displayKols = rawKols.map((p: any) => {
    const rawKyc = p.kycStatus || 'UNVERIFIED';
    const isVerified = rawKyc === 'VERIFIED';
    const isRejected = rawKyc === 'REJECTED';
    const fullName = p.fullName || p.user?.fullName || 'Đối tác Tiếp thị';
    const socialLinks = readKycMetadata(p.socialLinksJson);
    const socialChannels = p.user?.socialChannels || [];
    const primaryChannel = socialChannels.find((channel: any) => channel.isPrimary) || socialChannels[0];
    const frontCardUrl = socialLinks.frontCardUrl || null;
    const backCardUrl = socialLinks.backCardUrl || null;
    const channelUrl = socialLinks.channelUrl || primaryChannel?.channelUrl || null;

    const idCard = p.idCardNumber?.trim() || '';
    const isValidIdCardLength = idCard.length === 12;
    const accountHolder = (p.bankAccountName || '').trim();
    const isNameMatched =
      Boolean(accountHolder) &&
      Boolean(fullName) &&
      normalizeVietnameseName(fullName) === normalizeVietnameseName(accountHolder);

    const missingRequiredFields = [
      !idCard && 'Số CCCD',
      !frontCardUrl && 'Ảnh CCCD mặt trước',
      !backCardUrl && 'Ảnh CCCD mặt sau',
      !p.bankName?.trim() && 'Ngân hàng thụ hưởng',
      !p.bankAccountNumber?.trim() && 'Số tài khoản',
      !accountHolder && 'Tên chủ tài khoản',
      !channelUrl && 'Đường dẫn kênh nội dung',
    ].filter(Boolean);

    return {
      id: p.id,
      userId: p.userId,
      fullName,
      avatarUrl: p.user?.avatarUrl || p.avatarUrl || null,
      email: p.user?.email || 'kol@scanms.vn',
      phone: p.user?.phoneNumber || 'Chưa cung cấp',
      role: p.user?.role || 'CUSTOMER',
      kycStatus: rawKyc,
      kycLabel: isVerified ? 'Đã xác minh' : isRejected ? 'Bị từ chối' : 'Chờ thẩm định',
      tierName: p.tier?.name || 'Hạng Đồng (Bronze)',
      commissionRate: '10%',
      createdAt: formatKycDate(socialLinks.submittedAt || p.updatedAt || p.createdAt),
      status: isVerified ? 'active' : isRejected ? 'rejected' : 'pending',
      avatar: fullName[0]?.toUpperCase() || 'K',
      avatarBg: isVerified
        ? 'bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]'
        : isRejected
          ? 'bg-rose-100 text-rose-800'
          : 'bg-[#F3EFE6] text-[#7D715E]',
      idCardNumber: idCard || 'Chưa cung cấp',
      isValidIdCardLength,
      taxCode: p.taxCode || 'Chưa khai báo',
      bankName: p.bankName || 'Chưa cung cấp',
      accountNumber: p.bankAccountNumber || 'Chưa cung cấp',
      accountHolder: accountHolder || 'Chưa cung cấp',
      isNameMatched,
      bio: p.bio || '',
      frontCardUrl,
      backCardUrl,
      channelProofUrl: socialLinks.channelProofUrl || null,
      channelPlatform: socialLinks.platform || primaryChannel?.platformName || 'TIKTOK',
      channelName: socialLinks.channelName || primaryChannel?.channelName || 'Kênh đối tác',
      channelUrl,
      followerCount: socialLinks.followerCount ?? primaryChannel?.followerCount ?? p.totalFollowers ?? 0,
      socialChannels,
      missingRequiredFields,
      channelsList:
        socialLinks.channels && socialLinks.channels.length > 0
          ? socialLinks.channels
          : socialChannels.length > 0
            ? socialChannels.map((c: any) => ({
                platform: c.platformName || c.platform,
                channelName: c.channelName,
                channelUrl: c.channelUrl,
                followerCount: c.followerCount,
                channelProofUrl: socialLinks.channelProofUrl,
                isPrimary: c.isPrimary,
                isVerified: c.isVerified,
              }))
            : channelUrl
              ? [
                  {
                    platform: socialLinks.platform || 'TIKTOK',
                    channelName: socialLinks.channelName || '',
                    channelUrl,
                    followerCount: socialLinks.followerCount || p.totalFollowers || 0,
                    channelProofUrl: socialLinks.channelProofUrl,
                    isPrimary: true,
                    isVerified: isVerified,
                  },
                ]
              : [],
      specialtyCategories: socialLinks.specialtyCategories || [],
      contentStyles: socialLinks.contentStyles || [],
    };
  });

  const filteredKols = displayKols.filter((u: any) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search) ||
      u.idCardNumber.includes(search) ||
      u.channelName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || u.kycStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const pendingCount = displayKols.filter((u: any) => u.kycStatus === 'UNVERIFIED').length;
  const verifiedCount = displayKols.filter((u: any) => u.kycStatus === 'VERIFIED').length;
  const rejectedCount = displayKols.filter((u: any) => u.kycStatus === 'REJECTED').length;
  const totalCount = displayKols.length;

  return (
    <div className="w-full min-w-0 pb-8 flex flex-col gap-4 text-left">
      {/* Toast thông báo */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
            toastMsg.type === 'error'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-[#FBF5EB] text-[#8F682E] border-[#EEDFC6]'
          }`}
        >
          {toastMsg.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#B88E4F] shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Ảnh phóng to Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2 border border-[#EAE4D7] shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewImage}
              alt="Chi tiết tài liệu"
              className="max-h-[85vh] w-auto rounded-xl object-contain mx-auto"
            />
          </div>
        </div>
      )}

      {/* Header Chuẩn Mực */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EAE4D7] bg-white px-4 py-4 sm:px-6 shadow-[0_1px_2px_rgba(35,29,21,0.02)]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid place-items-center shrink-0 w-11 h-11 border border-[#EEDFC6] rounded-xl bg-[#FBF5EB] text-[#B88E4F]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="m-0 text-base font-bold tracking-tight text-[#1A1612]">Thẩm định Đối tác</h1>
            <p className="mb-0 mt-0.5 text-xs text-[#7D715E]">Xác minh danh tính và kênh truyền thông đối tác tiếp thị.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => showToast('Đang tạo báo cáo thẩm định eKYC...')}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-semibold text-[#7D715E] transition hover:border-[#EEDFC6] hover:bg-[#FBF5EB] hover:text-[#8F682E] cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#B88E4F]" />
            <span>Xuất báo cáo</span>
          </button>
          <button
            type="button"
            onClick={() => loadApplications()}
            disabled={loading}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3.5 text-xs font-semibold text-[#8F682E] transition hover:bg-[#F3EFE6] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </header>

      {/* 4 Thẻ Thống Kê Theo Quy Trình Vận Hành */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Chờ thẩm định',
            subLabel: 'Cần Maker-Checker xử lý',
            value: pendingCount,
            filter: 'UNVERIFIED' as const,
            icon: <Clock className="h-4 w-4" />,
            isHighlight: pendingCount > 0,
          },
          {
            label: 'Đã xác minh (Tích Xanh)',
            subLabel: 'Hạng Đồng · 10% Thù lao',
            value: verifiedCount,
            filter: 'VERIFIED' as const,
            icon: <CheckCircle2 className="h-4 w-4 text-[#059669]" />,
            isHighlight: false,
          },
          {
            label: 'Cần bổ sung / Từ chối',
            subLabel: 'Chờ đối tác nộp lại',
            value: rejectedCount,
            filter: 'REJECTED' as const,
            icon: <AlertCircle className="h-4 w-4 text-rose-600" />,
            isHighlight: false,
          },
          {
            label: 'Tổng hồ sơ đăng ký',
            subLabel: 'Mạng lưới đối tác sàn',
            value: totalCount,
            filter: 'ALL' as const,
            icon: <CreditCard className="h-4 w-4 text-[#B88E4F]" />,
            isHighlight: false,
          },
        ].map((stat) => (
          <button
            type="button"
            key={stat.label}
            aria-pressed={filterStatus === stat.filter}
            onClick={() => {
              setFilterStatus(stat.filter);
              setSearch('');
            }}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition cursor-pointer min-h-[96px] ${
              filterStatus === stat.filter
                ? 'border-[#C59B58] bg-[#FBF5EB] shadow-xs ring-1 ring-[#C59B58]/20'
                : 'border-[#EAE4D7] bg-white hover:border-[#C59B58]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-[#7D715E]">{stat.label}</span>
              <span className="grid h-7 w-7 place-items-center rounded-lg border border-[#EAE4D7] bg-[#FAF8F5]">
                {stat.icon}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <strong className="text-2xl font-bold tabular-nums text-[#1A1612]">{stat.value}</strong>
              <span className="text-[10px] text-[#9A8D78]">{stat.subLabel}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Bộ Lọc Tìm Kiếm & Trạng Thái */}
      <Card className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_240px_auto] items-center gap-3 rounded-2xl border-[#EAE4D7] bg-white p-3.5 shadow-none">
        <Input
          aria-label="Tìm hồ sơ đối tác"
          placeholder="Tìm theo tên đối tác, email, SĐT, số CCCD hoặc tên kênh..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          clearable
          onClear={() => setSearch('')}
          icon={<Search className="h-4 w-4 text-[#7D715E]" />}
          className="border-[#EAE4D7] bg-white focus-within:border-[#C59B58] focus-within:ring-[#C59B58]/15"
        />

        <Select
          aria-label="Lọc trạng thái thẩm định"
          className="w-full"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          options={[
            { value: 'ALL', label: 'Tất cả trạng thái hồ sơ' },
            { value: 'UNVERIFIED', label: 'Chờ thẩm định' },
            { value: 'VERIFIED', label: 'Đã xác minh' },
            { value: 'REJECTED', label: 'Cần bổ sung / Từ chối' },
          ]}
        />
        <span className="whitespace-nowrap text-xs text-[#7D715E] font-medium" aria-live="polite">
          Hiển thị <strong className="text-[#1A1612]">{filteredKols.length}</strong> / {displayKols.length} hồ sơ
        </span>
      </Card>

      {/* Bảng Danh Sách Hồ Sơ Đối Tác */}
      <Card className="overflow-hidden rounded-2xl border-[#EAE4D7] bg-white p-0 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4D7] bg-white px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="m-0 text-xs font-bold uppercase tracking-wider text-[#1A1612]">
                Danh sách hồ sơ đối tác tiếp thị (KOL/KOC)
              </h2>
              <p className="mb-0 mt-0.5 text-[11px] text-[#7D715E]">
                Thẩm định CCCD 12 số, tài khoản ngân hàng thụ hưởng Napas và cấp Tích Xanh kênh truyền thông
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-0.5 text-[11px] font-semibold text-[#8F682E]">
              {pendingCount} hồ sơ chờ thẩm định
            </span>
          </div>
        </div>

        <div className="max-w-full overflow-x-auto" role="region" aria-label="Danh sách hồ sơ đối tác" tabIndex={0}>
          <table className="w-full min-w-[1020px] table-fixed border-collapse text-left text-xs">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[11%]" />
              <col className="w-[12%]" />
              <col className="w-[11%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[#EAE4D7] bg-[#FAF8F5]">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7D715E]">
                  Đối tác tiếp thị
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7D715E]">
                  Định danh & Liên hệ
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7D715E]">
                  Kênh truyền thông
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7D715E]">
                  Followers
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7D715E]">
                  Hạng khởi điểm
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7D715E]">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-[#7D715E]">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1ECE3]">
              {filteredKols.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#7D715E]">
                    <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-[#FAF8F5] text-[#B88E4F]">
                      <Search className="h-5 w-5" />
                    </div>
                    <div className="font-bold text-[#1A1612]">Không tìm thấy hồ sơ đối tác</div>
                    <div className="mt-1 text-[11px] text-[#7D715E]">
                      Thử đổi từ khóa tìm kiếm hoặc chuyển bộ lọc trạng thái.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredKols.map((u: any) => (
                  <tr key={u.id} className="transition-colors hover:bg-[#FAF8F5]/80">
                    {/* Cột 1: Đối tác */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`h-9 w-9 shrink-0 overflow-hidden rounded-xl flex items-center justify-center font-bold text-xs ${u.avatarBg}`}
                        >
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.fullName} className="h-full w-full object-cover" />
                          ) : (
                            u.avatar
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-bold leading-5 text-[#1A1612]">
                            <span className="truncate" title={u.fullName}>
                              {u.fullName}
                            </span>
                            {u.kycStatus === 'VERIFIED' && (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#059669]" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-[#7D715E]">
                            <span className="font-medium">{u.role}</span>
                            <span>·</span>
                            <span className="tabular-nums">{u.createdAt}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Định danh & Liên hệ */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="font-mono text-xs font-bold text-[#1A1612] flex items-center gap-1">
                        <span>CCCD: {u.idCardNumber}</span>
                        
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-[#7D715E]" title={u.email}>
                        {u.email}
                      </div>
                      <div className="text-[10px] text-[#7D715E]">{u.phone}</div>
                    </td>

                    {/* Cột 3: Kênh sáng tạo FR-07 */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md bg-[#FAF8F5] border border-[#EAE4D7] px-1.5 py-0.5 text-[9px] font-bold text-[#7D715E] uppercase">
                          {u.channelPlatform}
                        </span>
                        {u.channelUrl ? (
                          <a
                            href={u.channelUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-[120px] items-center gap-1 truncate text-xs font-semibold text-[#8F682E] hover:underline"
                            title={u.channelUrl}
                          >
                            <span className="truncate">{u.channelName}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-xs text-[#7D715E]">{u.channelName}</span>
                        )}
                      </div>
                      
                    </td>

                    {/* Cột 4: Followers */}
                    <td className="px-4 py-3.5 align-middle text-xs font-bold tabular-nums text-[#1A1612]">
                      {Number(u.followerCount).toLocaleString('vi-VN')}
                      <span className="block text-[10px] font-normal text-[#7D715E]">người theo dõi</span>
                    </td>

                    {/* Cột 5: Hạng khởi điểm */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="inline-flex flex-col">
                        <span className="font-semibold text-xs text-[#8F682E]">
                          {u.tierName}
                        </span>
                        <span className="text-[10px] text-[#7D715E] font-mono">
                          Thù lao gốc: {u.commissionRate}
                        </span>
                      </div>
                    </td>

                    {/* Cột 6: Trạng thái */}
                    <td className="px-4 py-3.5 align-middle">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          u.kycStatus === 'VERIFIED'
                            ? 'bg-[#FBF5EB] border-[#EEDFC6] text-[#059669]'
                            : u.kycStatus === 'REJECTED'
                              ? 'bg-rose-50 border-rose-200 text-rose-700'
                              : 'bg-[#FBF5EB] border-[#EEDFC6] text-[#8F682E]'
                        }`}
                      >
                        {u.kycStatus === 'VERIFIED' ? (
                          <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                        ) : u.kycStatus === 'REJECTED' ? (
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                        ) : (
                          <Clock className="w-3 h-3 text-[#B88E4F]" />
                        )}
                        {u.kycLabel}
                      </span>
                    </td>

                    {/* Cột 7: Thao tác */}
                    <td className="px-4 py-3.5 align-middle text-right">
                      <Button
                        variant="gold"
                        size="sm"
                        className="px-3 text-xs"
                        icon={<Eye className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setInspectProfile(u);
                          setShowRejectInput(false);
                          setRejectReason('');
                        }}
                      >
                        Thẩm định
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL THẨM ĐỊNH CHI TIẾT MAKER-CHECKER (FR-05, FR-06, FR-07) */}
      {inspectProfile && (
        <Modal
          isOpen={true}
          onClose={() => setInspectProfile(null)}
          title={
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#1A1612]">
                Hồ sơ Thẩm định Đối tác Tiếp thị (Maker-Checker)
              </span>
              <span className="rounded-md border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-0.5 text-[10px] font-bold text-[#8F682E]">
                FR-05 · FR-06 · FR-07
              </span>
            </div>
          }
          subtitle={
            <span className="text-xs text-[#7D715E]">
              {inspectProfile.fullName} · {inspectProfile.email} · Nộp ngày: {inspectProfile.createdAt}
            </span>
          }
          icon={<ShieldCheck className="h-4 w-4 text-[#B88E4F]" />}
          maxWidth="4xl"
          className="max-h-[calc(100dvh-2rem)] overflow-hidden rounded-3xl border-[#EAE4D7] bg-[#FAF8F5] p-5 shadow-[0_24px_80px_rgba(35,29,21,0.18)]"
        >
          <div className="flex flex-col gap-4 text-left text-xs max-h-[78vh] overflow-y-auto pr-1">
            {/* Banner Thông tin đối tác & Trạng thái */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] font-bold text-sm text-[#8F682E]">
                  {inspectProfile.avatarUrl ? (
                    <img src={inspectProfile.avatarUrl} alt={inspectProfile.fullName} className="h-full w-full object-cover" />
                  ) : (
                    inspectProfile.avatar
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold text-[#1A1612]">{inspectProfile.fullName}</strong>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                        inspectProfile.status === 'active'
                          ? 'border-[#EEDFC6] bg-[#FBF5EB] text-[#059669]'
                          : inspectProfile.status === 'rejected'
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#8F682E]'
                      }`}
                    >
                      {inspectProfile.kycLabel}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#7D715E]">
                    <span>Email: <strong className="text-[#1A1612]">{inspectProfile.email}</strong></span>
                    <span>SĐT: <strong className="text-[#1A1612]">{inspectProfile.phone}</strong></span>
                    <span>Vai trò hiện tại: <strong className="text-[#1A1612]">{inspectProfile.role}</strong></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-right">
                  <span className="block text-[10px] text-[#7D715E]">Cấp bậc kích hoạt</span>
                  <strong className="block text-xs font-bold text-[#8F682E]">Hạng Đồng (Bronze) · 10%</strong>
                </div>
              </div>
            </div>

            {/* BẢNG ĐỐI SOÁT TỰ ĐỘNG MAKER-CHECKER (AUTOMATED CROSS-CHECK) */}
            {/* Thanh trạng thái đối soát */}
            <div className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3 flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs font-semibold text-[#1A1612]">Kết quả đối soát:</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                  inspectProfile.isNameMatched
                    ? 'bg-[#FBF5EB] text-[#8F682E] border-[#EEDFC6]'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {inspectProfile.isNameMatched ? 'Khớp tên chủ thẻ' : 'Lệch tên đăng ký'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                  inspectProfile.isValidIdCardLength
                    ? 'bg-[#FBF5EB] text-[#8F682E] border-[#EEDFC6]'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {inspectProfile.isValidIdCardLength ? 'CCCD 12 số hợp lệ' : 'Kiểm tra lại số CCCD'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                  inspectProfile.frontCardUrl && inspectProfile.backCardUrl
                    ? 'bg-[#FBF5EB] text-[#8F682E] border-[#EEDFC6]'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {inspectProfile.frontCardUrl && inspectProfile.backCardUrl ? 'Đủ 2 mặt CCCD' : 'Thiếu ảnh CCCD'}
                </span>
              </div>
            </div>

            {/* KIẾN TRÚC 3 KHỐI THẨM ĐỊNH (3-COLUMN EXECUTIVE GRID) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              {/* KHỐI 1: GIẤY TỜ ĐỊNH DANH CÁ NHÂN (eKYC - FR-05) */}
              <div className="space-y-3 rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#FAF8F5]">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#FBF5EB] text-[#B88E4F]">
                      <FileText className="w-3.5 h-3.5" />
                    </span>
                    <strong className="text-xs font-bold uppercase tracking-wider text-[#1A1612]">
                      Thông tin định danh
                    </strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#EAE4D7]/70 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] text-[#7D715E]">Số CCCD gắn chip</span>
                      <strong className="font-mono text-xs font-bold text-[#1A1612]">
                        {inspectProfile.idCardNumber}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(inspectProfile.idCardNumber, 'Số CCCD')}
                      className="p-1 rounded-md hover:bg-white text-[#7D715E] hover:text-[#1A1612] transition"
                      title="Sao chép số CCCD"
                    >
                      {copiedText === 'Số CCCD' ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#EAE4D7]/70">
                    <span className="block text-[10px] text-[#7D715E]">Mã số thuế cá nhân</span>
                    <strong className="font-mono text-xs text-[#1A1612]">
                      {inspectProfile.taxCode || 'Chưa cung cấp'}
                    </strong>
                  </div>
                </div>

                {/* Ảnh CCCD 2 mặt */}
                <div className="space-y-2 pt-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7D715E]">
                    Tài liệu ảnh chụp CCCD
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'CCCD Mặt trước', url: inspectProfile.frontCardUrl },
                      { label: 'CCCD Mặt sau', url: inspectProfile.backCardUrl },
                    ].map((doc) => (
                      <div key={doc.label} className="space-y-1">
                        <span className="block text-[10px] text-[#7D715E] font-medium">{doc.label}</span>
                        {doc.url ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(doc.url)}
                            className="group relative h-28 w-full cursor-zoom-in overflow-hidden rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] transition hover:border-[#C59B58]"
                            title="Bấm để phóng to đối soát"
                          >
                            <img
                              src={doc.url}
                              alt={doc.label}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            />
                            <span className="absolute inset-x-0 bottom-0 bg-[#231D15]/70 py-1 text-center text-[9px] font-semibold text-white">
                              Phóng to
                            </span>
                          </button>
                        ) : (
                          <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-[#EAE4D7] bg-[#FAF8F5] text-[10px] text-[#7D715E]">
                            Chưa tải lên
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* KHỐI 2: KÊNH MẠNG XÃ HỘI & NỘI DUNG (FR-07) */}
              <div className="space-y-3 rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#FAF8F5]">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#FBF5EB] text-[#B88E4F]">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                    <strong className="text-xs font-bold uppercase tracking-wider text-[#1A1612]">
                      Kênh truyền thông
                    </strong>
                  </div>
                  <span className="rounded-md border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-0.5 text-[10px] font-bold text-[#8F682E] uppercase">
                    {inspectProfile.channelPlatform}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#EAE4D7]/70">
                      <span className="block text-[10px] text-[#7D715E]">Tên kênh / Profile</span>
                      <strong className="mt-0.5 block truncate text-xs font-bold text-[#1A1612]">
                        {inspectProfile.channelName}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#EAE4D7]/70">
                      <span className="block text-[10px] text-[#7D715E]">Người theo dõi</span>
                      <strong className="mt-0.5 block text-xs font-bold tabular-nums text-[#1A1612]">
                        {Number(inspectProfile.followerCount).toLocaleString('vi-VN')}
                      </strong>
                    </div>
                  </div>

                  {inspectProfile.channelUrl ? (
                    <a
                      href={inspectProfile.channelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-2.5 text-[11px] font-semibold text-[#8F682E] hover:bg-[#FBF5EB] hover:border-[#EEDFC6] transition"
                    >
                      <span className="truncate pr-2">{inspectProfile.channelUrl}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  ) : (
                    <div className="p-2.5 rounded-xl border border-dashed border-[#EAE4D7] text-[11px] text-[#7D715E]">
                      Chưa cung cấp liên kết kênh
                    </div>
                  )}

                  {/* Ảnh minh chứng sở hữu kênh / Analytics */}
                  <div className="space-y-1 pt-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7D715E]">
                      Minh chứng sở hữu kênh (Analytics)
                    </span>
                    {inspectProfile.channelProofUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(inspectProfile.channelProofUrl)}
                        className="group relative h-28 w-full cursor-zoom-in overflow-hidden rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] transition hover:border-[#C59B58]"
                        title="Bấm để phóng to minh chứng"
                      >
                        <img
                          src={inspectProfile.channelProofUrl}
                          alt="Minh chứng sở hữu kênh"
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-[#231D15]/70 py-1 text-center text-[9px] font-semibold text-white">
                          Xem ảnh minh chứng
                        </span>
                      </button>
                    ) : (
                      <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-[#EAE4D7] bg-[#FAF8F5] text-[10px] text-[#7D715E]">
                        Chưa nộp ảnh chụp Creator Center
                      </div>
                    )}
                  </div>

                  {inspectProfile.bio && (
                    <div className="rounded-xl bg-[#FAF8F5] p-2 text-[10px] text-[#7D715E] leading-4">
                      <span className="font-semibold block text-[#1A1612]">Tiểu sử:</span>
                      {inspectProfile.bio}
                    </div>
                  )}
                </div>
              </div>

              {/* KHỐI 3: TÀI KHOẢN NGÂN HÀNG NAPAS 24/7 & HẠNG ĐỐI TÁC */}
              <div className="space-y-3 rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#FAF8F5]">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#FBF5EB] text-[#B88E4F]">
                      <CreditCard className="w-3.5 h-3.5" />
                    </span>
                    <strong className="text-xs font-bold uppercase tracking-wider text-[#1A1612]">
                      Tài khoản nhận hoa hồng
                    </strong>
                  </div>
                  <span className="text-[10px] font-bold text-[#059669]">
                    {inspectProfile.isNameMatched ? 'Khớp tên chủ thẻ' : 'Lệch tên đăng ký'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#EAE4D7]/70">
                    <span className="block text-[10px] text-[#7D715E]">Ngân hàng thụ hưởng</span>
                    <strong className="mt-0.5 block text-xs font-bold text-[#1A1612]">
                      {inspectProfile.bankName}
                    </strong>
                  </div>

                  <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#EAE4D7]/70 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] text-[#7D715E]">Số tài khoản nhận hoa hồng</span>
                      <strong className="font-mono text-xs font-bold text-[#1A1612]">
                        {inspectProfile.accountNumber}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(inspectProfile.accountNumber, 'Số tài khoản')}
                      className="p-1 rounded-md hover:bg-white text-[#7D715E] hover:text-[#1A1612] transition"
                      title="Sao chép số tài khoản"
                    >
                      {copiedText === 'Số tài khoản' ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#EAE4D7]/70">
                    <span className="block text-[10px] text-[#7D715E]">Tên chủ tài khoản (Chữ in hoa)</span>
                    <strong className="mt-0.5 block text-xs font-bold uppercase text-[#1A1612]">
                      {inspectProfile.accountHolder}
                    </strong>
                  </div>

                  {/* Chính sách thuế & Cấp bậc */}
                  <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 space-y-1.5 text-[10px]">
                    <div className="flex items-center justify-between text-[#8F682E] font-semibold">
                      <span>Cơ chế khấu trừ thuế:</span>
                      <span className="font-bold">10% Thuế TNCN</span>
                    </div>
                    <div className="flex items-center justify-between text-[#7D715E]">
                      <span>Cổng chi trả tự động:</span>
                      <span className="font-medium text-[#1A1612]">Napas 24/7 tức thì</span>
                    </div>
                    <div className="flex items-center justify-between text-[#7D715E] pt-1 border-t border-[#EEDFC6]/60">
                      <span>Hạng sau phê duyệt:</span>
                      <span className="font-bold text-[#8F682E]">Hạng Đồng (Base Rate 10%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Khung nhập lý do từ chối nếu có yêu cầu */}
            {showRejectInput && (
              <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                <label className="block text-xs font-bold text-rose-800">
                  Nội dung phản hồi / Lý do từ chối hồ sơ đối tác
                </label>
                <textarea
                  rows={2}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="VD: Ảnh CCCD mặt sau bị mờ góc; Vui lòng cập nhật đúng tên chủ thẻ ngân hàng trùng với CCCD..."
                  className="w-full resize-y rounded-xl border border-rose-200 bg-white p-3 text-xs text-[#1A1612] outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                />
                <span className="text-[10px] text-rose-600 block">
                  Thông báo này sẽ được gửi trực tiếp đến hộp thư và màn hình nâng cấp của đối tác.
                </span>
              </div>
            )}

            {/* Trạng thái đã duyệt xong */}
            {inspectProfile.kycStatus === 'VERIFIED' && (
              <div className="p-3.5 rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
                <div className="text-xs text-[#7D715E]">
                  <strong className="text-[#1A1612] block">Hồ sơ đối tác đã được thẩm định & phê duyệt</strong>
                  Tài khoản đang hoạt động với Hạng Đồng (Base Rate 10%) và được cấp Tích Xanh cho toàn bộ kênh truyền thông.
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions Footer */}
          <div className="mt-4 flex shrink-0 flex-col-reverse gap-2 border-t border-[#EAE4D7] pt-3.5 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="md"
              className="w-full sm:w-auto"
              onClick={() => setInspectProfile(null)}
            >
              Đóng
            </Button>

            {inspectProfile.kycStatus !== 'VERIFIED' && (
              <>
                <Button
                  variant="outline"
                  size="md"
                  className="w-full border-rose-200 bg-white text-rose-700 hover:bg-rose-50 sm:w-auto"
                  onClick={() => handleReviewKol(inspectProfile.id, 'REJECTED')}
                  disabled={reviewKolMutation.isPending}
                >
                  {showRejectInput ? 'Xác nhận Từ chối' : 'Yêu cầu sửa / Từ chối'}
                </Button>
                <Button
                  variant="gold"
                  size="md"
                  icon={<ShieldCheck className="w-4 h-4" />}
                  onClick={() => handleReviewKol(inspectProfile.id, 'VERIFIED')}
                  disabled={reviewKolMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {reviewKolMutation.isPending ? 'Đang xử lý...' : 'Phê duyệt Đối tác'}
                </Button>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
