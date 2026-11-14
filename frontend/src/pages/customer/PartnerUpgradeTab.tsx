import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Clock3,
  CheckCircle2,
  CircleAlert,
  Lock,
  ShieldAlert,
  Send,
  X,
  Loader2,
} from 'lucide-react';
import {
  kycService,
  type UpgradeStatusResponse,
  type ApplyKolData,
} from '../../services/kyc.service';
import { authService } from '../../services/auth.service';
import { toast } from '../../utils/toast';
import { KolUpgradeForm } from './PartnerUpgradeForms';

const createEmptyKolForm = (): ApplyKolData => ({
  platform: 'TIKTOK',
  channelName: '',
  channelUrl: '',
  followerCount: '' as unknown as number,
  channelProofUrl: '',
  idCardNumber: '',
  taxCode: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountName: '',
  bio: '',
  frontCardUrl: '',
  backCardUrl: '',
  channels: [
    {
      platform: 'TIKTOK',
      channelName: '',
      channelUrl: '',
      followerCount: '' as unknown as number,
      channelProofUrl: '',
      isPrimary: true,
    },
  ],
  specialtyCategories: [],
});

export function ApplicationBadge({ status }: { status?: string | null }) {
  const verified = status === 'VERIFIED';
  const rejected = status === 'REJECTED';
  const needsInfo = status === 'NEEDS_INFO';
  const empty = !status || status === 'DRAFT';
  const Icon = verified ? CheckCircle2 : rejected || needsInfo ? CircleAlert : Clock3;
  const label = verified
    ? 'Đã xác minh'
    : rejected
      ? 'Bị từ chối'
      : needsInfo
        ? 'Cần bổ sung'
        : status === 'DRAFT'
          ? 'Bản nháp'
          : status
            ? 'Chờ xét duyệt'
            : 'Chưa đăng ký';
  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
        empty
          ? 'bg-[#FAF8F5] border-[#EAE4D7] text-[#7D715E]'
          : rejected
            ? 'bg-white border-[#F5D8D4] text-[#DC2626]'
            : needsInfo
              ? 'bg-[#FBF5EB] border-[#F5D09B] text-[#D97706]'
              : verified
                ? 'bg-[#FBF5EB] border-[#EEDFC6] text-[#059669]'
                : 'bg-[#FBF5EB] border-[#EEDFC6] text-[#8F682E]'
      }`}
    >
      <Icon size={13} />
      {label}
    </span>
  );
}

export const PartnerUpgradeTab: React.FC = () => {
  const navigate = useNavigate();
  const [statusData, setStatusData] = useState<UpgradeStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [kolForm, setKolForm] = useState(createEmptyKolForm);

  const loadStatus = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await kycService.getMyUpgradeStatus();
      setStatusData(data);
      const app = data?.kolApplication;
      if (app) {
        const meta =
          app.socialLinksJson && typeof app.socialLinksJson === 'object'
            ? app.socialLinksJson
            : {};
        const channelsFromMeta = Array.isArray(meta.channels) && meta.channels.length > 0
          ? meta.channels
          : Array.isArray(app.channels) && app.channels.length > 0
            ? app.channels.map((ch: any) => ({
                platform: ch.platformName || ch.platform || 'TIKTOK',
                channelName: ch.channelName || '',
                channelUrl: ch.channelUrl || '',
                followerCount: Number(ch.followerCount) || 0,
                channelProofUrl: meta.channelProofUrl || '',
                isPrimary: Boolean(ch.isPrimary),
              }))
            : null;
        const primaryCh = channelsFromMeta?.[0];
        setKolForm((prev) => ({
          ...prev,
          platform: (primaryCh?.platform || meta.platform || prev.platform) as any,
          channelName: primaryCh?.channelName || meta.channelName || prev.channelName,
          channelUrl: primaryCh?.channelUrl || meta.channelUrl || prev.channelUrl,
          followerCount:
            primaryCh?.followerCount ??
            meta.followerCount ??
            (app.totalFollowers > 0 ? app.totalFollowers : prev.followerCount),
          channelProofUrl: primaryCh?.channelProofUrl || meta.channelProofUrl || prev.channelProofUrl,
          channels: channelsFromMeta || prev.channels,
          specialtyCategories: Array.isArray(meta.specialtyCategories)
            ? meta.specialtyCategories
            : prev.specialtyCategories,
          bio: app.bio ?? prev.bio,
          idCardNumber: app.idCardNumber ?? prev.idCardNumber,
          taxCode: app.taxCode ?? prev.taxCode,
          frontCardUrl: meta.frontCardUrl ?? prev.frontCardUrl,
          backCardUrl: meta.backCardUrl ?? prev.backCardUrl,
          bankName: app.bankName ?? prev.bankName,
          bankAccountNumber: app.bankAccountNumber ?? prev.bankAccountNumber,
          bankAccountName: app.bankAccountName ?? prev.bankAccountName,
        }));
      }
    } catch (err: any) {
      console.error('Failed to load upgrade status:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleKolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const primaryChannel = kolForm.channels?.[0];
    const platform = primaryChannel?.platform || kolForm.platform;
    const channelUrl = primaryChannel?.channelUrl || kolForm.channelUrl;

    if (!platform) {
      toast.error('Vui lòng chọn nền tảng mạng xã hội chính');
      return;
    }
    if (!channelUrl?.trim()) {
      toast.error('Vui lòng nhập liên kết kênh mạng xã hội');
      return;
    }
    if (!kolForm.idCardNumber?.trim() || kolForm.idCardNumber.length < 9) {
      toast.error('Vui lòng nhập số CCCD/CMND hợp lệ (9 - 12 chữ số)');
      return;
    }
    if (!kolForm.frontCardUrl?.trim() || !kolForm.backCardUrl?.trim()) {
      toast.error('Vui lòng tải lên ảnh CCCD mặt trước và mặt sau');
      return;
    }

    // Tài khoản ngân hàng là tùy chọn lúc đăng ký (có thể bổ sung khi rút tiền)
    const hasAnyBank = Boolean(
      kolForm.bankName?.trim() ||
      kolForm.bankAccountNumber?.trim() ||
      kolForm.bankAccountName?.trim()
    );
    if (hasAnyBank) {
      if (!kolForm.bankName?.trim()) {
        toast.error('Vui lòng chọn tên ngân hàng thụ hưởng');
        return;
      }
      if (!kolForm.bankAccountNumber?.trim() || !kolForm.bankAccountName?.trim()) {
        toast.error('Vui lòng nhập đầy đủ số tài khoản và tên chủ tài khoản ngân hàng');
        return;
      }
    }

    setShowConfirmModal(true);
  };

  const executeKolSubmit = async () => {
    const primaryChannel = kolForm.channels?.[0];
    const platform = primaryChannel?.platform || kolForm.platform;
    const channelUrl = primaryChannel?.channelUrl || kolForm.channelUrl;
    const channelName = primaryChannel?.channelName || kolForm.channelName;
    const followerCount = primaryChannel?.followerCount !== undefined ? primaryChannel.followerCount : kolForm.followerCount;
    const channelProofUrl = primaryChannel?.channelProofUrl || kolForm.channelProofUrl;

    setSubmitting(true);
    try {
      const payload: ApplyKolData = {
        ...kolForm,
        platform,
        channelUrl,
        channelName,
        followerCount: Number(followerCount) || 0,
        channelProofUrl,
        channels: (kolForm.channels && kolForm.channels.length > 0)
          ? kolForm.channels
          : [
              {
                platform: (platform as any) || 'TIKTOK',
                channelName: channelName || '',
                channelUrl: channelUrl || '',
                followerCount: Number(followerCount) || 0,
                channelProofUrl: channelProofUrl || undefined,
                isPrimary: true,
              },
            ],
        specialtyCategories: kolForm.specialtyCategories?.length ? kolForm.specialtyCategories : undefined,
      };

      const res = await kycService.applyKolUpgrade(payload);
      localStorage.removeItem('scanms_kol_upgrade_draft');
      setShowConfirmModal(false);
      toast.success(res.message || 'Đã nộp hồ sơ đăng ký thành công! Vui lòng chờ xét duyệt.');
      await loadStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Không thể gửi hồ sơ');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-2 text-xs text-[#7D715E]">
          <span className="w-4 h-4 border-2 border-[#C59B58] border-t-transparent rounded-full animate-spin" />
          <span>Đang tải thông tin hồ sơ đối tác…</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return <div role="alert" className="rounded-2xl border border-[#EEDFC6] bg-white p-5 text-sm text-[#1A1612]">
      <p>Không tải được trạng thái hồ sơ đối tác. Vui lòng kiểm tra kết nối trước khi gửi hồ sơ mới.</p>
      <button type="button" onClick={() => void loadStatus()}
        className="mt-3 min-h-11 rounded-xl border border-[#C59B58] bg-[#FBF5EB] px-4 font-semibold text-[#795A2D]">
        Tải lại trạng thái
      </button>
    </div>;
  }

  const kolApp = statusData?.kolApplication;
  const reviewStatus =
    kolApp?.reviewStatus ||
    (kolApp?.status === 'VERIFIED'
      ? 'VERIFIED'
      : kolApp?.status === 'REJECTED'
        ? 'REJECTED'
        : kolApp?.status === 'UNVERIFIED'
          ? 'PENDING_APPROVAL'
          : 'DRAFT');
  const isVerified = reviewStatus === 'VERIFIED';
  const isPendingLocked = reviewStatus === 'PENDING_APPROVAL';
  const isNeedsInfo = reviewStatus === 'NEEDS_INFO';
  const isRejected = reviewStatus === 'REJECTED';

  const primaryChannel = kolForm.channels?.[0];
  const summaryPlatform = primaryChannel?.platform || kolForm.platform || 'TIKTOK';
  const summaryChannelName = primaryChannel?.channelName || kolForm.channelName || 'Chưa đặt tên';
  const summaryFollowers = Number(primaryChannel?.followerCount ?? kolForm.followerCount ?? 0);

  return (
    <div className="w-full max-w-[1200px] space-y-5 pb-12 text-[#1A1612]">
      {/* Header hiển thị trạng thái hồ sơ khi đã nộp */}
      {(isVerified || isPendingLocked || isNeedsInfo || isRejected) && (
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div className="flex items-center gap-2.5">
            <ApplicationBadge status={reviewStatus} />
            {isPendingLocked && (
              <span className="text-xs text-[#7D715E]">
                Bạn có thể xem lại thông tin đã nộp bên dưới trong lúc chờ Ban Quản Trị thẩm định.
              </span>
            )}
          </div>
        </header>
      )}

      {/* Trạng thái tài khoản đã duyệt */}
      {isVerified ? (
        <div className="p-6 border border-[#EEDFC6] rounded-2xl bg-[#FBF5EB] space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-[#EEDFC6] flex items-center justify-center text-[#059669]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1612] m-0">
                Tài khoản đã kích hoạt (Hạng khởi điểm: Đồng)
              </h3>
              <p className="text-xs text-[#7D715E] mt-1 m-0">
                Hưởng thù lao cơ sở 10% chuẩn hệ thống và toàn quyền sử dụng bộ công cụ tiếp thị liên kết.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => authService.switchWorkspace('kol', navigate)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white font-semibold text-xs shadow-xs transition active:scale-[0.98] cursor-pointer"
          >
            Vào Không gian Tiếp thị
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* Form nộp hồ sơ 2 cột đối xứng (tự động khóa readOnly khi đang PENDING_APPROVAL) */
        <KolUpgradeForm
          form={kolForm}
          setForm={setKolForm}
          onSubmit={handleKolSubmit}
          submitting={submitting}
          readOnly={isPendingLocked}
          rejectionReason={
            isNeedsInfo || isRejected
              ? kolApp?.rejectionReason || kolApp?.socialLinksJson?.rejectionReason || 'Vui lòng kiểm tra lại thông tin'
              : undefined
          }
          status={reviewStatus}
        />
      )}

      {/* Pop-up Xác nhận trước khi gửi duyệt (Cảnh báo khóa hồ sơ) */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1612]/50 backdrop-blur-[2px]"
          onClick={() => !submitting && setShowConfirmModal(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-2xl bg-white border border-[#EAE4D7] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#FBF5EB] border-b border-[#EEDFC6] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#C59B58]/15 text-[#B88E4F] flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1A1612] m-0">
                    Xác nhận gửi hồ sơ xét duyệt?
                  </h3>
                  <p className="text-[11px] text-[#7D715E] m-0">
                    Kiểm tra kỹ thông tin trước khi nộp lên Ban Quản Trị
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowConfirmModal(false)}
                className="p-1.5 rounded-lg text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#1A1612] transition cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-xs text-[#7D715E] leading-relaxed">
                <ShieldAlert className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#1A1612] block mb-0.5">Lưu ý quan trọng về khóa chỉnh sửa</strong>
                  Một khi đã gửi duyệt, hồ sơ sẽ bị <strong className="text-[#1A1612]">khóa tạm thời</strong> để Ban Quản Trị đối soát. Bạn chỉ có thể chỉnh sửa lại sau khi Quản lý phản hồi hoặc gửi yêu cầu bổ sung.
                </div>
              </div>

              <div className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#7D715E]">Kênh chính</span>
                  <span className="font-semibold text-[#1A1612] text-right">
                    {summaryPlatform} • {summaryChannelName}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#7D715E]">Lượng theo dõi</span>
                  <span className="font-semibold text-[#1A1612] tabular-nums">
                    {summaryFollowers.toLocaleString('vi-VN')} followers
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#7D715E]">Số CCCD / CMND</span>
                  <span className="font-semibold text-[#1A1612] tabular-nums">
                    {kolForm.idCardNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#7D715E]">Ngân hàng thụ hưởng</span>
                  <span className="font-semibold text-[#1A1612] text-right">
                    {kolForm.bankName ? `${kolForm.bankName} • ${kolForm.bankAccountNumber}` : 'Bổ sung sau'}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#FAF8F5] border-t border-[#EAE4D7] flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#F3EFE6] text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] transition cursor-pointer disabled:opacity-50"
              >
                Kiểm tra lại
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={executeKolSubmit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-semibold shadow-xs transition active:scale-[0.98] cursor-pointer disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {submitting ? 'Đang gửi...' : 'Xác nhận gửi duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerUpgradeTab;
