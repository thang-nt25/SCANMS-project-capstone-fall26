import React, { useState, useLayoutEffect, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Link as LinkIcon,
  UserCheck,
  Building,
  Send,
  ShieldAlert,
  Clock,
  Loader2,
  ExternalLink,
  Trash2,
  Plus,
  Star,
  Camera,
  Check,
  Globe,
  Music2,
  Users,
  Video,
  MoreHorizontal,
} from 'lucide-react';
import { kycService, type KycProfile } from '../../services/kyc.service';
import { socialService, type SocialChannel } from '../../services/social.service';
import { authService } from '../../services/auth.service';
import { Select } from '../../components/ui/Select';
import { ImageUploadDropzone } from '../../components/ui/ImageUploadDropzone';
import { BankSelectTrigger } from '../../components/bank/BankSelectTrigger';
import { toast } from '../../utils/toast';
import { kycReviewItems } from '../../utils/kyc-review-items';
import { socialChannelFields, socialChannelUrlError } from '../../utils/social-channel-form';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

interface KycSubmissionPageProps {
  loadedData?: { profile: KycProfile; channels: SocialChannel[] };
  isRefreshing?: boolean;
  onProfileSaved?: (data: { profile: KycProfile; channels: SocialChannel[] }) => void;
}

const channelPlatforms = [
  { value: 'TIKTOK', label: 'TikTok', icon: Music2 },
  { value: 'FACEBOOK', label: 'Facebook', icon: Users },
  { value: 'YOUTUBE', label: 'YouTube', icon: Video },
  { value: 'INSTAGRAM', label: 'Instagram', icon: Camera },
  { value: 'OTHER', label: 'Nền tảng khác', icon: Globe },
] as const;
const channelPlatformOptions = channelPlatforms.map(({ value, label, icon: Icon }) => ({
  value,
  label,
  content: <span className="flex items-center gap-2.5"><Icon size={15} className="shrink-0 text-[#8E6B38]" aria-hidden="true" /><span>{label}</span></span>,
}));
const channelPlatformMenuClass = 'rounded-xl p-1 [&>div]:max-h-none [&_[role=option]]:min-h-8 [&_[role=option]]:rounded-lg [&_[role=option]]:border-0 [&_[role=option]]:px-2.5 [&_[role=option]]:py-1.5 [&_[role=option]]:text-xs';
const sectionHeadingClass = 'kyc-fixed-section-heading flex min-h-[68px] flex-wrap items-center gap-2.5 border-b border-[#EAE4D7] px-4 py-3 sm:px-5';
const sectionColumnsClass = 'kyc-section-body grid min-w-0 grid-cols-1 divide-y divide-[#EAE4D7] md:grid-cols-2 md:divide-x md:divide-y-0 [&_input:not([type=file]):not(.sr-only)]:rounded-lg! [&_textarea]:rounded-lg! [&_button[aria-haspopup=listbox]]:rounded-lg!';
const sectionColumnClass = 'min-w-0 space-y-4 p-4 sm:p-5';
const fieldClass = 'h-11 w-full min-w-0 rounded-lg! border border-[#EAE4D7] bg-white px-3 text-sm text-[#1A1612] outline-none transition-colors focus:border-[#C59B58]';
const identityNumberPattern = /^\d{9,12}$/;

const KycSubmissionPage = forwardRef<{ refresh: () => Promise<void> }, KycSubmissionPageProps>(function KycSubmissionPage({ loadedData, isRefreshing = false, onProfileSaved }, ref) {
  const formRef = useRef<HTMLFormElement>(null);
  const [activeSection, setActiveSection] = useState<'channel' | 'identity' | 'bank'>('channel');
  const [searchParams] = useSearchParams();
  const targetSection = searchParams.get('section');
  useEffect(() => {
    if (targetSection === 'identity' || targetSection === 'bank') setActiveSection(targetSection);
  }, [targetSection]);
  const loadSequence = useRef(0);
  const revealSection = (section: string) => {
    setActiveSection(section as typeof activeSection);
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-profile-section="${section}"]`);
    requestAnimationFrame(() => panel?.scrollIntoView({ block: 'nearest' }));
  };
  const currentUser = authService.getCurrentUser();
  const [profile, setProfile] = useState<KycProfile | null>(null);
  const [socialChannels, setSocialChannels] = useState<SocialChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  // Social Channels & Primary Channel (Matching PartnerUpgradeTab - Image 2)
  const [platform, setPlatform] = useState('TIKTOK');
  const [channelName, setChannelName] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [followerCount, setFollowerCount] = useState<number | ''>('');
  const [channelProofUrl, setChannelProofUrl] = useState<string>('');
  const channelFields = socialChannelFields(platform);
  const channelLinkError = channelUrl.trim() ? socialChannelUrlError(platform, channelUrl) : null;
  const focusChannelUrl = () => {
    revealSection('channel');
    requestAnimationFrame(() => document.getElementById('kyc-channel-url')?.focus());
  };

  // Additional connected channels management
  const [showAddOtherChannel, setShowAddOtherChannel] = useState(false);
  const [otherPlatform, setOtherPlatform] = useState('YOUTUBE');
  const [otherChannelName, setOtherChannelName] = useState('');
  const [otherChannelUrl, setOtherChannelUrl] = useState('');
  const [otherFollowers, setOtherFollowers] = useState<number | ''>('');
  const [addingOtherChannel, setAddingOtherChannel] = useState(false);

  const defaultName = currentUser?.fullName
    ? currentUser.fullName
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/Đ/g, 'D')
    : '';

  // KYC CCCD & Legal
  const [idCardNumber, setIdCardNumber] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [frontCardUrl, setFrontCardUrl] = useState<string>('');
  const [backCardUrl, setBackCardUrl] = useState<string>('');

  // Bank Info & Bio
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState(defaultName);
  const [bio, setBio] = useState('');

  useLayoutEffect(() => {
    if (loadedData) {
      applyProfileData(loadedData.profile, loadedData.channels);
      setLoading(false);
      setLoadError('');
      return;
    }
    void loadProfile().catch((err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Không thể tải hồ sơ KYC.');
    });
    return () => { loadSequence.current++; };
  }, [loadedData]);

  const applyProfileData = (p: KycProfile, channels: SocialChannel[]) => {
    const primary = channels.find((channel) => channel.isPrimary) || channels[0];
    const links = p.socialLinksJson;
    setProfile(p);
    setSocialChannels(channels);
    setIdCardNumber(p.idCardNumber ?? '');
    setTaxCode(p.taxCode ?? '');
    setBankName(p.bankName ?? '');
    setBankAccountNumber(p.bankAccountNumber ?? '');
    setBankAccountName(p.bankAccountName ?? defaultName);
    setBio(p.bio ?? '');
    setFrontCardUrl(links?.frontCardUrl ?? '');
    setBackCardUrl(links?.backCardUrl ?? '');
    setChannelProofUrl(links?.channelProofUrl ?? '');
    setPlatform(String(links?.platform || primary?.platformName || 'TIKTOK').trim().toUpperCase());
    setChannelName(links?.channelName || primary?.channelName || '');
    setChannelUrl(links?.channelUrl || primary?.channelUrl || '');
    setFollowerCount(links?.followerCount ?? primary?.followerCount ?? '');
  };

  const loadProfile = async (forceRefresh = false) => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setLoadError('');
    try {
      const [p, channels] = await Promise.all([
        kycService.getMyKyc({ forceRefresh }),
        socialService.getMyChannels({ forceRefresh }),
      ]);
      if (sequence !== loadSequence.current) return;
      if (!p || !Array.isArray(channels)) throw new Error('Dữ liệu hồ sơ KYC không hợp lệ.');
      applyProfileData(p, channels);
      onProfileSaved?.({ profile: p, channels });
    } catch (err: unknown) {
      if (sequence === loadSequence.current) {
        setLoadError(err instanceof Error ? err.message : 'Không thể tải hồ sơ KYC.');
      }
      throw err;
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  };

  const loadSocialChannels = async () => {
    try {
      const channels = await socialService.getMyChannels();
      setSocialChannels(channels || []);
      const primary = channels?.find((c) => c.isPrimary) || channels?.[0];
      if (primary) {
        setPlatform((prev) => (prev ? prev : (primary.platformName as any) || 'TIKTOK'));
        setChannelName((prev) => (prev ? prev : primary.channelName || ''));
        setChannelUrl((prev) => (prev ? prev : primary.channelUrl || ''));
        setFollowerCount((prev) => (prev !== '' ? prev : primary.followerCount || ''));
      }
    } catch (err) {
      console.error('Lỗi tải kênh mạng xã hội:', err);
      toast.error(err instanceof Error ? err.message : 'Không thể tải các kênh đã kết nối.');
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: () => loadProfile(true),
  }));

  const handleAddOtherChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otherChannelUrl.trim()) {
      toast.error('Vui lòng nhập đường dẫn liên kết kênh');
      return;
    }

    setAddingOtherChannel(true);
    try {
      await socialService.addChannel({
        platformName: otherPlatform,
        channelName: otherChannelName.trim() || `${otherPlatform} Creator`,
        channelUrl: otherChannelUrl.trim(),
        followerCount: Number(otherFollowers) || 0,
        isPrimary: socialChannels.length === 0,
      });
      toast.success('Đã thêm kênh phụ thành công');
      setShowAddOtherChannel(false);
      setOtherChannelName('');
      setOtherChannelUrl('');
      setOtherFollowers('');
      loadSocialChannels();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thêm kênh');
    } finally {
      setAddingOtherChannel(false);
    }
  };

  const [channelToDelete, setChannelToDelete] = useState<SocialChannel | null>(null);
  const [isDeletingChannel, setIsDeletingChannel] = useState(false);

  const handleConfirmDeleteChannel = async () => {
    if (!channelToDelete?.id) return;
    setIsDeletingChannel(true);
    try {
      await socialService.deleteChannel(channelToDelete.id);
      toast.success('Đã xóa kênh mạng xã hội khỏi danh sách');
      setChannelToDelete(null);
      loadSocialChannels();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa kênh');
    } finally {
      setIsDeletingChannel(false);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await socialService.setPrimary(id);
      toast.success('Đã chọn làm kênh chính');
      loadSocialChannels();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isRefreshing || saving) return;

    if (!platform) {
      revealSection('channel');
      toast.error('Vui lòng chọn nền tảng mạng xã hội chính');
      return;
    }
    if (!channelUrl.trim()) {
      revealSection('channel');
      toast.error('Vui lòng nhập đường link kênh mạng xã hội');
      return;
    }
    if (channelLinkError) {
      focusChannelUrl();
      return;
    }
    if (!identityNumberPattern.test(idCardNumber)) {
      revealSection('identity');
      toast.error('Vui lòng nhập số CCCD/CMND hợp lệ (từ 9 đến 12 số)');
      return;
    }
    if (!taxCode.trim()) {
      revealSection('identity');
      toast.error('Vui lòng nhập Mã số thuế cá nhân (MST) để hoàn tất hồ sơ');
      return;
    }
    if (!bankName?.trim()) {
      revealSection('bank');
      toast.error('Vui lòng chọn ngân hàng thụ hưởng nhận hoa hồng');
      return;
    }
    if (!bankAccountNumber.trim() || !bankAccountName.trim()) {
      revealSection('bank');
      toast.error('Vui lòng điền đầy đủ số tài khoản và tên chủ tài khoản ngân hàng');
      return;
    }
    if (!frontCardUrl || !backCardUrl) {
      revealSection('identity');
      toast.error('Vui lòng tải ảnh mặt trước và mặt sau của giấy tờ.');
      return;
    }

    setSaving(true);
    try {
      await kycService.submitKyc({
        idCardNumber: idCardNumber.trim(),
        taxCode: taxCode.trim(),
        bankName,
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountName: bankAccountName.trim().toUpperCase(),
        bio: bio.trim(),
        frontCardUrl,
        backCardUrl,
        channelProofUrl,
        platform,
        channelName: channelName.trim() || `${platform} Creator`,
        channelUrl: channelUrl.trim(),
        followerCount: followerCount ? Number(followerCount) : 0,
      });

      await loadProfile(true);
      toast.success('Đã gửi hồ sơ KYC để thẩm định.');
      await authService.getMe();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Không thể lưu hồ sơ, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  const rawStatus = profile?.kycStatus || (profile as any)?.status || 'UNVERIFIED';
  const hasSubmitted = Boolean(profile?.idCardNumber);
  const isVerified = rawStatus === 'VERIFIED';
  const isRejected = rawStatus === 'REJECTED';
  const review = profile?.socialLinksJson;
  const isNeedsInfo = rawStatus === 'UNVERIFIED' && (review?.needsInfo === true || review?.reviewStatus === 'NEEDS_INFO');
  const isPending = !isNeedsInfo && ((rawStatus === 'UNVERIFIED' && hasSubmitted) || rawStatus === 'PENDING');
  const requestedItems: unknown[] = Array.isArray(review?.requestedItems) ? review.requestedItems : [];
  const showReviewField = ({ section, profileFieldId }: (typeof kycReviewItems)[number]) => {
    setActiveSection(section);
    requestAnimationFrame(() => {
      const field = document.getElementById(profileFieldId);
      field?.scrollIntoView({ block: 'center' });
      field?.focus({ preventScroll: true });
    });
  };
  const channelComplete = Boolean(channelName.trim() && channelUrl.trim() && !channelLinkError && followerCount !== '');
  const identityComplete = Boolean(identityNumberPattern.test(idCardNumber) && taxCode.trim() && frontCardUrl && backCardUrl);
  const bankComplete = Boolean(bankName.trim() && bankAccountNumber.trim() && bankAccountName.trim());

  if (loading && !profile) {
    return (
      <section className="flex items-center gap-2 p-3 sm:px-3.5 border border-[#EAE4D7] rounded-xl bg-white text-[#7D715E] text-xs" role="status" aria-busy="true">
        <Loader2 size={16} className="animate-spin text-[#B88E4F] shrink-0" aria-hidden="true" />
        <span>Đang tải dữ liệu hồ sơ KYC…</span>
      </section>
    );
  }

  if (!profile && loadError) {
    return <section className="p-3 border border-red-200 rounded-xl bg-white text-red-600 text-xs" role="alert">{loadError}</section>;
  }

  const reviewNote = isRejected || isNeedsInfo
    ? review?.rejectionReason || 'Vui lòng kiểm tra thông tin và gửi lại.'
    : isPending ? 'Dự kiến trong 24 giờ làm việc' : null;
  const reviewBadge = (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold ${isRejected
      ? 'border-[#DC2626]/20 bg-[#DC2626]/5 text-[#DC2626]'
      : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#795A2D]'}`}>
      {isVerified ? <Check size={12} aria-hidden="true" /> : isRejected ? <ShieldAlert size={12} aria-hidden="true" /> : <Clock size={12} aria-hidden="true" />}
      {isVerified ? 'Hồ sơ đã xác thực' : isRejected ? 'Hồ sơ bị từ chối' : isNeedsInfo ? 'Cần bổ sung hồ sơ' : isPending ? 'Đang xét duyệt' : 'Chưa nộp hồ sơ'}
    </span>
  );

  return (
    <div className="kyc-page flex flex-col gap-3.5 w-full text-left" aria-busy={loading || isRefreshing}>
      {searchParams.get('required') && <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs text-[#715126]">
        <strong className="font-medium">Hồ sơ cần kiểm tra để xử lý rút tiền</strong>
        <div className="mt-2 flex flex-wrap gap-2">{[
          { code: 'VERIFIED_KYC', section: 'identity', label: 'Định danh' },
          { code: 'BENEFICIARY_MATCH', section: 'bank', label: 'Tài khoản ngân hàng' },
          { code: 'TAX_ID', section: 'identity', label: 'Mã số thuế' },
        ].filter(item => searchParams.get('required')?.split(',').includes(item.code)).map(item => <button type="button" key={item.code} onClick={() => revealSection(item.section)} className="rounded-lg border border-[#EEDFC6] bg-white px-3 py-2">{item.label} ↗</button>)}</div>
      </div>}
      {loading && (
        <section className="flex items-center gap-2 p-3 sm:px-3.5 border border-[#EAE4D7] rounded-xl bg-white text-[#7D715E] text-xs" role="status">
          <Loader2 size={16} className="animate-spin text-[#B88E4F] shrink-0" aria-hidden="true" />
          <span>Đang tải dữ liệu hồ sơ KYC…</span>
        </section>
      )}
      <div className="kyc-step-header rounded-2xl border border-[#EAE4D7] bg-white p-3">
        {(isRejected || isNeedsInfo) && requestedItems.length > 0 && (
          <section className="mb-3 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs">
            <h2 className="mb-2 font-semibold text-[#655A49]">Mục cần chỉnh sửa</h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {requestedItems.filter((label): label is string => typeof label === 'string').map(label => {
                const item = kycReviewItems.find(option => option.label === label);
                return (
                  <li key={label}>
                    {item
                      ? <button type="button" onClick={() => showReviewField(item)} className="cursor-pointer text-left font-medium text-[#795A2D] underline underline-offset-2">{label}</button>
                      : label}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {activeSection !== 'channel' && reviewNote && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[#7D715E]" role="status">
            {reviewBadge}<span className="wrap-anywhere">{reviewNote}</span>
          </div>
        )}
        <div className="kyc-step-tabs grid grid-cols-3 gap-2 [&>button]:flex [&>button]:min-h-12 [&>button]:items-center [&>button]:justify-center [&>button]:gap-2 [&>button]:rounded-xl [&>button]:border [&>button]:border-[#EAE4D7] [&>button]:bg-white [&>button]:px-2 [&>button]:py-2 [&>button]:text-xs [&>button]:font-semibold [&>button]:text-[#7D715E] [&>button]:cursor-pointer [&>button[aria-pressed=true]]:bg-[#FBF5EB] [&>button[aria-pressed=true]]:border-[#C59B58] [&>button[aria-pressed=true]]:text-[#1A1612] [&>button>span]:grid [&>button>span]:size-6 [&>button>span]:place-items-center [&>button>span]:rounded-full [&>button>span]:border [&>button>span]:border-[#EEDFC6] max-sm:[&>button]:flex-col" role="group" aria-label="Các phần hồ sơ KYC">
          {([
            { id: 'channel', label: 'Kênh truyền thông' },
            { id: 'identity', label: 'Định danh CCCD' },
            { id: 'bank', label: 'Ngân hàng' },
          ] as const).map((step, index) => (
            <button type="button" key={step.id} aria-pressed={activeSection === step.id} onClick={() => setActiveSection(step.id)}>
              <span aria-hidden="true">{index + 1}</span>{step.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. FORM ĐỊNH DANH */}
      <form
        ref={formRef}
        inert={loading || isRefreshing}
        onSubmit={handleSubmit}
        onInvalidCapture={event => {
          const field = event.target as HTMLInputElement;
          const section = field.closest<HTMLElement>('[data-profile-section]')?.dataset.profileSection;
          if (section) {
            revealSection(section);
            requestAnimationFrame(() => field.focus());
          }
        }}
        className="kyc-profile-form min-w-0"
      >
        <div className="kyc-content-card rounded-2xl border border-[#EAE4D7] bg-white overflow-hidden">
        {/* 1. BẰNG CHỨNG SỞ HỮU KÊNH TRUYỀN THÔNG (CHUẨN IMAGE 2) */}
        <section className="kyc-fixed-section [&[hidden]]:hidden" data-profile-section="channel" hidden={activeSection !== 'channel'}>
          <header className={sectionHeadingClass}>
            <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5">
              <div className="flex min-w-0 flex-[1_1_9rem] items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] text-[#B88E4F]"><LinkIcon size={15} aria-hidden="true" /></span>
                <div className="kyc-section-copy min-w-0">
                  <h2 className="text-sm font-semibold text-[#1A1612]">Kênh sáng tạo</h2>
                  {channelName && <p title={channelName} className="truncate text-xs text-[#7D715E]">{channelName}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5" role="status">
                {!channelComplete && <span className="rounded-md border border-[#EAE4D7] px-2 py-1 text-[11px] text-[#7D715E]">Kênh cần bổ sung</span>}
                {reviewBadge}
              </div>
            </div>
            {reviewNote && <p className="w-full wrap-anywhere text-xs text-[#7D715E] sm:pl-10">{reviewNote}</p>}
          </header>
          <div className={sectionColumnsClass}>
          <div className={sectionColumnClass}>
          <h3 className="text-xs font-semibold text-[#655A49]">Thông tin kênh chính</h3>
          <div className="kyc-channel-fields grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="kyc-platform" className="text-xs font-bold text-[#1A1612] block mb-1.5">Nền tảng của kênh chính *</label>
              <Select
                portal
                id="kyc-platform"
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
                options={channelPlatformOptions}
                selectedLabel={channelPlatforms.some(option => option.value === platform) ? undefined : 'Nền tảng khác'}
                menuClassName={channelPlatformMenuClass}
                className="h-11 w-full rounded-lg px-3 py-1.5 text-sm"
                placeholder="Chọn nền tảng"
                required
              />
            </div>

            <div>
              <label htmlFor="kyc-channel-name" className="text-xs font-bold text-[#1A1612] block mb-1.5">Tên kênh hiển thị *</label>
              <input
                id="kyc-channel-name"
                type="text"
                placeholder="VD: Thành Thắng Reviews"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                required
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="kyc-followers" className="text-xs font-bold text-[#1A1612] block mb-1.5">{channelFields.audienceLabel} *</label>
              <input
                id="kyc-followers"
                type="number"
                min="0"
                placeholder="VD: 15000"
                value={followerCount}
                onChange={(e) => setFollowerCount(e.target.value === '' ? '' : Number(e.target.value))}
                required
                className={`${fieldClass} tabular-nums`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="kyc-channel-url" className="text-xs font-bold text-[#1A1612] block mb-1.5">
              Liên kết kênh *
            </label>
            <input
              id="kyc-channel-url"
              type="url"
              placeholder={channelFields.urlPlaceholder}
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              required
              aria-invalid={Boolean(channelLinkError)}
              aria-describedby={channelLinkError ? 'kyc-channel-url-error' : undefined}
              className={`${fieldClass} aria-invalid:border-[#DC2626]`}
            />
            {channelLinkError && <p id="kyc-channel-url-error" className="mt-1.5 text-xs text-[#DC2626]">{channelLinkError}</p>}
          </div>
          </div>

          <div className={sectionColumnClass}>
          <div id="kyc-channel-proof" tabIndex={-1}>
          <ImageUploadDropzone
            className="kyc-channel-proof"
            variant="document"
            conciseDocument
            label="Ảnh quản trị kênh"
            value={channelProofUrl}
            onChange={(url) => setChannelProofUrl(url)}
            iconType="camera"
            folder="scanms/kyc/proofs"
          />
          </div>

            <section className="kyc-channel-panel min-w-0 border-t border-[#EAE4D7] pt-3" aria-labelledby="kyc-connected-heading">
              <div className="kyc-channel-panel-heading flex flex-wrap items-center justify-between gap-2">
                <h3 id="kyc-connected-heading" className="flex items-center gap-1.5 text-xs font-semibold text-[#1A1612]"><LinkIcon size={14} className="text-[#B88E4F]" aria-hidden="true" />Kênh đã lưu <span className="font-normal tabular-nums text-[#7D715E]">{socialChannels.length}</span></h3>
                <button
                  type="button"
                  onClick={() => setShowAddOtherChannel(!showAddOtherChannel)}
                  aria-expanded={showAddOtherChannel}
                  className="text-[11px] text-[#B88E4F] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  {showAddOtherChannel ? 'Đóng' : 'Thêm kênh'}
                </button>
              </div>
            <div className="kyc-channel-panel-body mt-2.5">

              {/* Form thêm kênh phụ nhanh */}
              {showAddOtherChannel && (
                <div className="kyc-add-channel mb-3 p-3 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Select
                      portal
                      value={otherPlatform}
                      onChange={(e) => setOtherPlatform(e.target.value)}
                      aria-label="Nền tảng của kênh phụ"
                      options={channelPlatformOptions}
                      menuClassName={channelPlatformMenuClass}
                      className="w-full min-h-10 rounded-lg px-3 py-1.5 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Tên kênh"
                      aria-label="Tên kênh phụ"
                      value={otherChannelName}
                      onChange={(e) => setOtherChannelName(e.target.value)}
                      className="bg-white border border-[#EAE4D7] rounded-lg px-2.5 py-1.5 text-xs text-[#1A1612] outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Số người theo dõi"
                      aria-label="Số người theo dõi kênh phụ"
                      value={otherFollowers}
                      onChange={(e) => setOtherFollowers(e.target.value === '' ? '' : Number(e.target.value))}
                      className="bg-white border border-[#EAE4D7] rounded-lg px-2.5 py-1.5 text-xs text-[#1A1612] outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Liên kết kênh"
                      aria-label="Liên kết kênh phụ"
                      value={otherChannelUrl}
                      onChange={(e) => setOtherChannelUrl(e.target.value)}
                      className="flex-1 bg-white border border-[#EAE4D7] rounded-lg px-2.5 py-1.5 text-xs text-[#1A1612] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddOtherChannel}
                      disabled={addingOtherChannel}
                      className="px-3 py-1.5 bg-[#C59B58] text-white rounded-lg text-xs font-bold hover:bg-[#B88E4F] transition shrink-0 cursor-pointer"
                    >
                      {addingOtherChannel ? 'Lưu...' : 'Lưu kênh'}
                    </button>
                  </div>
                </div>
              )}

              <div className="kyc-connected-list space-y-2">
                {socialChannels.length === 0 && <p className="text-xs text-[#7D715E]">Chưa có kênh đã lưu.</p>}
                {socialChannels.map((c) => (
                  <div
                    key={c.id}
                    className="kyc-connected-channel flex items-center justify-between gap-2 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="kyc-channel-platform-icon grid size-8 shrink-0 place-items-center rounded-lg bg-white text-[#B88E4F]"><LinkIcon size={16} /></span>
                      <div className="min-w-0">
                        <div className="kyc-connected-name flex flex-wrap items-center gap-2">
                      <strong className="text-xs text-[#1A1612]">{c.channelName}</strong>
                          {c.isPrimary && (
                            <span className="text-[9px] font-bold bg-[#EBD08C] text-[#231D15] px-1 py-0.2 rounded shrink-0">
                              Chính
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#7D715E] block truncate">
                          {channelPlatforms.find(option => option.value === c.platformName)?.label ?? c.platformName} · {Number(c.followerCount).toLocaleString('vi-VN')} {socialChannelFields(c.platformName).audienceLabel.toLowerCase().replace(/^số /, '')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={c.channelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-[#B88E4F] hover:bg-white rounded"
                        title="Mở link"
                        aria-label={`Mở kênh ${c.channelName || c.platformName}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <details className="relative">
                        <summary aria-label={`Thao tác với kênh ${c.channelName || c.platformName}`} className="grid size-8 cursor-pointer list-none place-items-center rounded-lg text-[#7D715E] hover:bg-[#FBF5EB] [&::-webkit-details-marker]:hidden"><MoreHorizontal size={16} /></summary>
                        <div className="absolute right-0 z-20 mt-1 grid min-w-44 gap-1 rounded-lg border border-[#EAE4D7] bg-white p-1.5 shadow-lg [&>button]:flex [&>button]:min-h-9 [&>button]:items-center [&>button]:gap-2 [&>button]:px-2 [&>button]:text-left [&>button]:text-xs" onClick={event => {
                          if ((event.target as HTMLElement).closest('button')) event.currentTarget.closest('details')?.removeAttribute('open');
                        }}>
                      {!c.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(c.id)}
                          className="p-1 text-stone-400 hover:text-[#B88E4F] hover:bg-white rounded cursor-pointer"
                          title="Đặt làm kênh chính"
                          aria-label={`Đặt ${c.channelName || c.platformName} làm kênh chính`}
                        >
                          <Star className="w-3 h-3" />
                          Đặt làm kênh chính
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setChannelToDelete(c)}
                        className="p-1 text-stone-400 hover:text-rose-600 hover:bg-white rounded cursor-pointer"
                        title="Xóa kênh"
                        aria-label={`Xóa kênh ${c.channelName || c.platformName}`}
                      >
                        <Trash2 className="w-3 h-3" />
                        Xóa kênh
                      </button>
                        </div>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </section>
          </div>
          </div>
        </section>

        <section className="kyc-fixed-section [&[hidden]]:hidden" data-profile-section="identity" hidden={activeSection !== 'identity'}>
          <header className={sectionHeadingClass}>
            <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] text-[#B88E4F]"><UserCheck size={15} aria-hidden="true" /></span>
            <h2 className="flex-1 text-sm font-semibold text-[#1A1612]">Định danh & mã số thuế</h2>
            <span className="rounded-md border border-[#EAE4D7] px-2 py-1 text-[11px] text-[#7D715E]">{identityComplete ? 'Đã điền' : 'Cần bổ sung'}</span>
          </header>
          <div className="kyc-section-body min-w-0">
            <div className="grid grid-cols-1 divide-y divide-[#EAE4D7] border-b border-[#EAE4D7] md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className={sectionColumnClass}>
              <div>
                <label htmlFor="kyc-id-number" className="mb-1.5 block text-xs font-semibold">Số CCCD / CMND *</label>
                <input
                  id="kyc-id-number"
                  type="text"
                  inputMode="numeric"
                  placeholder="Nhập số giấy tờ"
                  title="Nhập từ 9 đến 12 chữ số theo giấy tờ"
                  aria-describedby="kyc-id-number-hint"
                  value={idCardNumber}
                  onChange={event => setIdCardNumber(event.target.value.replace(/\D/g, '').slice(0, 12))}
                  required
                  className={`${fieldClass} tabular-nums`}
                />
                <span id="kyc-id-number-hint" className="sr-only">Nhập từ 9 đến 12 chữ số theo giấy tờ.</span>
              </div>
              </div>
              <div className={sectionColumnClass}>
              <div>
                <label htmlFor="kyc-tax-code" className="mb-1.5 block text-xs font-semibold">Mã số thuế cá nhân *</label>
                <input
                  id="kyc-tax-code"
                  type="text"
                  inputMode="numeric"
                  placeholder="Nhập mã số thuế"
                  value={taxCode}
                  onChange={event => setTaxCode(event.target.value.replace(/\D/g, '').slice(0, 14))}
                  className={`${fieldClass} tabular-nums`}
                />
              </div>
              </div>
            </div>
            <div className="grid grid-cols-1 divide-y divide-[#EAE4D7] md:grid-cols-2 md:divide-x md:divide-y-0">
              <div id="kyc-front-card" tabIndex={-1} className={sectionColumnClass}>
              <ImageUploadDropzone
                className="kyc-identity-upload"
                variant="document"
                conciseDocument
                label="Ảnh mặt trước"
                value={frontCardUrl}
                onChange={setFrontCardUrl}
                iconType="idcard"
                folder="scanms/kyc/idcards"
                required
              />
              </div>
              <div id="kyc-back-card" tabIndex={-1} className={sectionColumnClass}>
              <ImageUploadDropzone
                className="kyc-identity-upload"
                variant="document"
                conciseDocument
                label="Ảnh mặt sau"
                value={backCardUrl}
                onChange={setBackCardUrl}
                iconType="idcard"
                folder="scanms/kyc/idcards"
                required
              />
              </div>
            </div>
          </div>
        </section>

        <section className="kyc-fixed-section [&[hidden]]:hidden" data-profile-section="bank" hidden={activeSection !== 'bank'}>
          <header className={sectionHeadingClass}>
            <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] text-[#B88E4F]"><Building size={15} aria-hidden="true" /></span>
            <h2 className="flex-1 text-sm font-semibold text-[#1A1612]">Ngân hàng & giới thiệu</h2>
            <span className="rounded-md border border-[#EAE4D7] px-2 py-1 text-[11px] text-[#7D715E]">{bankComplete ? 'Đã điền' : 'Cần bổ sung'}</span>
          </header>
          <div className={`${sectionColumnsClass.replace('md:grid-cols-2', 'md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]')} md:grid-rows-[auto_auto_auto] md:gap-y-4`}>
            <div className={`kyc-bank-fields ${sectionColumnClass} md:col-start-1 md:row-span-3 md:row-start-1 md:grid md:grid-rows-subgrid md:space-y-0 [&_input:not(.sr-only)]:h-11! [&_input:not(.sr-only)]:min-h-11! [&_input:not(.sr-only)]:rounded-lg! [&_input:not(.sr-only)]:text-sm`}>
              <h3 className="text-xs font-semibold text-[#655A49]">Tài khoản nhận thù lao</h3>
              <div id="kyc-bank-name" tabIndex={-1}>
              <BankSelectTrigger
                className="w-full max-w-[520px] [&>button]:h-12! [&>button]:min-h-12! [&>button]:rounded-lg! [&>button]:shadow-none"
                compact
                label="Ngân hàng"
                value={bankName}
                onChange={setBankName}
                placeholder="Chọn ngân hàng"
                required
              />
              </div>
              <div className="grid w-full max-w-[520px] grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div>
                <label htmlFor="kyc-bank-number" className="mb-1.5 block text-xs font-semibold">Số tài khoản *</label>
                <input
                  id="kyc-bank-number"
                  type="text"
                  inputMode="numeric"
                  placeholder="Nhập số tài khoản"
                  value={bankAccountNumber}
                  onChange={event => setBankAccountNumber(event.target.value.trim())}
                  required
                  className={`${fieldClass} tabular-nums`}
                />
              </div>
              <div>
                <label htmlFor="kyc-bank-owner" className="mb-1.5 block text-xs font-semibold">Tên chủ tài khoản *</label>
                <input
                  id="kyc-bank-owner"
                  type="text"
                  placeholder="Nhập tên chủ tài khoản"
                  value={bankAccountName}
                  onChange={event => setBankAccountName(event.target.value.toUpperCase())}
                  required
                  className={fieldClass}
                />
              </div>
              </div>
            </div>
            <div className={`${sectionColumnClass} md:col-start-2 md:row-span-3 md:row-start-1 md:grid md:grid-rows-subgrid`}>
              <div className="flex min-w-0 flex-col md:row-span-2 md:row-start-2">
              <label htmlFor="kyc-bio" className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">Giới thiệu nội dung <span className="font-normal text-[#7D715E]">Không bắt buộc</span></label>
              <textarea
                id="kyc-bio"
                rows={4}
                placeholder="Phong cách nội dung, ngành hàng thế mạnh…"
                value={bio}
                onChange={event => setBio(event.target.value)}
                className="min-h-[104px] w-full min-w-0 resize-y rounded-lg border border-[#EAE4D7] bg-white px-3 py-2.5 text-sm leading-5 text-[#1A1612] outline-none focus:border-[#C59B58] md:min-h-0 md:flex-1"
              />
              </div>
            </div>
          </div>
        </section>

        {/* NÚT LƯU & CẬP NHẬT HỒ SƠ KYC */}
        <div className="kyc-profile-actions flex justify-end gap-2 border-t border-[#EAE4D7] px-4 py-3 sm:px-5 [&>button]:min-h-11 [&>button]:rounded-lg [&>button]:border [&>button]:border-[#EEDFC6] [&>button]:bg-[#FBF5EB] [&>button]:px-5 [&>button]:text-sm [&>button]:font-semibold [&>button]:cursor-pointer [&>button:disabled]:opacity-50 [&>button[hidden]]:hidden">
          {activeSection !== 'bank' && <button type="button" disabled={saving || loading || isRefreshing} onClick={() => {
            if (activeSection === 'channel' && channelLinkError) {
              focusChannelUrl();
              return;
            }
            setActiveSection(activeSection === 'channel' ? 'identity' : 'bank');
          }}>Tiếp tục</button>}
          <button
            type="submit"
            hidden={activeSection !== 'bank'}
            disabled={saving || loading || isRefreshing}
            className="inline-flex items-center justify-center gap-2 min-h-[36px] px-4 border border-[#EEDFC6] rounded-lg bg-[#FBF5EB] text-[#1A1612] text-xs font-semibold hover:bg-[#F3EFE6] hover:border-[#C59B58] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#1A1612]" />
            ) : (
              <Send className="w-4 h-4 text-[#B88E4F]" />
            )}
            <span>
              {saving
                ? 'Đang lưu hồ sơ...'
                : isVerified
                ? 'Lưu hồ sơ'
                : 'Gửi hồ sơ KYC'}
            </span>
          </button>
        </div>
        </div>
      </form>

      {/* Modal Xác nhận Xóa kênh mạng xã hội chuẩn SCANMS */}
      <ConfirmModal
        isOpen={Boolean(channelToDelete)}
        onClose={() => !isDeletingChannel && setChannelToDelete(null)}
        onConfirm={handleConfirmDeleteChannel}
        isLoading={isDeletingChannel}
        title="Xóa kênh khỏi hồ sơ KYC"
        message={`Bạn có chắc chắn muốn xóa kênh "${channelToDelete?.channelName || 'này'}" khỏi hồ sơ định danh KYC?`}
        confirmText="Xác nhận xóa"
        variant="danger"
      />
    </div>
  );
});

export default KycSubmissionPage;
