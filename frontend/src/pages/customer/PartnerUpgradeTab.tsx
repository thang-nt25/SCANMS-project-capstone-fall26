import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Clock3,
  CheckCircle2,
  CircleAlert,
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
  const empty = !status || status === 'DRAFT';
  const Icon = verified ? CheckCircle2 : rejected ? CircleAlert : Clock3;
  const label = verified
    ? 'Đã xác minh'
    : rejected
      ? 'Cần bổ sung'
      : status === 'NEEDS_INFO'
        ? 'Cần bổ sung'
        : status === 'DRAFT'
          ? 'Bản nháp'
          : status
            ? 'Chờ xét duyệt'
            : 'Chưa đăng ký';
  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${empty
          ? 'bg-[#FAF8F5] border-[#EAE4D7] text-[#7D715E]'
          : rejected
            ? 'bg-white border-[#F5D8D4] text-[#DC2626]'
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
  const [submitting, setSubmitting] = useState(false);
  const [kolForm, setKolForm] = useState(createEmptyKolForm);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await kycService.getMyUpgradeStatus();
      setStatusData(data);
    } catch (err: any) {
      console.error('Failed to load upgrade status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleKolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const primaryChannel = kolForm.channels?.[0];
    const platform = primaryChannel?.platform || kolForm.platform;
    const channelUrl = primaryChannel?.channelUrl || kolForm.channelUrl;
    const channelName = primaryChannel?.channelName || kolForm.channelName;
    const followerCount = primaryChannel?.followerCount !== undefined ? primaryChannel.followerCount : kolForm.followerCount;
    const channelProofUrl = primaryChannel?.channelProofUrl || kolForm.channelProofUrl;

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

  const kolApp = statusData?.kolApplication;
  const isVerified = kolApp?.status === 'VERIFIED';
  const isPending = kolApp?.status === 'UNVERIFIED';
  const isRejected = kolApp?.status === 'REJECTED';

  return (
    <div className="w-full space-y-5 pb-12 text-[#1A1612]">
      {/* Header chỉ hiển thị khi đã được kích hoạt hoặc đang chờ duyệt */}
      {(isVerified || isPending) && (
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1612] m-0">
              Đăng ký Đối tác Tiếp thị
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            <ApplicationBadge status={kolApp?.status} />
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
      ) : isPending ? (
        <div className="p-6 border border-[#EAE4D7] rounded-2xl bg-white space-y-3">
          <div className="flex items-center gap-2.5 text-[#D97706]">
            <Clock3 className="w-5 h-5" />
            <h3 className="text-sm font-bold text-[#1A1612] m-0">
              Hồ sơ đang trong quá trình xét duyệt
            </h3>
          </div>
          <p className="text-xs text-[#7D715E] m-0 leading-relaxed">
            Hồ sơ định danh của bạn đã được gửi lên Ban Quản Trị sàn SCANMS. Thời gian xét duyệt tiêu chuẩn trong vòng 24 giờ làm việc.
          </p>
        </div>
      ) : (
        /* Form nộp hồ sơ 2 cột đối xứng với header bar thống nhất */
        <KolUpgradeForm
          form={kolForm}
          setForm={setKolForm}
          onSubmit={handleKolSubmit}
          submitting={submitting}
          rejectionReason={isRejected ? kolApp?.socialLinksJson?.rejectionReason || 'Vui lòng kiểm tra lại thông tin' : undefined}
          status={kolApp?.status}
        />
      )}
    </div>
  );
};

export default PartnerUpgradeTab;
