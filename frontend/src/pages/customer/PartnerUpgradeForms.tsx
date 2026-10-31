import { useRef, useState } from 'react';
import type {
  Dispatch,
  FormEventHandler,
  InputHTMLAttributes,
  ReactNode,
  SetStateAction,
} from 'react';
import {
  ChevronDown,
  CircleAlert,
  Info,
  Send,
  ShieldCheck,
  Megaphone,
  Store,
} from 'lucide-react';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { ImageUploadDropzone } from '../../components/ui/ImageUploadDropzone';
import { BankSelectTrigger } from '../../components/bank/BankSelectTrigger';
import type { ApplyKolData, ApplyShopData } from '../../services/kyc.service';

function Field({
  label,
  id,
  children,
  full = false,
  wide = false,
  required = false,
  hint,
}: {
  label: string;
  id?: string;
  children: ReactNode;
  full?: boolean;
  wide?: boolean;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={`partner-field flex flex-col gap-[7px] min-w-0 ${full ? 'col-span-full' : ''} ${wide ? 'col-span-1 md:col-span-2' : ''}`}
    >
      <label htmlFor={id} className="text-[12px] font-[550] text-[#1A1612] leading-[1.5]">
        {label}
        {required && <span className="text-[#B88E4F]"> *</span>}
      </label>
      {children}
      {hint && <span className="text-[11px] text-[#7D715E] leading-[1.6]">{hint}</span>}
    </div>
  );
}

function TextField({
  label,
  full,
  wide,
  hint,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  full?: boolean;
  wide?: boolean;
  hint?: string;
}) {
  return (
    <Field
      label={label}
      id={input.id}
      full={full}
      wide={wide}
      required={input.required}
      hint={hint}
    >
      <input
        {...input}
        className="w-full min-w-0 h-[44px] p-[10px_13px] border border-[#EAE4D7] rounded-[11px] bg-white text-[13px] text-[#1A1612] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#A39783] placeholder:font-[400] focus:border-[#C59B58] focus:shadow-[0_0_0_3px_#FBF5EB] max-[640px]:text-[16px]"
      />
    </Field>
  );
}

function Section({
  number,
  title,
  description,
  children,
  showHeader = true,
}: {
  number: number;
  title: string;
  description?: string;
  children: ReactNode;
  showHeader?: boolean;
}) {
  return (
    <section className="partner-form-section min-w-0">
      {showHeader && <div className="partner-section-heading flex items-center gap-[10px] mb-[16px]">
        <span className="flex items-center justify-center shrink-0 w-[24px] h-[24px] border border-[#EEDFC6] rounded-[6px] bg-[#FBF5EB] text-[#B88E4F] text-[12px] font-[700] font-mono">
          {number}
        </span>
        <div>
          <h4 className="m-0 text-[13px] leading-[1.4] font-[700] text-[#1A1612] uppercase tracking-wide">{title}</h4>
          {description && <p className="m-[2px_0_0] text-[11px] text-[#7D715E] leading-[1.5]">{description}</p>}
        </div>
      </div>}
      {children}
    </section>
  );
}

function FormHeader({ shop = false }: { shop?: boolean }) {
  return (
    <header className="partner-form-header flex items-center justify-between gap-4 p-5 sm:p-6 border-b border-[#EAE4D7] bg-[#FAF8F5]/70 rounded-t-2xl">
      <div className="flex items-center gap-3.5 min-w-0">
        <span className="w-10 h-10 border border-[#EEDFC6] rounded-xl bg-[#FBF5EB] text-[#B88E4F] flex items-center justify-center shrink-0 shadow-2xs">
          {shop ? <Store size={20} /> : <Megaphone size={20} />}
        </span>
        <div>
          <h3 className="m-0 text-base sm:text-lg font-bold text-[#1A1612]">
            {shop ? 'Hồ sơ pháp lý gian hàng (Merchant)' : 'Hồ sơ định danh Đối tác Tiếp thị (KOL/KOC)'}
          </h3>
          {shop && <p className="m-0 mt-0.5 text-xs text-[#7D715E]">
            Xác thực tư cách pháp nhân kinh doanh và tài khoản đối soát doanh thu.
          </p>}
        </div>
      </div>
    </header>
  );
}

function FormFooter({
  submitting,
  shop = false,
  statusBadge,
  navigation,
}: {
  submitting: boolean;
  shop?: boolean;
  statusBadge?: ReactNode;
  navigation?: ReactNode;
}) {
  return (
    <footer className="partner-form-footer border-t border-[#EAE4D7] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#FAF8F5]/60 rounded-b-2xl">
      <p className="flex items-center gap-2 text-xs text-[#7D715E] leading-relaxed m-0">
        <ShieldCheck size={16} className="text-[#B88E4F] shrink-0" />
        <span>Dữ liệu eKYC được mã hóa và đối soát bảo mật theo quy chế sàn SCANMS.</span>
      </p>
      <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end">
        {statusBadge}
        {navigation || (
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 bg-[#C59B58] hover:bg-[#B88E4F] text-white border border-[#C59B58] rounded-xl px-5 py-2.5 text-xs font-bold tracking-wide cursor-pointer transition shadow-xs disabled:opacity-55 max-[640px]:w-full active:scale-[0.98]"
        >
          <Send size={14} />
          {submitting
            ? 'Đang gửi hồ sơ…'
            : shop
              ? 'Nộp hồ sơ gian hàng'
              : 'Nộp hồ sơ định danh'}
        </button>
        )}
      </div>
    </footer>
  );
}

function ShopReviewGuide() {
  return (
    <details className="border border-[#EAE4D7] rounded-[11px] bg-white text-[12px] text-[#7D715E] leading-[1.6] [&[open]_.shop-guide-arrow]:rotate-180">
      <summary className="flex items-center gap-[9px] p-[11px_14px] cursor-pointer list-none select-none [&::-webkit-details-marker]:none">
        <ShieldCheck aria-hidden="true" size={16} className="text-[#B88E4F] shrink-0" />
        <span className="font-[600] text-[#1A1612]">Tiêu chuẩn xét duyệt hồ sơ mở gian hàng</span>
        <span className="ml-auto inline-flex items-center gap-[6px] text-[#8F682E] font-[600] text-[11px]">
          <span>Chi tiết quy trình</span>
          <ChevronDown aria-hidden="true" size={13} className="shop-guide-arrow transition-transform duration-200" />
        </span>
      </summary>
      <div className="grid grid-cols-2 gap-[16px] p-[14px] border-t border-[#EAE4D7] bg-[#FAF8F5]/30 max-[640px]:grid-cols-1">
        <div>
          <strong className="block text-[#1A1612] text-[11px] font-[700] uppercase tracking-wide mb-[4px]">1. Thẩm định pháp lý</strong>
          <p className="m-0 text-[11px] leading-[1.6] text-[#7D715E]">
            Đối chiếu mã số thuế doanh nghiệp/hộ kinh doanh, CCCD đại diện hợp pháp và kho hàng thực tế.
          </p>
        </div>
        <div>
          <strong className="block text-[#1A1612] text-[11px] font-[700] uppercase tracking-wide mb-[4px]">2. Kiểm duyệt hàng hóa</strong>
          <p className="m-0 text-[11px] leading-[1.6] text-[#7D715E]">
            Thẩm định giấy phép công bố sản phẩm và hóa đơn chứng từ xuất xứ trước khi kích hoạt gian hàng.
          </p>
        </div>
      </div>
    </details>
  );
}

type BankFields = Pick<
  ApplyKolData,
  'bankName' | 'bankAccountNumber' | 'bankAccountName'
>;
function BankDetails({
  form,
  onChange,
  prefix,
}: {
  form: BankFields;
  onChange: (key: keyof BankFields, value: string) => void;
  prefix: string;
}) {
  return (
    <>
      <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
        <span className="text-[12px] font-[550] text-[#1A1612] leading-[1.5]">
          Ngân hàng thụ hưởng <span className="text-[#B88E4F]">*</span>
        </span>
        <BankSelectTrigger
          value={form.bankName}
          onChange={(value) => onChange('bankName', value)}
          placeholder="Chọn ngân hàng"
          required
        />
      </div>
      <TextField
        id={`${prefix}-account`}
        label="Số tài khoản"
        inputMode="numeric"
        autoComplete="off"
        required
        value={form.bankAccountNumber}
        onChange={(event) => onChange('bankAccountNumber', event.target.value)}
        placeholder="Nhập số tài khoản"
      />
      <TextField
        id={`${prefix}-account-name`}
        label="Tên chủ tài khoản"
        required
        value={form.bankAccountName}
        onChange={(event) =>
          onChange('bankAccountName', event.target.value.toUpperCase())
        }
        placeholder="Nhập tên chủ tài khoản"
      />
    </>
  );
}

export function KolUpgradeForm({
  form,
  setForm,
  onSubmit,
  submitting,
  rejectionReason,
  statusBadge,
}: {
  form: ApplyKolData;
  setForm: Dispatch<SetStateAction<ApplyKolData>>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitting: boolean;
  rejectionReason?: string;
  statusBadge?: ReactNode;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const steps = ['Kênh truyền thông', 'Định danh CCCD', 'Ngân hàng'];
  const revealInvalidField = (input: HTMLInputElement | HTMLTextAreaElement) => {
    const step = Number(input.closest<HTMLElement>('[data-partner-step]')?.dataset.partnerStep || 0);
    setActiveStep(step);
    requestAnimationFrame(() => {
      input.reportValidity();
      if (input.classList.contains('sr-only')) {
        input.parentElement?.querySelector<HTMLButtonElement>('button')?.focus();
      } else input.focus();
    });
  };
  const nextStep = () => {
    const invalid = formRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-partner-step="${activeStep}"] :invalid`);
    if (invalid) { revealInvalidField(invalid); return; }
    if (activeStep === 1 && (!form.frontCardUrl || !form.backCardUrl)) {
      formRef.current?.querySelector<HTMLElement>('[data-partner-step="1"]')?.focus();
      return;
    }
    setActiveStep(previous => Math.min(2, previous + 1));
  };
  const patch = <K extends keyof ApplyKolData>(
    key: K,
    value: ApplyKolData[K],
  ) => setForm((previous) => ({ ...previous, [key]: value }));
  return (
    <form
      ref={formRef}
      id="partner-upgrade-form"
      className="partner-kol-form min-w-0 border border-[#EAE4D7] rounded-2xl bg-white shadow-xs overflow-visible"
      autoComplete="off"
      noValidate
      onSubmit={event => {
        event.preventDefault();
        if (submitting) return;
        if (activeStep < 2) { nextStep(); return; }
        const invalid = formRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(':invalid');
        if (invalid) { revealInvalidField(invalid); return; }
        if (!form.frontCardUrl || !form.backCardUrl) { setActiveStep(1); return; }
        onSubmit(event);
      }}
    >
      <FormHeader />
      <nav className="partner-step-navigation" aria-label="Các bước đăng ký đối tác">
        {steps.map((label, index) => (
          <button type="button" key={label} aria-current={activeStep === index ? 'step' : undefined}
            aria-controls={`partner-step-${index}`} disabled={submitting}
            onClick={() => setActiveStep(index)}>
            <span aria-hidden="true">{index + 1}</span><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="partner-form-body p-5 sm:p-6 grid gap-6">
        {rejectionReason && (
          <div className="flex items-start gap-3 border border-[#FCA5A5] rounded-xl p-3.5 bg-[#FEF2F2] text-xs text-[#DC2626]">
            <CircleAlert size={18} className="text-[#DC2626] shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sm font-bold mb-0.5">Hồ sơ cần cập nhật lại</strong>
              <p className="leading-relaxed">{rejectionReason}</p>
            </div>
          </div>
        )}
        <div id="partner-step-0" data-partner-step="0" hidden={activeStep !== 0}>
        <Section
          number={1}
          title="Kênh truyền thông & Lưu lượng"
          showHeader={false}
          description="Nền tảng phát triển nội dung và số liệu người theo dõi thực tế."
        >
          <div className="partner-channel-fields grid gap-[15px] grid-cols-3 max-[640px]:grid-cols-1">
            <Field label="Nền tảng chính" id="kol-platform" required>
              <CustomSelect
                id="kol-platform"
                value={form.platform || ''}
                onChange={(value) =>
                  patch('platform', value as ApplyKolData['platform'])
                }
                options={[
                  { value: 'TIKTOK', label: 'TikTok' },
                  { value: 'FACEBOOK', label: 'Facebook' },
                  { value: 'YOUTUBE', label: 'YouTube' },
                  { value: 'INSTAGRAM', label: 'Instagram' },
                  { value: 'LEMON8', label: 'Lemon8' },
                  { value: 'OTHER', label: 'Nền tảng khác' },
                ]}
                placeholder="Chọn nền tảng"
                required
              />
            </Field>
            <TextField
              id="kol-channel-name"
              label="Tên kênh"
              required
              value={form.channelName}
              onChange={(event) => patch('channelName', event.target.value)}
              placeholder="Nhập tên kênh"
            />
            <TextField
              id="kol-followers"
              label="Số người theo dõi"
              type="number"
              min={0}
              required
              value={form.followerCount}
              onChange={(event) =>
                patch(
                  'followerCount',
                  event.target.value === ''
                    ? ('' as unknown as number)
                    : Number(event.target.value),
                )
              }
              placeholder="Ví dụ: 10000"
            />
            <TextField
              id="kol-channel-url"
              label="Liên kết kênh"
              type="url"
              required
              value={form.channelUrl}
              onChange={(event) => patch('channelUrl', event.target.value)}
              placeholder="Nhập liên kết kênh"
            />
          </div>
          <div className="mt-[14px]">
            <ImageUploadDropzone
              variant="document"
              label="Ảnh trang quản trị kênh"
              className="partner-document-upload"
              helperText="Ảnh trang quản trị (TikTok Studio, Meta Business Suite…); hiển thị tên kênh và quyền quản trị."
              value={form.channelProofUrl}
              onChange={(value) => patch('channelProofUrl', value)}
              iconType="camera"
              folder="scanms/kyc/proofs"
            />
          </div>
        </Section>
        </div>
        <div className="partner-identity-sections partner-step-panels" hidden={activeStep === 0}>
          <div id="partner-step-1" data-partner-step="1" hidden={activeStep !== 1} tabIndex={-1}>
          <Section
            number={2}
            title="Định danh công dân (CCCD)"
            showHeader={false}
            description="Ảnh chụp 2 mặt CCCD gắn chip rõ nét phục vụ đối chiếu eKYC."
          >
            <div className="grid gap-[15px] grid-cols-2 max-[640px]:grid-cols-1">
              <TextField
                id="kol-id"
                label="Số CCCD / CMND"
                inputMode="numeric"
                maxLength={12}
                required
                value={form.idCardNumber}
                onChange={(event) => patch('idCardNumber', event.target.value)}
                placeholder="Nhập 9–12 chữ số"
              />
              <TextField
                id="kol-tax"
                label="Mã số thuế cá nhân"
                inputMode="numeric"
                value={form.taxCode || ''}
                onChange={(event) => patch('taxCode', event.target.value)}
                placeholder="Không bắt buộc"
              />
              <ImageUploadDropzone
                variant="document"
                label="CCCD mặt trước"
                className="partner-document-upload"
                value={form.frontCardUrl}
                onChange={(value) => patch('frontCardUrl', value)}
                iconType="idcard"
                folder="scanms/kyc/idcards"
                required
              />
              <ImageUploadDropzone
                variant="document"
                label="CCCD mặt sau"
                className="partner-document-upload"
                value={form.backCardUrl}
                onChange={(value) => patch('backCardUrl', value)}
                iconType="idcard"
                folder="scanms/kyc/idcards"
                required
              />
            </div>
          </Section>
          {(!form.frontCardUrl || !form.backCardUrl) && <p className="partner-step-hint">Vui lòng đính kèm đủ ảnh CCCD mặt trước và mặt sau trước khi tiếp tục.</p>}
          </div>
          <div id="partner-step-2" data-partner-step="2" hidden={activeStep !== 2}>
          <Section
            number={3}
            title="Tài khoản thanh toán Napas 24/7"
            showHeader={false}
            description="Tài khoản ngân hàng thụ hưởng hoa hồng tiếp thị định kỳ."
          >
            <div className="grid gap-[15px] grid-cols-2 max-[640px]:grid-cols-1">
              <BankDetails prefix="kol" form={form} onChange={patch} />
              <Field label="Giới thiệu & ngành hàng thế mạnh" id="kol-bio" full>
                <textarea
                  id="kol-bio"
                  rows={2}
                  className="w-full min-w-0 p-[10px_13px] border border-[#EAE4D7] rounded-[11px] bg-white text-[13px] text-[#1A1612] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#A39783] placeholder:font-[400] focus:border-[#C59B58] focus:shadow-[0_0_0_3px_#FBF5EB] resize-y min-h-[78px] max-[640px]:text-[16px]"
                  value={form.bio || ''}
                  onChange={(event) => patch('bio', event.target.value)}
                  placeholder="Nội dung bạn sáng tạo và ngành hàng phù hợp…"
                />
              </Field>
            </div>
          </Section>
          </div>
        </div>
      </div>
      <FormFooter submitting={submitting} statusBadge={statusBadge} navigation={
        <div className="partner-step-actions">
          {activeStep > 0 && <button type="button" disabled={submitting} onClick={() => setActiveStep(previous => previous - 1)}>Quay lại</button>}
          {activeStep < 2 ? <button type="button" className="partner-step-primary" onClick={nextStep}>Tiếp tục</button>
            : <button type="submit" className="partner-step-primary" disabled={submitting}><Send size={14} />{submitting ? 'Đang gửi hồ sơ…' : 'Nộp hồ sơ định danh'}</button>}
        </div>
      } />
    </form>
  );
}

export function ShopUpgradeForm({
  form,
  setForm,
  onSubmit,
  submitting,
  reviewNote,
}: {
  form: ApplyShopData;
  setForm: Dispatch<SetStateAction<ApplyShopData>>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitting: boolean;
  reviewNote?: string | null;
}) {
  const patch = <K extends keyof ApplyShopData>(
    key: K,
    value: ApplyShopData[K],
  ) => setForm((previous) => ({ ...previous, [key]: value }));
  return (
    <form
      id="partner-upgrade-form"
      className="min-w-0 border border-[#EAE4D7] rounded-[18px] bg-white overflow-visible"
      autoComplete="off"
      onSubmit={onSubmit}
    >
      <FormHeader shop />
      <div className="p-[22px] grid gap-[22px] max-[640px]:p-[17px] max-[640px]:gap-[20px]">
        <ShopReviewGuide />
        {reviewNote && (
          <div className="flex items-start gap-[10px] border border-[#EEDFC6] rounded-[12px] p-[12px_14px] bg-[#FBF5EB] text-[12px] text-[#7D715E] leading-[1.7]">
            <Info size={17} className="text-[#B88E4F] shrink-0 mt-[2px]" />
            <div>
              <strong className="block text-[#8F682E] font-[600]">Ghi chú từ Ban Quản Trị</strong>
              {reviewNote}
            </div>
          </div>
        )}
        <Section
          number={1}
          title="Thông tin pháp lý & Liên hệ"
          description="Tên gian hàng, loại hình đăng ký kinh doanh và kho hàng vận hành."
        >
          <div className="grid gap-[15px] grid-cols-3 max-[640px]:grid-cols-1">
            <div className="col-span-2 max-[640px]:col-span-1">
              <TextField
                id="shop-name"
                label="Tên gian hàng / thương hiệu"
                required
                value={form.shopName}
                onChange={(event) => patch('shopName', event.target.value)}
                placeholder="Nhập tên gian hàng"
              />
            </div>
            <Field
              id="shop-business-type"
              label="Hình thức kinh doanh"
              required
            >
              <CustomSelect
                id="shop-business-type"
                value={form.businessType}
                onChange={(value) =>
                  patch('businessType', value as ApplyShopData['businessType'])
                }
                options={[
                  { value: 'ENTERPRISE', label: 'Doanh nghiệp / Công ty' },
                  { value: 'HOUSEHOLD', label: 'Hộ kinh doanh' },
                  { value: 'INDIVIDUAL', label: 'Cá nhân kinh doanh' },
                ]}
                placeholder="Chọn hình thức"
                required
              />
            </Field>
            <TextField
              id="shop-tax"
              label="Mã số thuế"
              required
              value={form.taxCode}
              onChange={(event) => patch('taxCode', event.target.value)}
              placeholder="Nhập mã số thuế"
            />
            <TextField
              id="shop-phone"
              label="Điện thoại liên hệ"
              type="tel"
              required
              value={form.contactPhone}
              onChange={(event) => patch('contactPhone', event.target.value)}
              placeholder="Nhập số điện thoại"
            />
            <TextField
              id="shop-email"
              label="Email đối soát"
              type="email"
              required
              value={form.contactEmail}
              onChange={(event) => patch('contactEmail', event.target.value)}
              placeholder="Nhập email đối soát"
            />
            <TextField
              id="shop-warehouse"
              label="Địa chỉ kho xuất hàng"
              full
              required
              value={form.warehouseAddress}
              onChange={(event) =>
                patch('warehouseAddress', event.target.value)
              }
              placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố"
              hint="Địa chỉ thực tế để xử lý vận chuyển và đối soát."
            />
          </div>
        </Section>
        <div className="grid grid-cols-2 gap-[20px] pt-[22px] border-t border-[#EAE4D7] max-[1100px]:grid-cols-1">
          <Section
            number={2}
            title="Giấy phép kinh doanh & Đại diện pháp luật"
            description="Bản scan giấy chứng nhận ĐKKD và CCCD người đại diện pháp luật."
          >
            <div className="grid gap-[15px] grid-cols-2 max-[640px]:grid-cols-1">
              <TextField
                id="shop-owner-id"
                label="CCCD người đại diện"
                inputMode="numeric"
                maxLength={12}
                full
                required
                value={form.idCardNumber || ''}
                onChange={(event) =>
                  patch('idCardNumber', event.target.value.replace(/\D/g, ''))
                }
                placeholder="Nhập 9–12 chữ số"
              />
              <ImageUploadDropzone
                variant="document"
                label="CCCD mặt trước"
                value={form.frontCardUrl || ''}
                onChange={(value) => patch('frontCardUrl', value)}
                iconType="idcard"
                folder="scanms/kyc/shop_idcards"
                required
              />
              <ImageUploadDropzone
                variant="document"
                label="CCCD mặt sau"
                value={form.backCardUrl || ''}
                onChange={(value) => patch('backCardUrl', value)}
                iconType="idcard"
                folder="scanms/kyc/shop_idcards"
                required
              />
              <ImageUploadDropzone
                variant="document"
                label="Giấy đăng ký kinh doanh"
                value={form.businessLicenseUrl || ''}
                onChange={(value) => patch('businessLicenseUrl', value)}
                iconType="file"
                folder="scanms/kyc/licenses"
                required
              />
              <ImageUploadDropzone
                variant="document"
                label="Ủy quyền thương hiệu"
                helperText="Không bắt buộc. Có thể dùng hợp đồng phân phối."
                value={form.brandAuthorizationUrl || ''}
                onChange={(value) => patch('brandAuthorizationUrl', value)}
                iconType="file"
                folder="scanms/kyc/authorizations"
              />
            </div>
          </Section>
          <Section
            number={3}
            title="Tài khoản thanh toán doanh thu"
            description="Tài khoản ngân hàng chính thức nhận quyết toán dòng tiền sau ký quỹ Escrow."
          >
            <div className="grid gap-[15px] grid-cols-2 max-[640px]:grid-cols-1">
              <BankDetails prefix="shop" form={form} onChange={patch} />
              <Field label="Giới thiệu gian hàng" id="shop-description" full>
                <textarea
                  id="shop-description"
                  rows={3}
                  className="w-full min-w-0 p-[10px_13px] border border-[#EAE4D7] rounded-[11px] bg-white text-[13px] text-[#1A1612] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#A39783] placeholder:font-[400] focus:border-[#C59B58] focus:shadow-[0_0_0_3px_#FBF5EB] resize-y min-h-[78px] max-[640px]:text-[16px]"
                  value={form.description || ''}
                  onChange={(event) => patch('description', event.target.value)}
                  placeholder="Ngành hàng chính và giới thiệu ngắn về gian hàng…"
                />
              </Field>
            </div>
          </Section>
        </div>
      </div>
      <FormFooter shop submitting={submitting} />
    </form>
  );
}

