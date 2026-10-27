import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  ShieldAlert,
  Percent,
  Clock,
  CheckCircle2,
  Store,
  Upload,
  Loader2,
  ImageIcon,
  Building2,
  FileText,
  Mail,
  MapPin,
  Phone,
  UserRound,
  Pencil,
  X,
} from 'lucide-react';
import { storeService } from '../../services/store.service';
import { authService } from '../../services/auth.service';
import { uploadService } from '../../services/upload.service';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { SponsoredPlacementsPanel } from '../../components/stores/SponsoredPlacementsPanel';
import { StorefrontSettingsSection } from '../../components/stores/StorefrontSettingsSection';

export default function ShopSettingsPage() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const isShopManager = currentUser?.role === 'SHOP_MANAGER';
  const isPlatformAdmin =
    currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'SYSTEM_MANAGER';

  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [policyReturn, setPolicyReturn] = useState('');
  const [policyWarranty, setPolicyWarranty] = useState('');
  const [policyShipping, setPolicyShipping] = useState('');
  const [attributionWindowDays, setAttributionWindowDays] = useState<number>(30);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [shopOwnerDetails, setShopOwnerDetails] = useState({
    representativeName: currentUser?.fullName || '',
    contactPhone: currentUser?.phoneNumber || '',
    contactEmail: currentUser?.email || '',
    businessType: '',
    taxCode: '',
    businessAddress: '',
    warehouseAddress: '',
    returnWarehouseAddress: '',
  });
  const [ownerDetailsDraft, setOwnerDetailsDraft] = useState(shopOwnerDetails);
  const [isEditingOwnerDetails, setIsEditingOwnerDetails] = useState(false);
  const [savingOwnerDetails, setSavingOwnerDetails] = useState(false);
  const [sameReturnAddress, setSameReturnAddress] = useState(true);

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

  const loadStore = useCallback(async () => {
    try {
      const store = await storeService.getMyStore();
      if (store.name) setName(store.name);
      if (store.description) setDescription(store.description);
      if (store.logoUrl) {
        setLogoUrl(store.logoUrl);
      } else {
        setLogoUrl('');
      }
      if (store.slug) setStoreSlug(store.slug);
      setPolicyReturn(store.policyReturn || '');
      setPolicyWarranty(store.policyWarranty || '');
      setPolicyShipping(store.policyShipping || '');
      if (store.attributionWindowDays) setAttributionWindowDays(store.attributionWindowDays);

      const onboardingData = (store as any).onboardingData || {};
      const returnWarehouse = (store as any).returnWarehouse || {};
      const businessAddr = onboardingData.businessAddress || '';
      const pickupAddr = onboardingData.warehouseAddress || returnWarehouse.address || '';
      const returnAddr = onboardingData.returnWarehouseAddress || returnWarehouse.address || pickupAddr;

      const loadedDetails = {
        representativeName:
          onboardingData.representativeName || store.owner?.fullName || currentUser?.fullName || '',
        contactPhone: onboardingData.contactPhone || store.owner?.phoneNumber || '',
        contactEmail: onboardingData.contactEmail || store.owner?.email || '',
        businessType: onboardingData.businessType || '',
        taxCode: onboardingData.taxCode || '',
        businessAddress: businessAddr,
        warehouseAddress: pickupAddr,
        returnWarehouseAddress: returnAddr,
      };
      setShopOwnerDetails(loadedDetails);
      setOwnerDetailsDraft(loadedDetails);
      setSameReturnAddress(returnAddr === pickupAddr);
    } catch (err) {
      console.error('Lỗi tải cấu hình shop:', err);
    }
  }, [currentUser?.fullName]);

  useEffect(() => {
    if (isShopManager) void loadStore();
  }, [isShopManager, loadStore]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const storefrontPath = storeSlug ? `/shop/${encodeURIComponent(storeSlug)}` : '';
  const storefrontUrl = storefrontPath && typeof window !== 'undefined'
    ? new URL(storefrontPath, window.location.origin).toString()
    : '';

  const copyStorefrontUrl = async () => {
    if (!storefrontUrl) return;
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      showToast('Đã sao chép liên kết gian hàng.');
    } catch {
      showToast('Không thể sao chép tự động. Hãy chọn và sao chép đường dẫn.');
    }
  };

  const handleSave = async (e: any) => {
    e.preventDefault();

    const detailsToSave = isEditingOwnerDetails ? ownerDetailsDraft : shopOwnerDetails;
    const warehouseAddress = detailsToSave.warehouseAddress.trim();
    const returnWarehouseAddress = sameReturnAddress
      ? warehouseAddress
      : (detailsToSave.returnWarehouseAddress || warehouseAddress).trim();

    if (isEditingOwnerDetails) {
      if (!detailsToSave.representativeName.trim() || !detailsToSave.businessType ||
          !detailsToSave.taxCode.trim() || !detailsToSave.contactPhone.trim() ||
          !detailsToSave.contactEmail.trim() || !warehouseAddress) {
        showToast('Vui lòng bổ sung đầy đủ thông tin chủ shop và kho hàng.');
        return;
      }
      if (!/^[+]?([0-9().\-\s]){8,20}$/.test(detailsToSave.contactPhone.trim())) {
        showToast('Số điện thoại liên hệ chưa đúng định dạng.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(detailsToSave.contactEmail.trim())) {
        showToast('Email đối soát chưa đúng định dạng.');
        return;
      }
      if (warehouseAddress.split(',').map((part) => part.trim()).filter(Boolean).length < 4) {
        showToast('Địa chỉ kho cần đủ số nhà/đường, phường/xã, quận/huyện, tỉnh/thành, ngăn cách bằng dấu phẩy.');
        return;
      }
    }

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
        websiteUrl: '',
        policyReturn,
        policyWarranty,
        policyShipping,
        defaultCommissionRate: 10,
        attributionWindowDays: Number(attributionWindowDays),
        ...(warehouseAddress && {
          representativeName: detailsToSave.representativeName || name,
          businessType: detailsToSave.businessType || 'ENTERPRISE',
          taxCode: detailsToSave.taxCode || '0316892451',
          contactPhone: detailsToSave.contactPhone || '0902345678',
          contactEmail: detailsToSave.contactEmail || 'shop@scanms.vn',
          businessAddress: detailsToSave.businessAddress || 'Tòa nhà Bitexco, 2 Hải Triều, P. Bến Nghé, Q.1, TP. Hồ Chí Minh',
          warehouseAddress,
          returnWarehouseAddress,
        }),
      });
      if (isEditingOwnerDetails) {
        const savedDetails = { ...detailsToSave, warehouseAddress, returnWarehouseAddress };
        setShopOwnerDetails(savedDetails);
        setOwnerDetailsDraft(savedDetails);
        setIsEditingOwnerDetails(false);
      }
      showToast('Đã lưu cấu hình gian hàng.');
    } catch (err: any) {
      showToast(err.message || 'Lỗi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOwnerDetails = async () => {
    const returnWarehouseAddr = sameReturnAddress
      ? ownerDetailsDraft.warehouseAddress.trim()
      : (ownerDetailsDraft.returnWarehouseAddress || ownerDetailsDraft.warehouseAddress).trim();

    const details = {
      representativeName: ownerDetailsDraft.representativeName.trim(),
      businessType: ownerDetailsDraft.businessType,
      contactPhone: ownerDetailsDraft.contactPhone.trim(),
      contactEmail: ownerDetailsDraft.contactEmail.trim(),
      taxCode: ownerDetailsDraft.taxCode.trim(),
      businessAddress: ownerDetailsDraft.businessAddress.trim() || 'Tòa nhà Bitexco, 2 Hải Triều, P. Bến Nghé, Q.1, TP. Hồ Chí Minh',
      warehouseAddress: ownerDetailsDraft.warehouseAddress.trim(),
      returnWarehouseAddress: returnWarehouseAddr,
    };

    if (!details.representativeName || !details.businessType || !details.taxCode ||
        !details.contactPhone || !details.contactEmail || !details.warehouseAddress) {
      showToast('Vui lòng bổ sung đầy đủ thông tin chủ shop và kho hàng.');
      return;
    }
    if (!/^[+]?([0-9().\-\s]){8,20}$/.test(details.contactPhone)) {
      showToast('Số điện thoại liên hệ chưa đúng định dạng.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.contactEmail)) {
      showToast('Email đối soát chưa đúng định dạng.');
      return;
    }
    if (details.warehouseAddress.split(',').map((part) => part.trim()).filter(Boolean).length < 4) {
      showToast('Địa chỉ kho cần đủ số nhà/đường, phường/xã, quận/huyện, tỉnh/thành, ngăn cách bằng dấu phẩy.');
      return;
    }

    setSavingOwnerDetails(true);
    try {
      await storeService.updateMyStore(details);
      setShopOwnerDetails(details);
      setOwnerDetailsDraft(details);
      setIsEditingOwnerDetails(false);
      showToast('Đã cập nhật thông tin chủ shop.');
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Không thể lưu thông tin chủ shop.');
    } finally {
      setSavingOwnerDetails(false);
    }
  };

  if (!isShopManager) {
    return (
      <div className="max-w-lg mx-auto my-12 text-center">
        <Card className="p-8 bg-white border border-[#EAE4D7] flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#FBF5EB] text-[#B88E4F] flex items-center justify-center">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-[#1A1612] m-0">
            Chỉ dành cho Chủ gian hàng
          </h2>
          <p className="text-xs sm:text-sm text-[#7D715E] leading-relaxed m-0">
            Đây là nơi quản lý thông tin và chính sách của một gian hàng cụ thể. Tài khoản quản trị sàn không dùng khu vực này để cấu hình chính sách toàn sàn.
          </p>
          <Button
            variant="gold"
            size="md"
            onClick={() => navigate(isPlatformAdmin ? '/admin/analytics' : '/collaborator/dashboard')}
          >
            {isPlatformAdmin ? 'Về trang quản trị sàn' : 'Về trang Tổng quan KOL'}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="merchant-settings-page mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-4 pb-10 pt-3 text-left sm:gap-5 sm:pt-4">
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-white text-[#1A1612] px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2.5 border border-[#EEDFC6] animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-[#B88E4F]" />
          <span>{toastMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2 xl:gap-5">
        <div className="flex flex-col gap-4 xl:gap-5 lg:contents">
          <section className="settings-brand space-y-4 rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5 lg:col-start-1 lg:row-start-1 lg:row-span-2">
            <div className="flex items-center gap-3 border-b border-[#EAE4D7] pb-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
                <Store className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="m-0 text-sm font-semibold text-[#1A1612]">Nhận diện thương hiệu</h2>
              </div>
            </div>

            <div>
              <label htmlFor="settings-store-name" className="mb-2 block text-xs font-medium text-[#1A1612]">
                Tên gian hàng <span className="text-rose-600">*</span>
              </label>
              <input
                id="settings-store-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Sora Skin Official Store"
                className="h-10 w-full rounded-lg border border-[#EAE4D7] bg-white px-3 text-[13px] font-medium text-[#1A1612] outline-none transition hover:border-[#B88E4F]/50 focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/10"
                required
              />
            </div>

            <div className="settings-logo flex flex-col gap-2.5 border-t border-[#EAE4D7] pt-4">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#1A1612]">
                <ImageIcon className="h-3.5 w-3.5 text-[#B88E4F]" />
                <span>Logo đại diện <strong className="text-rose-600">*</strong></span>
              </span>

              <div className="flex items-center gap-3">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#EEDFC6] bg-white">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Shop Logo"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/assets/shops/shop-sora-skin.png';
                      }}
                    />
                  ) : (
                    <Store className="h-5 w-5 text-[#7D715E]" />
                  )}
                </div>

                <label className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB]/50 px-3 text-xs font-medium text-[#1A1612] transition hover:border-[#C59B58] ${uploadingLogo ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}>
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#B88E4F]" />
                  ) : (
                    <Upload className="h-4 w-4 shrink-0 text-[#B88E4F]" />
                  )}
                  <span>{uploadingLogo ? 'Đang tải lên...' : 'Tải logo'}</span>
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

            <StorefrontSettingsSection url={storefrontUrl} path={storefrontPath} description={description}
              onDescriptionChange={setDescription} onCopy={() => void copyStorefrontUrl()} />
          </section>

          <section className="space-y-4 self-start rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5 lg:col-span-2 lg:col-start-1 lg:row-start-3">
            <header className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="m-0 text-sm font-semibold text-[#1A1612]">Chính sách công khai</h2>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-4 border-t border-[#EAE4D7] pt-4 sm:grid-cols-2">
              {([
                ['Đổi trả & hoàn tiền', policyReturn, setPolicyReturn, 'Cam kết đổi trả trong 7-14 ngày nếu lỗi nhà sản xuất...'],
                ['Bảo hành & chất lượng', policyWarranty, setPolicyWarranty, 'Cam kết 100% hàng chính hãng có tem niêm phong...'],
                ['Giao nhận & đồng kiểm', policyShipping, setPolicyShipping, 'Hỗ trợ đồng kiểm khi nhận hàng, giao nhanh 2-3 ngày...'],
              ] as const).map(([label, value, setValue, placeholder], index) => (
                <div key={label} className="min-w-0">
                  <label htmlFor={`store-policy-${index}`} className="mb-2 block text-xs font-medium text-[#1A1612]">
                    {label}
                  </label>
                  <textarea
                    id={`store-policy-${index}`}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder={placeholder}
                    className="block min-h-[104px] w-full resize-y rounded-lg border border-[#EAE4D7] bg-white px-3 py-2.5 text-[13px] leading-relaxed text-[#1A1612] outline-none transition placeholder:text-[#A39784] focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/10"
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4 xl:gap-5 lg:contents">
          <section className="settings-affiliate space-y-4 rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5 lg:col-start-2 lg:row-start-1">
            <div className="flex items-center gap-3 border-b border-[#EAE4D7] pb-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
                <Percent className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="m-0 text-sm font-semibold text-[#1A1612]">Tiếp thị liên kết</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <span className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#1A1612]">
                  <Percent className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B88E4F]" />
                  Hoa hồng nền SCANMS
                </span>
                <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB]/40 px-3">
                  <span className="text-base font-semibold tabular-nums text-[#B88E4F]">10%</span>
                  <span className="text-[10px] font-medium text-[#7D715E]">Cố định theo sàn</span>
                </div>
              </div>

              <div className="min-w-0">
                <label htmlFor="settings-attribution-trigger" className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#1A1612]">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B88E4F]" />
                  Thời hạn ghi nhận đơn
                </label>
                <Select
                  id="settings-attribution"
                  aria-label="Thời hạn ghi nhận đơn"
                  portal
                  value={String(attributionWindowDays)}
                  onChange={(e) => setAttributionWindowDays(Number(e.target.value))}
                  className="h-10 w-full rounded-lg text-[13px] shadow-none"
                >
                  <option value="7">7 ngày</option>
                  <option value="14">14 ngày</option>
                  <option value="30">30 ngày (Tiêu chuẩn)</option>
                  <option value="60">60 ngày</option>
                </Select>
              </div>
            </div>
          </section>

          <section className="settings-owner rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-[0_2px_10px_rgba(35,29,21,0.03)] sm:p-5 lg:col-start-2 lg:row-start-2">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4D7] pb-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="m-0 text-sm font-semibold text-[#1A1612]">Thông tin chủ shop</h3>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {isEditingOwnerDetails ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingOwnerDetails(false)}
                        disabled={savingOwnerDetails}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#EAE4D7] bg-white px-3 py-2 text-xs font-semibold text-[#7D715E] transition hover:border-[#C59B58] hover:text-[#1A1612] disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" /> Hủy
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setOwnerDetailsDraft({ ...shopOwnerDetails });
                          setIsEditingOwnerDetails(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-xs font-semibold text-[#8A642C] transition hover:border-[#C59B58]"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Sửa thông tin
                      </button>
                    )}
                  </div>
              </div>

                {isEditingOwnerDetails ? (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-semibold text-[#1A1612]">
                        Người đại diện <span className="text-rose-600">*</span>
                        <input
                          value={ownerDetailsDraft.representativeName}
                          maxLength={150}
                          onChange={(event) => setOwnerDetailsDraft({ ...ownerDetailsDraft, representativeName: event.target.value })}
                          placeholder="Nhập tên người đại diện"
                          className="mt-1.5 h-11 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-sm font-normal outline-none transition placeholder:text-[#A99D8A] focus:border-[#C59B58]"
                        />
                      </label>
                      <div>
                        <span className="block text-xs font-semibold text-[#1A1612] mb-1.5">
                          Loại hình kinh doanh <span className="text-rose-600">*</span>
                        </span>
                        <Select
                          value={ownerDetailsDraft.businessType}
                          onChange={(event) => setOwnerDetailsDraft({ ...ownerDetailsDraft, businessType: event.target.value })}
                          className="h-11 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#C59B58]"
                        >
                          <option value="">Chọn loại hình kinh doanh</option>
                          <option value="INDIVIDUAL">Cá nhân</option>
                          <option value="HOUSEHOLD">Hộ kinh doanh</option>
                          <option value="ENTERPRISE">Doanh nghiệp</option>
                        </Select>
                      </div>
                      <label className="block text-xs font-semibold text-[#1A1612]">
                        Điện thoại liên hệ <span className="text-rose-600">*</span>
                        <input
                          type="tel"
                          value={ownerDetailsDraft.contactPhone}
                          maxLength={20}
                          onChange={(event) => setOwnerDetailsDraft({ ...ownerDetailsDraft, contactPhone: event.target.value })}
                          placeholder="Ví dụ: 0902345678"
                          className="mt-1.5 h-11 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-sm font-normal outline-none transition placeholder:text-[#A99D8A] focus:border-[#C59B58]"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-[#1A1612]">
                        Email nhận đối soát <span className="text-rose-600">*</span>
                        <input
                          type="email"
                          value={ownerDetailsDraft.contactEmail}
                          maxLength={255}
                          onChange={(event) => setOwnerDetailsDraft({ ...ownerDetailsDraft, contactEmail: event.target.value })}
                          placeholder="Ví dụ: shop@example.vn"
                          className="mt-1.5 h-11 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-sm font-normal outline-none transition placeholder:text-[#A99D8A] focus:border-[#C59B58]"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-[#1A1612] sm:col-span-2">
                        Mã số thuế <span className="text-rose-600">*</span>
                        <input
                          value={ownerDetailsDraft.taxCode}
                          maxLength={30}
                          onChange={(event) => setOwnerDetailsDraft({ ...ownerDetailsDraft, taxCode: event.target.value })}
                          placeholder="Nhập mã số thuế cá nhân, hộ kinh doanh hoặc doanh nghiệp"
                          className="mt-1.5 h-11 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-sm font-normal outline-none transition placeholder:text-[#A99D8A] focus:border-[#C59B58]"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-[#1A1612] sm:col-span-2">
                        Địa chỉ trụ sở chính / Đăng ký kinh doanh (Legal HQ) <span className="text-rose-600">*</span>
                        <input
                          value={ownerDetailsDraft.businessAddress}
                          maxLength={500}
                          onChange={(event) => setOwnerDetailsDraft({ ...ownerDetailsDraft, businessAddress: event.target.value })}
                          placeholder="Địa chỉ trụ sở xuất hóa đơn VAT và hiển thị công khai trên gian hàng"
                          className="mt-1.5 h-11 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-sm font-normal outline-none transition placeholder:text-[#A99D8A] focus:border-[#C59B58]"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-[#1A1612] sm:col-span-2">
                        Kho lấy hàng xuất đi (GHN Pickup Warehouse) <span className="text-rose-600">*</span>
                        <textarea
                          value={ownerDetailsDraft.warehouseAddress}
                          maxLength={500}
                          rows={2}
                          onChange={(event) => setOwnerDetailsDraft({ ...ownerDetailsDraft, warehouseAddress: event.target.value })}
                          placeholder="Nhập địa chỉ kho thật: số nhà/đường, phường/xã, quận/huyện, tỉnh/thành"
                          className="mt-1.5 w-full resize-y rounded-xl border border-[#EAE4D7] bg-white px-3 py-2.5 text-sm font-normal outline-none transition placeholder:text-[#A99D8A] focus:border-[#C59B58]"
                        />
                        <span className="mt-1 block font-normal text-[#7D715E]">Địa chỉ này được dùng làm điểm lấy hàng để GHN tính cước. Hãy nhập kho thực tế của Shop.</span>
                      </label>
                      <div className="sm:col-span-2 space-y-2 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3">
                        <label className="flex items-center gap-2 text-xs font-semibold text-[#1A1612] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sameReturnAddress}
                            onChange={(e) => setSameReturnAddress(e.target.checked)}
                            className="rounded accent-[#C59B58]"
                          />
                          <span>Kho nhận hàng hoàn trả (Return Warehouse) trùng với kho lấy hàng</span>
                        </label>
                        {!sameReturnAddress && (
                          <div className="pt-2">
                            <label className="block text-xs font-semibold text-[#1A1612]">
                              Địa chỉ kho nhận hàng hoàn trả riêng <span className="text-rose-600">*</span>
                              <textarea
                                value={ownerDetailsDraft.returnWarehouseAddress}
                                maxLength={500}
                                rows={2}
                                onChange={(event) => setOwnerDetailsDraft({ ...ownerDetailsDraft, returnWarehouseAddress: event.target.value })}
                                placeholder="Địa chỉ nơi bưu tá mang hàng trả về khi khách khiếu nại hoặc giao thất bại"
                                className="mt-1.5 w-full resize-y rounded-xl border border-[#EAE4D7] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A99D8A] focus:border-[#C59B58]"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EAE4D7] pt-3">
                      <p className="m-0 text-[11px] text-[#7D715E]">Các mục có dấu * cần được điền đầy đủ.</p>
                      <button
                        type="button"
                        onClick={handleSaveOwnerDetails}
                        disabled={savingOwnerDetails}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#C59B58] px-4 text-xs font-bold text-white transition hover:bg-[#B88E4F] disabled:cursor-wait disabled:opacity-60"
                      >
                        {savingOwnerDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {savingOwnerDetails ? 'Đang lưu...' : 'Lưu thông tin'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="settings-owner-details">
                  <div className="settings-owner-info grid grid-cols-1 gap-x-5 gap-y-0 sm:grid-cols-2">
                    <div className="flex min-w-0 items-start gap-2.5 border-b border-[#EAE4D7]/70 py-3">
                      <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[#B88E4F]" />
                      <div className="min-w-0">
                        <p className="m-0 text-[11px] text-[#7D715E]">Người đại diện</p>
                        <p className="m-0 mt-0.5 break-words text-[13px] font-medium leading-relaxed text-[#1A1612]">{shopOwnerDetails.representativeName || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-start gap-2.5 border-b border-[#EAE4D7]/70 py-3">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#B88E4F]" />
                      <div className="min-w-0">
                        <p className="m-0 text-[11px] text-[#7D715E]">Loại hình kinh doanh</p>
                        <p className="m-0 mt-0.5 text-[13px] font-medium leading-relaxed text-[#1A1612]">
                          {shopOwnerDetails.businessType === 'INDIVIDUAL'
                            ? 'Cá nhân'
                            : shopOwnerDetails.businessType === 'HOUSEHOLD'
                              ? 'Hộ kinh doanh'
                              : shopOwnerDetails.businessType === 'ENTERPRISE'
                                ? 'Doanh nghiệp'
                                : shopOwnerDetails.businessType || 'Chưa cập nhật'}
                        </p>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-start gap-2.5 border-b border-[#EAE4D7]/70 py-3">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#B88E4F]" />
                      <div className="min-w-0">
                        <p className="m-0 text-[11px] text-[#7D715E]">Điện thoại liên hệ</p>
                        <p className="m-0 mt-0.5 break-words text-[13px] font-medium leading-relaxed text-[#1A1612]">{shopOwnerDetails.contactPhone || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-start gap-2.5 border-b border-[#EAE4D7]/70 py-3">
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#B88E4F]" />
                      <div className="min-w-0">
                        <p className="m-0 text-[11px] text-[#7D715E]">Email nhận đối soát</p>
                        <p className="m-0 mt-0.5 break-all text-[13px] font-medium leading-relaxed text-[#1A1612]">{shopOwnerDetails.contactEmail || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-start gap-2.5 border-b border-[#EAE4D7]/70 py-3">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#B88E4F]" />
                      <div className="min-w-0">
                        <p className="m-0 text-[11px] text-[#7D715E]">Mã số thuế</p>
                        <p className="m-0 mt-0.5 break-words font-mono text-[13px] font-medium leading-relaxed text-[#1A1612]">{shopOwnerDetails.taxCode || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-start gap-2.5 border-b border-[#EAE4D7]/70 py-3">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#B88E4F]" />
                      <div className="min-w-0">
                        <p className="m-0 text-[11px] text-[#7D715E]">Trụ sở chính & Pháp lý</p>
                        <p className="m-0 mt-0.5 break-words text-[13px] font-medium leading-relaxed text-[#1A1612]">{shopOwnerDetails.businessAddress || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex min-w-0 items-start gap-2.5 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB]/30 p-3 sm:col-span-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#B88E4F]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="m-0 text-xs font-semibold text-[#1A1612]">Kho lấy hàng</p>
                          <span className="text-[10px] rounded-md bg-white px-2 py-0.5 font-medium text-[#B88E4F] border border-[#EEDFC6]">GHN</span>
                        </div>
                        <p className="m-0 mt-0.5 break-words text-[13px] font-medium leading-relaxed text-[#1A1612]">{shopOwnerDetails.warehouseAddress || 'Chưa cập nhật'}</p>
                        <div className="mt-3 grid gap-1 border-t border-[#EAE4D7] pt-2 text-xs text-[#7D715E]">
                          <span>Kho nhận hàng hoàn trả</span>
                          <span className="break-words font-medium leading-relaxed text-[#1A1612]">{!shopOwnerDetails.returnWarehouseAddress || shopOwnerDetails.returnWarehouseAddress.trim() === shopOwnerDetails.warehouseAddress.trim() ? 'Dùng chung kho lấy hàng' : shopOwnerDetails.returnWarehouseAddress}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                )}
              </div>
          </section>

        </div>

        <div className="settings-save-bar flex flex-wrap items-center justify-between gap-3 border border-[#EAE4D7] bg-white p-3 rounded-xl lg:col-span-2">
          <Button
            type="submit"
            variant="gold"
            size="lg"
            icon={<Save className="w-4 h-4" />}
            loading={saving}
            className="h-11 rounded-xl px-6 text-sm font-semibold shadow-sm"
          >
            {saving ? 'Đang lưu cấu hình...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
      {isShopManager && <SponsoredPlacementsPanel />}
    </div>
  );
}
