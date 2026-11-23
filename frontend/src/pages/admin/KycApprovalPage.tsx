import { handleAvatarImageError } from '@/utils/image-fallback.utils';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  CreditCard,
  Search,
  CheckCircle2,
  Eye,
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
import { kycReviewItems } from '../../utils/kyc-review-items';

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
  const [searchParams] = useSearchParams();
  const requestedUser = searchParams.get('userId');
  const requestedSection = searchParams.get('section');
  const requestedFocus = searchParams.get('focus');
  const openedTarget = useRef('');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UNVERIFIED' | 'VERIFIED' | 'REJECTED'>('UNVERIFIED');

  // Inspect modal
  const [inspectProfile, setInspectProfile] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [requestedItems, setRequestedItems] = useState<string[]>([]);
  const [reviewActionMode, setReviewActionMode] = useState<'NEEDS_INFO' | 'REJECTED' | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // TanStack Query: Caching danh sách hồ sơ nâng cấp
  const {
    data: applicationsData,
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
      items,
    }: {
      profileId: string;
      status: 'VERIFIED' | 'NEEDS_INFO' | 'REJECTED';
      reason?: string;
      items?: string[];
    }) => {
      return kycService.reviewKolApplication(profileId, status, reason, items);
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
      setRequestedItems(status === 'NEEDS_INFO' ? inspectProfile?.suggestedReviewItems ?? [] : []);
      return;
    }

    if (!rejectReason.trim() && (status === 'REJECTED' || requestedItems.length === 0)) {
      showToast(
        status === 'NEEDS_INFO'
          ? 'Vui lòng nêu rõ các mục cần đối tác bổ sung hoặc chỉnh sửa.'
          : 'Vui lòng nhập lý do từ chối hồ sơ.',
        'error',
      );
      return;
    }

    reviewKolMutation.mutate({
      profileId,
      status,
      reason: rejectReason.trim() || 'Vui lòng cập nhật các mục được đánh dấu rồi gửi lại hồ sơ.',
      items: requestedItems,
    });
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
    const channelName = socialLinks.channelName || primaryChannel?.channelName;
    const reportedFollowers = socialLinks.followerCount ?? primaryChannel?.followerCount;

    const idCard = p.idCardNumber?.trim() || '';
    const idCardPattern = p.user?.role === 'CUSTOMER' ? /^\d{12}$/ : /^\d{9,12}$/;
    const idCardCheck = !idCard ? 'missing' : idCardPattern.test(idCard) ? 'valid' : 'invalid';
    const bankName = p.bankName?.trim() || '';
    const accountNumber = p.bankAccountNumber?.trim() || '';
    const accountHolder = (p.bankAccountName || '').trim();
    const profileName = normalizeVietnameseName(p.fullName?.trim() || p.user?.fullName || '');
    const holderName = normalizeVietnameseName(accountHolder);
    const bankCheck = !bankName || !accountNumber || !holderName
      ? 'missing'
      : !profileName
        ? 'unchecked'
        : profileName === holderName ? 'matched' : 'mismatch';
    const bankCheckLabel = {
      missing: 'Thiếu thông tin ngân hàng',
      unchecked: 'Chưa đối chiếu tên',
      matched: 'Khớp tên chủ tài khoản',
      mismatch: 'Tên chủ tài khoản lệch',
    }[bankCheck];
    const bankCheckTone = bankCheck === 'mismatch'
      ? 'border-rose-200 bg-rose-50 text-[#B91C1C]'
      : bankCheck === 'matched'
        ? 'border-[#EEDFC6] bg-[#FBF5EB] text-[#795A2D]'
        : 'border-[#EAE4D7] bg-[#FAF8F5] text-[#655A49]';

    const missingRequiredFields = [
      !idCard && 'Số CCCD',
      !frontCardUrl && 'Ảnh CCCD mặt trước',
      !backCardUrl && 'Ảnh CCCD mặt sau',
      !bankName && 'Ngân hàng thụ hưởng',
      !accountNumber && 'Số tài khoản',
      !accountHolder && 'Tên chủ tài khoản',
      !channelUrl && 'Đường dẫn kênh nội dung',
    ].filter(Boolean);
    const suggestedReviewItems = [
      idCardCheck !== 'valid' && 'Số CCCD',
      !frontCardUrl && 'Ảnh CCCD mặt trước',
      !backCardUrl && 'Ảnh CCCD mặt sau',
      !channelName && 'Tên kênh chính',
      !channelUrl && 'Liên kết kênh chính',
      (reportedFollowers == null || (p.user?.role === 'CUSTOMER' && Number(reportedFollowers) <= 0)) && 'Số người theo dõi',
      !socialLinks.channelProofUrl && 'Ảnh quản trị kênh',
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
      idCardCheck,
      taxCode: p.taxCode || 'Chưa khai báo',
      bankName: bankName || 'Chưa cung cấp',
      accountNumber: accountNumber || 'Chưa cung cấp',
      accountHolder: accountHolder || 'Chưa cung cấp',
      bankCheckLabel,
      bankCheckTone,
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
      suggestedReviewItems,
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
  useEffect(() => {
    const targetKey = `${requestedUser}:${requestedSection}`;
    if (!requestedUser || !applicationsData || openedTarget.current === targetKey) return;
    const target = displayKols.find((profile: any) => profile.userId === requestedUser);
    if (!target) return;
    openedTarget.current = targetKey;
    setFilterStatus('ALL');
    setInspectProfile(target);
  }, [applicationsData, requestedUser, requestedSection]);
  useEffect(() => {
    if (!inspectProfile || !requestedSection) return;
    const frame = requestAnimationFrame(() => document.getElementById(requestedFocus === 'tax' ? 'kyc-review-tax' : `kyc-review-${requestedSection}`)?.scrollIntoView({ block: 'center' }));
    return () => cancelAnimationFrame(frame);
  }, [inspectProfile, requestedSection, requestedFocus]);

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

      {/* 4 Thẻ Thống Kê Theo Quy Trình Vận Hành */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Tổng hồ sơ',
            value: totalCount,
            filter: 'ALL' as const,
            icon: <CreditCard className="h-4 w-4 text-[#8F682E]" />,
          },
          {
            label: 'Chờ thẩm định',
            value: pendingCount,
            filter: 'UNVERIFIED' as const,
            icon: <Clock className="h-4 w-4 text-[#D97706]" />,
          },
          {
            label: 'Đã xác minh',
            value: verifiedCount,
            filter: 'VERIFIED' as const,
            icon: <CheckCircle2 className="h-4 w-4 text-[#059669]" />,
          },
          {
            label: 'Cần bổ sung / Từ chối',
            value: rejectedCount,
            filter: 'REJECTED' as const,
            icon: <AlertCircle className="h-4 w-4 text-[#DC2626]" />,
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
            className={`flex min-h-24 min-w-0 cursor-pointer flex-col justify-between gap-2 rounded-2xl border p-3 text-left transition-colors sm:p-4 ${
              filterStatus === stat.filter
                ? 'border-[#C59B58] bg-[#FBF5EB]'
                : 'border-[#EAE4D7] bg-white hover:border-[#C59B58]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 text-xs font-semibold leading-snug text-[#655A49]">{stat.label}</span>
              <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#FAF8F5]">
                {stat.icon}
              </span>
            </div>
            <strong className="text-2xl font-bold tabular-nums text-[#1A1612]">{stat.value.toLocaleString('vi-VN')}</strong>
          </button>
        ))}
      </div>

      {/* Bộ Lọc Tìm Kiếm & Trạng Thái */}
      <Card className="grid grid-cols-1 items-center gap-3 rounded-2xl border-[#EAE4D7] bg-white p-3 shadow-none sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
        <div className="min-w-0 sm:col-span-2 xl:col-span-1">
        <Input
          aria-label="Tìm hồ sơ đối tác"
          placeholder="Tìm hồ sơ đối tác"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          clearable
          onClear={() => setSearch('')}
          icon={<Search className="h-4 w-4 text-[#7D715E]" />}
          className="h-11 rounded-lg border-[#EAE4D7] bg-white focus-within:border-[#C59B58] focus-within:ring-[#C59B58]/15 [&>button]:size-10"
        />
        </div>

        <Select
          aria-label="Lọc trạng thái thẩm định"
          portal
          className="h-11 w-full rounded-lg"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          options={[
            { value: 'ALL', label: 'Tất cả trạng thái' },
            { value: 'UNVERIFIED', label: 'Chờ thẩm định' },
            { value: 'VERIFIED', label: 'Đã xác minh' },
            { value: 'REJECTED', label: 'Cần bổ sung / Từ chối' },
          ]}
        />
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3.5 text-xs font-semibold text-[#8F682E] transition hover:bg-[#F3EFE6]"
        >
          <Download className="h-4 w-4 shrink-0" />
          <span>Xuất báo cáo</span>
        </button>
      </Card>

      {/* Bảng Danh Sách Hồ Sơ Đối Tác */}
      <Card className="overflow-hidden rounded-2xl border-[#EAE4D7] bg-white p-0 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4D7] bg-white px-4 py-3 sm:px-5">
          <h2 className="m-0 text-sm font-semibold text-[#1A1612]">Hồ sơ đối tác</h2>
          <span className="whitespace-nowrap text-xs tabular-nums text-[#7D715E]" aria-live="polite">
            {filteredKols.length.toLocaleString('vi-VN')} kết quả
          </span>
        </div>

        <div className="max-w-full overflow-x-auto" role="region" aria-label="Danh sách hồ sơ đối tác" tabIndex={0}>
          <table className="w-full min-w-[920px] table-fixed border-collapse text-left text-xs">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[22%]" />
              <col className="w-[19%]" />
              <col className="w-[11%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[#EAE4D7] bg-[#FAF8F5]">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7D715E]">
                  Đối tác tiếp thị
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7D715E]">
                  Định danh & liên hệ
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7D715E]">
                  Kênh truyền thông
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
                  <td colSpan={6} className="py-12 text-center text-[#7D715E]">
                    <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-[#FAF8F5] text-[#B88E4F]">
                      <Search className="h-5 w-5" />
                    </div>
                    <div className="font-bold text-[#1A1612]">Không tìm thấy hồ sơ đối tác</div>
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
                            <img src={u.avatarUrl} onError={handleAvatarImageError} alt={u.fullName} className="h-full w-full object-cover" />
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
                      <div className="mt-1 text-[11px] tabular-nums text-[#7D715E]">
                        <span className="font-semibold text-[#1A1612]">{Number(u.followerCount).toLocaleString('vi-VN')}</span> người theo dõi
                      </div>
                    </td>

                    {/* Hạng khởi điểm */}
                    <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-0.5 font-semibold text-[11px] text-[#8F682E]">
                        Đồng · {u.commissionRate}
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap">
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

                    {/* Thao tác */}
                    <td className="px-3 py-3.5 align-middle text-right whitespace-nowrap">
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
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-[#EAE4D7] bg-white px-3 py-2.5 sm:px-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] text-sm font-bold text-[#8F682E]">
                  {inspectProfile.avatarUrl ? (
                    <img src={inspectProfile.avatarUrl} onError={handleAvatarImageError} alt={inspectProfile.fullName} className="h-full w-full object-cover" />
                  ) : (
                    inspectProfile.avatar
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
                  <p className="mt-0.5 text-[11px] text-[#7D715E]">SĐT: {inspectProfile.phone}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 [&>span]:rounded-md [&>span]:border [&>span]:px-2 [&>span]:py-1 [&>span]:text-[11px] [&>span]:font-medium">
                <span className={inspectProfile.bankCheckTone}>{inspectProfile.bankCheckLabel}</span>
                {inspectProfile.idCardCheck !== 'valid' && (
                  <span className="border-amber-200 bg-amber-50 text-[#92400E]">
                    {inspectProfile.idCardCheck === 'missing' ? 'Thiếu số CCCD / CMND' : 'Số CCCD / CMND sai định dạng'}
                  </span>
                )}
                {(!inspectProfile.frontCardUrl || !inspectProfile.backCardUrl) && (
                  <span className="border-amber-200 bg-amber-50 text-[#92400E]">Thiếu ảnh giấy tờ</span>
                )}
              </div>
            </div>

            {/* 3 KHỐI THẨM ĐỊNH CÂN ĐỐI */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-stretch">
              {/* KHỐI 1: ĐỊNH DANH CÁ NHÂN */}
              <div id="kyc-review-identity" className="flex flex-col gap-2.5 rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-2xs">
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
                    {inspectProfile.idCardCheck !== 'missing' && <button
                      type="button"
                      onClick={() => copyToClipboard(inspectProfile.idCardNumber, 'Số CCCD')}
                      className="p-1 rounded-md hover:bg-white text-[#7D715E] hover:text-[#1A1612] transition shrink-0 cursor-pointer"
                      title="Sao chép số CCCD"
                    >
                      {copiedText === 'Số CCCD' ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>}
                  </div>

                  <div id="kyc-review-tax" className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#EAE4D7]/70">
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
              <div id="kyc-review-bank" className="flex flex-col gap-2.5 rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-2xs">
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
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${inspectProfile.bankCheckTone}`}
                  >
                    {inspectProfile.bankCheckLabel}
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
              className={`mt-3 max-h-[35dvh] shrink-0 space-y-2 overflow-y-auto rounded-2xl border p-3.5 ${
                reviewActionMode === 'NEEDS_INFO'
                  ? 'border-[#EEDFC6] bg-[#FBF5EB]'
                  : 'border-rose-200 bg-rose-50/70'
              }`}
            >
              <fieldset className="@container min-w-0">
                <legend className="mb-2 text-xs font-semibold text-[#1A1612]">Mục cần đối tác chỉnh sửa</legend>
                <div className="grid auto-rows-fr grid-cols-2 gap-2 @min-[820px]:grid-cols-5">
                  {kycReviewItems.map(({ label }) => (
                    <label key={label} className="flex min-h-9 min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-[#EAE4D7] bg-white px-2.5 py-1.5 text-xs leading-snug text-[#655A49] transition-colors hover:border-[#C59B58] focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-[#B88E4F] has-[:checked]:border-[#C59B58] has-[:checked]:bg-[#FBF5EB] has-[:checked]:text-[#231D15]">
                      <input type="checkbox" checked={requestedItems.includes(label)} onChange={event => {
                        const checked = event.target.checked;
                        setRequestedItems(items => checked ? [...items, label] : items.filter(item => item !== label));
                      }} className="size-3.5 shrink-0 accent-[#B88E4F]" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label
                htmlFor="kyc-review-note"
                className={`block text-xs font-bold ${
                  reviewActionMode === 'NEEDS_INFO' ? 'text-[#8F682E]' : 'text-[#DC2626]'
                }`}
              >
                {reviewActionMode === 'NEEDS_INFO'
                  ? 'Ghi chú cho đối tác'
                  : 'Lý do từ chối hồ sơ *'}
              </label>
              <textarea
                id="kyc-review-note"
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
