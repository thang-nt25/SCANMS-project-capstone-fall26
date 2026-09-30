import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  ShieldAlert,
  Globe,
  Percent,
  Clock,
  Coins,
  CheckCircle2,
  ChevronDown,
  Store,
  Upload,
  Loader2,
  Check,
  ImageIcon,
  Camera,
} from 'lucide-react';
import { storeService } from '../../services/store.service';
import { authService } from '../../services/auth.service';
import { uploadService } from '../../services/upload.service';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const SHOP_LOGO_PRESETS = [
  { id: 'shop-1', label: 'Sora Skin', url: 'https://res.cloudinary.com/uwha9nbe/image/upload/v1789584519/scanms/logos/shop-sora-skin.jpg' },
  { id: 'shop-2', label: 'Tech Store', url: 'https://res.cloudinary.com/uwha9nbe/image/upload/v1789584520/scanms/logos/shop-techstore.jpg' },
  { id: 'shop-3', label: 'Mỹ Phẩm Xanh', url: 'https://res.cloudinary.com/uwha9nbe/image/upload/v1789584525/scanms/logos/shop-my-pham-xanh.jpg' },
  { id: 'shop-4', label: 'Store A Flagship', url: 'https://res.cloudinary.com/uwha9nbe/image/upload/v1789584523/scanms/logos/shop-store-a.jpg' },
  { id: 'shop-5', label: 'Store B Concept', url: 'https://res.cloudinary.com/uwha9nbe/image/upload/v1789584524/scanms/logos/shop-store-b.jpg' },
  { id: 'shop-6', label: 'Official Flagship', url: 'https://res.cloudinary.com/uwha9nbe/image/upload/v1789584522/scanms/logos/shop-flagship.jpg' },
];

export default function ShopSettingsPage() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const isShopOrAdmin =
    currentUser?.role === 'SHOP_MANAGER' ||
    currentUser?.role === 'SYSTEM_ADMIN' ||
    currentUser?.role === 'SYSTEM_MANAGER';

  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(currentUser);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [policyReturn, setPolicyReturn] = useState('');
  const [policyWarranty, setPolicyWarranty] = useState('');
  const [policyShipping, setPolicyShipping] = useState('');
  const [defaultCommissionRate, setDefaultCommissionRate] = useState<number>(10);
  const [attributionWindowDays, setAttributionWindowDays] = useState<number>(30);
  const [minPayoutAmount, setMinPayoutAmount] = useState<number>(200000);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    loadStore();

    const handleUserSync = () => {
      setCurrentUserProfile(authService.getCurrentUser());
    };
    window.addEventListener('auth-user-updated', handleUserSync);
    return () => window.removeEventListener('auth-user-updated', handleUserSync);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const secureUrl = await uploadService.uploadImage(file, 'scanms/logos');
      setLogoUrl(secureUrl);
      showToast('Đã tải logo gian hàng lên Cloudinary thành công!');
    } catch (err: any) {
      console.error('Lỗi upload logo Cloudinary:', err);
      showToast(err?.response?.data?.message || err?.message || 'Không thể tải logo lên Cloudinary');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Kích thước ảnh tối đa 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const secureUrl = await uploadService.uploadImage(file, 'scanms/avatars');
      await authService.updateAvatar(secureUrl);
      setCurrentUserProfile(authService.getCurrentUser());
      showToast('Cập nhật ảnh đại diện chủ gian hàng thành công!');
    } catch (err: any) {
      console.error('Lỗi tải ảnh đại diện:', err);
      showToast(err?.response?.data?.message || err?.message || 'Không thể tải ảnh đại diện lên');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const loadStore = async () => {
    try {
      const store = await storeService.getMyStore();
      if (store.name) setName(store.name);
      if (store.description) setDescription(store.description);
      if (store.logoUrl) setLogoUrl(store.logoUrl);
      if (store.websiteUrl) setWebsiteUrl(store.websiteUrl);
      setPolicyReturn(store.policyReturn || '');
      setPolicyWarranty(store.policyWarranty || '');
      setPolicyShipping(store.policyShipping || '');
      if (store.defaultCommissionRate) setDefaultCommissionRate(Number(store.defaultCommissionRate));
      if (store.attributionWindowDays) setAttributionWindowDays(store.attributionWindowDays);
      if (store.minPayoutAmount) setMinPayoutAmount(Number(store.minPayoutAmount));
    } catch (err) {
      console.error('Lỗi tải cấu hình shop:', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();

    if (!logoUrl?.trim()) {
      showToast('Logo gian hàng không được để trống (Bắt buộc)');
      return;
    }

    setSaving(true);
    try {
      await storeService.updateMyStore({
        name,
        description,
        logoUrl: logoUrl.trim(),
        websiteUrl,
        policyReturn,
        policyWarranty,
        policyShipping,
        defaultCommissionRate: Number(defaultCommissionRate),
        attributionWindowDays: Number(attributionWindowDays),
        minPayoutAmount: Number(minPayoutAmount),
      });
      showToast('Lưu cấu hình gian hàng thành công!');
    } catch (err: any) {
      showToast(err.message || 'Lỗi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  if (!isShopOrAdmin) {
    return (
      <div className="max-w-lg mx-auto my-12 text-center">
        <Card className="p-8 bg-white border border-[#EAE4D7] flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#FBF5EB] text-[#B88E4F] flex items-center justify-center">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-[#1A1612] m-0">
            Khu Vực Dành Cho Chủ Gian Hàng
          </h2>
          <p className="text-xs sm:text-sm text-[#7D715E] leading-relaxed m-0">
            Cài đặt gian hàng, hạn mức rút tiền tối thiểu và thời hạn lưu vết cookie là tính năng quản trị dành riêng cho Chủ Shop.
          </p>
          <Button
            variant="gold"
            size="md"
            onClick={() => navigate('/collaborator/dashboard')}
          >
            Về trang Tổng quan KOL
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto text-left">
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-white text-[#1A1612] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 border border-[#EEDFC6]">
          <CheckCircle2 className="w-4 h-4 text-[#B88E4F]" />
          <span>{toastMsg}</span>
        </div>
      )}



      {/* Shop Owner Profile Header Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#EAE4D7] shadow-xs flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="relative group shrink-0">
            <div className="w-18 h-18 rounded-2xl overflow-hidden border-2 border-[#E8D4B0] bg-gradient-to-br from-[#FAF0DD] to-[#F3EFE6] shadow-sm flex items-center justify-center">
              {currentUserProfile?.avatarUrl ? (
                <img
                  src={currentUserProfile.avatarUrl}
                  alt={currentUserProfile.fullName || 'Chủ Shop'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-black text-[#8C6226]">
                  {currentUserProfile?.fullName?.[0]?.toUpperCase() || 'S'}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              title="Bấm để tải ảnh đại diện lên"
              className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white shadow-sm border-2 border-white transition cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#1A1612]">
                {currentUserProfile?.fullName || 'Chủ Gian Hàng'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F]">
                🏪 Quản Trị Gian Hàng
              </span>
            </div>
            <p className="text-xs text-[#7D715E] mt-0.5">{currentUserProfile?.email}</p>
            <p className="text-xs text-[#8C7D6B] mt-1">
              Ảnh đại diện cá nhân của bạn sẽ hiển thị trên thanh điều hướng, tin nhắn hợp tác với KOL và hệ thống toàn sàn.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] hover:border-[#C59B58] hover:bg-[#F3EFE6] text-xs font-bold text-[#1A1612] transition shadow-2xs cursor-pointer active:scale-98"
        >
          {uploadingAvatar ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B88E4F]" />
          ) : (
            <Camera className="w-3.5 h-3.5 text-[#B88E4F]" />
          )}
          <span>{uploadingAvatar ? 'Đang tải...' : 'Đổi ảnh cá nhân'}</span>
        </button>

        <input
          type="file"
          ref={avatarInputRef}
          onChange={handleAvatarUpload}
          accept="image/png,image/jpeg,image/webp,image/jpg"
          className="hidden"
        />
      </div>

      <Card className="p-6 sm:p-7 bg-white border border-[#EAE4D7]">
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div>
            <label className="text-xs font-bold text-[#1A1612] mb-1.5 block">
              Tên gian hàng / Thương hiệu
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#1A1612] outline-none hover:border-[#B88E4F]/50 focus:border-[#B88E4F] transition"
              required
            />
          </div>

          <div className="p-4 bg-[#FAF8F5] border border-[#EAE4D7] rounded-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1A1612] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#B88E4F]" />
                <span>Logo đại diện gian hàng <strong className="text-rose-600">* (Bắt buộc)</strong></span>
              </label>
              <span className="text-[10px] text-[#7D715E] bg-white px-2 py-0.5 rounded-full border border-[#EAE4D7]">
                Lưu trữ đám mây Cloudinary
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-[#C59B58] ring-offset-2 shrink-0 bg-[#F3EFE6] flex items-center justify-center shadow-xs">
                {logoUrl ? (
                  <img src={logoUrl} alt="Shop Logo" className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-7 h-7 text-[#7D715E]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {SHOP_LOGO_PRESETS.map((p) => {
                    const isSelected = logoUrl === p.url;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setLogoUrl(p.url)}
                        className={`relative group p-0.5 rounded-lg border-2 transition cursor-pointer ${
                          isSelected ? 'border-[#C59B58] scale-105 shadow-xs' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                        title={p.label}
                      >
                        <img src={p.url} alt={p.label} className="w-7 h-7 rounded-md object-cover" />
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#15803d] text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="URL logo Cloudinary..."
                    required
                    className="flex-1 bg-white border border-[#EAE4D7] rounded-lg px-3 py-1.5 text-xs text-[#1A1612] focus:border-[#C59B58] outline-none transition font-medium"
                  />
                  <label className="cursor-pointer px-3 py-1.5 bg-white border border-[#EAE4D7] hover:border-[#C59B58] text-[#1A1612] text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 transition">
                    {uploadingLogo ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#B88E4F] animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-[#B88E4F]" />
                    )}
                    <span>{uploadingLogo ? 'Đang tải...' : 'Tải logo (PNG/JPG)'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      disabled={uploadingLogo}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#1A1612] mb-1.5 block">
              Mô tả gian hàng
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl p-3 text-xs sm:text-sm text-[#1A1612] outline-none hover:border-[#B88E4F]/50 focus:border-[#B88E4F] transition resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#1A1612] mb-1.5 block flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#B88E4F]" />
                Website chính thức (Storefront)
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1A1612] outline-none hover:border-[#B88E4F]/50 focus:border-[#B88E4F] transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#1A1612] mb-1.5 block flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-[#B88E4F]" />
                Tỷ lệ hoa hồng mặc định (%)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={defaultCommissionRate}
                onChange={(e) => setDefaultCommissionRate(Number(e.target.value))}
                className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-[#1A1612] outline-none hover:border-[#B88E4F]/50 focus:border-[#B88E4F] transition"
                required
              />
            </div>
          </div>

          <section className="rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-[#1A1612]">Chính sách công khai của Shop</h2>
              <p className="text-xs text-[#7D715E]">Khách sẽ thấy nội dung này trước khi đặt hàng. Nếu chưa nhập chính sách đổi trả, hệ thống hiển thị rõ quy định mặc định của SCANMS.</p>
            </div>
            {([
              ['Đổi trả / hoàn tiền', policyReturn, setPolicyReturn],
              ['Bảo hành', policyWarranty, setPolicyWarranty],
              ['Giao hàng', policyShipping, setPolicyShipping],
            ] as const).map(([label, value, setValue]) => (
              <label key={label} className="block text-xs font-bold text-[#1A1612]">
                {label}
                <textarea value={value} onChange={(event) => setValue(event.target.value)} maxLength={500} rows={2}
                  className="mt-1 w-full rounded-xl border border-[#EAE4D7] bg-white p-3 text-sm font-normal outline-none focus:border-[#C59B58]" />
              </label>
            ))}
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#1A1612] mb-1.5 block flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#B88E4F]" />
                Thời gian lưu vết Cookie (Ngày)
              </label>
              <div className="relative">
                <select
                  value={attributionWindowDays}
                  onChange={(e) => setAttributionWindowDays(Number(e.target.value))}
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#1A1612] appearance-none outline-none cursor-pointer hover:border-[#B88E4F]/50 transition"
                >
                  <option value={7}>7 ngày</option>
                  <option value={14}>14 ngày</option>
                  <option value={30}>30 ngày (Tiêu chuẩn Last-Click)</option>
                  <option value={60}>60 ngày</option>
                </select>
                <ChevronDown className="w-4 h-4 text-[#7D715E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1A1612] mb-1.5 block flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-[#B88E4F]" />
                Hạn mức rút tối thiểu (₫)
              </label>
              <input
                type="number"
                value={minPayoutAmount}
                onChange={(e) => setMinPayoutAmount(Number(e.target.value))}
                className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-[#1A1612] outline-none hover:border-[#B88E4F]/50 focus:border-[#B88E4F] transition"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="gold"
              size="lg"
              icon={<Save className="w-4 h-4" />}
              loading={saving}
              className="w-full sm:w-auto"
            >
              {saving ? 'Đang lưu...' : 'Lưu cấu hình gian hàng'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
