import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  CreditCard,
  Search,
  CheckCircle2,
  Eye,
  RefreshCw,
  Share2,
  ExternalLink,
  ShieldCheck,
  Clock,
  AlertCircle,
  Building2,
  User,
  X,
} from 'lucide-react';
import { kycService, type KycProfile } from '../../services/kyc.service';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';

export default function KycApprovalPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [inspectProfile, setInspectProfile] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // TanStack Query: Caching danh sách KYC, chuyển trang quay lại không bị chớp giật
  const { data: profiles = [], isLoading: loading, refetch: loadPending } = useQuery<KycProfile[]>({
    queryKey: ['pending-kyc'],
    queryFn: async () => {
      const list = await kycService.getPendingKyc();
      return Array.isArray(list) ? list : [];
    },
    staleTime: 1000 * 60 * 3,
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // TanStack Query Mutation: Duyệt/Từ chối và tự động invalidate cache
  const reviewMutation = useMutation({
    mutationFn: async ({ profileId, status, reason }: { profileId: string; status: 'VERIFIED' | 'REJECTED'; reason?: string }) => {
      return kycService.reviewKyc(profileId, status, reason);
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-kyc'] });
      showToast(`Đã ${status === 'VERIFIED' ? 'phê duyệt cấp Tích Xanh' : 'từ chối'} hồ sơ KYC thành công!`);
      setInspectProfile(null);
      setShowRejectInput(false);
      setRejectReason('');
    },
    onError: (err: any) => {
      showToast(err.message || 'Thao tác phê duyệt thất bại', 'error');
    },
  });

  const handleReview = async (profileId: string, status: 'VERIFIED' | 'REJECTED') => {
    if (status === 'REJECTED' && !showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    reviewMutation.mutate({ profileId, status, reason: rejectReason.trim() || undefined });
  };

  const displayUsers = profiles.map((p: any) => {
    const rawKyc = p.kycStatus || 'UNVERIFIED';
    const isVerified = rawKyc === 'VERIFIED';
    const isRejected = rawKyc === 'REJECTED';
    const fullName = p.fullName || p.user?.fullName || 'Đối tác SCANMS';
    return {
      id: p.id,
      fullName,
      email: p.user?.email || 'kol@scanms.vn',
      role: p.user?.role || 'COLLABORATOR',
      kycStatus: rawKyc,
      kycLabel: isVerified ? 'Đã xác minh' : isRejected ? 'Từ chối' : 'Chờ duyệt CCCD',
      tier: p.tier?.name || 'KOL Tiêu chuẩn',
      createdAt: new Date(p.createdAt || Date.now()).toLocaleDateString('vi-VN'),
      status: isVerified ? 'active' : isRejected ? 'rejected' : 'pending',
      avatar: fullName[0]?.toUpperCase() || 'K',
      avatarBg: isVerified ? 'bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]' : isRejected ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800',
      idCardNumber: p.idCardNumber || 'Chưa cung cấp',
      taxCode: p.taxCode || 'Chưa nộp',
      bankName: p.bankName || 'Chưa cung cấp',
      accountNumber: p.bankAccountNumber || p.accountNumber || 'Chưa cung cấp',
      accountHolder: p.bankAccountName || p.accountHolder || fullName,
      bio: p.bio || '',
      frontCardUrl: p.socialLinksJson?.frontCardUrl || null,
      backCardUrl: p.socialLinksJson?.backCardUrl || null,
      socialChannels: p.user?.socialChannels || [],
    };
  });

  const filtered = displayUsers.filter((u: any) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.idCardNumber.includes(search);
    const matchRole = filterRole === 'ALL' || u.role === filterRole;
    const matchStatus = filterStatus === 'ALL' || u.kycStatus === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const pendingCount = displayUsers.filter((u: any) => u.kycStatus === 'UNVERIFIED' || u.kycStatus === 'PENDING').length;
  const verifiedCount = displayUsers.filter((u: any) => u.kycStatus === 'VERIFIED').length;

  return (
    <div className="flex flex-col gap-6 text-left">
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 border ${
            toastMsg.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-800'
              : 'bg-[#231D15] text-[#F3EFE6] border-[#B88E4F]'
          }`}
        >
          {toastMsg.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#B88E4F]" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Ảnh phóng to Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Chi tiết CCCD"
              className="max-h-[85vh] w-auto rounded-xl object-contain mx-auto"
            />
          </div>
        </div>
      )}

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B88E4F] animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#B88E4F]">
              Cổng Quản Trị Thẩm Định Đa Cấp (FR-06)
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#1A1612] tracking-tight m-0">
            Xét Duyệt Hồ Sơ Định Danh & Kênh Sáng Tạo (KYC)
          </h1>
          <p className="text-xs sm:text-sm text-[#7D715E] mt-1 m-0">
            Thẩm định tính hợp pháp của CCCD, mã số thuế TNCN, đối soát tài khoản thụ hưởng và năng lực kênh mạng xã hội của KOL.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            icon={<Download className="w-4 h-4 text-[#B88E4F]" />}
            onClick={() => showToast('Đang xuất danh sách hồ sơ thẩm định...')}
            className="border-[#EAE4D7] text-[#1A1612] hover:bg-[#FAF8F5]"
          >
            Xuất báo cáo
          </Button>
          <Button
            variant="gold"
            size="md"
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={() => { loadPending(); }}
          >
            Làm mới
          </Button>
        </div>
      </header>

      {/* Thẻ thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Đã duyệt cấp Tích Xanh"
          value={verifiedCount.toString()}
          subText="KOL hợp lệ, đủ điều kiện nhận hoa hồng"
          icon={<ShieldCheck className="w-5 h-5 text-[#B88E4F]" />}
          iconBg="bg-[#FBF5EB] text-[#B88E4F]"
        />

        <StatCard
          title="Hồ sơ đã nộp"
          value={displayUsers.length.toString()}
          subText="Tổng số đối tác trong hệ thống"
          icon={<CreditCard className="w-5 h-5 text-[#B88E4F]" />}
          iconBg="bg-[#F3EFE6] text-[#7D715E]"
        />

        <StatCard
          title="Hồ sơ chờ thẩm định"
          value={pendingCount.toString()}
          trend={pendingCount > 0 ? 'Cần kiểm tra ngay' : 'Đã xử lý xong'}
          trendType={pendingCount > 0 ? 'negative' : 'positive'}
          icon={<Clock className="w-5 h-5 text-amber-700" />}
          iconBg="bg-amber-100 text-amber-800"
        />
      </div>

      {/* Bộ lọc */}
      <Card className="p-3.5 flex flex-wrap items-center gap-3 bg-white border border-[#EAE4D7] rounded-2xl">
        <Input
          placeholder="Tìm theo tên, email, CCCD hoặc mã đối tác..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          clearable
          onClear={() => setSearch('')}
          icon={<Search className="w-4 h-4 text-[#7D715E]" />}
          className="flex-1 min-w-[280px]"
        />

        <Select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          options={[
            { value: 'ALL', label: 'Tất cả vai trò' },
            { value: 'COLLABORATOR', label: 'Đối tác KOL/KOC' },
            { value: 'SHOP_MANAGER', label: 'Chủ Gian Hàng (Shop)' },
            { value: 'SYSTEM_ADMIN', label: 'Quản Trị Viên (Admin)' },
          ]}
        />

        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={[
            { value: 'ALL', label: 'Tất cả trạng thái KYC' },
            { value: 'VERIFIED', label: 'Đã xác minh (Tích Xanh)' },
            { value: 'UNVERIFIED', label: 'Chờ duyệt hồ sơ' },
            { value: 'REJECTED', label: 'Bị từ chối' },
          ]}
        />
      </Card>

      {/* Bảng danh sách */}
      <Card className="overflow-hidden p-0 bg-white border border-[#EAE4D7] rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EAE4D7]">
                <th className="py-3.5 px-4 text-xs font-bold text-[#7D715E] uppercase tracking-wider">Đối tác</th>
                <th className="py-3.5 px-4 text-xs font-bold text-[#7D715E] uppercase tracking-wider">Email</th>
                <th className="py-3.5 px-4 text-xs font-bold text-[#7D715E] uppercase tracking-wider">Kênh MXH</th>
                <th className="py-3.5 px-4 text-xs font-bold text-[#7D715E] uppercase tracking-wider">Trạng thái KYC</th>
                <th className="py-3.5 px-4 text-xs font-bold text-[#7D715E] uppercase tracking-wider">Cấp bậc</th>
                <th className="py-3.5 px-4 text-xs font-bold text-[#7D715E] uppercase tracking-wider">Ngày nộp</th>
                <th className="py-3.5 px-4 text-xs font-bold text-[#7D715E] uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF8F5]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#7D715E]">
                    <div className="text-3xl mb-2">📋</div>
                    <div className="font-bold text-[#1A1612]">Không tìm thấy hồ sơ nào</div>
                    <div className="text-xs text-[#7D715E] mt-1">
                      {loading ? 'Đang tải dữ liệu từ máy chủ...' : 'Chưa có hồ sơ định danh nào khớp với điều kiện tìm kiếm.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((u: any) => (
                  <tr key={u.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${u.avatarBg}`}
                        >
                          {u.avatar}
                        </span>
                        <div>
                          <div className="text-xs sm:text-sm font-extrabold text-[#1A1612] flex items-center gap-1.5">
                            {u.fullName}
                            {u.kycStatus === 'VERIFIED' && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#B88E4F]" />
                            )}
                          </div>
                          <div className="text-[11px] text-[#7D715E] font-mono">CCCD: {u.idCardNumber}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-[#7D715E] font-mono">
                      {u.email}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {u.socialChannels.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#EAE4D7] text-[#1A1612]">
                            {u.socialChannels.length} Kênh
                          </span>
                          <span className="text-[11px] text-[#7D715E]">
                            (
                            {u.socialChannels[0].platformName}{' '}
                            {Number(u.socialChannels[0].followerCount).toLocaleString('vi-VN')} flw
                            )
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-stone-400">Chưa liên kết</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {u.kycStatus === 'VERIFIED' && (
                        <Badge variant="success" dot size="md">
                          ĐÃ XÁC MINH
                        </Badge>
                      )}
                      {(u.kycStatus === 'UNVERIFIED' || u.kycStatus === 'PENDING') && (
                        <Badge variant="warning" dot dotPulse size="md">
                          CHỜ THẨM ĐỊNH
                        </Badge>
                      )}
                      {u.kycStatus === 'REJECTED' && (
                        <Badge variant="danger" dot size="md">
                          TỪ CHỐI
                        </Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F]">
                        {u.tier}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-[#7D715E]">
                      {u.createdAt}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      {(u.kycStatus === 'UNVERIFIED' || u.kycStatus === 'PENDING') ? (
                        <Button
                          variant="gold"
                          size="sm"
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          onClick={() => {
                            setInspectProfile(u);
                            setShowRejectInput(false);
                            setRejectReason('');
                          }}
                        >
                          Thẩm định hồ sơ
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5 text-[#B88E4F]" />}
                          onClick={() => {
                            setInspectProfile(u);
                            setShowRejectInput(false);
                            setRejectReason('');
                          }}
                          className="border-[#EAE4D7] text-[#1A1612] hover:bg-[#FAF8F5]"
                        >
                          Xem chi tiết
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* INSPECT MODAL: THẨM ĐỊNH TOÀN DIỆN CCCD + NGÂN HÀNG + KÊNH MXH */}
      {inspectProfile && (
        <Modal
          isOpen={Boolean(inspectProfile)}
          onClose={() => {
            setInspectProfile(null);
            setShowRejectInput(false);
          }}
          title="Hồ Sơ Định Danh & Năng Lực KOL"
          subtitle={`${inspectProfile.fullName} (${inspectProfile.email})`}
          icon={<ShieldCheck className="w-5 h-5 text-[#B88E4F]" />}
          maxWidth="2xl"
        >
          <div className="flex flex-col gap-4 text-left">
            {/* 1. Ảnh CCCD 2 mặt */}
            <div>
              <label className="text-xs font-extrabold text-[#1A1612] mb-2 block flex items-center justify-between">
                <span>Ảnh Căn Cước Công Dân (Bấm vào để phóng to)</span>
                <span className="text-[11px] font-normal text-[#7D715E]">Đối soát với thông tin nộp</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-[#EAE4D7] rounded-xl p-2 bg-[#FAF8F5] flex flex-col items-center">
                  <span className="text-[11px] font-bold text-[#7D715E] mb-1.5">Mặt trước CCCD</span>
                  {inspectProfile.frontCardUrl ? (
                    <img
                      src={inspectProfile.frontCardUrl}
                      alt="CCCD Mặt trước"
                      onClick={() => setPreviewImage(inspectProfile.frontCardUrl)}
                      className="w-full h-36 object-cover rounded-lg cursor-pointer hover:opacity-90 transition shadow-sm"
                    />
                  ) : (
                    <div className="w-full h-36 bg-stone-100 rounded-lg flex flex-col items-center justify-center text-stone-400 text-xs">
                      <CreditCard className="w-6 h-6 mb-1 opacity-50" />
                      Chưa nộp ảnh mặt trước
                    </div>
                  )}
                </div>

                <div className="border border-[#EAE4D7] rounded-xl p-2 bg-[#FAF8F5] flex flex-col items-center">
                  <span className="text-[11px] font-bold text-[#7D715E] mb-1.5">Mặt sau CCCD</span>
                  {inspectProfile.backCardUrl ? (
                    <img
                      src={inspectProfile.backCardUrl}
                      alt="CCCD Mặt sau"
                      onClick={() => setPreviewImage(inspectProfile.backCardUrl)}
                      className="w-full h-36 object-cover rounded-lg cursor-pointer hover:opacity-90 transition shadow-sm"
                    />
                  ) : (
                    <div className="w-full h-36 bg-stone-100 rounded-lg flex flex-col items-center justify-center text-stone-400 text-xs">
                      <CreditCard className="w-6 h-6 mb-1 opacity-50" />
                      Chưa nộp ảnh mặt sau
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Thông tin đối soát tài chính */}
            <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#EAE4D7] flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#EAE4D7]">
                <span className="text-[#7D715E] font-medium">Số Căn Cước Công Dân:</span>
                <strong className="font-mono text-[#1A1612] text-sm">{inspectProfile.idCardNumber}</strong>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#EAE4D7]">
                <span className="text-[#7D715E] font-medium">Mã Số Thuế Cá Nhân (MST):</span>
                <strong className="font-mono text-[#1A1612]">{inspectProfile.taxCode}</strong>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#EAE4D7]">
                <span className="text-[#7D715E] font-medium">Ngân Hàng Thụ Hưởng:</span>
                <strong className="text-[#1A1612] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#B88E4F]" />
                  {inspectProfile.bankName}
                </strong>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#EAE4D7]">
                <span className="text-[#7D715E] font-medium">Số Tài Khoản:</span>
                <strong className="font-mono text-[#B88E4F] font-bold text-sm">
                  {inspectProfile.accountNumber}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#7D715E] font-medium">Tên Chủ Tài Khoản:</span>
                <strong className="text-[#1A1612] font-extrabold flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#B88E4F]" />
                  {inspectProfile.accountHolder}
                </strong>
              </div>
            </div>

            {/* 3. Danh sách kênh truyền thông (FR-07) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-extrabold text-[#1A1612] flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-[#B88E4F]" />
                  Năng Lực Truyền Thông (Kênh Sáng Tạo Nội Dung)
                </label>
                <span className="text-[11px] font-bold text-[#7D715E]">
                  {inspectProfile.socialChannels.length} Kênh đã khai báo
                </span>
              </div>

              {inspectProfile.socialChannels.length === 0 ? (
                <div className="p-3 bg-[#FAF8F5] border border-dashed border-[#EAE4D7] rounded-xl text-center text-xs text-[#7D715E]">
                  KOL chưa liên kết kênh truyền thông nào.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {inspectProfile.socialChannels.map((ch: any) => (
                    <div
                      key={ch.id}
                      className="p-3 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-[#1A1612] truncate">
                            {ch.channelName || ch.platformName}
                          </span>
                          {ch.isPrimary && (
                            <span className="text-[9px] font-black bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] px-1.5 py-0.2 rounded-full">
                              Chính
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#7D715E] font-semibold">
                          {Number(ch.followerCount).toLocaleString('vi-VN')} người theo dõi
                        </div>
                      </div>
                      <a
                        href={ch.channelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-white border border-[#EAE4D7] rounded-lg text-[#B88E4F] hover:bg-[#FBF5EB] transition shrink-0"
                        title="Mở xem kênh"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form nhập lý do từ chối nếu bấm từ chối */}
            {showRejectInput && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex flex-col gap-2">
                <label className="text-xs font-bold text-rose-800">
                  Lý do từ chối hồ sơ (Gửi thông báo phản hồi cho KOL):
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="VD: Ảnh CCCD mặt sau bị mờ, không thấy rõ nơi cấp. Tên tài khoản ngân hàng không trùng khớp họ tên trên CCCD..."
                  rows={2}
                  className="w-full bg-white border border-rose-300 rounded-lg p-2.5 text-xs text-[#1A1612] outline-none"
                  required
                />
              </div>
            )}

            {/* Các nút hành động */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#EAE4D7]">
              <Button
                variant="outline"
                size="md"
                className="border-rose-300 text-rose-700 hover:bg-rose-50"
                onClick={() => handleReview(inspectProfile.id, 'REJECTED')}
              >
                {showRejectInput ? 'Xác nhận Từ chối' : 'Từ chối hồ sơ'}
              </Button>
              <Button
                variant="gold"
                size="md"
                icon={<ShieldCheck className="w-4 h-4" />}
                onClick={() => handleReview(inspectProfile.id, 'VERIFIED')}
              >
                Phê duyệt & Cấp Tích Xanh
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
