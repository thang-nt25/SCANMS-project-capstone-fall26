import React, { useState, useEffect, useRef } from 'react';
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
import './PartnerUpgrade.css';

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
      className={`inline-flex items-center gap-1.5 border rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap shadow-2xs ${
        empty
          ? 'bg-[#FAF8F5] border-[#EAE4D7] text-[#7D715E]'
          : rejected
            ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#DC2626]'
            : verified
              ? 'bg-[#F0FDF4] border-[#DCFCE7] text-[#059669]'
              : 'bg-[#FBF5EB] border-[#EEDFC6] text-[#8F682E]'
      }`}
    >
      <Icon size={14} className={rejected ? 'text-[#DC2626]' : verified ? 'text-[#059669]' : empty ? 'text-[#7D715E]' : 'text-[#C59B58]'} />
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
  const [policyTab, setPolicyTab] = useState(0);
  const layoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;
    const headers = Array.from(layout.querySelectorAll<HTMLElement>('.partner-form-header, .partner-policy > div:first-child'));
    if (headers.length !== 2) return;
    const alignHeaders = () => {
      const height = Math.max(49, ...headers.map(header => {
        const contentHeight = Math.max(...Array.from(header.children).map(child => child.getBoundingClientRect().height));
        const style = getComputedStyle(header);
        return contentHeight + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + parseFloat(style.borderBottomWidth);
      }));
      layout.style.setProperty('--partner-header-height', `${Math.ceil(height)}px`);
    };
    const observer = new ResizeObserver(alignHeaders);
    headers.forEach(header => Array.from(header.children).forEach(child => observer.observe(child)));
    alignHeaders();
    return () => observer.disconnect();
  }, [loading, statusData?.kolApplication?.status]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await kycService.getMyUpgradeStatus();
      setStatusData(data);
      if (data?.kolApplication) {
        const app = data.kolApplication;
        const extra = app.socialLinksJson || {};
        const primaryChannel = app.channels?.find((c: any) => c.isPrimary) || app.channels?.[0];
        setKolForm(prev => ({
          ...prev,
          platform: (extra.platform || primaryChannel?.platformName || prev.platform || '') as any,
          channelName: extra.channelName || primaryChannel?.channelName || prev.channelName || '',
          channelUrl: extra.channelUrl || primaryChannel?.channelUrl || prev.channelUrl || '',
          followerCount: extra.followerCount ?? primaryChannel?.followerCount ?? prev.followerCount ?? ('' as any),
          channelProofUrl: extra.channelProofUrl || primaryChannel?.channelProofUrl || prev.channelProofUrl || '',
          idCardNumber: extra.idCardNumber || prev.idCardNumber || '',
          taxCode: extra.taxCode || prev.taxCode || '',
          bankName: extra.bankName || prev.bankName || '',
          bankAccountNumber: extra.bankAccountNumber || prev.bankAccountNumber || '',
          bankAccountName: extra.bankAccountName || prev.bankAccountName || '',
          bio: extra.bio || prev.bio || '',
          frontCardUrl: extra.frontCardUrl || prev.frontCardUrl || '',
          backCardUrl: extra.backCardUrl || prev.backCardUrl || '',
        }));
      }
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
      <div className="border border-[#EAE4D7] rounded-2xl bg-white p-12 text-center text-[#7D715E] shadow-xs">
        <RefreshCw className="h-6 w-6 animate-spin text-[#C59B58] mx-auto mb-2.5" />
        <p className="text-xs font-medium">Đang tải hồ sơ đối tác…</p>
      </div>
    );
  }

  const kolApp = statusData?.kolApplication;
  const isVerified = kolApp?.status === 'VERIFIED';
  const isRejected = kolApp?.status === 'REJECTED';

  return (
    <div ref={layoutRef} className="partner-upgrade space-y-6 text-[#1A1612]">
      {/* 60/40 Split Layout without redundant top banner */}
      <div className="partner-upgrade-layout">
        {/* Left Column (60%): Form / Status Screen */}
        <div className="partner-upgrade-primary space-y-5">
          {isVerified ? (
            <div className="p-6 border border-[#EEDFC6] rounded-2xl bg-[#FBF5EB] space-y-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#EEDFC6] flex items-center justify-center text-[#059669] shadow-2xs">
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white font-bold text-xs shadow-xs transition active:scale-[0.98] cursor-pointer"
              >
                Vào Không gian Tiếp thị
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="partner-upgrade-form-wrap">
              <KolUpgradeForm
                form={kolForm}
                setForm={setKolForm}
                onSubmit={handleKolSubmit}
                submitting={submitting}
                rejectionReason={
                  isRejected
                    ? kolApp?.socialLinksJson?.rejectionReason || 'Vui lòng kiểm tra lại ảnh CCCD và thông tin kênh.'
                    : undefined
                }
                statusBadge={<ApplicationBadge status={kolApp?.status} />}
              />
            </div>
          )}
        </div>

        {/* Right Column (40%): Executive Policy Card */}
        <aside className="partner-upgrade-aside" aria-label="Chính sách và quy trình đăng ký đối tác">
          <div className="partner-policy">
            <div className="flex items-center gap-2.5 pb-3.5 border-b border-[#EAE4D7]">
              <div className="w-8 h-8 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F] shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-[#C59B58]" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1612]">
                  Chính sách đối tác tiếp thị
                </h3>
              </div>
            </div>

            <div className="partner-policy-tabs" role="tablist" aria-label="Thông tin dành cho đối tác">
              {['Quyền lợi', 'Quy trình', 'Liên hệ'].map((label, index) => (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  id={`partner-policy-tab-${index}`}
                  aria-controls={`partner-policy-panel-${index}`}
                  aria-selected={policyTab === index}
                  tabIndex={policyTab === index ? 0 : -1}
                  onClick={() => setPolicyTab(index)}
                  onKeyDown={event => {
                    let next = index;
                    if (event.key === 'ArrowRight') next = (index + 1) % 3;
                    else if (event.key === 'ArrowLeft') next = (index + 2) % 3;
                    else if (event.key === 'Home') next = 0;
                    else if (event.key === 'End') next = 2;
                    else return;
                    event.preventDefault();
                    setPolicyTab(next);
                    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="partner-policy-panel" id="partner-policy-panel-0" role="tabpanel" aria-labelledby="partner-policy-tab-0" hidden={policyTab !== 0} tabIndex={0}>
            <div className="partner-policy-highlights">
              <div><span>Hoa hồng cơ sở</span><strong>10<small>%</small></strong><span>Khởi điểm hạng Đồng</span></div>
              <div><span>Trải nghiệm mẫu</span><strong>14<small>ngày</small></strong><span>Thời gian dùng thử</span></div>
            </div>
            <div className="partner-policy-rows space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[#FAF8F5]">
                <span className="text-[#7D715E]">Deal độc quyền</span>
                <span className="font-bold text-[#8F682E]">VIP 13% – 16%</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#FAF8F5]">
                <span className="text-[#7D715E]" title="Qua Napas 24/7">Rút tiền 24/7</span>
                <span className="font-semibold text-[#1A1612]">Khấu trừ 10% TNCN</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[#7D715E]">Thời gian duyệt</span>
                <span className="font-bold text-[#059669] flex items-center gap-1">
                  <Clock3 size={12} /> Cam kết trong 24h
                </span>
              </div>
            </div>
            </div>

            {/* Compact Flow */}
            <div className="partner-policy-panel partner-policy-process" id="partner-policy-panel-1" role="tabpanel" aria-labelledby="partner-policy-tab-1" hidden={policyTab !== 1} tabIndex={0}>
              <div className="text-[11px] font-bold text-[#7D715E] uppercase tracking-wider mb-2.5">
                Quy trình tiếp nhận (4 bước)
              </div>
              <ol className="partner-policy-timeline">
                {[
                  ['Nộp eKYC', 'Kênh & CCCD'],
                  ['Thẩm định', 'Đối soát trong 24h'],
                  ['Hạng Đồng', 'Hoa hồng 10%'],
                  ['Tiếp thị', 'Tạo link sản phẩm'],
                ].map(([title, description], index) => <li key={title}>
                  <span className="partner-policy-timeline-number" aria-hidden="true">{index + 1}</span>
                  <div><strong>{title}</strong><p>{description}</p></div>
                </li>)}
              </ol>
            </div>

            {/* Helpline */}
            <div className="partner-policy-panel" id="partner-policy-panel-2" role="tabpanel" aria-labelledby="partner-policy-tab-2" hidden={policyTab !== 2} tabIndex={0}>
              <div className="partner-policy-contact-options">
                <a href="tel:19006868"><Phone aria-hidden="true" /><span><small>Hotline hỗ trợ</small><strong>1900 6868</strong></span></a>
                <a href="mailto:creator@scanms.vn"><Mail aria-hidden="true" /><span><small>Email đối tác</small><strong>creator@scanms.vn</strong></span></a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PartnerUpgradeTab;
