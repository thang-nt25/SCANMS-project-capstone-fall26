import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Clock3,
  CheckCircle2,
  CircleAlert,
  RefreshCw,
  Phone,
  Mail,
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
  platform: '' as ApplyKolData['platform'],
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
});

function ApplicationBadge({ status }: { status?: string | null }) {
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
      className={`inline-flex items-center gap-1.5 border rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
        empty
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
    if (!kolForm.platform) {
      toast.error('Vui lòng chọn nền tảng mạng xã hội chính');
      return;
    }
    if (!kolForm.channelUrl?.trim()) {
      toast.error('Vui lòng nhập liên kết kênh');
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
    if (!kolForm.bankName?.trim()) {
      toast.error('Vui lòng chọn ngân hàng thụ hưởng');
      return;
    }
    if (!kolForm.bankAccountNumber?.trim() || !kolForm.bankAccountName?.trim()) {
      toast.error('Vui lòng nhập thông tin tài khoản ngân hàng thụ hưởng');
      return;
    }

    setSubmitting(true);
    try {
      await kycService.applyKolUpgrade(kolForm);
      toast.success('Đã gửi hồ sơ đăng ký đối tác tiếp thị');
      loadStatus();
      authService.getMe();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể gửi hồ sơ');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="border border-[#EAE4D7] rounded-2xl bg-white p-10 text-center text-[#7D715E]">
        <RefreshCw className="h-5 w-5 animate-spin text-[#C59B58] mx-auto mb-2" />
        <p className="text-xs">Đang tải hồ sơ...</p>
      </div>
    );
  }

  const kolApp = statusData?.kolApplication;
  const isVerified = kolApp?.status === 'VERIFIED';
  const isPending = kolApp?.status === 'UNVERIFIED';
  const isRejected = kolApp?.status === 'REJECTED';

  return (
    <div className="space-y-5 text-[#1A1612]">
      {/* Clean Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 lg:p-6 border border-[#EAE4D7] rounded-2xl bg-white shadow-[0_1px_2px_rgba(35,29,21,0.02)]">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#1A1612]">
            Đăng ký Đối tác Tiếp thị
          </h1>
          <p className="mt-1 text-xs text-[#7D715E]">
            Định danh cá nhân (eKYC) để nhận thù lao tiếp thị và liên kết phân phối sản phẩm chính hãng.
          </p>
        </div>
        <div className="shrink-0">
          <ApplicationBadge status={kolApp?.status} />
        </div>
      </header>

      {/* 60/40 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (60%): Form / Status Screen */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {isVerified ? (
            <div className="p-6 border border-[#EEDFC6] rounded-2xl bg-[#FBF5EB] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#EEDFC6] flex items-center justify-center text-[#059669]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1A1612]">
                    Tài khoản đã kích hoạt (Hạng khởi điểm: Đồng)
                  </h3>
                  <p className="text-xs text-[#7D715E] mt-0.5">
                    Hưởng hoa hồng cơ sở 10% chuẩn hệ thống và toàn quyền sử dụng bộ công cụ tiếp thị.
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
            <div className="p-6 border border-[#EEDFC6] rounded-2xl bg-white space-y-4 shadow-[0_1px_2px_rgba(35,29,21,0.02)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center text-[#8F682E]">
                  <Clock3 className="w-5 h-5 text-[#C59B58]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1A1612]">
                    Hồ sơ đang chờ thẩm định (SLA 24h)
                  </h3>
                  <p className="text-xs text-[#7D715E] mt-0.5">
                    Bộ phận vận hành đang đối soát thông tin CCCD và tài khoản ngân hàng thụ hưởng.
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <KolUpgradeForm
                  form={kolForm}
                  setForm={setKolForm}
                  onSubmit={handleKolSubmit}
                  submitting={submitting}
                />
              </div>
            </div>
          ) : (
            <div className="border border-[#EAE4D7] rounded-2xl bg-white shadow-[0_1px_2px_rgba(35,29,21,0.02)] overflow-hidden">
              {isRejected && (
                <div className="flex items-start gap-2.5 p-3.5 bg-[#FAF8F5] border-b border-[#F5D8D4] text-[#DC2626] text-xs">
                  <CircleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold mb-0.5">Hồ sơ cần cập nhật lại</strong>
                    {kolApp?.socialLinksJson?.rejectionReason || 'Vui lòng kiểm tra lại ảnh CCCD và thông tin kênh.'}
                  </div>
                </div>
              )}
              <KolUpgradeForm
                form={kolForm}
                setForm={setKolForm}
                onSubmit={handleKolSubmit}
                submitting={submitting}
                rejectionReason={
                  kolApp?.status === 'REJECTED'
                    ? kolApp.socialLinksJson?.rejectionReason
                    : undefined
                }
              />
            </div>
          )}
        </div>

        {/* Right Column (40%): Executive Policy Card */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-[#EAE4D7] shadow-[0_1px_2px_rgba(35,29,21,0.02)] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#EAE4D7]">
              <ShieldCheck className="w-4 h-4 text-[#C59B58]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1612]">
                Chính sách đối tác tiếp thị
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[#FAF8F5]">
                <span className="text-[#7D715E]">Hoa hồng cơ sở</span>
                <span className="font-semibold text-[#1A1612] font-mono">10% (Hạng Đồng)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#FAF8F5]">
                <span className="text-[#7D715E]">Hàng mẫu thử</span>
                <span className="font-semibold text-[#1A1612]">14 ngày trải nghiệm</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#FAF8F5]">
                <span className="text-[#7D715E]">Deal độc quyền</span>
                <span className="font-semibold text-[#1A1612] font-mono">VIP 13% – 16%</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#FAF8F5]">
                <span className="text-[#7D715E]">Rút tiền Napas 24/7</span>
                <span className="font-semibold text-[#1A1612]">Khấu trừ 10% TNCN</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[#7D715E]">Thời gian duyệt</span>
                <span className="font-semibold text-[#059669]">Cam kết trong 24h</span>
              </div>
            </div>

            {/* Compact Flow */}
            <div className="pt-2 border-t border-[#EAE4D7]">
              <div className="text-[11px] font-semibold text-[#7D715E] uppercase tracking-wider mb-2">
                Quy trình tiếp nhận
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7]">
                  <span className="font-bold text-[#1A1612] block">1. Nộp eKYC</span>
                  <span className="text-[#7D715E]">Khai báo kênh & CCCD</span>
                </div>
                <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7]">
                  <span className="font-bold text-[#1A1612] block">2. Thẩm định</span>
                  <span className="text-[#7D715E]">Đối soát thông tin</span>
                </div>
                <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7]">
                  <span className="font-bold text-[#1A1612] block">3. Hạng Đồng</span>
                  <span className="text-[#7D715E]">Hoa hồng 10%</span>
                </div>
                <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7]">
                  <span className="font-bold text-[#1A1612] block">4. Lấy Smart Link</span>
                  <span className="text-[#7D715E]">Bắt đầu tiếp thị</span>
                </div>
              </div>
            </div>

            {/* Helpline */}
            <div className="pt-3 border-t border-[#EAE4D7] flex items-center justify-between text-[11px] text-[#7D715E]">
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3 h-3 text-[#C59B58]" /> 1900 6868
              </span>
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3 h-3 text-[#C59B58]" /> creator@scanms.vn
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerUpgradeTab;
