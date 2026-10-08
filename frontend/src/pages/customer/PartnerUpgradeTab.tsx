import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Store,
  ArrowRight,
  ShieldCheck,
  Clock3,
  CheckCircle2,
  CircleAlert,
  RefreshCw,
} from 'lucide-react';
import {
  kycService,
  type UpgradeStatusResponse,
  type ApplyKolData,
  type ApplyShopData,
} from '../../services/kyc.service';
import { authService } from '../../services/auth.service';
import { toast } from '../../utils/toast';

import { KolUpgradeForm, ShopUpgradeForm } from './PartnerUpgradeForms';
import './PartnerUpgradeTab.css';

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

const createEmptyShopForm = (): ApplyShopData => ({
  shopName: '',
  description: '',
  warehouseAddress: '',
  businessType: '' as ApplyShopData['businessType'],
  taxCode: '',
  businessLicenseUrl: '',
  brandAuthorizationUrl: '',
  contactPhone: '',
  contactEmail: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountName: '',
  idCardNumber: '',
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
      ? 'Cần nộp lại'
      : status === 'NEEDS_INFO'
        ? 'Cần bổ sung'
        : status === 'DRAFT'
          ? 'Bản nháp'
          : status
            ? 'Chờ xét duyệt'
            : 'Chưa đăng ký';
  return (
    <span
      className={`partner-status ${empty ? 'is-empty' : ''} ${rejected ? 'is-error' : ''}`}
    >
      {!empty && <Icon />}
      {label}
    </span>
  );
}

export const PartnerUpgradeTab: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activePartnerType, setActivePartnerType] = useState<'kol' | 'shop'>(
    location.pathname.endsWith('/upgrade/shop') ? 'shop' : 'kol',
  );
  const [statusData, setStatusData] = useState<UpgradeStatusResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setContentWidth(entry.contentRect.width),
    );
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [loading]);

  const [kolForm, setKolForm] = useState(createEmptyKolForm);
  const [shopForm, setShopForm] = useState(createEmptyShopForm);

  useEffect(() => {
    setKolForm(createEmptyKolForm());
    setShopForm(createEmptyShopForm());
    if (location.pathname.endsWith('/upgrade/shop'))
      setActivePartnerType('shop');
    if (location.pathname.endsWith('/upgrade/kol')) setActivePartnerType('kol');
  }, [location.pathname]);

  useEffect(() => {
    const clearRestoredForm = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setKolForm(createEmptyKolForm());
      setShopForm(createEmptyShopForm());
    };
    window.addEventListener('pageshow', clearRestoredForm);
    return () => window.removeEventListener('pageshow', clearRestoredForm);
  }, []);

  const selectPartnerType = (type: 'kol' | 'shop') => {
    if (type === activePartnerType) return;
    if (type === 'kol') setKolForm(createEmptyKolForm());
    else setShopForm(createEmptyShopForm());
    setActivePartnerType(type);
  };

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
    if (!kolForm.channelUrl.trim()) {
      toast.error('Vui lòng nhập đường link kênh mạng xã hội');
      return;
    }
    if (!kolForm.idCardNumber.trim() || kolForm.idCardNumber.length < 9) {
      toast.error('Vui lòng nhập số CCCD/CMND hợp lệ');
      return;
    }
    if (!kolForm.frontCardUrl?.trim() || !kolForm.backCardUrl?.trim()) {
      toast.error('Vui lòng tải lên đầy đủ ảnh CCCD mặt trước và mặt sau');
      return;
    }
    if (!kolForm.bankName?.trim()) {
      toast.error('Vui lòng chọn ngân hàng thụ hưởng');
      return;
    }
    if (!kolForm.bankAccountNumber.trim() || !kolForm.bankAccountName.trim()) {
      toast.error(
        'Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng để nhận hoa hồng',
      );
      return;
    }

    setSubmitting(true);
    try {
      await kycService.applyKolUpgrade(kolForm);
      toast.success(
        'Gửi hồ sơ đăng ký KOL thành công! Ban Quản Trị SCANMS sẽ xét duyệt trong 24h.',
      );
      loadStatus();
      authService.getMe();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Không thể gửi hồ sơ, vui lòng thử lại',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopForm.businessType) {
      toast.error('Vui lòng chọn hình thức kinh doanh');
      return;
    }
    if (!shopForm.shopName.trim()) {
      toast.error('Vui lòng nhập tên gian hàng');
      return;
    }
    if (!shopForm.warehouseAddress.trim()) {
      toast.error(
        'Địa chỉ kho xuất hàng là bắt buộc theo Nghị định 85/2021/NĐ-CP',
      );
      return;
    }
    if (!shopForm.taxCode.trim()) {
      toast.error(
        'Vui lòng nhập mã số thuế doanh nghiệp / hộ kinh doanh / cá nhân',
      );
      return;
    }
    if (!shopForm.contactPhone.trim()) {
      toast.error('Vui lòng nhập số hotline hỗ trợ khách hàng');
      return;
    }
    if (!shopForm.contactEmail.trim()) {
      toast.error('Vui lòng nhập email đối soát thanh toán');
      return;
    }
    if (
      !shopForm.idCardNumber?.trim() ||
      !/^\d{9,12}$/.test(shopForm.idCardNumber)
    ) {
      toast.error('Vui lòng nhập số CCCD người đại diện hợp lệ (9 - 12 số)');
      return;
    }
    if (!shopForm.frontCardUrl || !shopForm.backCardUrl) {
      toast.error(
        'Vui lòng tải lên ảnh CCCD mặt trước và mặt sau của người đại diện',
      );
      return;
    }
    if (!shopForm.businessLicenseUrl) {
      toast.error('Vui lòng tải lên giấy phép đăng ký kinh doanh');
      return;
    }
    if (!shopForm.bankName?.trim()) {
      toast.error('Vui lòng chọn ngân hàng nhận tiền doanh thu bán hàng');
      return;
    }
    if (
      !shopForm.bankAccountNumber?.trim() ||
      !shopForm.bankAccountName?.trim()
    ) {
      toast.error(
        'Vui lòng nhập đầy đủ số tài khoản và tên chủ tài khoản nhận doanh thu',
      );
      return;
    }

    setSubmitting(true);
    try {
      await kycService.applyShopUpgrade(shopForm);
      toast.success(
        'Gửi hồ sơ mở Gian Hàng thành công! Ban Quản Trị SCANMS sẽ thẩm định giấy phép.',
      );
      loadStatus();
      authService.getMe();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          'Không thể gửi hồ sơ gian hàng, vui lòng thử lại',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="partner-upgrade">
        <div className="partner-form partner-waiting">
          <RefreshCw className="h-5 w-5 animate-spin text-[#B88E4F]" />
          <p>Đang tải hồ sơ đối tác…</p>
        </div>
      </div>
    );
  }

  const kolApp = statusData?.kolApplication;
  const shopApp = statusData?.shopApplication;
  const shopStatus =
    shopApp?.onboardingStatus ||
    (shopApp?.isVerified ? 'VERIFIED' : shopApp ? 'PENDING_APPROVAL' : null);
  const canSubmitShopApplication =
    !shopStatus || ['DRAFT', 'NEEDS_INFO', 'REJECTED'].includes(shopStatus);
  const choices = [
    {
      type: 'kol' as const,
      title: 'Đối tác KOL',
      icon: Sparkles,
      status: kolApp?.status,
      description:
        kolApp?.status === 'VERIFIED'
          ? 'Tạo liên kết tiếp thị, theo dõi hoa hồng và kết nối với các gian hàng.'
          : kolApp?.status === 'UNVERIFIED'
            ? 'Hồ sơ đã gửi đang được xem xét. Điền thông tin nếu cần cập nhật hồ sơ.'
            : kolApp?.status === 'REJECTED'
              ? 'Kiểm tra ghi chú xét duyệt, bổ sung thông tin và gửi lại hồ sơ.'
              : 'Giới thiệu sản phẩm từ các gian hàng và nhận hoa hồng tiếp thị liên kết.',
      action: kolApp ? 'Cập nhật hồ sơ KOL' : 'Đăng ký KOL',
    },
    {
      type: 'shop' as const,
      title: 'Mở gian hàng',
      icon: Store,
      status: shopStatus,
      description:
        shopStatus === 'VERIFIED'
          ? 'Quản lý sản phẩm, đơn hàng và hợp tác cùng KOL trên SCANMS.'
          : shopStatus === 'NEEDS_INFO' || shopStatus === 'REJECTED'
            ? 'Bổ sung thông tin theo ghi chú xét duyệt và gửi lại hồ sơ gian hàng.'
            : shopStatus === 'PENDING_APPROVAL'
              ? 'Hồ sơ đang chờ xét duyệt. Bạn sẽ nhận thông báo khi có kết quả.'
              : 'Kinh doanh sản phẩm và kết nối với mạng lưới nhà sáng tạo trên SCANMS.',
      action: shopApp ? 'Trạng thái hồ sơ gian hàng' : 'Đăng ký gian hàng',
    },
  ];

  return (
    <div
      ref={contentRef}
      className={`partner-upgrade ${contentWidth > 0 && contentWidth < 1100 ? 'is-narrow' : ''} ${contentWidth > 0 && contentWidth < 640 ? 'is-mobile' : ''}`}
    >
      <header className="partner-upgrade-header">
        <div>
          <span className="partner-upgrade-eyebrow">Đồng hành cùng SCANMS</span>
          <h2>Nâng cấp đối tác</h2>
          <p>
            Trở thành KOL tiếp thị liên kết hoặc mở gian hàng. Chọn vai trò phù
            hợp và hoàn thiện hồ sơ đăng ký.
          </p>
        </div>
        <div className="partner-account-note">
          <ShieldCheck />
          <span>
            <strong>Một tài khoản, nhiều vai trò</strong>Tiếp tục mua sắm và
            chuyển đổi linh hoạt.
          </span>
        </div>
      </header>
      <div className="partner-choices" aria-label="Chọn loại đối tác">
        {choices.map((choice) => (
          <article
            key={choice.type}
            className={`partner-choice ${activePartnerType === choice.type ? 'is-selected' : ''}`}
          >
            <button
              type="button"
              className="partner-choice-select"
              aria-pressed={activePartnerType === choice.type}
              onClick={() => selectPartnerType(choice.type)}
            >
              <span className="partner-choice-icon">
                <choice.icon />
              </span>
              <span className="partner-choice-copy">
                <span className="partner-choice-title">
                  <strong>{choice.title}</strong>
                  <ApplicationBadge status={choice.status} />
                </span>
                <span className="partner-choice-description">
                  {choice.description}
                </span>
              </span>
            </button>
            <button
              type="button"
              className="partner-choice-action"
              onClick={() =>
                choice.status === 'VERIFIED'
                  ? authService.switchWorkspace(choice.type, navigate)
                  : selectPartnerType(choice.type)
              }
            >
              {choice.status === 'VERIFIED'
                ? choice.type === 'kol'
                  ? 'Vào không gian KOL'
                  : 'Vào quản lý gian hàng'
                : activePartnerType === choice.type
                  ? 'Đang chọn hồ sơ này'
                  : choice.action}
              {activePartnerType === choice.type &&
              choice.status !== 'VERIFIED' ? (
                <CheckCircle2 />
              ) : (
                <ArrowRight />
              )}
            </button>
          </article>
        ))}
      </div>
      {activePartnerType === 'kol' && (
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
      )}
      {activePartnerType === 'shop' &&
        (canSubmitShopApplication ? (
          <ShopUpgradeForm
            form={shopForm}
            setForm={setShopForm}
            onSubmit={handleShopSubmit}
            submitting={submitting}

            reviewNote={
              shopStatus === 'NEEDS_INFO' || shopStatus === 'REJECTED'
                ? shopApp?.onboardingReviewNote
                : undefined
            }
          />
        ) : (
          <section className="partner-form partner-waiting">
            <span className="partner-form-icon">
              {shopStatus === 'VERIFIED' ? <CheckCircle2 /> : <Clock3 />}
            </span>
            <h3>
              {shopStatus === 'VERIFIED'
                ? 'Gian hàng đã được xác minh'
                : 'Hồ sơ đang chờ xét duyệt'}
            </h3>
            <p>
              {shopStatus === 'VERIFIED'
                ? 'Gian hàng đã được kích hoạt. Bạn có thể vào không gian quản lý để đăng sản phẩm và hợp tác cùng KOL.'
                : 'SCANMS đang kiểm tra hồ sơ của bạn. Kết quả hoặc yêu cầu bổ sung sẽ được gửi qua thông báo.'}
            </p>
            {shopApp?.onboardingReviewNote && shopStatus !== 'VERIFIED' && (
              <div className="partner-review-note">
                <CircleAlert />
                <div>
                  <strong>Ghi chú xét duyệt</strong>
                  {shopApp.onboardingReviewNote}
                </div>
              </div>
            )}
            <button
              type="button"
              className="partner-primary"
              onClick={() =>
                shopStatus === 'VERIFIED'
                  ? authService.switchWorkspace('shop', navigate)
                  : void loadStatus()
              }
            >
              {shopStatus === 'VERIFIED' ? <ArrowRight /> : <RefreshCw />}
              {shopStatus === 'VERIFIED'
                ? 'Vào quản lý gian hàng'
                : 'Kiểm tra trạng thái'}
            </button>
          </section>
        ))}
    </div>
  );
};
