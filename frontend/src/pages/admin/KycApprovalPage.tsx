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
  const [reviewActionMode, setReviewActionMode] = useState<'NEEDS_INFO' | 'REJECTED' | null>(null);
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

  // Mutation: Duyệt/Bổ sung/Từ chối KOL
  const reviewKolMutation = useMutation({
    mutationFn: async ({
      profileId,
      status,
      reason,
    }: {
      profileId: string;
      status: 'VERIFIED' | 'NEEDS_INFO' | 'REJECTED';
      reason?: string;
    }) => {
      return kycService.reviewKolApplication(profileId, status, reason);
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['upgrade-applications'] });
      showToast(
        status === 'VERIFIED'
          ? 'Đã phê duyệt Đối tác, kích hoạt Hạng Đồng (10%) và cấp Tích Xanh kênh!'
          : status === 'NEEDS_INFO'
            ? 'Đã gửi yêu cầu bổ sung thông tin và mở khóa hồ sơ cho đối tác cập nhật.'
            : 'Đã từ chối hồ sơ đối tác.',
      );
      setInspectProfile(null);
      setReviewActionMode(null);
      setRejectReason('');
    },
    onError: (err: any) => {
      showToast(err.message || 'Thao tác phê duyệt thất bại', 'error');
    },
  });

  const handleReviewKol = async (profileId: string, status: 'VERIFIED' | 'NEEDS_INFO' | 'REJECTED') => {
    if (status === 'VERIFIED') {
      reviewKolMutation.mutate({ profileId, status });
      return;
    }

    if (reviewActionMode !== status) {
      setReviewActionMode(status);
      setRejectReason('');
      return;
    }

    if (!rejectReason.trim()) {
      showToast(
        status === 'NEEDS_INFO'
          ? 'Vui lòng nêu rõ các mục cần đối tác bổ sung hoặc chỉnh sửa.'
          : 'Vui lòng nhập lý do từ chối hồ sơ.',
        'error',
      );
      return;
    }

    reviewKolMutation.mutate({ profileId, status, reason: rejectReason.trim() });
  };

  // Chuẩn hóa danh sách KOL
  const rawKols = applicationsData?.kolApplications || [];
  const displayKols = rawKols.map((p: any) => {
    const rawKyc = p.kycStatus || 'UNVERIFIED';
    const socialLinks = readKycMetadata(p.socialLinksJson);
    const isVerified = rawKyc === 'VERIFIED';
    const isRejected = rawKyc === 'REJECTED';
    const isNeedsInfo =
      !isVerified &&
      !isRejected &&
      (socialLinks.needsInfo === true || socialLinks.reviewStatus === 'NEEDS_INFO');
    const fullName = p.fullName || p.user?.fullName || 'Đối tác Tiếp thị';
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
      reviewStatus: isVerified ? 'VERIFIED' : isRejected ? 'REJECTED' : isNeedsInfo ? 'NEEDS_INFO' : 'PENDING_APPROVAL',
      isNeedsInfo,
      rejectionReason: socialLinks.rejectionReason || null,
      kycLabel: isVerified ? 'Đã xác minh' : isRejected ? 'Bị từ chối' : isNeedsInfo ? 'Chờ bổ sung' : 'Chờ thẩm định',
      tierName: p.tier?.name || 'Hạng Đồng (Bronze)',
      commissionRate: '10%',
      createdAt: formatKycDate(socialLinks.submittedAt || p.updatedAt || p.createdAt),
      status: isVerified ? 'active' : isRejected ? 'rejected' : isNeedsInfo ? 'needs_info' : 'pending',
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

  const handleExportCsv = () => {
    if (!displayKols || displayKols.length === 0) {
      showToast('Không có dữ liệu đối tác để xuất báo cáo', 'error');
      return;
    }
    const headers = [
      'Mã hồ sơ',
      'Họ và tên',
      'Email',
      'Số điện thoại',
      'Số CCCD/Định danh',
      'Ngân hàng',
      'Số tài khoản',
      'Chủ tài khoản',
      'Kênh nội dung',
      'Nền tảng',
      'Lượt theo dõi',
      'Trạng thái eKYC',
      'Hạng bậc',
      'Ngày nộp',
    ];
    const rows = displayKols.map((k: any) => [
      `"${k.id || ''}"`,
      `"${(k.fullName || '').replace(/"/g, '""')}"`,
      `"${(k.email || '').replace(/"/g, '""')}"`,
      `"${k.phone || ''}"`,
      `"\t${k.idCardNumber || ''}"`,
      `"${(k.bankName || '').replace(/"/g, '""')}"`,
      `"\t${k.accountNumber || ''}"`,
      `"${(k.accountHolder || '').replace(/"/g, '""')}"`,
      `"${(k.channelName || '').replace(/"/g, '""')}"`,
      `"${k.channelPlatform || ''}"`,
      k.followerCount || 0,
      `"${k.kycLabel || ''}"`,
      `"${k.tierName || ''}"`,
      `"${k.createdAt || ''}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bao_cao_tham_dinh_ekyc_kol_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Đã xuất báo cáo ${displayKols.length} hồ sơ đối tác thành công!`);
  };

  return (
    <div className="w-full min-w-0 pb-8 flex flex-col gap-4 text-left">
      {/* Toast thông báo */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-[120] px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
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
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EAE4D7] bg-white px-4 py-3 sm:px-6 shadow-[0_1px_2px_rgba(35,29,21,0.02)]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid place-items-center shrink-0 w-10 h-10 border border-[#EEDFC6] rounded-xl bg-[#FBF5EB] text-[#B88E4F]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h1 className="m-0 text-base font-bold tracking-tight text-[#1A1612]">Duyệt hồ sơ đối tác</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
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

      {/* 4 Thẻ Thống Kê */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Chờ thẩm định',
            value: pendingCount,
            filter: 'UNVERIFIED' as const,
            icon: <Clock className="h-4 w-4 text-[#D97706]" />,
            accentBorder: 'border-l-4 border-l-[#D97706]',
            iconBox: 'bg-amber-50 border-amber-200',
            valueColor: 'text-[#D97706]',
          },
          {
            label: 'Đã xác minh',
            value: verifiedCount,
            filter: 'VERIFIED' as const,
            icon: <CheckCircle2 className="h-4 w-4 text-[#059669]" />,
            accentBorder: 'border-l-4 border-l-[#059669]',
            iconBox: 'bg-emerald-50 border-emerald-200',
            valueColor: 'text-[#1A1612]',
          },
          {
            label: 'Cần bổ sung / Từ chối',
            value: rejectedCount,
            filter: 'REJECTED' as const,
            icon: <AlertCircle className="h-4 w-4 text-[#DC2626]" />,
            accentBorder: 'border-l-4 border-l-[#DC2626]',
            iconBox: 'bg-rose-50 border-rose-200',
            valueColor: 'text-[#DC2626]',
          },
          {
            label: 'Tổng hồ sơ',
            value: totalCount,
            filter: 'ALL' as const,
            icon: <CreditCard className="h-4 w-4 text-[#B88E4F]" />,
            accentBorder: 'border-l-4 border-l-[#C59B58]',
            iconBox: 'bg-[#FBF5EB] border-[#EEDFC6]',
            valueColor: 'text-[#1A1612]',
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
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition cursor-pointer min-h-[88px] ${stat.accentBorder} ${
              filterStatus === stat.filter
                ? 'border-[#C59B58] bg-[#FBF5EB] shadow-xs ring-1 ring-[#C59B58]/25'
                : 'border-[#EAE4D7] bg-white hover:border-[#C59B58]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#7D715E] whitespace-nowrap">{stat.label}</span>
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${stat.iconBox}`}>
                {stat.icon}
              </span>
            </div>
            <div className="mt-2">
              <strong className={`text-2xl font-bold tabular-nums ${stat.valueColor}`}>{stat.value}</strong>
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
          portal
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4D7] bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="m-0 text-xs font-bold uppercase tracking-wider text-[#1A1612]">
              Danh sách hồ sơ đối tác (KOL/KOC)
            </h2>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-[#D97706] whitespace-nowrap">
            {pendingCount} chờ thẩm định
          </span>
        </div>

        <div className="max-w-full overflow-x-auto" role="region" aria-label="Danh sách hồ sơ đối tác" tabIndex={0}>
          <table className="w-full min-w-[1040px] table-fixed border-collapse text-left text-xs">
            <colgroup>
              <col className="w-[19%]" />
              <col className="w-[20%]" />
              <col className="w-[18%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[11%]" />
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
                    <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-0.5 font-semibold text-[11px] text-[#8F682E]">
                        Đồng · {u.commissionRate}
                      </span>
                    </td>

                    {/* Cột 6: Trạng thái */}
                    <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap ${
                          u.kycStatus === 'VERIFIED'
                            ? 'bg-emerald-50 border-emerald-200 text-[#059669]'
                            : u.kycStatus === 'REJECTED'
                              ? 'bg-rose-50 border-rose-200 text-[#DC2626]'
                              : u.isNeedsInfo
                                ? 'bg-amber-50 border-amber-200 text-[#D97706]'
                                : 'bg-[#FBF5EB] border-[#EEDFC6] text-[#B88E4F]'
                        }`}
                      >
                        {u.kycStatus === 'VERIFIED' ? (
                          <CheckCircle2 className="w-3 h-3 shrink-0 text-[#059669]" />
                        ) : u.kycStatus === 'REJECTED' ? (
                          <AlertCircle className="w-3 h-3 shrink-0 text-[#DC2626]" />
                        ) : (
                          <Clock className="w-3 h-3 shrink-0 text-[#D97706]" />
                        )}
                        {u.kycLabel}
                      </span>
                    </td>

                    {/* Cột 7: Thao tác */}
                    <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                      <Button
                        variant="gold"
                        size="sm"
                        className="px-3 text-xs whitespace-nowrap"
                        icon={<Eye className="h-3.5 w-3.5 shrink-0" />}
                        onClick={() => {
                          setInspectProfile(u);
                          setReviewActionMode(null);
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

      {/* MODAL THẨM ĐỊNH CHI TIẾT */}
      {inspectProfile && (
        <Modal
          isOpen={true}
          onClose={() => setInspectProfile(null)}
          title={
            <span className="text-base font-bold text-[#1A1612]">
              Thẩm định hồ sơ đối tác
            </span>
          }
          subtitle={
            <span className="text-xs text-[#7D715E]">
              {inspectProfile.fullName} · {inspectProfile.email} · Nộp {inspectProfile.createdAt}
            </span>
          }
          icon={<ShieldCheck className="h-4 w-4 text-[#B88E4F]" />}
          maxWidth="6xl"
          className="max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-3xl border-[#EAE4D7] bg-[#FAF8F5] p-5 shadow-[0_24px_80px_rgba(35,29,21,0.18)]"
        >
          <div className="flex flex-col gap-3 text-left text-xs overflow-y-auto pr-1">
            {/* Thanh thông tin đối tác & Kết quả đối soát gọn trên 1 hàng */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EAE4D7] bg-white px-4 py-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] font-bold text-sm text-[#8F682E]">
                  {inspectProfile.avatarUrl ? (
                    <img src={inspectProfile.avatarUrl} alt={inspectProfile.fullName} className="h-full w-full object-cover" />
                  ) : (
                    inspectProfile.avatar
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold text-[#1A1612] truncate">{inspectProfile.fullName}</strong>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                        inspectProfile.status === 'active'
                          ? 'border-emerald-200 bg-emerald-50 text-[#059669]'
                          : inspectProfile.status === 'rejected'
                            ? 'border-rose-200 bg-rose-50 text-[#DC2626]'
                            : inspectProfile.isNeedsInfo
                              ? 'border-amber-200 bg-amber-50 text-[#D97706]'
                              : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#8F682E]'
                      }`}
                    >
                      {inspectProfile.kycLabel}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#7D715E]">
                    <span>SĐT: <strong className="text-[#1A1612]">{inspectProfile.phone}</strong></span>
                    <span>·</span>
                    <span>Hạng kích hoạt: <strong className="text-[#8F682E]">Đồng (10%)</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap ${
                  inspectProfile.isNameMatched
                    ? 'bg-emerald-50 text-[#059669] border-emerald-200'
                    : 'bg-rose-50 text-[#DC2626] border-rose-200'
                }`}>
                  {inspectProfile.isNameMatched ? 'Khớp tên ngân hàng' : 'Lệch tên ngân hàng'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap ${
                  inspectProfile.isValidIdCardLength
                    ? 'bg-[#FBF5EB] text-[#8F682E] border-[#EEDFC6]'
                    : 'bg-amber-50 text-[#D97706] border-amber-200'
                }`}>
                  {inspectProfile.isValidIdCardLength ? 'CCCD hợp lệ' : 'Kiểm tra số CCCD'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap ${
                  inspectProfile.frontCardUrl && inspectProfile.backCardUrl
                    ? 'bg-[#FBF5EB] text-[#8F682E] border-[#EEDFC6]'
                    : 'bg-rose-50 text-[#DC2626] border-rose-200'
                }`}>
                  {inspectProfile.frontCardUrl && inspectProfile.backCardUrl ? 'Đủ 2 mặt CCCD' : 'Thiếu ảnh CCCD'}
                </span>
              </div>
            </div>

            {/* 3 KHỐI THẨM ĐỊNH CÂN ĐỐI */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-stretch">
              {/* KHỐI 1: ĐỊNH DANH CÁ NHÂN */}
              <div className="flex flex-col gap-2.5 rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#FAF8F5]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#FBF5EB] text-[#B88E4F]">
                      <FileText className="w-3.5 h-3.5" />
                    </span>
                    <strong className="text-xs font-bold uppercase tracking-wider text-[#1A1612] whitespace-nowrap">
                      Thông tin định danh
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#EAE4D7]/70 flex items-center justify-between gap-1.5">
                    <div className="min-w-0">
                      <span className="block text-[10px] text-[#7D715E] whitespace-nowrap">Số CCCD</span>
                      <strong className="font-mono text-xs font-bold text-[#1A1612] truncate block">
                        {inspectProfile.idCardNumber}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(inspectProfile.idCardNumber, 'Số CCCD')}
                      className="p-1 rounded-md hover:bg-white text-[#7D715E] hover:text-[#1A1612] transition shrink-0 cursor-pointer"
                      title="Sao chép số CCCD"
                    >
                      {copiedText === 'Số CCCD' ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#EAE4D7]/70">
                    <span className="block text-[10px] text-[#7D715E] whitespace-nowrap">Mã số thuế</span>
                    <strong className={`font-mono text-xs block truncate ${inspectProfile.taxCode ? 'text-[#1A1612] font-bold' : 'text-[#7D715E] font-normal'}`}>
                      {inspectProfile.taxCode || 'Chưa cập nhật'}
                    </strong>
                  </div>
                </div>

                {/* Ảnh CCCD 2 mặt */}
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7D715E]">
                    Ảnh chụp CCCD
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Mặt trước', url: inspectProfile.frontCardUrl },
                      { label: 'Mặt sau', url: inspectProfile.backCardUrl },
                    ].map((doc) => (
                      <div key={doc.label} className="space-y-1">
                        <span className="block text-[10px] text-[#7D715E] font-medium">{doc.label}</span>
                        {doc.url ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(doc.url)}
                            className="group relative h-28 w-full cursor-zoom-in overflow-hidden rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] transition hover:border-[#C59B58]"
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

              {/* KHỐI 2: KÊNH TRUYỀN THÔNG */}
              <div className="flex flex-col gap-2.5 rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#FAF8F5]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#FBF5EB] text-[#B88E4F]">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                    <strong className="text-xs font-bold uppercase tracking-wider text-[#1A1612] whitespace-nowrap">
                      Kênh truyền thông
                    </strong>
                  </div>
                  <span className="shrink-0 rounded-md border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-0.5 text-[10px] font-bold text-[#8F682E] uppercase whitespace-nowrap">
                    {inspectProfile.channelPlatform}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#EAE4D7]/70">
                    <span className="block text-[10px] text-[#7D715E] whitespace-nowrap">Tên kênh</span>
                    <strong className="mt-0.5 block truncate text-xs font-bold text-[#1A1612]">
                      {inspectProfile.channelName}
                    </strong>
                  </div>
                  <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#EAE4D7]/70">
                    <span className="block text-[10px] text-[#7D715E] whitespace-nowrap">Người theo dõi</span>
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
                    Chưa có liên kết kênh
                  </div>
                )}

                <div className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7D715E]">
                    Minh chứng sở hữu kênh
                  </span>
                  {inspectProfile.channelProofUrl ? (
                    <button
                      type="button"
                      onClick={() => setPreviewImage(inspectProfile.channelProofUrl)}
                      className="group relative h-24 w-full cursor-zoom-in overflow-hidden rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] transition hover:border-[#C59B58]"
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
                      Chưa nộp ảnh minh chứng
                    </div>
                  )}
                </div>

                {inspectProfile.bio && (
                  <div className="rounded-xl bg-[#FAF8F5] px-2.5 py-2 text-[11px] text-[#7D715E] leading-snug line-clamp-2" title={inspectProfile.bio}>
                    <span className="font-semibold text-[#1A1612]">Giới thiệu: </span>
                    {inspectProfile.bio}
                  </div>
                )}
              </div>

              {/* KHỐI 3: TÀI KHOẢN NGÂN HÀNG */}
              <div className="flex flex-col gap-2.5 rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#FAF8F5]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#FBF5EB] text-[#B88E4F]">
                      <CreditCard className="w-3.5 h-3.5" />
                    </span>
                    <strong className="text-xs font-bold uppercase tracking-wider text-[#1A1612] whitespace-nowrap">
                      Tài khoản ngân hàng
                    </strong>
                  </div>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                      inspectProfile.isNameMatched
                        ? 'border-emerald-200 bg-emerald-50 text-[#059669]'
                        : 'border-rose-200 bg-rose-50 text-[#DC2626]'
                    }`}
                  >
                    {inspectProfile.isNameMatched ? 'Khớp tên' : 'Lệch tên'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#EAE4D7]/70">
                    <span className="block text-[10px] text-[#7D715E] whitespace-nowrap">Ngân hàng thụ hưởng</span>
                    <strong className={`mt-0.5 block text-xs ${inspectProfile.bankName && inspectProfile.bankName !== 'Chưa cung cấp' ? 'font-bold text-[#1A1612]' : 'font-normal text-[#7D715E]'}`}>
                      {inspectProfile.bankName && inspectProfile.bankName !== 'Chưa cung cấp' ? inspectProfile.bankName : 'Chưa cập nhật'}
                    </strong>
                  </div>

                  <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#EAE4D7]/70 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-[10px] text-[#7D715E] whitespace-nowrap">Số tài khoản</span>
                      <strong className={`font-mono text-xs block truncate ${inspectProfile.accountNumber && inspectProfile.accountNumber !== 'Chưa cung cấp' ? 'font-bold text-[#1A1612]' : 'font-normal text-[#7D715E]'}`}>
                        {inspectProfile.accountNumber && inspectProfile.accountNumber !== 'Chưa cung cấp' ? inspectProfile.accountNumber : 'Chưa cập nhật'}
                      </strong>
                    </div>
                    {inspectProfile.accountNumber && inspectProfile.accountNumber !== 'Chưa cung cấp' && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(inspectProfile.accountNumber, 'Số tài khoản')}
                        className="p-1 rounded-md hover:bg-white text-[#7D715E] hover:text-[#1A1612] transition shrink-0 cursor-pointer"
                        title="Sao chép số tài khoản"
                      >
                        {copiedText === 'Số tài khoản' ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#EAE4D7]/70">
                    <span className="block text-[10px] text-[#7D715E] whitespace-nowrap">Tên chủ tài khoản</span>
                    <strong className={`mt-0.5 block text-xs ${inspectProfile.accountHolder && inspectProfile.accountHolder !== 'Chưa cung cấp' ? 'font-bold uppercase text-[#1A1612]' : 'font-normal text-[#7D715E]'}`}>
                      {inspectProfile.accountHolder && inspectProfile.accountHolder !== 'Chưa cung cấp' ? inspectProfile.accountHolder : 'Chưa cập nhật'}
                    </strong>
                  </div>

                  {/* Tóm tắt chính sách gọn 1 dòng mỗi mục */}
                  <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#7D715E] whitespace-nowrap">Hạng khởi điểm</span>
                      <span className="font-bold text-[#8F682E] whitespace-nowrap">Hạng Đồng · 10%</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#7D715E] whitespace-nowrap">Khấu trừ thuế</span>
                      <span className="font-semibold text-[#1A1612] whitespace-nowrap">10% TNCN</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner trạng thái nếu đang chờ khách hàng bổ sung */}
            {inspectProfile.isNeedsInfo && !reviewActionMode && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-xs">
                <Clock className="w-4 h-4 text-[#D97706] shrink-0" />
                <div className="text-[#7D715E]">
                  <strong className="text-[#D97706]">Đang chờ đối tác bổ sung: </strong>
                  {inspectProfile.rejectionReason && (
                    <span className="text-[#1A1612]">&ldquo;{inspectProfile.rejectionReason}&rdquo;</span>
                  )}
                </div>
              </div>
            )}

            {/* Trạng thái đã duyệt xong */}
            {inspectProfile.kycStatus === 'VERIFIED' && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-[#059669] font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Hồ sơ đã được phê duyệt (Hạng Đồng · 10%).</span>
              </div>
            )}
          </div>

          {/* Khung nhập lý do GHIM CỐ ĐỊNH ngay trên footer (không bị trôi khi cuộn) */}
          {reviewActionMode && (
            <div
              className={`mt-3 shrink-0 space-y-2 rounded-2xl border p-3.5 ${
                reviewActionMode === 'NEEDS_INFO'
                  ? 'border-[#EEDFC6] bg-[#FBF5EB]'
                  : 'border-rose-200 bg-rose-50/70'
              }`}
            >
              <label
                className={`block text-xs font-bold ${
                  reviewActionMode === 'NEEDS_INFO' ? 'text-[#8F682E]' : 'text-[#DC2626]'
                }`}
              >
                {reviewActionMode === 'NEEDS_INFO'
                  ? 'Nội dung yêu cầu đối tác bổ sung'
                  : 'Lý do từ chối hồ sơ'}
              </label>
              <textarea
                autoFocus
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={
                  reviewActionMode === 'NEEDS_INFO'
                    ? 'Nhập thông tin cần đối tác chỉnh sửa hoặc bổ sung...'
                    : 'Nhập lý do từ chối hồ sơ...'
                }
                className={`w-full resize-none rounded-xl border bg-white p-2.5 text-xs text-[#1A1612] outline-none ${
                  reviewActionMode === 'NEEDS_INFO'
                    ? 'border-[#EEDFC6] focus:border-[#C59B58]'
                    : 'border-rose-200 focus:border-rose-400'
                }`}
              />
            </div>
          )}

          {/* Modal Actions Footer */}
          <div className="mt-3 flex shrink-0 flex-col-reverse gap-2 border-t border-[#EAE4D7] pt-3 sm:flex-row sm:justify-end">
            {reviewActionMode ? (
              <>
                <Button
                  variant="outline"
                  size="md"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setReviewActionMode(null);
                    setRejectReason('');
                  }}
                  disabled={reviewKolMutation.isPending}
                >
                  Quay lại
                </Button>
                <Button
                  variant={reviewActionMode === 'NEEDS_INFO' ? 'gold' : 'outline'}
                  size="md"
                  className={
                    reviewActionMode === 'REJECTED'
                      ? 'w-full border-rose-300 bg-rose-600 text-white hover:bg-rose-700 sm:w-auto'
                      : 'w-full sm:w-auto'
                  }
                  onClick={() => handleReviewKol(inspectProfile.id, reviewActionMode)}
                  disabled={reviewKolMutation.isPending}
                >
                  {reviewKolMutation.isPending
                    ? 'Đang xử lý...'
                    : reviewActionMode === 'NEEDS_INFO'
                      ? 'Xác nhận Yêu cầu bổ sung'
                      : 'Xác nhận Từ chối'}
                </Button>
              </>
            ) : (
              <>
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
                      Từ chối hồ sơ
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      className="w-full border-[#EEDFC6] bg-[#FBF5EB] text-[#8F682E] hover:bg-[#F3EFE6] sm:w-auto"
                      onClick={() => handleReviewKol(inspectProfile.id, 'NEEDS_INFO')}
                      disabled={reviewKolMutation.isPending}
                    >
                      Yêu cầu bổ sung
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
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
