import type {
  Dispatch,
  FormEventHandler,
  InputHTMLAttributes,
  ReactNode,
  SetStateAction,
} from 'react';
import {
  Info,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { ImageUploadDropzone } from '../../components/ui/ImageUploadDropzone';
import { BankSelectTrigger } from '../../components/bank/BankSelectTrigger';
import type { ApplyKolData } from '../../services/kyc.service';

const PRIMARY_CATEGORIES = [
  'Mỹ phẩm & Chăm sóc da chuyên sâu',
  'Thời trang & May mặc thể thao năng động',
  'Dinh dưỡng, Thảo mộc & Sức khỏe thiên nhiên',
  'Thiết bị gia dụng & Đồ bếp thông minh',
];

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
      className={`flex flex-col gap-[7px] min-w-0 ${full ? 'col-span-full' : ''} ${wide ? 'col-span-1 md:col-span-2' : ''}`}
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
}: {
  number: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className="flex items-center gap-[10px] mb-[16px]">
        <span className="flex items-center justify-center shrink-0 w-[26px] h-[26px] border border-[#EEDFC6] rounded-[8px] bg-[#FBF5EB] text-[#B88E4F] text-[12px] font-[700] font-mono">
          {number}
        </span>
        <div>
          <h4 className="m-0 text-[14px] leading-[1.5] font-[650] text-[#1A1612]">{title}</h4>
          {description && <p className="m-[2px_0_0] text-[11px] text-[#7D715E] leading-[1.5]">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function FormFooter({ submitting }: { submitting: boolean }) {
  return (
    <footer className="border-t border-[#EAE4D7] p-[16px_22px] flex items-center justify-between gap-[20px] bg-[#FAF8F5]/40 max-[640px]:flex-col max-[640px]:items-stretch max-[640px]:p-[16px]">
      <p className="flex items-center gap-[8px] text-[11px] text-[#7D715E] leading-[1.5] m-0">
        <ShieldCheck size={16} className="text-[#B88E4F] shrink-0" />
        <span>Dữ liệu cá nhân được bảo mật theo quy định pháp luật.</span>
      </p>
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-[8px] bg-[#C59B58] hover:bg-[#B88E4F] text-white border border-[#C59B58] rounded-[10px] px-[20px] py-[10px] text-[12px] font-[700] tracking-wide cursor-pointer transition-colors duration-150 disabled:opacity-55 max-[640px]:w-full"
      >
        <Send size={14} />
        {submitting ? 'Đang gửi hồ sơ…' : 'Nộp hồ sơ đối tác'}
      </button>
    </footer>
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
          Ngân hàng thụ hưởng Napas 24/7 <span className="text-[#B88E4F]">*</span>
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
        label="Số tài khoản ngân hàng"
        inputMode="numeric"
        autoComplete="off"
        required
        value={form.bankAccountNumber}
        onChange={(event) =>
          onChange('bankAccountNumber', event.target.value.replace(/\D/g, ''))
        }
        placeholder="Nhập số tài khoản ngân hàng"
      />
      <TextField
        id={`${prefix}-account-name`}
        label="Tên chủ tài khoản (Viết hoa không dấu)"
        autoComplete="off"
        required
        value={form.bankAccountName}
        onChange={(event) =>
          onChange('bankAccountName', event.target.value.toUpperCase())
        }
        placeholder="NGUYEN VAN A"
        hint="Bắt buộc phải trùng khớp 100% với họ và tên trên thẻ CCCD để quyết toán thuế TNCN."
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
      className="min-w-0 border border-[#EAE4D7] rounded-[18px] bg-white overflow-visible"
      autoComplete="off"
      onSubmit={onSubmit}
    >
      <div className="p-[22px] grid gap-[22px] max-[640px]:p-[17px] max-[640px]:gap-[20px]">
        {rejectionReason && (
          <div className="flex items-start gap-[10px] border border-[#EEDFC6] rounded-[12px] p-[12px_14px] bg-[#FBF5EB] text-[12px] text-[#7D715E] leading-[1.7]">
            <Info size={17} className="text-[#B88E4F] shrink-0 mt-[2px]" />
            <div>
              <strong className="block text-[#8F682E] font-[600]">Yêu cầu bổ sung từ Ban Quản Trị</strong>
              {rejectionReason}
            </div>
          </div>
        )}

        {/* Khối 1: Kênh Truyền Thông & Sáng Tạo (FR-07) */}
        <Section
          number={1}
          title="Kênh truyền thông"
          description="Nền tảng phát triển nội dung và số lượng người theo dõi."
        >
          <div className="grid gap-[15px] grid-cols-3 max-[640px]:grid-cols-1">
            <Field label="Nền tảng chính" id="kol-platform" required>
              <CustomSelect
                id="kol-platform"
                value={form.platform || ''}
                onChange={(value) =>
                  patch('platform', value as ApplyKolData['platform'])
                }
                options={[
                  { value: 'TIKTOK', label: 'TikTok' },
                  { value: 'YOUTUBE', label: 'YouTube' },
                  { value: 'FACEBOOK', label: 'Facebook' },
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
              label="Tên kênh (@Handle)"
              required
              value={form.channelName}
              onChange={(event) => patch('channelName', event.target.value)}
              placeholder="Ví dụ: @thaonhi.beauty"
            />
            <TextField
              id="kol-followers"
              label="Số người theo dõi (Followers)"
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
              placeholder="Ví dụ: 50000"
            />
            <TextField
              id="kol-channel-url"
              label="Đường dẫn liên kết kênh (URL)"
              type="url"
              full
              required
              value={form.channelUrl}
              onChange={(event) => patch('channelUrl', event.target.value)}
              placeholder="https://tiktok.com/@thaonhi.beauty"
            />
          </div>
          <div className="mt-[14px]">
            <ImageUploadDropzone
              variant="document"
              label="Ảnh chụp màn hình trang quản trị kênh (Proof)"
              helperText="Ảnh chụp giao diện TikTok Studio / Meta Business Suite chứng minh quyền sở hữu và số liệu người theo dõi."
              value={form.channelProofUrl}
              onChange={(value) => patch('channelProofUrl', value)}
              iconType="camera"
              folder="scanms/kyc/proofs"
            />
          </div>
        </Section>

        {/* Khối 2: Định Danh Công Dân & Khối 3: Ngân Hàng Napas */}
        <div className="grid grid-cols-2 gap-[20px] pt-[22px] border-t border-[#EAE4D7] max-[1100px]:grid-cols-1">
          <Section
            number={2}
            title="Thông tin định danh"
            description="Số CCCD và ảnh chụp hai mặt để đối soát thông tin."
          >
            <div className="grid gap-[15px] grid-cols-2 max-[640px]:grid-cols-1">
              <TextField
                id="kol-id"
                label="Số CCCD gắn chip"
                inputMode="numeric"
                maxLength={12}
                required
                value={form.idCardNumber}
                onChange={(event) => patch('idCardNumber', event.target.value)}
                placeholder="12 chữ số trên CCCD"
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
                className="col-span-full"
                label="CCCD mặt trước"
                value={form.frontCardUrl}
                onChange={(value) => patch('frontCardUrl', value)}
                iconType="idcard"
                folder="scanms/kyc/idcards"
                required
              />
              <ImageUploadDropzone
                variant="document"
                className="col-span-full"
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
            description="Tài khoản ngân hàng để nhận chi trả hoa hồng hàng tháng."
          >
            <div className="grid gap-[15px] grid-cols-2 max-[640px]:grid-cols-1">
              <BankDetails prefix="kol" form={form} onChange={patch} />

              <div className="col-span-full">
                <Field label="Ngành hàng thế mạnh đề xuất hợp tác" id="kol-category">
                  <select
                    className="w-full min-w-0 h-[44px] p-[10px_13px] border border-[#EAE4D7] rounded-[11px] bg-white text-[13px] text-[#1A1612] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#C59B58]"
                    onChange={(e) => {
                      const currentBio = form.bio || '';
                      patch('bio', `[Thế mạnh: ${e.target.value}] ${currentBio.replace(/\[Thế mạnh: .*?\]\s*/, '')}`);
                    }}
                  >
                    <option value="">-- Chọn ngành hàng thế mạnh --</option>
                    {PRIMARY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Giới thiệu phong cách sáng tạo & Tệp người theo dõi" id="kol-bio" full>
                <textarea
                  id="kol-bio"
                  rows={2}
                  className="w-full min-w-0 p-[10px_13px] border border-[#EAE4D7] rounded-[11px] bg-white text-[13px] text-[#1A1612] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#A39783] placeholder:font-[400] focus:border-[#C59B58] focus:shadow-[0_0_0_3px_#FBF5EB] resize-y min-h-[78px] max-[640px]:text-[16px]"
                  value={form.bio || ''}
                  onChange={(event) => patch('bio', event.target.value)}
                  placeholder="Mô tả ngắn gọn về tệp khán giả của bạn và lý do nhãn hàng nên tài trợ hàng mẫu..."
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
