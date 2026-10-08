import type {
  Dispatch,
  FormEventHandler,
  InputHTMLAttributes,
  ReactNode,
  SetStateAction,
} from 'react';
import {
  ChevronDown,
  Info,
  Send,
  ShieldCheck,
  Sparkles,
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
      className={`partner-field ${full ? 'full' : ''} ${wide ? 'wide' : ''}`}
    >
      <label htmlFor={id}>
        {label}
        {required && <span className="upgrade-required"> *</span>}
      </label>
      {children}
      {hint && <span className="partner-field-hint">{hint}</span>}
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
      <input {...input} className="partner-input" />
    </Field>
  );
}

function Section({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="partner-section">
      <div className="partner-section-heading">
        <span className="partner-section-number">{number}</span>
        <div>
          <h4>{title}</h4>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function FormHeader({ shop = false }: { shop?: boolean }) {
  return (
    <header className="partner-form-heading">
      <div className="partner-form-heading-main">
        <span className="partner-form-icon">
          {shop ? <Store /> : <Sparkles />}
        </span>
        <div>
          <h3>{shop ? 'Hồ sơ mở gian hàng' : 'Hồ sơ đăng ký KOL'}</h3>
          <p>
            {shop
              ? 'Thông tin kinh doanh, giấy tờ và tài khoản nhận doanh thu.'
              : 'Thông tin kênh, giấy tờ định danh và tài khoản nhận hoa hồng.'}
          </p>
        </div>
      </div>
    </header>
  );
}

function FormFooter({
  submitting,
  shop = false,
}: {
  submitting: boolean;
  shop?: boolean;
}) {
  return (
    <footer className="partner-form-footer">
      <p>
        <ShieldCheck />
        <span>
          Thông tin dùng để xác minh hồ sơ và đối soát.
          <br />
          Các mục có dấu * là bắt buộc.
        </span>
      </p>
      <button type="submit" disabled={submitting} className="partner-primary">
        <Send />
        {submitting
          ? 'Đang gửi hồ sơ…'
          : shop
            ? 'Gửi hồ sơ mở gian hàng'
            : 'Gửi hồ sơ KOL'}
      </button>
    </footer>
  );
}

function ShopReviewGuide() {
  return (
    <details className="partner-shop-review">
      <summary>
        <ShieldCheck aria-hidden="true" />
        <span>Hồ sơ được xét duyệt trước khi mở quyền bán hàng</span>
        <span className="partner-shop-review-toggle">
          Xem quy trình <ChevronDown aria-hidden="true" />
        </span>
      </summary>
      <div className="partner-shop-review-content">
        <div>
          <strong>1. Xác minh gian hàng</strong>
          <p>
            Đối chiếu thông tin kinh doanh, giấy tờ người đại diện, kho hàng và
            tài khoản nhận tiền.
          </p>
        </div>
        <div>
          <strong>2. Kiểm tra sản phẩm</strong>
          <p>
            Giấy tờ nguồn gốc và các tài liệu liên quan được kiểm tra khi gian
            hàng đăng sản phẩm.
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
      <div className="partner-field full partner-bank">
        <span className="partner-field-label">
          Ngân hàng thụ hưởng <span className="upgrade-required">*</span>
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
}: {
  form: ApplyKolData;
  setForm: Dispatch<SetStateAction<ApplyKolData>>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitting: boolean;
  rejectionReason?: string;
}) {
  const patch = <K extends keyof ApplyKolData>(
    key: K,
    value: ApplyKolData[K],
  ) => setForm((previous) => ({ ...previous, [key]: value }));
  return (
    <form
      id="partner-upgrade-form"
      className="partner-form"
      autoComplete="off"
      onSubmit={onSubmit}
    >
      <FormHeader />
      <div className="partner-form-body">
        {rejectionReason && (
          <div className="partner-review-note">
            <Info />
            <div>
              <strong>Ghi chú xét duyệt</strong>
              {rejectionReason}
            </div>
          </div>
        )}
        <Section
          number={1}
          title="Kênh truyền thông"
          description="Cung cấp kênh chính và ảnh xác nhận quyền quản trị."
        >
          <div className="partner-fields cols-3">
            <Field label="Nền tảng chính" id="kol-platform" required>
              <CustomSelect
                id="kol-platform"
                value={form.platform}
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
              placeholder="Nhập số người theo dõi"
            />
            <TextField
              id="kol-channel-url"
              label="Liên kết kênh"
              type="url"
              full
              required
              value={form.channelUrl}
              onChange={(event) => patch('channelUrl', event.target.value)}
              placeholder="Nhập liên kết kênh"
            />
          </div>
          <div className="mt-4">
            <ImageUploadDropzone
              variant="document"
              className="partner-channel-proof"
              label="Ảnh trang quản trị kênh"
              helperText="Ảnh trang quản trị (TikTok Studio, Meta Business Suite…); hiển thị tên kênh và quyền quản trị."
              value={form.channelProofUrl}
              onChange={(value) => patch('channelProofUrl', value)}
              iconType="camera"
              folder="scanms/kyc/proofs"
            />
          </div>
        </Section>
        <div className="partner-lower-grid partner-kol-details">
          <Section
            number={2}
            title="Định danh cá nhân"
            description="Ảnh rõ nét, đầy đủ bốn góc của giấy tờ."
          >
            <div className="partner-fields partner-identity-fields">
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
                value={form.frontCardUrl}
                onChange={(value) => patch('frontCardUrl', value)}
                iconType="idcard"
                folder="scanms/kyc/idcards"
                required
              />
              <ImageUploadDropzone
                variant="document"
                label="CCCD mặt sau"
                value={form.backCardUrl}
                onChange={(value) => patch('backCardUrl', value)}
                iconType="idcard"
                folder="scanms/kyc/idcards"
                required
              />
            </div>
          </Section>
          <Section
            number={3}
            title="Tài khoản nhận hoa hồng"
            description="Tên chủ tài khoản cần khớp với thông tin định danh."
          >
            <div className="partner-fields">
              <BankDetails prefix="kol" form={form} onChange={patch} />
              <Field label="Giới thiệu & ngành hàng thế mạnh" id="kol-bio" full>
                <textarea
                  id="kol-bio"
                  rows={2}
                  className="partner-input"
                  value={form.bio || ''}
                  onChange={(event) => patch('bio', event.target.value)}
                  placeholder="Nội dung bạn sáng tạo và ngành hàng phù hợp…"
                />
              </Field>
            </div>
          </Section>
        </div>
      </div>
      <FormFooter submitting={submitting} />
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
      className="partner-form"
      autoComplete="off"
      onSubmit={onSubmit}
    >
      <FormHeader shop />
      <div className="partner-form-body">
        <ShopReviewGuide />
        {reviewNote && (
          <div className="partner-review-note">
            <Info />
            <div>
              <strong>Ghi chú từ Ban Quản Trị</strong>
              {reviewNote}
            </div>
          </div>
        )}
        <Section
          number={1}
          title="Gian hàng & liên hệ"
          description="Thông tin kinh doanh và liên hệ để xét duyệt hồ sơ."
        >
          <div className="partner-fields cols-3">
            <TextField
              id="shop-name"
              label="Tên gian hàng / thương hiệu"
              wide
              required
              value={form.shopName}
              onChange={(event) => patch('shopName', event.target.value)}
              placeholder="Nhập tên gian hàng"
            />
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
        <div className="partner-lower-grid partner-shop-details">
          <Section
            number={2}
            title="Giấy tờ kinh doanh & định danh"
            description="Tải ảnh chụp hoặc bản scan rõ nét, đầy đủ thông tin."
          >
            <div className="partner-fields partner-document-fields">
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
            title="Tài khoản nhận doanh thu"
            description="Thông tin nhận tiền sau khi đơn hàng được đối soát."
          >
            <div className="partner-fields partner-payment-fields">
              <BankDetails prefix="shop" form={form} onChange={patch} />
              <Field label="Giới thiệu gian hàng" id="shop-description" full>
                <textarea
                  id="shop-description"
                  rows={3}
                  className="partner-input"
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
