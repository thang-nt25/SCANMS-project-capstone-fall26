import {
  useState,
  useEffect,
  type Dispatch,
  type FormEventHandler,
  type InputHTMLAttributes,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  Send,
  Plus,
  Globe,
  Building,
  X,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronLeft,
  Check,
  ShieldCheck,
  Coins,
  PackageCheck,
  CreditCard,
  Award,
  Link as LinkIcon,
  Lock,
} from 'lucide-react';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { ImageUploadDropzone } from '../../components/ui/ImageUploadDropzone';
import { BankSelectTrigger } from '../../components/bank/BankSelectTrigger';
import { authService } from '../../services/auth.service';
import { toast } from '../../utils/toast';
import type { ApplyKolData, SocialChannelFormItem } from '../../services/kyc.service';
import { ApplicationBadge } from './PartnerUpgradeTab';

const PRIMARY_CATEGORIES = [
  'Mỹ phẩm & Chăm sóc da chuyên sâu',
  'Thời trang & May mặc thể thao năng động',
  'Dinh dưỡng, Thảo mộc & Sức khỏe thiên nhiên',
  'Thiết bị gia dụng & Đồ bếp thông minh',
];

// Brand SVGs for Social Platforms
const TikTokIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.43 6.3 6.3 0 0 0 1.83-4.43V8.8a8.28 8.28 0 0 0 4.9 1.57V6.92a4.85 4.85 0 0 1-1-.23z" />
  </svg>
);

const YouTubeIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const InstagramIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const FacebookIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const PLATFORM_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  TIKTOK: { label: 'TikTok', icon: TikTokIcon },
  YOUTUBE: { label: 'YouTube', icon: YouTubeIcon },
  INSTAGRAM: { label: 'Instagram', icon: InstagramIcon },
  FACEBOOK: { label: 'Facebook', icon: FacebookIcon },
  OTHER: { label: 'Khác', icon: Globe },
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Mỹ phẩm & Chăm sóc da chuyên sâu': [
    '#Skincare',
    '#DaDầuMụn',
    '#Treatment',
    '#RoutineKhoaHọc',
    '#PhụcHồi',
    '#ChốngNắng',
  ],
  'Thời trang & May mặc thể thao năng động': [
    '#Activewear',
    '#ĐồTậpGym',
    '#YogaOutfit',
    '#ThờiTrangNăngĐộng',
    '#PhốiĐồ',
  ],
  'Dinh dưỡng, Thảo mộc & Sức khỏe thiên nhiên': [
    '#EatClean',
    '#ThảoMộc',
    '#DinhDưỡng',
    '#Detox',
    '#SứcKhỏeTựNhiên',
    '#Collagen',
  ],
  'Thiết bị gia dụng & Đồ bếp thông minh': [
    '#ĐồBếpThôngMinh',
    '#GiaDụngTiệnÍch',
    '#NồiChiên',
    '#SmartLiving',
    '#NấuĂn',
  ],
};

function Field({
  label,
  id,
  children,
  full = false,
  wide = false,
  required = false,
}: {
  label: string;
  id?: string;
  children: ReactNode;
  full?: boolean;
  wide?: boolean;
  required?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1.5 min-w-0 ${full ? 'col-span-full' : ''} ${wide ? 'col-span-1 md:col-span-2' : ''}`}
    >
      <label htmlFor={id} className="text-xs font-semibold text-[#1A1612]">
        {label}
        {required && <span className="text-[#B88E4F]"> *</span>}
      </label>
      {children}
    </div>
  );
}

function TextField({
  label,
  full,
  wide,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  full?: boolean;
  wide?: boolean;
}) {
  return (
    <Field
      label={label}
      id={input.id}
      full={full}
      wide={wide}
      required={input.required}
    >
      <input
        {...input}
        className="w-full min-w-0 h-10 px-3 py-2 border border-[#EAE4D7] rounded-xl bg-white text-xs text-[#1A1612] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#A39783] focus:border-[#C59B58] focus:shadow-[0_0_0_3px_#FBF5EB]"
      />
    </Field>
  );
}

export function KolUpgradeForm({
  form,
  setForm,
  onSubmit,
  submitting,
  rejectionReason,
  status,
  readOnly = false,
}: {
  form: ApplyKolData;
  setForm: Dispatch<SetStateAction<ApplyKolData>>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitting: boolean;
  rejectionReason?: string;
  status?: string | null;
  readOnly?: boolean;
}) {
  // Stepper state: 1 = Hồ sơ sáng tạo, 2 = Định danh & thanh toán
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // User profile
  const currentUser = authService.getCurrentUser();

  const patch = (key: keyof ApplyKolData, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const rawChannels = form.channels || [];
  const primaryChannel = rawChannels[0] || {
    platform: (form.platform as any) || 'TIKTOK',
    channelName: form.channelName || '',
    channelUrl: form.channelUrl || '',
    followerCount: form.followerCount,
    channelProofUrl: form.channelProofUrl,
    isPrimary: true,
  };

  const secondaryChannels = rawChannels.slice(1);

  const updatePrimary = (updates: Partial<SocialChannelFormItem>) => {
    const updatedPrimary: SocialChannelFormItem = {
      ...primaryChannel,
      ...updates,
      isPrimary: true,
    };
    const nextChannels = [updatedPrimary, ...secondaryChannels];
    setForm((prev) => ({
      ...prev,
      platform: (updatedPrimary.platform as any) || prev.platform,
      channelName: updatedPrimary.channelName ?? prev.channelName,
      channelUrl: updatedPrimary.channelUrl ?? prev.channelUrl,
      followerCount: updatedPrimary.followerCount ?? prev.followerCount,
      channelProofUrl: updatedPrimary.channelProofUrl ?? prev.channelProofUrl,
      channels: nextChannels,
    }));
  };

  // State cho Modal thêm kênh mạng xã hội phụ
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newPlatform, setNewPlatform] = useState<keyof typeof PLATFORM_CONFIG>('YOUTUBE');
  const [newHandle, setNewHandle] = useState('');
  const [newFollowers, setNewFollowers] = useState<number | ''>('');
  const [newUrl, setNewUrl] = useState('');

  const handleSaveSecondaryChannel = () => {
    if (!newHandle.trim()) {
      toast.error('Vui lòng nhập tên kênh hoặc @handle');
      return;
    }
    if (!newUrl.trim()) {
      toast.error('Vui lòng nhập liên kết kênh');
      return;
    }

    const newChannelItem: SocialChannelFormItem = {
      platform: newPlatform as any,
      channelName: newHandle.trim(),
      channelUrl: newUrl.trim(),
      followerCount: Number(newFollowers) || 0,
      isPrimary: false,
    };

    const updated = [...rawChannels, newChannelItem];
    setForm((prev) => ({ ...prev, channels: updated }));
    setNewHandle('');
    setNewFollowers('');
    setNewUrl('');
    setShowAddChannel(false);
    toast.success(`Đã thêm kênh ${PLATFORM_CONFIG[newPlatform]?.label || newPlatform}`);
  };

  const removeSecondaryChannel = (indexInSecondary: number) => {
    const updated = rawChannels.filter((_, i) => i !== indexInSecondary + 1);
    setForm((prev) => ({ ...prev, channels: updated }));
  };

  // Ngành hàng thế mạnh
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (form.specialtyCategories?.[0]) return form.specialtyCategories[0];
    const match = form.bio?.match(/\[Thế mạnh:\s*(.*?)\]/);
    return match ? match[1].trim() : '';
  });

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setForm((prev) => {
      const cleanBio = (prev.bio || '').replace(/\[Thế mạnh: .*?\]\s*/, '').trim();
      return {
        ...prev,
        specialtyCategories: cat ? [cat] : [],
        bio: cat ? (cleanBio ? `[Thế mạnh: ${cat}] ${cleanBio}` : `[Thế mạnh: ${cat}]`) : cleanBio,
      };
    });
  };

  const handleAddKeyword = (kw: string) => {
    setForm((prev) => {
      const current = prev.bio || '';
      if (current.includes(kw)) return prev;
      return { ...prev, bio: current ? `${current} ${kw}` : kw };
    });
  };

  // Lưu nháp
  const handleSaveDraft = () => {
    try {
      localStorage.setItem('scanms_kol_upgrade_draft', JSON.stringify(form));
      toast.success('Đã lưu nháp hồ sơ');
    } catch {
      toast.error('Không thể lưu nháp hồ sơ');
    }
  };

  // Tải nháp tự động nếu form đang rỗng
  useEffect(() => {
    try {
      const saved = localStorage.getItem('scanms_kol_upgrade_draft');
      if (saved && !form.channelUrl && !form.idCardNumber) {
        const parsed = JSON.parse(saved);
        setForm((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, []);

  // Chuyển bước kèm kiểm tra hợp lệ
  const handleNextStep = () => {
    if (!primaryChannel.channelName?.trim()) {
      toast.error('Vui lòng nhập tên kênh hoặc @handle');
      return;
    }
    if (!primaryChannel.channelUrl?.trim()) {
      toast.error('Vui lòng nhập đường dẫn kênh');
      return;
    }
    if (!primaryChannel.followerCount || Number(primaryChannel.followerCount) <= 0) {
      toast.error('Vui lòng nhập số người theo dõi');
      return;
    }
    if (!primaryChannel.channelProofUrl?.trim()) {
      toast.error('Vui lòng tải lên ảnh minh chứng quyền sở hữu kênh');
      return;
    }
    if (!selectedCategory) {
      toast.error('Vui lòng chọn ngành hàng thế mạnh');
      return;
    }
    if (!form.bio?.trim()) {
      toast.error('Vui lòng nhập phần giới thiệu thế mạnh nội dung');
      return;
    }

    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Tính trạng thái hoàn thành
  const hasChannel = Boolean(primaryChannel.channelName && primaryChannel.channelUrl);
  const hasCategory = Boolean(selectedCategory);
  const hasBio = Boolean(form.bio && form.bio.trim().length > 10);
  const hasProof = Boolean(primaryChannel.channelProofUrl);
  const hasIdCard = Boolean(form.idCardNumber && form.idCardNumber.trim().length >= 9);
  const hasPhotos = Boolean(form.frontCardUrl && form.backCardUrl);
  const hasBank = Boolean(form.bankAccountNumber && form.bankName);

  const step1Complete = hasChannel && hasCategory && hasBio && hasProof;
  const step2Ready = hasIdCard && hasPhotos;

  const isNeedsInfo = status === 'NEEDS_INFO';
  const isRejected = status === 'REJECTED';

  return (
    <form
      id="partner-upgrade-form"
      className="w-full text-[#1A1612] space-y-4"
      autoComplete="off"
      onSubmit={(e) => {
        if (readOnly) {
          e.preventDefault();
          return;
        }
        onSubmit(e);
      }}
    >
      {readOnly && (
        <div className="flex items-start gap-2.5 border border-[#EEDFC6] rounded-xl p-3.5 bg-[#FBF5EB] text-xs text-[#7D715E] leading-relaxed">
          <Lock size={16} className="text-[#B88E4F] shrink-0 mt-0.5" />
          <div>
            <strong className="block text-[#1A1612] font-semibold">
              Hồ sơ đang trong quá trình thẩm định — Đã khóa chỉnh sửa
            </strong>
            Thông tin của bạn đã được gửi lên Ban Quản Trị SCANMS (thời gian duyệt tiêu chuẩn trong 24 giờ làm việc). Bạn có thể xem lại các trường đã nộp ở Bước 1 &amp; Bước 2 nhưng không thể thay đổi cho đến khi Quản lý phản hồi hoặc yêu cầu bổ sung.
          </div>
        </div>
      )}

      {rejectionReason && (
        <div
          className={`flex items-start gap-2.5 border rounded-xl p-3.5 text-xs leading-relaxed ${
            isRejected
              ? 'border-red-200 bg-red-50/70 text-[#7D715E]'
              : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#7D715E]'
          }`}
        >
          <ShieldCheck
            size={16}
            className={`shrink-0 mt-0.5 ${isRejected ? 'text-[#DC2626]' : 'text-[#D97706]'}`}
          />
          <div>
            <strong
              className={`block font-semibold ${
                isRejected ? 'text-[#DC2626]' : 'text-[#D97706]'
              }`}
            >
              {isNeedsInfo ? 'Yêu cầu bổ sung từ Ban Quản Trị' : 'Hồ sơ bị từ chối'}
            </strong>
            {rejectionReason}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* THANH HEADER ĐIỀU HƯỚNG TỔNG THỂ UNIFIED (TITLE + STEPPER)  */}
      {/* ============================================================ */}
      <div className="rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-[#EAE4D7]">
          <ApplicationBadge status={status} />
        </div>

        {/* Thanh Stepper điều hướng 2 bước đặt gọn gàng, tinh tế bên phải */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Các bước đăng ký đối tác">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            aria-pressed={currentStep === 1}
            className={`flex min-h-12 items-center justify-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-medium transition cursor-pointer ${
              currentStep === 1
                ? 'border-[#EEDFC6] bg-[#FBF5EB] text-[#79592C]'
                : step1Complete
                  ? 'border-[#EAE4D7] bg-white text-[#1A1612]'
                  : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:bg-[#FAF8F5]'
            }`}
          >
            <span
              className={`flex shrink-0 items-center justify-center w-7 h-7 rounded-full border text-xs font-medium transition ${
                currentStep === 1
                  ? 'border-[#C59B58] bg-[#FBF5EB] text-[#79592C]'
                  : step1Complete
                    ? 'border-[#EEDFC6] bg-white text-[#B88E4F]'
                    : 'bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E]'
              }`}
            >
              {step1Complete && currentStep !== 1 ? <Check size={12} /> : '1'}
            </span>
            <span>Hồ sơ sáng tạo</span>
          </button>

          <div
            className={`hidden ${
              currentStep === 2 || step1Complete ? 'bg-[#C59B58]' : 'bg-[#EAE4D7]'
            }`}
          />

          <button
            type="button"
            onClick={() => {
              if (step1Complete) setCurrentStep(2);
              else handleNextStep();
            }}
            aria-pressed={currentStep === 2}
            className={`flex min-h-12 items-center justify-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-medium transition cursor-pointer ${
              currentStep === 2
                ? 'border-[#EEDFC6] bg-[#FBF5EB] text-[#79592C]'
                : step2Ready
                  ? 'border-[#EAE4D7] bg-white text-[#1A1612]'
                  : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:bg-[#FAF8F5]'
            }`}
          >
            <span
              className={`flex shrink-0 items-center justify-center w-7 h-7 rounded-full border text-xs font-medium transition ${
                currentStep === 2
                  ? 'border-[#C59B58] bg-[#FBF5EB] text-[#79592C]'
                  : step2Ready
                    ? 'border-[#EEDFC6] bg-white text-[#B88E4F]'
                    : 'bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E]'
              }`}
            >
              {step2Ready && currentStep !== 2 ? <Check size={12} /> : '2'}
            </span>
            <span>Định danh & Thanh toán</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* BỐ CỤC 2 CỘT: CỘT CHÍNH (TRÁI) & SIDEBAR TỔNG QUAN (PHẢI)    */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* ========================================================== */}
        {/* CỘT CHÍNH (8 / 12 COLS): FORM NHẬP LIỆU GỌN GÀNG, KHÔNG THỪA*/}
        {/* ========================================================== */}
        <div className="min-w-0 xl:col-span-8 flex flex-col">
          {/* -------------------------------------------------------- */}
          {/* BƯỚC 1: HỒ SƠ SÁNG TẠO                                   */}
          {/* -------------------------------------------------------- */}
          {currentStep === 1 && (
            <div className="flex flex-col p-4 sm:p-5 rounded-2xl border border-[#EAE4D7] bg-white">
              <fieldset disabled={readOnly} className={`space-y-3.5 ${readOnly ? 'opacity-85 pointer-events-none select-text' : ''}`}>
              {/* 1. Nền tảng chính đại diện */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1A1612]">
                  Nền tảng chính đại diện <span className="text-[#B88E4F]">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {['TIKTOK', 'YOUTUBE', 'INSTAGRAM', 'FACEBOOK', 'OTHER'].map((platformKey) => {
                    const cfg = PLATFORM_CONFIG[platformKey] || { label: platformKey, icon: Globe };
                    const IconComp = cfg.icon;
                    const isSelected = primaryChannel.platform === platformKey;
                    return (
                      <button
                        key={platformKey}
                        type="button"
                        onClick={() => updatePrimary({ platform: platformKey as any })}
                        className={`flex min-w-0 items-center justify-center gap-1.5 h-10 px-2 rounded-xl text-xs font-medium transition cursor-pointer border ${
                          isSelected
                            ? 'bg-[#FBF5EB] text-[#B88E4F] border-[#C59B58] shadow-xs'
                            : 'bg-white text-[#7D715E] border-[#EAE4D7] hover:border-[#C59B58] hover:text-[#1A1612]'
                        }`}
                      >
                        <IconComp className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#B88E4F]' : 'text-[#7D715E]'}`} />
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Tên kênh (@Handle) & Số người theo dõi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField
                  label="Tên kênh (@Handle)"
                  required
                  value={primaryChannel.channelName}
                  onChange={(e) => updatePrimary({ channelName: e.target.value })}
                  placeholder="@thaonhi.skincare"
                />
                <TextField
                  label="Số người theo dõi"
                  type="number"
                  min={0}
                  required
                  value={
                    primaryChannel.followerCount === ('' as unknown as number)
                      ? ''
                      : primaryChannel.followerCount
                  }
                  onChange={(e) =>
                    updatePrimary({
                      followerCount:
                        e.target.value === '' ? ('' as unknown as number) : Number(e.target.value),
                    })
                  }
                  placeholder="50000"
                />
              </div>

              {/* 3. Ghép Đường dẫn URL (Trái) & Ảnh minh chứng (Phải) vào cùng 1 hàng để không bị rộng loãng */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                <div className="space-y-2">
                  <TextField
                    label="Đường dẫn kênh (URL)"
                    type="url"
                    required
                    value={primaryChannel.channelUrl}
                    onChange={(e) => updatePrimary({ channelUrl: e.target.value })}
                    placeholder="https://tiktok.com/@thaonhi.skincare"
                  />


                </div>

                {/* Dropzone Ảnh quản trị đặt bên phải để lấp đầy tự nhiên */}
                <ImageUploadDropzone
                  variant="compact"
                  className="min-w-0 space-y-1.5 [&>div:not(:first-child)]:h-10 [&>div:not(:first-child)]:min-h-10 [&>div:not(:first-child)]:py-0 [&>div:first-child]:min-h-[16px] [&>div:first-child>label]:font-semibold [&>div:first-child>span]:hidden"
                  label="Ảnh chụp trang quản trị kênh"
                  value={primaryChannel.channelProofUrl}
                  onChange={(value) => updatePrimary({ channelProofUrl: value })}
                  iconType="camera"
                  folder="scanms/kyc/proofs"
                  required
                />
              </div>

              {/* Kênh mạng xã hội bổ sung dạng chip nhỏ gọn, không làm dài form */}
              <div className={`rounded-xl border border-[#EAE4D7] bg-white px-3 ${secondaryChannels.length ? 'space-y-2 py-2.5' : 'flex h-10 items-center'}`}>
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[#7D715E]">
                    Kênh bổ sung ({secondaryChannels.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddChannel(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B88E4F] hover:text-[#8F682E] transition cursor-pointer"
                  >
                    <Plus size={12} /> Thêm kênh
                  </button>
                </div>

                {/* Danh sách chip các kênh phụ */}
                {secondaryChannels.length > 0 && <div className="flex flex-wrap gap-1.5">
                  {(
                    secondaryChannels.map((sec, secIdx) => {
                      const cfg = PLATFORM_CONFIG[sec.platform] || { label: sec.platform, icon: Globe };
                      const IconComp = cfg.icon;
                      return (
                        <span
                          key={secIdx}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] text-xs font-medium text-[#1A1612]"
                        >
                          <IconComp className="w-3 h-3 text-[#B88E4F]" />
                          <span>{sec.channelName}</span>
                          <span className="text-[10px] text-[#7D715E]">
                            ({Number(sec.followerCount).toLocaleString('vi-VN')})
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSecondaryChannel(secIdx)}
                            className="text-[#DC2626] hover:text-[#B91C1C] cursor-pointer ml-0.5"
                            title="Xóa kênh"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      );
                    })
                  )}
                </div>}
              </div>

              {/* 4. Ngành hàng thế mạnh */}
              <div className="space-y-1.5">
                <Field label="Ngành hàng thế mạnh" required>
                  <CustomSelect
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    options={PRIMARY_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                    placeholder="-- Chọn ngành hàng thế mạnh --"
                    required
                  />
                </Field>

                {/* Từ khóa gợi ý (chỉ hiển thị khi đã chọn ngành hàng) */}
                {selectedCategory && (CATEGORY_KEYWORDS[selectedCategory] || []).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] font-semibold text-[#7D715E]">Từ khóa gợi ý:</span>
                    {(CATEGORY_KEYWORDS[selectedCategory] || []).map((kw) => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => handleAddKeyword(kw)}
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF8F5] hover:bg-[#FBF5EB] border border-[#EAE4D7] hover:border-[#C59B58] text-[#7D715E] hover:text-[#B88E4F] transition cursor-pointer"
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Giới thiệu phong cách sáng tạo & Tệp khán giả */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="kol-bio" className="text-xs font-semibold text-[#1A1612]">
                    Giới thiệu phong cách sáng tạo & Tệp khán giả <span className="text-[#B88E4F]">*</span>
                  </label>
                  <span className="text-[11px] text-[#7D715E]">
                    {(form.bio || '').length}/500
                  </span>
                </div>
                <textarea
                  id="kol-bio"
                  rows={3}
                  maxLength={500}
                  className="w-full min-w-0 p-3 border border-[#EAE4D7] rounded-xl bg-white text-xs text-[#1A1612] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#A39783] focus:border-[#C59B58] focus:shadow-[0_0_0_3px_#FBF5EB] resize-y min-h-[100px] leading-relaxed"
                  value={form.bio || ''}
                  onChange={(event) => patch('bio', event.target.value)}
                  placeholder="Mô tả phong cách sáng tạo, thế mạnh nội dung và tệp khán giả mục tiêu..."
                />
              </div>
              </fieldset>

              {/* Cụm nút hành động chính ngay dưới chân form */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#EAE4D7]">
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="h-9 px-4 rounded-xl border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] text-xs font-bold text-[#7D715E] hover:text-[#1A1612] transition cursor-pointer"
                  >
                    Lưu nháp
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-[#7D715E]">
                    Chế độ chỉ xem (Đang chờ duyệt)
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => (readOnly ? setCurrentStep(2) : handleNextStep())}
                  className="h-9 px-5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{readOnly ? 'Xem bước 2' : 'Tiếp tục'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* BƯỚC 2: ĐỊNH DANH eKYC & THANH TOÁN                      */}
          {/* -------------------------------------------------------- */}
          {currentStep === 2 && (
            <div className="flex flex-col p-4 sm:p-5 rounded-2xl border border-[#EAE4D7] bg-white">
              <fieldset disabled={readOnly} className={`space-y-4 ${readOnly ? 'opacity-85 pointer-events-none select-text' : ''}`}>
                {/* Header Card Bước 2 */}
                <div className="flex items-center justify-between pb-3 border-b border-[#EAE4D7]">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={18} className="text-[#B88E4F]" />
                    <h2 className="text-sm sm:text-base font-bold text-[#1A1612] m-0">
                      Định danh eKYC & Tài khoản nhận tiền
                    </h2>
                  </div>
                  <span className="text-[11px] font-bold text-[#7D715E] bg-[#FAF8F5] px-2.5 py-0.5 rounded-full border border-[#EAE4D7]">
                    Bước 2/2
                  </span>
                </div>

              {/* 1. Định danh CCCD */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextField
                    id="kol-id"
                    label="Số CCCD gắn chip (12 chữ số)"
                    inputMode="numeric"
                    maxLength={12}
                    required
                    value={form.idCardNumber}
                    onChange={(event) => patch('idCardNumber', event.target.value.replace(/\D/g, ''))}
                    placeholder="12 chữ số trên thẻ CCCD"
                  />
                  <TextField
                    id="kol-tax"
                    label="Mã số thuế cá nhân (Tùy chọn)"
                    inputMode="numeric"
                    value={form.taxCode || ''}
                    onChange={(event) => patch('taxCode', event.target.value.replace(/\D/g, ''))}
                    placeholder="Không bắt buộc"
                  />
                </div>

                {/* 2 Khung ảnh CCCD Mặt trước & Mặt sau */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <ImageUploadDropzone
                    variant="document"
                    label="Ảnh CCCD mặt trước"
                    value={form.frontCardUrl}
                    onChange={(value) => patch('frontCardUrl', value)}
                    iconType="idcard"
                    folder="scanms/kyc/idcards"
                    required
                  />
                  <ImageUploadDropzone
                    variant="document"
                    label="Ảnh CCCD mặt sau"
                    value={form.backCardUrl}
                    onChange={(value) => patch('backCardUrl', value)}
                    iconType="idcard"
                    folder="scanms/kyc/idcards"
                    required
                  />
                </div>
              </div>

              {/* 2. Tài khoản ngân hàng nhận thù lao (Tùy chọn) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Building size={14} className="text-[#B88E4F]" />
                    <span className="text-xs font-bold text-[#1A1612]">
                      Tài khoản ngân hàng thụ hưởng
                    </span>
                  </div>
                  <span className="text-[10px] text-[#B88E4F] font-semibold bg-[#FBF5EB] px-2 py-0.5 rounded border border-[#EEDFC6]">
                    Tùy chọn · Bổ sung khi rút tiền
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#1A1612]">
                      Ngân hàng thụ hưởng
                    </label>
                    <BankSelectTrigger
                      value={form.bankName}
                      onChange={(value) => patch('bankName', value)}
                      placeholder="Chọn ngân hàng thụ hưởng"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextField
                      id="kol-bank-number"
                      label="Số tài khoản ngân hàng"
                      inputMode="numeric"
                      value={form.bankAccountNumber}
                      onChange={(event) => patch('bankAccountNumber', event.target.value.replace(/\s+/g, ''))}
                      placeholder="Nhập số tài khoản"
                    />
                    <TextField
                      id="kol-bank-acc"
                      label="Tên chủ tài khoản"
                      value={form.bankAccountName}
                      onChange={(event) => patch('bankAccountName', event.target.value.toUpperCase())}
                      placeholder="NGUYEN VAN A (Trùng tên CCCD)"
                    />
                  </div>
                </div>

                {/* Thẻ xem trước tài khoản thụ hưởng Napas 24/7 (Warm Sand Gold VIP Card) */}
                <div className="relative overflow-hidden rounded-2xl border-2 border-[#EEDFC6] bg-gradient-to-br from-[#FAF8F5] via-[#F3EFE6] to-[#E9DEC9] p-5 sm:p-6 shadow-sm mt-3 space-y-4">
                  {/* Luxury watermarked background elements */}
                  <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-gradient-to-br from-[#C59B58]/15 to-transparent blur-xl pointer-events-none" />
                  <div className="absolute -left-8 -bottom-8 w-36 h-36 rounded-full bg-[#B88E4F]/10 blur-xl pointer-events-none" />

                  {/* Top Row: EMV Chip & Bank Name / Napas 24/7 */}
                  <div className="relative z-10 flex items-center justify-between pb-1">
                    <div className="flex items-center gap-3">
                      {/* Golden Metallic EMV Chip */}
                      <div className="w-11 h-8 rounded-lg bg-gradient-to-br from-[#F5E6CC] via-[#C59B58] to-[#8E6A2F] p-1 border border-[#B88E4F] shadow-xs flex flex-col justify-between">
                        <div className="flex justify-between h-1.5 border-b border-[#7A5820]/40">
                          <span className="w-2 border-r border-[#7A5820]/40" />
                          <span className="w-2 border-l border-[#7A5820]/40" />
                        </div>
                        <div className="flex justify-between h-1.5">
                          <span className="w-2 border-r border-[#7A5820]/40" />
                          <span className="w-2 border-l border-[#7A5820]/40" />
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D715E] block">
                          Tài khoản thụ hưởng
                        </span>
                        <span className="text-xs sm:text-sm font-black text-[#1A1612] tracking-wide uppercase">
                          {form.bankName ? form.bankName : 'Chọn ngân hàng thụ hưởng'}
                        </span>
                      </div>
                    </div>

                    {/* Brand Gold Napas 24/7 Badge */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-[#C59B58] to-[#B88E4F] text-white text-[11px] font-black shadow-xs">
                      <CreditCard size={13} className="text-white" />
                      <span>NAPAS 24/7</span>
                    </span>
                  </div>

                  {/* Middle Row: Formatted Account Number */}
                  <div className="relative z-10 py-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D715E] block mb-0.5">
                      Số tài khoản nhận tiền
                    </span>
                    <div className="text-base sm:text-lg font-mono font-bold tracking-[0.2em] text-[#1A1612]">
                      {form.bankAccountNumber
                        ? form.bankAccountNumber.replace(/(\d{4})/g, '$1 ').trim()
                        : '•••• •••• •••• ••••'}
                    </div>
                  </div>

                  {/* Bottom Row: Account Holder & Escrow Term */}
                  <div className="relative z-10 flex items-end justify-between pt-2 border-t border-[#EAE4D7]">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D715E] block">
                        Chủ tài khoản
                      </span>
                      <span className="text-xs sm:text-sm font-black text-[#1A1612] uppercase tracking-wide">
                        {form.bankAccountName || (currentUser?.fullName?.toUpperCase() ?? 'NGUYEN VAN A')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#7D715E] block">
                        Bảo chứng đối soát
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8F682E] bg-white/80 px-2.5 py-0.5 rounded-lg border border-[#EEDFC6]">
                        14 ngày bảo chứng
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Cụm nút hành động chính ngay dưới chân form Bước 2 */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#EAE4D7]">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="h-9 px-4 rounded-xl border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] text-xs font-bold text-[#7D715E] hover:text-[#1A1612] transition flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Quay lại</span>
              </button>
              {!readOnly ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-9 px-5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  <Send size={13} />
                  <span>
                    {submitting
                      ? 'Đang gửi hồ sơ…'
                      : isNeedsInfo
                        ? 'Cập nhật & Gửi lại hồ sơ'
                        : 'Gửi hồ sơ đăng ký'}
                  </span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B88E4F]">
                  <Lock size={13} />
                  Hồ sơ đã khóa để chờ duyệt
                </span>
              )}
            </div>
          </div>
        )}
        </div>

        {/* ========================================================== */}
        {/* CỘT PHẢI (4 / 12 COLS): HỒ SƠ & QUYỀN LỢI ĐỐI TÁC CÓ ĐIỂM NHẤN*/}
        {/* ========================================================== */}
        <aside className="min-w-0 xl:col-span-4 rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#EEDFC6] bg-[#FBF5EB] text-base font-semibold text-[#B88E4F]">
              <span>{currentUser?.fullName?.[0] || 'K'}</span>
              {currentUser?.avatarUrl && <img src={currentUser.avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-sm font-semibold text-[#1A1612]">{currentUser?.fullName || 'Nhà sáng tạo'}</p>
              <p className="m-0 break-all text-xs leading-5 text-[#7D715E]">{currentUser?.email || ''}</p>
              <span className="mt-1 inline-flex items-center gap-1 text-xs text-[#8F682E]">
                {currentStep === 2 && step2Ready ? <CheckCircle2 size={12} className="text-[#059669]" /> : <Clock size={12} />}
                {currentStep === 1 ? 'Đang hoàn thiện' : step2Ready ? 'Sẵn sàng nộp' : 'Đang định danh'}
              </span>
            </div>
          </div>

          <div className="mt-4 border-t border-[#EAE4D7] pt-3">
            <p className="mb-2 text-xs font-medium text-[#7D715E]">Tiến độ hồ sơ</p>
            <ul className="m-0 list-none space-y-2 p-0">
              {(currentStep === 1 ? [
                { label: 'Kênh truyền thông', done: hasChannel && hasProof },
                { label: 'Lĩnh vực hợp tác', done: hasCategory },
                { label: 'Giới thiệu bản thân', done: hasBio },
              ] : [
                { label: 'Hồ sơ sáng tạo', done: step1Complete },
                { label: 'Định danh CCCD', done: hasIdCard && hasPhotos },
                { label: 'Ngân hàng (tùy chọn)', done: hasBank },
              ]).map((item, index) => (
                <li key={item.label} className="flex items-center gap-2 text-xs leading-5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#EAE4D7] bg-[#FAF8F5] text-[10px] text-[#7D715E]">
                    {item.done ? <Check size={12} className="text-[#059669]" /> : index + 1}
                  </span>
                  <span className={item.done ? 'text-[#1A1612]' : 'text-[#7D715E]'}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <details className="group mt-4 border-t border-[#EAE4D7] pt-3">
            <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 text-sm font-medium text-[#1A1612] [&::-webkit-details-marker]:hidden">
              <Award size={16} className="shrink-0 text-[#B88E4F]" />
              Quyền lợi đối tác
              <span aria-hidden="true" className="ml-auto text-[#7D715E] transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <ul className="mb-0 mt-3 list-none space-y-3 p-0">
              {[
                { icon: Coins, title: 'Hoa hồng theo cấp bậc', description: 'Đồng 10% · Bạc 11% · Vàng 12% · Kim Cương 13%.' },
                { icon: PackageCheck, title: 'Nhận mẫu trải nghiệm', description: 'Đăng ký mẫu và làm review theo chính sách từng gian hàng.' },
                { icon: CreditCard, title: 'Rút thu nhập', description: 'Gửi yêu cầu rút từ số dư khả dụng về ngân hàng đã xác thực.' },
                { icon: Award, title: 'Mã ưu đãi riêng', description: 'Hợp tác với shop để nhận coupon dành cho kênh của bạn.' },
              ].map(({ icon: Icon, title, description }) => (
                <li key={title} className="flex items-start gap-2">
                  <Icon size={14} className="mt-0.5 shrink-0 text-[#B88E4F]" />
                  <div>
                    <p className="m-0 text-xs font-medium leading-5 text-[#1A1612]">{title}</p>
                    <p className="m-0 text-xs leading-5 text-[#7D715E]">{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        </aside>
      </div>

      {/* ============================================================ */}
      {/* MODAL THÊM KÊNH MẠNG XÃ HỘI PHỤ (POPUP TRỰC QUAN CÓ ICON CHUẨN)*/}
      {/* ============================================================ */}
      {showAddChannel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#231D15]/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowAddChannel(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#EEDFC6] bg-white p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE4D7]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F]">
                  <Globe size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1A1612] m-0">
                    Thêm kênh mạng xã hội bổ sung
                  </h3>
                  <p className="text-[11px] text-[#7D715E] m-0 mt-0.5">
                    Liên kết các kênh khác để tăng uy tín và cơ hội nhận đề xuất hợp tác
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddChannel(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5] transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body Modal */}
            <div className="space-y-4">
              {/* 1. Chọn Nền Tảng Trực Quan Có Icon Đầy Đủ */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1A1612]">
                  Nền tảng mạng xã hội <span className="text-[#DC2626]">*</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(PLATFORM_CONFIG).map(([k, cfg]) => {
                    const Icon = cfg.icon;
                    const isSelected = newPlatform === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setNewPlatform(k as any)}
                        className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'border-[#B88E4F] bg-[#FBF5EB] text-[#1A1612] shadow-xs font-bold ring-2 ring-[#B88E4F]/20'
                            : 'border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E] hover:border-[#C59B58] hover:bg-white hover:text-[#1A1612]'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isSelected
                              ? 'bg-white text-[#B88E4F] shadow-2xs'
                              : 'bg-white/80 text-[#7D715E]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] leading-tight truncate w-full text-center">
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Tên kênh & Số follower */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A1612]">
                    Tên kênh (@Handle) <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#B88E4F]">
                      @
                    </span>
                    <input
                      type="text"
                      placeholder="thaonhi.vlog"
                      value={newHandle.startsWith('@') ? newHandle.slice(1) : newHandle}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^@+/, '');
                        setNewHandle(val ? `@${val}` : '');
                      }}
                      className="w-full h-10 pl-7 pr-3 text-xs border border-[#EAE4D7] rounded-xl bg-white text-[#1A1612] placeholder-[#A39783] outline-none focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/15 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#1A1612]">
                    Số người theo dõi (Followers)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      placeholder="15000"
                      value={newFollowers === '' ? '' : newFollowers}
                      onChange={(e) =>
                        setNewFollowers(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full h-10 px-3 text-xs border border-[#EAE4D7] rounded-xl bg-white text-[#1A1612] placeholder-[#A39783] outline-none focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/15 transition"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Đường dẫn URL */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1A1612]">
                  Đường dẫn kênh (URL) <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <LinkIcon
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B88E4F]"
                  />
                  <input
                    type="url"
                    placeholder={
                      newPlatform === 'YOUTUBE'
                        ? 'https://youtube.com/@thaonhivlog'
                        : newPlatform === 'FACEBOOK'
                          ? 'https://facebook.com/thaonhi.official'
                          : newPlatform === 'INSTAGRAM'
                            ? 'https://instagram.com/thaonhi'
                            : newPlatform === 'TIKTOK'
                              ? 'https://tiktok.com/@thaonhi'
                              : 'https://...'
                    }
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full h-10 pl-8 pr-3 text-xs border border-[#EAE4D7] rounded-xl bg-white text-[#1A1612] placeholder-[#A39783] outline-none focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/15 transition"
                  />
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-[#EAE4D7]">
              <button
                type="button"
                onClick={() => setShowAddChannel(false)}
                className="h-10 px-4 rounded-xl border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#7D715E] transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveSecondaryChannel}
                className="inline-flex items-center gap-1.5 h-10 px-6 rounded-xl bg-gradient-to-r from-[#C59B58] to-[#B88E4F] hover:from-[#B88E4F] hover:to-[#A37B3C] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Check size={14} />
                <span>Lưu kênh</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
