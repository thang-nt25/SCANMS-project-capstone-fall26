import { SponsoredPlacementsPanel } from '../../components/stores/SponsoredPlacementsPanel';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, FileText, Loader2, MapPin, Pencil, Percent, Save, ShieldAlert, Store, Upload } from 'lucide-react';
import { publicWebsiteUrl } from '@/utils/public-url';
import { storeService, type StoreSettings } from '../../services/store.service';
import { authService } from '../../services/auth.service';
import { uploadService } from '../../services/upload.service';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { StorefrontSettingsSection } from '../../components/stores/StorefrontSettingsSection';

const tabs = [
  { id: 'profile', label: 'Hồ sơ gian hàng', icon: Store },
  { id: 'affiliate', label: 'Tiếp thị liên kết', icon: Percent },
  { id: 'owner', label: 'Thông tin chủ Shop', icon: Building2 },
] as const;
type SettingsTab = typeof tabs[number]['id'];

const emptyProfile = { name: '', description: '', logoUrl: '', policyReturn: '', policyWarranty: '', policyShipping: '' };
const policies = [
  { key: 'policyReturn', label: 'Đổi trả & hoàn tiền' },
  { key: 'policyWarranty', label: 'Bảo hành & chất lượng' },
  { key: 'policyShipping', label: 'Giao nhận & đồng kiểm' },
] as const;

const businessTypes = [
  { value: 'INDIVIDUAL', label: 'Cá nhân' },
  { value: 'HOUSEHOLD', label: 'Hộ kinh doanh' },
  { value: 'ENTERPRISE', label: 'Doanh nghiệp' },
];
const contactFields = [
  { key: 'representativeName', label: 'Người đại diện', maxLength: 150, required: true },
  { key: 'contactPhone', label: 'Điện thoại liên hệ', maxLength: 21, type: 'tel', required: true },
  { key: 'contactEmail', label: 'Email nhận đối soát', maxLength: 255, type: 'email', required: true },
] as const;
const legalFields = [
  { key: 'companyName', label: 'Tên doanh nghiệp / hộ kinh doanh', maxLength: 200 },
  { key: 'businessType', label: 'Loại hình kinh doanh', required: true },
  { key: 'taxCode', label: 'Mã số thuế', maxLength: 30, required: true },
  { key: 'businessAddress', label: 'Địa chỉ trụ sở chính', maxLength: 500 },
] as const;

function getOwnerDetails(store: StoreSettings, currentName: string) {
  const data = store.onboardingData ?? {};
  const pickup = data.warehouseAddress || store.warehouseAddress || store.returnWarehouse?.address || '';
  return {
    companyName: data.companyName === undefined ? store.companyName || data.businessName || data.registeredBusinessName || '' : data.companyName || '',
    representativeName: data.representativeName || store.representativeName || store.owner?.fullName || currentName,
    contactPhone: data.contactPhone || store.contactPhone || store.owner?.phoneNumber || '',
    contactEmail: data.contactEmail || store.contactEmail || store.owner?.email || '',
    businessType: data.businessType || store.businessType || '',
    taxCode: data.taxCode || store.taxCode || '',
    businessAddress: data.businessAddress ?? store.businessAddress ?? '',
    warehouseAddress: pickup,
    returnWarehouseAddress: data.returnWarehouseAddress || store.returnWarehouseAddress || store.returnWarehouse?.address || pickup,
  };
}

type OwnerDetails = ReturnType<typeof getOwnerDetails>;

const inputClass = 'h-[42px] w-full min-w-0 rounded-lg border border-[#EAE4D7] bg-white px-3 text-sm text-[#1A1612] outline-none focus:border-[#B88E4F] focus:ring-2 focus:ring-[#C59B58]/15';
const textareaClass = 'min-h-20 w-full resize-y rounded-lg border border-[#EAE4D7] bg-white px-3 py-2 text-sm text-[#1A1612] outline-none focus:border-[#B88E4F] focus:ring-2 focus:ring-[#C59B58]/15';
const labelClass = 'grid min-w-0 gap-1.5 text-xs font-semibold text-[#665948]';
const rowClass = 'grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-start gap-2 border-b border-[#EAE4D7]/70 py-2 text-sm last:border-0';
const sectionHeading = 'flex items-center gap-2 text-sm font-semibold text-[#1A1612]';
const policyTextArea = 'min-h-[96px] w-full min-w-0 rounded-lg border px-3.5 py-3 text-sm font-normal leading-relaxed';

function OwnerValue({ label, value }: { label: string; value: string }) {
  return (
    <div className={rowClass}>
      <dt className="text-xs leading-5 text-[#7D715E]">{label}</dt>
      <dd className={`break-words ${value ? 'font-medium text-[#1A1612]' : 'text-xs leading-5 text-[#7D715E]'}`}>{value || 'Chưa cập nhật'}</dd>
    </div>
  );
}

function SaveBar({ saving, disabled, onCancel, label = 'Lưu thay đổi' }: {
  saving: boolean;
  disabled?: boolean;
  onCancel: () => void;
  label?: string;
}) {
  return (
    <footer className="sticky bottom-0 z-10 flex justify-end gap-2 border-t border-[#EAE4D7] bg-white px-4 py-2.5 sm:px-6">
      <Button type="button" variant="outline" className="h-[42px] rounded-lg shadow-none" disabled={saving || disabled} onClick={onCancel}>Hủy</Button>
      <Button type="submit" variant="gold" className="h-[42px] rounded-lg" loading={saving} disabled={disabled} icon={<Save size={15} aria-hidden="true" />}>{saving ? 'Đang lưu…' : label}</Button>
    </footer>
  );
}

export default function ShopSettingsPage() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const currentName = currentUser?.fullName || '';
  const isShopManager = currentUser?.role === 'SHOP_MANAGER';
  const isPlatformAdmin = currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'SYSTEM_MANAGER';

  const [searchParams] = useSearchParams();
  const sponsorshipId = searchParams.get('sponsorship');
  const [tab, setTab] = useState<SettingsTab>(sponsorshipId ? 'affiliate' : 'profile');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [saving, setSaving] = useState<SettingsTab | null>(null);
  const saveInProgress = useRef(false);
  const [slug, setSlug] = useState('');
  const [profile, setProfile] = useState(emptyProfile);
  const [savedProfile, setSavedProfile] = useState(emptyProfile);
  const [storeId, setStoreId] = useState('');
  const [attributionDays, setAttributionDays] = useState(30);
  const [savedAttributionDays, setSavedAttributionDays] = useState(30);
  const [owner, setOwner] = useState<OwnerDetails | null>(null);
  const [ownerDraft, setOwnerDraft] = useState<OwnerDetails | null>(null);
  const [sameReturnAddress, setSameReturnAddress] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [hasVisitedAffiliate, setHasVisitedAffiliate] = useState(Boolean(sponsorshipId));

  useEffect(() => {
    if (!sponsorshipId) return;
    setTab('affiliate');
    setHasVisitedAffiliate(true);
  }, [sponsorshipId]);

  const openTab = (next: SettingsTab) => {
    if (next === 'affiliate') setHasVisitedAffiliate(true);
    setTab(next);
  };

  useEffect(() => {
    if (!isShopManager) return;
    let active = true;
    setLoading(true);
    setLoadError(false);
    storeService.getMyStore(Boolean(loadAttempt)).then(store => {
      if (!active) return;
      setStoreId(store.id);
      const storedProfile = {
        name: store.name || '',
        description: store.description || '',
        logoUrl: store.logoUrl || '',
        policyReturn: store.policyReturn || '',
        policyWarranty: store.policyWarranty || '',
        policyShipping: store.policyShipping || '',
      };
      setProfile(storedProfile);
      setSavedProfile(storedProfile);
      setSlug(store.slug || '');
      const days = store.attributionWindowDays || 30;
      setAttributionDays(days);
      setSavedAttributionDays(days);
      setOwner(getOwnerDetails(store, currentName));
    }).catch(() => {
      if (active) setLoadError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [currentName, isShopManager, loadAttempt]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), message.error ? 7500 : 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const profileChanged = (Object.keys(savedProfile) as Array<keyof typeof savedProfile>).some(key => profile[key] !== savedProfile[key]);
  const affiliateChanged = attributionDays !== savedAttributionDays;
  const ownerChanged = owner && ownerDraft && (
    (Object.keys(owner) as Array<keyof OwnerDetails>).some(key => ownerDraft[key] !== owner[key]) ||
    sameReturnAddress !== (owner.warehouseAddress === owner.returnWarehouseAddress)
  );
  const storefrontPath = slug ? `/shop/${encodeURIComponent(slug)}` : '';
  const storefrontUrl = storefrontPath ? publicWebsiteUrl(storefrontPath) : '';

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      setMessage({ text: 'Đã sao chép liên kết gian hàng.' });
    } catch {
      setMessage({ text: 'Chưa sao chép được. Bạn có thể chọn và sao chép đường dẫn.', error: true });
    }
  };

  const uploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const logoUrl = await uploadService.uploadImage(file, 'scanms/logos');
      setProfile(values => ({ ...values, logoUrl }));
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Không tải được logo.', error: true });
    } finally {
      input.value = '';
      setUploading(false);
    }
  };

  const save = async (activeTab: SettingsTab, data: Partial<StoreSettings>, onSaved: () => void) => {
    if (saveInProgress.current) return;
    saveInProgress.current = true;
    setSaving(activeTab);
    setMessage(null);
    try {
      await storeService.updateMyStore(data);
      onSaved();
      setMessage({ text: 'Đã lưu thay đổi.' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Không lưu được thay đổi.', error: true });
    } finally {
      saveInProgress.current = false;
      setSaving(null);
    }
  };

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    if (!profileChanged || uploading) return;
    const next = { ...profile, name: profile.name.trim(), description: profile.description.trim(), logoUrl: profile.logoUrl.trim(), policyReturn: profile.policyReturn.trim(), policyWarranty: profile.policyWarranty.trim(), policyShipping: profile.policyShipping.trim() };
    if (!next.name || !next.logoUrl) {
      setMessage({ text: 'Vui lòng nhập tên gian hàng và tải logo.', error: true });
      return;
    }
    void save('profile', next, () => { setProfile(next); setSavedProfile(next); });
  };

  const saveAffiliate = (event: FormEvent) => {
    event.preventDefault();
    if (!affiliateChanged) return;
    void save('affiliate', { attributionWindowDays: attributionDays }, () => setSavedAttributionDays(attributionDays));
  };

  const saveOwner = (event: FormEvent) => {
    event.preventDefault();
    if (!ownerDraft || !ownerChanged) return;
    const warehouseAddress = ownerDraft.warehouseAddress.trim();
    const details = {
      companyName: ownerDraft.companyName.trim(),
      representativeName: ownerDraft.representativeName.trim(),
      businessType: ownerDraft.businessType,
      taxCode: ownerDraft.taxCode.trim(),
      contactPhone: ownerDraft.contactPhone.trim(),
      contactEmail: ownerDraft.contactEmail.trim(),
      businessAddress: ownerDraft.businessAddress.trim(),
      warehouseAddress,
      returnWarehouseAddress: sameReturnAddress ? warehouseAddress : ownerDraft.returnWarehouseAddress.trim(),
    };
    if (!details.representativeName || !details.businessType || !details.taxCode || !details.contactPhone || !details.contactEmail || !details.warehouseAddress || !details.returnWarehouseAddress) {
      setMessage({ text: 'Vui lòng điền các trường bắt buộc.', error: true });
      return;
    }
    if (!/^\+?[0-9().\-\s]{8,20}$/.test(details.contactPhone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.contactEmail)) {
      setMessage({ text: 'Kiểm tra định dạng điện thoại và email liên hệ.', error: true });
      return;
    }
    if (warehouseAddress.split(',').filter(part => part.trim()).length < 4) {
      setMessage({ text: 'Địa chỉ kho lấy hàng cần đủ số nhà/đường, phường/xã, quận/huyện và tỉnh/thành, cách nhau bằng dấu phẩy.', error: true });
      return;
    }
    void save('owner', details, () => { setOwner(details); setOwnerDraft(null); });
  };

  if (!isShopManager) {
    return (
      <div className="mx-auto my-12 max-w-lg text-center">
        <Card className="flex flex-col items-center gap-4 border border-[#EAE4D7] bg-white p-8">
          <span className="grid size-12 place-items-center rounded-xl bg-[#FBF5EB] text-[#B88E4F]"><ShieldAlert size={24} /></span>
          <h2 className="text-lg font-semibold text-[#1A1612]">Chỉ dành cho Chủ gian hàng</h2>
          <Button variant="gold" onClick={() => navigate(isPlatformAdmin ? '/admin/analytics' : '/collaborator/dashboard')}>
            {isPlatformAdmin ? 'Về trang quản trị sàn' : 'Về trang Tổng quan KOL'}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="merchant-settings-page w-full min-w-0 pb-[calc(80px+env(safe-area-inset-bottom,0px))] text-left lg:pb-8">
      {message && (
        <div role={message.error ? 'alert' : 'status'} className={`fixed top-5 right-4 z-50 max-w-[min(24rem,calc(100vw-32px))] rounded-xl border bg-white px-4 py-3 text-sm shadow-lg ${message.error ? 'border-[#DC2626]/30 text-[#DC2626]' : 'border-[#EEDFC6] text-[#1A1612]'}`}>
          {message.text}
        </div>
      )}
      <div className="rounded-xl border border-[#EAE4D7] bg-white">
        <StorefrontSettingsSection name={savedProfile.name} logoUrl={tab === 'profile' ? profile.logoUrl : savedProfile.logoUrl} url={storefrontUrl} path={storefrontPath} onCopy={() => void copyUrl()} />
        <nav aria-label="Cài đặt gian hàng" role="tablist" className="grid grid-cols-3 gap-1 border-b border-[#EAE4D7] p-1.5 sm:gap-2 sm:p-2">
          {tabs.map(({ id, label, icon: Icon }, index) => (
            <button
              key={id}
              id={`store-settings-tab-${id}`}
              role="tab"
              type="button"
              aria-selected={tab === id}
              aria-controls={`store-settings-panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => openTab(id)}
              onKeyDown={event => {
                const nextIndex = event.key === 'ArrowRight' ? (index + 1) % tabs.length
                  : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
                  : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
                if (nextIndex === null) return;
                event.preventDefault();
                const next = tabs[nextIndex].id;
                openTab(next);
                document.getElementById(`store-settings-tab-${next}`)?.focus();
              }}
              className="relative flex min-h-[42px] min-w-0 items-center justify-center gap-1.5 rounded-lg border border-transparent px-1.5 text-center text-[11px] font-semibold leading-tight text-[#665948] after:pointer-events-none after:absolute after:-right-[3px] after:top-1/2 after:h-5 after:w-px after:-translate-y-1/2 after:bg-[#EAE4D7] last:after:hidden hover:bg-[#FAF8F5] focus-visible:outline-2 focus-visible:outline-[#C59B58] aria-selected:border-[#EEDFC6] aria-selected:bg-[#FBF5EB] aria-selected:text-[#231D15] sm:px-3 sm:text-sm sm:after:-right-[5px]"
            >
              <Icon size={16} aria-hidden="true" className="hidden shrink-0 text-[#B88E4F] sm:block" />
              {label}
            </button>
          ))}
        </nav>
        {loading ? (
          <p role="status" className="flex items-center gap-2 p-5 text-sm text-[#7D715E]"><Loader2 size={16} className="animate-spin" /> Đang tải cài đặt…</p>
        ) : loadError ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 p-5 text-sm text-[#DC2626]">
            Chưa tải được cài đặt. <Button type="button" variant="outline" size="sm" onClick={() => setLoadAttempt(value => value + 1)}>Thử lại</Button>
          </div>
        ) : (
          <>
            <section id="store-settings-panel-profile" role="tabpanel" aria-labelledby="store-settings-tab-profile" hidden={tab !== 'profile'}>
              <form onSubmit={saveProfile}>
                <fieldset disabled={saving !== null} className="min-w-0 space-y-5 px-4 py-5 sm:px-6 sm:py-6">
                  <div className="grid min-w-0 grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <div className="min-w-0 space-y-3.5 pb-4 md:pr-6 md:pb-0">
                      <label className={`${labelClass} gap-2`}><span>Tên gian hàng <span className="text-[#DC2626]" aria-hidden="true">*</span></span>
                        <input value={profile.name} required onChange={event => setProfile(values => ({ ...values, name: event.target.value }))} className={inputClass} />
                      </label>
                      <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#EAE4D7] px-2.5 text-xs font-semibold text-[#765629] hover:bg-[#FBF5EB] focus-within:ring-2 focus-within:ring-[#C59B58]/30">
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} aria-hidden="true" />}
                        {uploading ? 'Đang tải…' : profile.logoUrl ? 'Đổi logo' : 'Tải logo'}
                        {!profile.logoUrl && <span className="text-[#DC2626]" aria-hidden="true">*</span>}
                        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={event => void uploadLogo(event)} className="sr-only" />
                      </label>
                    </div>
                    <label className={`${labelClass} gap-2 border-t border-[#EAE4D7] pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6`}>
                      <span className="flex items-center justify-between gap-2">
                        Giới thiệu gian hàng <span className="shrink-0 font-normal tabular-nums text-[#7D715E]">{profile.description.length.toLocaleString('vi-VN')} ký tự</span>
                      </span>
                      <textarea value={profile.description} rows={3} onChange={event => setProfile(values => ({ ...values, description: event.target.value }))} className={`${textareaClass} px-3.5 py-3 font-normal leading-relaxed`} />
                    </label>
                  </div>
                  <section aria-labelledby="store-public-policies" className="border-t border-[#EAE4D7] pt-4">
                    <h2 id="store-public-policies" className={sectionHeading}><FileText size={16} aria-hidden="true" className="text-[#B88E4F]" /> Chính sách công khai</h2>
                    <div className="mt-4 grid divide-y divide-[#EAE4D7] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
                      {policies.map(({ key, label }) => (
                        <label key={key} className={`${labelClass} grid-rows-[auto_1fr] gap-2 py-4 first:pt-0 last:pb-0 lg:px-5 lg:py-0 lg:first:pl-0 lg:last:pr-0`}>
                          {label}
                          <span className="grid min-w-0">
                            <span aria-hidden="true" className={`${policyTextArea} invisible col-start-1 row-start-1 border-transparent whitespace-pre-wrap [overflow-wrap:anywhere]`}>{profile[key]}&nbsp;</span>
                            <textarea value={profile[key]} maxLength={500} rows={2} onChange={event => setProfile(values => ({ ...values, [key]: event.target.value }))} className={`${policyTextArea} col-start-1 row-start-1 h-full resize-none overflow-hidden border-[#EAE4D7] bg-white text-[#1A1612] outline-none focus:border-[#B88E4F] focus:ring-2 focus:ring-[#C59B58]/15`} />
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                </fieldset>
                {profileChanged && <SaveBar saving={saving === 'profile'} disabled={uploading || (saving !== null && saving !== 'profile')} onCancel={() => setProfile(savedProfile)} />}
              </form>
            </section>

            <section id="store-settings-panel-affiliate" role="tabpanel" aria-labelledby="store-settings-tab-affiliate" hidden={tab !== 'affiliate'}>
              <form onSubmit={saveAffiliate}>
                <fieldset disabled={saving !== null} className="grid min-w-0 divide-y divide-[#EAE4D7] px-4 py-2 sm:px-6 md:grid-cols-2 md:divide-x md:divide-y-0 md:py-4">
                  <div className="flex min-h-[54px] flex-wrap items-center justify-between gap-2 py-2.5 md:py-0 md:pr-5">
                    <span className="text-sm font-medium text-[#1A1612]">Thù lao cơ sở SCANMS</span>
                    <span className="inline-flex items-center gap-2"><strong className="tabular-nums text-[#765629]">10%</strong><span className="rounded-md border border-[#EEDFC6] bg-[#FBF5EB] px-1.5 py-0.5 text-xs text-[#765629]">Cố định</span></span>
                  </div>
                  <div className="flex min-h-[54px] min-w-0 flex-wrap items-center justify-between gap-2 py-2.5 md:py-0 md:pl-5">
                    <label htmlFor="store-attribution-window" className="text-sm font-medium text-[#1A1612]">Thời hạn ghi nhận qua link</label>
                    <div className="w-48 max-w-full">
                      <Select id="store-attribution-window" aria-label="Thời hạn ghi nhận qua link" value={String(attributionDays)} disabled={saving !== null} onChange={event => setAttributionDays(Number(event.target.value))} className={inputClass}>
                        <option value="7">7 ngày</option>
                        <option value="14">14 ngày</option>
                        <option value="30">30 ngày (Tiêu chuẩn)</option>
                        <option value="60">60 ngày</option>
                        {![7, 14, 30, 60].includes(savedAttributionDays) && <option value={savedAttributionDays}>{savedAttributionDays} ngày</option>}
                      </Select>
                    </div>
                  </div>
                </fieldset>
                {affiliateChanged && <SaveBar saving={saving === 'affiliate'} disabled={saving !== null && saving !== 'affiliate'} onCancel={() => setAttributionDays(savedAttributionDays)} />}
              </form>
              <section aria-label="Quảng bá gian hàng" className="border-t border-[#EAE4D7] px-4 py-4 sm:px-6">
                {hasVisitedAffiliate && <SponsoredPlacementsPanel key={sponsorshipId ?? 'bookings'} embedded storefront={savedProfile} storeId={storeId} paymentReturnId={sponsorshipId} />}
              </section>
            </section>

            <section id="store-settings-panel-owner" role="tabpanel" aria-labelledby="store-settings-tab-owner" hidden={tab !== 'owner'}>
              {owner && !ownerDraft && (
                <div className="space-y-3 px-4 py-4 sm:px-6">
                  <header className="flex items-center justify-between gap-2 border-b border-[#EAE4D7] pb-2.5">
                    <h2 className="text-sm font-semibold">Thông tin chủ Shop</h2>
                    <Button type="button" size="sm" variant="outline" className="h-9 rounded-lg shadow-none" icon={<Pencil size={14} aria-hidden="true" />} disabled={saving !== null} onClick={() => {
                      setOwnerDraft(owner);
                      setSameReturnAddress(owner.warehouseAddress === owner.returnWarehouseAddress);
                    }}>Sửa thông tin</Button>
                  </header>
                  <div className="grid gap-3 md:grid-cols-2 md:gap-0 md:divide-x md:divide-[#EAE4D7]">
                    <div className="md:pr-4">
                      <h3 className="text-xs font-semibold text-[#765629]">Liên hệ</h3>
                      <dl>{contactFields.map(({ key, label }) => <OwnerValue key={key} label={label} value={owner[key]} />)}</dl>
                    </div>
                    <div className="border-t border-[#EAE4D7] pt-3 md:border-t-0 md:pt-0 md:pl-4">
                      <h3 className="text-xs font-semibold text-[#765629]">Pháp lý</h3>
                      <dl>{legalFields.map(({ key, label }) => <OwnerValue key={key} label={label} value={key === 'businessType' ? businessTypes.find(item => item.value === owner.businessType)?.label ?? owner.businessType : owner[key]} />)}</dl>
                    </div>
                  </div>
                  <div className="border-t border-[#EAE4D7] pt-3">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold text-[#765629]"><MapPin size={14} aria-hidden="true" /> Kho hàng</h3>
                    <dl>
                      <OwnerValue label="Kho lấy hàng (GHN)" value={owner.warehouseAddress} />
                      <OwnerValue label="Kho nhận hàng trả" value={owner.returnWarehouseAddress} />
                    </dl>
                  </div>
                </div>
              )}
              {ownerDraft && (
                <form onSubmit={saveOwner}>
                  <fieldset disabled={saving !== null} className="min-w-0 space-y-4 px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between gap-2 border-b border-[#EAE4D7] pb-2.5">
                      <h2 className="text-sm font-semibold">Sửa thông tin chủ Shop</h2>
                      {!ownerChanged && <Button type="button" size="sm" variant="outline" className="h-9 rounded-lg shadow-none" onClick={() => setOwnerDraft(null)}>Hủy</Button>}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 md:gap-0 md:divide-x md:divide-[#EAE4D7]">
                      <div className="space-y-2.5 md:pr-4">
                        <h3 className="text-xs font-semibold text-[#765629]">Liên hệ</h3>
                        {contactFields.map(item => (
                          <label key={item.key} className={labelClass}><span>{item.label} <span className="text-[#DC2626]">*</span></span>
                            <input type={'type' in item ? item.type : 'text'} value={ownerDraft[item.key]} required maxLength={item.maxLength} onChange={event => setOwnerDraft({ ...ownerDraft, [item.key]: event.target.value })} className={inputClass} />
                          </label>
                        ))}
                      </div>
                      <div className="space-y-2.5 md:pl-4">
                        <h3 className="text-xs font-semibold text-[#765629]">Pháp lý</h3>
                        {legalFields.map(item => (
                          <label key={item.key} className={labelClass}><span>{item.label}{'required' in item && <span className="text-[#DC2626]"> *</span>}</span>
                            {item.key === 'businessType' ? (
                              <Select aria-label={item.label} value={ownerDraft.businessType} options={businessTypes} placeholder="Chọn loại hình" disabled={saving !== null} onChange={event => setOwnerDraft({ ...ownerDraft, businessType: event.target.value })} className={inputClass} />
                            ) : (
                              <input value={ownerDraft[item.key]} required={'required' in item} maxLength={item.maxLength} onChange={event => setOwnerDraft({ ...ownerDraft, [item.key]: event.target.value })} className={inputClass} />
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2.5 border-t border-[#EAE4D7] pt-3">
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-[#765629]"><MapPin size={14} aria-hidden="true" /> Kho hàng</h3>
                      <label className={labelClass}><span>Kho lấy hàng (GHN) <span className="text-[#DC2626]">*</span></span>
                        <textarea value={ownerDraft.warehouseAddress} required maxLength={500} rows={2} placeholder="Số nhà/đường, phường/xã, quận/huyện, tỉnh/thành" onChange={event => setOwnerDraft({ ...ownerDraft, warehouseAddress: event.target.value })} className={textareaClass} />
                      </label>
                      <label className="flex items-center gap-2 text-sm text-[#665948]">
                        <input type="checkbox" checked={sameReturnAddress} onChange={event => setSameReturnAddress(event.target.checked)} className="accent-[#C59B58]" />
                        Kho nhận hàng trả cùng địa chỉ kho lấy hàng
                      </label>
                      <label className={labelClass}><span>Kho nhận hàng trả {!sameReturnAddress && <span className="text-[#DC2626]">*</span>}</span>
                        <textarea value={sameReturnAddress ? ownerDraft.warehouseAddress : ownerDraft.returnWarehouseAddress} readOnly={sameReturnAddress} required={!sameReturnAddress} maxLength={500} rows={2} onChange={event => setOwnerDraft({ ...ownerDraft, returnWarehouseAddress: event.target.value })} className={`${textareaClass} read-only:bg-[#FAF8F5]`} />
                      </label>
                    </div>
                  </fieldset>
                  {ownerChanged && <SaveBar saving={saving === 'owner'} disabled={saving !== null && saving !== 'owner'} onCancel={() => setOwnerDraft(null)} label="Lưu thông tin" />}
                </form>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
