import { handleStoreImageError } from '@/utils/image-fallback.utils';
import { registerPrivateCacheReset } from '@/utils/private-cache-session';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  UserPlus,
  MoreHorizontal,
  Store,
  ShieldCheck,
  Search,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  MapPin,
  Edit2,
  Trash2,
  Power,
  Upload,
  RotateCcw,
  Archive,
  Loader2,
} from 'lucide-react';
import {
  personnelService,
  type InternalStaffMember,
  type CreateStaffPayload,
  type AdminStoreOption,
} from '../../services/personnel.service';
import { uploadService } from '../../services/upload.service';
import {
  loadShippingAddresses,
  type ShippingProvince,
} from '../../services/order-address.service';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { toast } from '../../utils/toast';
import { Modal } from '../../components/ui/Modal';

const DEFAULT_CATEGORIES = [
  'Mỹ phẩm & Chăm sóc da chuyên sâu',
  'Thời trang & May mặc thể thao năng động',
  'Dinh dưỡng, Thảo mộc & Sức khỏe thiên nhiên',
  'Thiết bị gia dụng & Đồ bếp thông minh',
];

let cachedStaffList: InternalStaffMember[] = [];
let cachedStoresList: AdminStoreOption[] = [];
registerPrivateCacheReset(() => { cachedStaffList = []; cachedStoresList = []; });

export const AdminPersonnelPage: React.FC = () => {
  const [confirmation, setConfirmation] = useState<{ title: string; name: string; description: string; label: string; danger?: boolean } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const confirmationResolver = useRef<((accepted: boolean) => void) | null>(null);
  const requestConfirmation = (details: NonNullable<typeof confirmation>) => {
    if (confirmationResolver.current) return Promise.resolve(false);
    setConfirmation(details);
    return new Promise<boolean>((resolve) => { confirmationResolver.current = resolve; });
  };
  const closeConfirmation = () => {
    if (confirming) return;
    confirmationResolver.current?.(false);
    confirmationResolver.current = null;
    setConfirmation(null);
  };
  const finishConfirmation = () => {
    confirmationResolver.current = null;
    setConfirmation(null);
    setConfirming(false);
  };
  useEffect(() => () => { confirmationResolver.current?.(false); }, []);
  const [staffList, setStaffList] = useState<InternalStaffMember[]>(() => cachedStaffList);
  const [stores, setStores] = useState<AdminStoreOption[]>(() => cachedStoresList);
  const [loading, setLoading] = useState(() => cachedStaffList.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SHOP_MANAGER' | 'SYSTEM_MANAGER' | 'SYSTEM_ADMIN' | 'STORES'>('ALL');
  const [storeStatusFilter, setStoreStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'>('ALL');

  const [staffPage, setStaffPage] = useState(1);
  const [staffMenu, setStaffMenu] = useState<{ staff: InternalStaffMember; top: number; left: number } | null>(null);
  const staffMenuRef = useRef<HTMLDivElement>(null);
  const staffMenuTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { setStaffPage(1); setStaffMenu(null); }, [searchQuery, roleFilter]);
  useEffect(() => { setStaffMenu(null); }, [staffPage]);
  useEffect(() => {
    if (!staffMenu) return;
    const outside = (event: PointerEvent) => { if (!staffMenuRef.current?.contains(event.target as Node) && !staffMenuTrigger.current?.contains(event.target as Node)) setStaffMenu(null); };
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') { setStaffMenu(null); staffMenuTrigger.current?.focus(); } };
    const dismiss = () => setStaffMenu(null);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keyboard);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    staffMenuRef.current?.querySelector('button')?.focus();
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', keyboard); window.removeEventListener('scroll', dismiss, true); window.removeEventListener('resize', dismiss); };
  }, [staffMenu]);

  // 4 Core Locked Categories (Enterprise In-House Governance)
  const categories = DEFAULT_CATEGORIES;

  useEffect(() => {
    try {
      localStorage.removeItem('scanms_all_categories');
      localStorage.removeItem('scanms_custom_categories');
    } catch {}
  }, []);

  // Shipping addresses (Provinces / Districts / Wards - standard like Customer address)
  const [shippingProvinces, setShippingProvinces] = useState<ShippingProvince[]>([]);

  // Staff Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [staffForm, setStaffForm] = useState<CreateStaffPayload>({
    email: '',
    fullName: '',
    phoneNumber: '',
    password: '',
    role: 'SHOP_MANAGER',
    storeId: '',
  });

  // Store Create Modal State
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [storeSubmitting, setStoreSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [storeForm, setStoreForm] = useState({
    name: '',
    categoryName: DEFAULT_CATEGORIES[0],
    description: '',
    logoUrl: '',
    defaultCommissionRate: 10,
    warehouseName: '',
    contactName: '',
    contactPhone: '',
    provinceCode: '',
    provinceName: '',
    districtCode: '',
    districtName: '',
    wardCode: '',
    wardName: '',
    detailAddress: '',
    ghnDistrictId: 1442,
    ghnWardCode: '20109',
  });

  // Store Detail & Edit Modal State
  const [selectedStore, setSelectedStore] = useState<AdminStoreOption | null>(null);
  const [isStoreDetailOpen, setIsStoreDetailOpen] = useState(false);
  const [isEditStoreMode, setIsEditStoreMode] = useState(false);
  const [editStoreSubmitting, setEditStoreSubmitting] = useState(false);
  const [uploadingEditLogo, setUploadingEditLogo] = useState(false);
  const [editStoreForm, setEditStoreForm] = useState({
    name: '',
    categoryName: '',
    description: '',
    logoUrl: '',
    warehouseName: '',
    contactName: '',
    contactPhone: '',
    provinceCode: '',
    provinceName: '',
    districtCode: '',
    districtName: '',
    wardCode: '',
    wardName: '',
    detailAddress: '',
    warehouseAddress: '',
    ghnDistrictId: 1442,
    ghnWardCode: '20109',
    ownerId: '',
  });

  // Load Shipping Address Catalog
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    loadShippingAddresses(controller.signal)
      .then((data) => {
        if (active) setShippingProvinces(data || []);
      })
      .catch((err) => {
        if (active) console.warn('Không thể tải danh mục địa chỉ mở rộng:', err);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const loadData = async () => {
    if (cachedStaffList.length === 0) setLoading(true);
    try {
      const [staffData, storeData] = await Promise.all([
        personnelService.getStaffList(),
        personnelService.getAdminStores(true),
      ]);
      cachedStaffList = staffData;
      cachedStoresList = storeData;
      setStaffList(staffData);
      setStores(storeData);
      if (storeData.length > 0 && !staffForm.storeId) {
        setStaffForm((prev) => ({ ...prev, storeId: storeData[0].id }));
      }
    } catch (err: any) {
      toast.error('Không thể tải dữ liệu nhân sự & cửa hàng');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper to derive selected province & district for Create Modal
  const createSelectedProvince = shippingProvinces.find(
    (p) => String(p.code) === String(storeForm.provinceCode) || p.name === storeForm.provinceName,
  );
  const createSelectedDistrict = createSelectedProvince?.districts.find(
    (d) => String(d.code) === String(storeForm.districtCode) || d.name === storeForm.districtName,
  );

  // Helper to derive selected province & district for Edit Modal
  const editSelectedProvince = shippingProvinces.find(
    (p) => String(p.code) === String(editStoreForm.provinceCode) || p.name === editStoreForm.provinceName,
  );
  const editSelectedDistrict = editSelectedProvince?.districts.find(
    (d) => String(d.code) === String(editStoreForm.districtCode) || d.name === editStoreForm.districtName,
  );

  // Handle Logo Upload (File based, strictly image formats)
  const handleLogoFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: 'create' | 'edit',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Vui lòng chọn định dạng ảnh hợp lệ: PNG, JPG, JPEG hoặc WEBP');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dung lượng file ảnh không được vượt quá 5 MB');
      e.target.value = '';
      return;
    }

    if (mode === 'create') setUploadingLogo(true);
    else setUploadingEditLogo(true);

    try {
      const secureUrl = await uploadService.uploadImage(file, 'scanms/logos');
      if (mode === 'create') {
        setStoreForm((prev) => ({ ...prev, logoUrl: secureUrl }));
      } else {
        setEditStoreForm((prev) => ({ ...prev, logoUrl: secureUrl }));
      }
      toast.success('Đã tải ảnh logo nhãn hàng lên thành công!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể tải ảnh logo lên');
    } finally {
      if (mode === 'create') setUploadingLogo(false);
      else setUploadingEditLogo(false);
      e.target.value = '';
    }
  };

  const handleToggleStatus = async (staff: InternalStaffMember) => {
    const nextStatus = !staff.isActive;
    const actionText = nextStatus ? 'kích hoạt' : 'vô hiệu hóa';
    if (!await requestConfirmation({ title: nextStatus ? 'Kích hoạt tài khoản' : 'Vô hiệu hóa tài khoản', name: staff.fullName, description: nextStatus ? 'Nhân sự được truy cập lại theo quyền đã cấp.' : 'Nhân sự sẽ bị chặn truy cập tài khoản.', label: nextStatus ? 'Kích hoạt' : 'Vô hiệu hóa', danger: !nextStatus })) {
      return;
    }
    try {
      await personnelService.toggleStaffStatus(staff.id, nextStatus);
      toast.success(`Đã ${actionText} nhân sự thành công`);
      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, isActive: nextStatus } : s)),
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Lỗi khi ${actionText} nhân sự`);
    } finally {
      finishConfirmation();
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (staffSubmitting) return;
    if (!staffForm.email.trim() || !staffForm.fullName.trim() || !staffForm.password.trim()) {
      toast.error('Vui lòng điền đầy đủ Email, Họ tên và Mật khẩu');
      return;
    }
    if (staffForm.password.length < 6) {
      toast.error('Mật khẩu khởi tạo tối thiểu 6 ký tự');
      return;
    }
    if (staffForm.role === 'SHOP_MANAGER' && !staffForm.storeId) {
      toast.error('Vui lòng chọn cửa hàng phụ trách cho quản lý');
      return;
    }

    setStaffSubmitting(true);
    try {
      const newStaff = await personnelService.createStaff(staffForm);
      toast.success(`Bổ nhiệm thành công nhân sự ${newStaff.fullName}!`);
      setIsStaffModalOpen(false);
      setStaffForm({
        email: '',
        fullName: '',
        phoneNumber: '',
        password: '',
        role: 'SHOP_MANAGER',
        storeId: stores[0]?.id || '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể bổ nhiệm nhân sự');
    } finally {
      setStaffSubmitting(false);
    }
  };

  // Open Create Store Modal with clean state
  const handleOpenCreateStoreModal = () => {
    setStoreForm({
      name: '',
      categoryName: DEFAULT_CATEGORIES[0],
      description: '',
      logoUrl: '',
      defaultCommissionRate: 10,
      warehouseName: '',
      contactName: '',
      contactPhone: '',
      provinceCode: '',
      provinceName: '',
      districtCode: '',
      districtName: '',
      wardCode: '',
      wardName: '',
      detailAddress: '',
      ghnDistrictId: 1442,
      ghnWardCode: '20109',
    });
    setIsStoreModalOpen(true);
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (storeSubmitting || uploadingLogo) return;
    if (!storeForm.name.trim()) {
      toast.error('Vui lòng nhập tên Cửa hàng / Nhãn hàng');
      return;
    }
    if (!storeForm.categoryName.trim()) {
      toast.error('Vui lòng chọn ngành hàng kinh doanh cố định');
      return;
    }
    if (!storeForm.provinceName || !storeForm.districtName || !storeForm.wardName) {
      toast.error('Vui lòng chọn đầy đủ Tỉnh/Thành phố, Quận/Huyện và Phường/Xã cho kho GHN');
      return;
    }
    if (!storeForm.detailAddress.trim()) {
      toast.error('Vui lòng nhập địa chỉ chi tiết kho (số nhà, tên đường, KCN...)');
      return;
    }

    if (!storeForm.contactName.trim() || !/^0[0-9]{9}$/.test(storeForm.contactPhone.trim())) {
      toast.error('Nhập người liên hệ và điện thoại kho hợp lệ gồm 10 chữ số');
      return;
    }

    const fullAddress = [
      storeForm.detailAddress.trim(),
      storeForm.wardName,
      storeForm.districtName,
      storeForm.provinceName,
    ]
      .filter(Boolean)
      .join(', ');

    setStoreSubmitting(true);
    try {
      await personnelService.createStore({
        name: storeForm.name.trim(),
        categoryName: storeForm.categoryName.trim(),
        defaultCommissionRate: 10,
        description: storeForm.description.trim() || undefined,
        logoUrl: storeForm.logoUrl.trim() || undefined,
        warehouseName: storeForm.warehouseName.trim() || `Kho Tổng ${storeForm.name.trim()}`,
        contactName: storeForm.contactName.trim(),
        contactPhone: storeForm.contactPhone.trim(),
        warehouseAddress: fullAddress,
        provinceCode: storeForm.provinceCode,
        provinceName: storeForm.provinceName,
        districtCode: storeForm.districtCode,
        districtName: storeForm.districtName,
        wardCode: storeForm.wardCode,
        wardName: storeForm.wardName,
        detailAddress: storeForm.detailAddress.trim(),
        ghnDistrictId: Number(storeForm.ghnDistrictId) || 1442,
        ghnWardCode: String(storeForm.ghnWardCode || '20109'),
      });
      toast.success(`Đã khởi tạo nhãn hàng "${storeForm.name}" thành công!`);
      setIsStoreModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể tạo Cửa hàng mới');
    } finally {
      setStoreSubmitting(false);
    }
  };

  // Open Store Detail
  const handleOpenStoreDetail = (store: AdminStoreOption) => {
    setSelectedStore(store);
    const wh = store.returnWarehouse || {};
    const province = shippingProvinces.find((p) => String(p.code) === String(wh.provinceCode));
    const district = province?.districts.find((d) => String(d.code) === String(wh.districtCode));
    const ward = district?.wards.find((w) => String(w.code) === String(wh.wardCode));
    setEditStoreForm({
      name: store.name,
      categoryName: store.categoryName || DEFAULT_CATEGORIES[0],
      description: store.description || '',
      logoUrl: store.logoUrl || '',
      warehouseName: wh.warehouseName || `Kho Tổng ${store.name}`,
      contactName: wh.contactName || '',
      contactPhone: wh.contactPhone || '',
      provinceCode: wh.provinceCode || '',
      provinceName: province?.name || wh.provinceName || '',
      districtCode: wh.districtCode || '',
      districtName: district?.name || wh.districtName || '',
      wardCode: wh.wardCode || '',
      wardName: ward?.name || wh.wardName || '',
      detailAddress: wh.detailAddress || wh.address || '',
      warehouseAddress: wh.address || '',
      ghnDistrictId: wh.ghnDistrictId || 1442,
      ghnWardCode: wh.ghnWardCode || '20109',
      ownerId: store.ownerId || '',
    });
    setIsEditStoreMode(false);
    setIsStoreDetailOpen(true);
  };

  // Toggle Store Active Status
  const handleToggleStoreStatus = async (store: AdminStoreOption) => {
    const nextStatus = !store.isActive;
    const actionText = nextStatus ? 'kích hoạt hoạt động' : 'tạm ngưng hoạt động';
    if (!await requestConfirmation({ title: nextStatus ? 'Kích hoạt nhãn hàng' : 'Tạm ngưng nhãn hàng', name: store.name, description: nextStatus ? 'Khôi phục trạng thái hoạt động của nhãn hàng.' : 'Chuyển nhãn hàng sang trạng thái tạm ngưng.', label: nextStatus ? 'Kích hoạt' : 'Tạm ngưng', danger: !nextStatus })) {
      return;
    }
    try {
      await personnelService.toggleStoreStatus(store.id, nextStatus);
      toast.success(`Đã ${actionText} nhãn hàng "${store.name}"`);
      setStores((prev) =>
        prev.map((st) => (st.id === store.id ? { ...st, isActive: nextStatus } : st)),
      );
      if (selectedStore?.id === store.id) {
        setSelectedStore((prev) => (prev ? { ...prev, isActive: nextStatus } : null));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Lỗi khi ${actionText}`);
    } finally {
      finishConfirmation();
    }
  };

  // Restore Soft-Deleted Store
  const handleRestoreStore = async (store: AdminStoreOption) => {
    if (!await requestConfirmation({ title: 'Khôi phục nhãn hàng', name: store.name, description: 'Đưa nhãn hàng từ kho lưu trữ trở lại hoạt động.', label: 'Khôi phục' })) {
      return;
    }
    try {
      await personnelService.restoreStore(store.id);
      toast.success(`Đã khôi phục nhãn hàng "${store.name}" thành công!`);
      loadData();
      if (selectedStore?.id === store.id) {
        setSelectedStore((prev) => (prev ? { ...prev, isDeleted: false, isActive: true } : null));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi khôi phục gian hàng');
    } finally {
      finishConfirmation();
    }
  };

  // Update Store Details
  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore || editStoreSubmitting || uploadingEditLogo) return;
    if (!editStoreForm.name.trim()) {
      toast.error('Tên gian hàng không được để trống');
      return;
    }

    const fullAddress = [
      editStoreForm.detailAddress.trim(),
      editStoreForm.wardName,
      editStoreForm.districtName,
      editStoreForm.provinceName,
    ]
      .filter(Boolean)
      .join(', ') || editStoreForm.warehouseAddress;

    setEditStoreSubmitting(true);
    try {
      const updated = await personnelService.updateStore(selectedStore.id, {
        name: editStoreForm.name.trim(),
        categoryName: editStoreForm.categoryName.trim(),
        description: editStoreForm.description.trim(),
        logoUrl: editStoreForm.logoUrl.trim() || undefined,
        warehouseName: editStoreForm.warehouseName.trim(),
        contactName: editStoreForm.contactName.trim(),
        contactPhone: editStoreForm.contactPhone.trim(),
        warehouseAddress: fullAddress,
        provinceCode: editStoreForm.provinceCode,
        provinceName: editStoreForm.provinceName,
        districtCode: editStoreForm.districtCode,
        districtName: editStoreForm.districtName,
        wardCode: editStoreForm.wardCode,
        wardName: editStoreForm.wardName,
        detailAddress: editStoreForm.detailAddress.trim(),
        ghnDistrictId: Number(editStoreForm.ghnDistrictId) || 1442,
        ghnWardCode: String(editStoreForm.ghnWardCode || '20109'),
        ownerId: editStoreForm.ownerId || undefined,
      });
      toast.success('Đã cập nhật thông tin nhãn hàng thành công!');
      setIsEditStoreMode(false);
      loadData();
      setSelectedStore(updated);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể cập nhật gian hàng');
    } finally {
      setEditStoreSubmitting(false);
    }
  };

  // Archive Store (Soft Delete)
  const handleDeleteStore = async (store: AdminStoreOption) => {
    if (!await requestConfirmation({ title: 'Lưu trữ nhãn hàng', name: store.name, description: 'Chuyển vào kho lưu trữ. Dữ liệu đơn hàng và thù lao được bảo lưu, nhãn hàng có thể khôi phục.', label: 'Lưu trữ', danger: true })) {
      return;
    }
    try {
      await personnelService.deleteStore(store.id);
      toast.success(`Đã chuyển nhãn hàng "${store.name}" vào kho lưu trữ!`);
      setIsStoreDetailOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi lưu trữ gian hàng');
    } finally {
      finishConfirmation();
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchQuery =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phoneNumber && s.phoneNumber.includes(searchQuery));
    const matchRole = roleFilter === 'ALL' || s.role === roleFilter;
    return matchQuery && matchRole;
  });

  const staffTotalPages = Math.max(1, Math.ceil(filteredStaff.length / 10));
  const currentStaffPage = Math.min(staffPage, staffTotalPages);
  const pagedStaff = filteredStaff.slice((currentStaffPage - 1) * 10, currentStaffPage * 10);

  const filteredStores = stores.filter((st) => {
    const matchQuery =
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.categoryName && st.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (st.owner?.role === 'SHOP_MANAGER' && st.owner.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchStatus = true;
    if (storeStatusFilter === 'ACTIVE') {
      matchStatus = !st.isDeleted && st.isActive;
    } else if (storeStatusFilter === 'PAUSED') {
      matchStatus = !st.isDeleted && !st.isActive;
    } else if (storeStatusFilter === 'ARCHIVED') {
      matchStatus = !!st.isDeleted;
    }

    return matchQuery && matchStatus;
  });

  const totalShopManagers = staffList.filter((s) => s.role === 'SHOP_MANAGER').length;
  const totalSystemManagers = staffList.filter((s) => s.role === 'SYSTEM_MANAGER').length;
  const activeStoresCount = stores.filter((s) => !s.isDeleted && s.isActive).length;
  const pausedStoresCount = stores.filter((s) => !s.isDeleted && !s.isActive).length;
  const archivedStoresCount = stores.filter((s) => s.isDeleted).length;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#EAE4D7] bg-white">
        <div role="tablist" aria-label="Nhóm nhân sự" className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 lg:grid-cols-5">
          {([
            ['ALL', 'Tất cả nhân sự', staffList.length],
            ['SHOP_MANAGER', 'Quản lý cửa hàng', totalShopManagers],
            ['SYSTEM_MANAGER', 'Vận hành', totalSystemManagers],
            ['SYSTEM_ADMIN', 'Quản trị hệ thống', staffList.filter((s) => s.role === 'SYSTEM_ADMIN').length],
            ['STORES', 'Cửa hàng & Kho', stores.length],
          ] as const).map(([value, label, count], index) => (
            <div key={value} className="min-w-0">
              <button type="button" role="tab" aria-selected={roleFilter === value} onClick={() => setRoleFilter(value)} className={`flex h-[60px] w-full items-center justify-center gap-2 rounded-[10px] border px-3.5 text-[13px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#C59B58] ${roleFilter === value ? 'border-[#EEDFC6] bg-[#FBF5EB] font-semibold text-[#8F682E]' : 'border-[#EAE4D7] bg-white font-medium text-[#655A49] hover:bg-[#FAF8F5]'}`}>
                <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white text-xs font-normal tabular-nums ${roleFilter === value ? 'border-[#C59B58] text-[#8F682E]' : 'border-[#EAE4D7] text-[#7D715E]'}`}>{index + 1}</span>
                <span className="min-w-0 text-center leading-[1.5]">{label}</span>
                <span className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-[7px] border border-[#EEDFC6] bg-[#FBF5EB] px-1.5 text-[11px] font-medium tabular-nums text-[#8F682E]">{count}</span>
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-[#EAE4D7] p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7D715E]" />
            <input aria-label="Tìm nhân sự hoặc cửa hàng" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={roleFilter === 'STORES' ? 'Tìm cửa hàng, ngành hàng…' : 'Tìm tên, email, điện thoại…'} className="h-[42px] w-full rounded-lg border border-[#EAE4D7] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#C59B58]" />
          </div>
          <button type="button" onClick={handleOpenCreateStoreModal} className="inline-flex h-[42px] items-center gap-2 rounded-lg border border-[#EAE4D7] px-4 text-[13px] font-semibold hover:bg-[#FAF8F5]"><Store size={16} />Thêm cửa hàng</button>
          <button type="button" onClick={() => setIsStaffModalOpen(true)} className="inline-flex h-[42px] items-center gap-2 rounded-lg bg-[#C59B58] px-4 text-[13px] font-semibold text-[#231D15] hover:bg-[#B88E4F]"><UserPlus size={16} />Bổ nhiệm nhân sự</button>
        </div>
      </section>

      {/* 3. Vùng Nội Dung */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-[#EAE4D7] text-[#7D715E]">
          <RefreshCw className="w-6 h-6 animate-spin text-[#B88E4F] mb-2" />
          <p className="text-xs">Đang tải dữ liệu nhân sự & cửa hàng...</p>
        </div>
      ) : roleFilter === 'STORES' ? (
        /* ================= TAB GIAN HÀNG & KHO GHN (BRAND GRID) ================= */
        <div className="space-y-4">
          <div className="rounded-xl border border-[#EAE4D7] bg-white p-2.5 sm:p-3" role="group" aria-label="Trạng thái cửa hàng">
            <div className="grid grid-cols-2 gap-y-2 sm:grid-cols-4">
              {([
                ['ALL', 'Tất cả', stores.length],
                ['ACTIVE', 'Hoạt động', activeStoresCount],
                ['PAUSED', 'Tạm ngưng', pausedStoresCount],
                ['ARCHIVED', 'Đã lưu trữ', archivedStoresCount],
              ] as const).map(([value, label, count], index) => (
                <div key={value} className="relative min-w-0 px-1.5">
                  {index > 0 && <span aria-hidden="true" className={`pointer-events-none absolute left-0 top-1/2 h-5 w-px -translate-y-1/2 bg-[#EAE4D7] ${index === 2 ? 'hidden sm:block' : ''}`} />}
                  <button type="button" aria-pressed={storeStatusFilter === value} onClick={() => setStoreStatusFilter(value)}
                    className={`flex h-[42px] w-full items-center justify-center gap-2 rounded-lg border px-2 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#C59B58] ${storeStatusFilter === value ? 'border-[#EEDFC6] bg-[#FBF5EB] font-semibold text-[#231D15]' : 'border-transparent bg-white text-[#655A49] hover:bg-[#FAF8F5]'}`}>
                    <span>{label}</span><span className="tabular-nums text-[#7D715E]">{count}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {filteredStores.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-[#EAE4D7] text-[#7D715E] text-xs">
              Không tìm thấy gian hàng nào phù hợp với bộ lọc.
            </div>
          ) : (
            <section aria-label="Danh sách cửa hàng" className="rounded-xl border border-[#EAE4D7] bg-white p-3 sm:p-4">
              <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredStores.map((st) => {
                  const wh = st.returnWarehouse;
                  const isArchived = !!st.isDeleted;
                  const warehouseReady = !!(wh?.contactName?.trim() && wh.contactPhone?.trim() && wh.detailAddress?.trim() && Number(wh.ghnDistrictId) > 0 && wh.ghnWardCode?.trim());
                  return (
                    <article key={st.id} className="flex min-w-0 flex-col rounded-xl border border-[#EAE4D7] bg-white p-4 transition-colors hover:border-[#C59B58]">
                      <header className="flex min-h-[60px] items-start gap-3">
                        {st.logoUrl ? <img src={st.logoUrl} onError={handleStoreImageError} alt={st.name} className="h-10 w-10 shrink-0 rounded-lg border border-[#EAE4D7] object-contain" /> : <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] text-xs font-semibold text-[#8F682E]">{st.name.slice(0, 2).toUpperCase()}</div>}
                        <div className="min-w-0 flex-1">
                          <h3 title={st.name} className="m-0 line-clamp-2 text-sm font-semibold leading-5 text-[#1A1612]">{st.name}</h3>
                          <p title={st.categoryName || ''} className="m-0 mt-1 line-clamp-2 text-xs leading-4 text-[#7D715E]">{st.categoryName || 'Chưa cập nhật ngành hàng'}</p>
                        </div>
                        <span className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium ${isArchived ? 'border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E]' : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#8F682E]'}`}>
                          {isArchived ? 'Đã lưu trữ' : st.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                        </span>
                      </header>
                      <dl className="my-3 flex-1 space-y-2.5 border-t border-[#EAE4D7] pt-3 text-[13px]">
                        <div className="flex items-start justify-between gap-3"><dt className="shrink-0 text-[#7D715E]">Quản lý</dt><dd className="m-0 break-words text-right font-medium text-[#1A1612]">{st.owner?.role === 'SHOP_MANAGER' ? st.owner.fullName : 'Chưa phân công'}</dd></div>
                        <div className="flex items-center justify-between gap-3"><dt className="text-[#7D715E]">Sản phẩm</dt><dd className="m-0 font-medium tabular-nums text-[#1A1612]">{st._count?.products ?? '—'}</dd></div>
                        <div className="flex items-center justify-between gap-3"><dt className="text-[#7D715E]">Kho xuất hàng</dt><dd className={`m-0 text-right font-medium ${warehouseReady ? 'text-[#8F682E]' : 'text-[#7D715E]'}`}>{warehouseReady ? 'Đã cấu hình' : 'Chưa đủ thông tin'}</dd></div>
                      </dl>
                      <footer className="grid grid-cols-2 gap-2 border-t border-[#EAE4D7] pt-3">
                        <button type="button" onClick={() => handleOpenStoreDetail(st)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-2 text-xs font-semibold text-[#231D15] transition-colors hover:bg-[#F3EFE6]"><Eye size={14} />Xem chi tiết</button>
                        {isArchived ? <button type="button" onClick={() => handleRestoreStore(st)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#EAE4D7] bg-white px-2 text-xs font-medium text-[#8F682E] transition-colors hover:bg-[#FAF8F5]"><RotateCcw size={14} />Khôi phục</button> : <button type="button" onClick={() => handleToggleStoreStatus(st)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#EAE4D7] bg-white px-2 text-xs font-medium text-[#655A49] transition-colors hover:bg-[#FAF8F5]"><Power size={14} />{st.isActive ? 'Tạm ngưng' : 'Kích hoạt'}</button>}
                      </footer>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* ================= TAB NHÂN SỰ NỘI BỘ ================= */
        <section aria-label="Danh sách nhân sự" className="overflow-hidden rounded-xl border border-[#EAE4D7] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] table-fixed border-collapse text-left text-[13px]">
              <colgroup><col style={{width:'30%'}} /><col style={{width:'18%'}} /><col style={{width:'22%'}} /><col style={{width:'12%'}} /><col style={{width:'12%'}} /><col style={{width:'6%'}} /></colgroup>
              <thead className="bg-[#FAF8F5] text-xs font-medium text-[#7D715E]"><tr className="border-b border-[#EAE4D7]">
                {['Nhân sự', 'Vai trò', 'Phụ trách', 'Điện thoại', 'Trạng thái', 'Thao tác'].map((label, index) => <th key={label} scope="col" className={`h-11 px-4 font-medium ${index === 5 ? 'text-right' : ''}`}>{label}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-[#EAE4D7]">
                {pagedStaff.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-[#7D715E]">Không tìm thấy nhân sự phù hợp.</td></tr> : pagedStaff.map((staff) => {
                  const assignedStore = staff.stores?.[0];
                  return <tr key={staff.id} className="h-[72px] transition-colors hover:bg-[#FAF8F5]">
                    <td className="px-4 py-3"><div className="flex min-w-0 items-center gap-2.5"><span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#EEDFC6] bg-[#F3EFE6] text-xs font-semibold text-[#8F682E]">{staff.fullName?.charAt(0).toUpperCase() || '—'}</span><div className="min-w-0"><p title={staff.fullName} className="m-0 truncate text-[13px] font-semibold leading-5 text-[#1A1612]">{staff.fullName}</p><p title={staff.email} className="m-0 truncate text-xs leading-5 text-[#7D715E]">{staff.email}</p></div></div></td>
                    <td className="px-4 py-3"><span className={`inline-flex h-6 max-w-full items-center gap-1.5 whitespace-nowrap rounded-md border px-2 text-[11px] font-medium ${staff.role === 'SYSTEM_ADMIN' ? 'border-[#231D15] bg-[#231D15] text-white' : staff.role === 'SYSTEM_MANAGER' ? 'border-[#EAE4D7] bg-white text-[#655A49]' : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#8F682E]'}`}>{staff.role === 'SHOP_MANAGER' ? <Store size={13} className="shrink-0" /> : <ShieldCheck size={13} className="shrink-0" />}{staff.role === 'SYSTEM_ADMIN' ? 'Quản trị hệ thống' : staff.role === 'SYSTEM_MANAGER' ? 'Vận hành' : 'Quản lý cửa hàng'}</span></td>
                    <td className="px-4 py-3"><span title={assignedStore?.name || ''} className={`block truncate ${assignedStore ? 'font-medium text-[#1A1612]' : 'text-[#7D715E]'}`}>{assignedStore?.name || (staff.role === 'SHOP_MANAGER' ? 'Chưa phân công' : 'Toàn hệ thống')}</span>{staff.stores && staff.stores.length > 1 && <span title={staff.stores.slice(1).map(store => store.name).join(', ')} className="text-xs text-[#7D715E]">+{staff.stores.length - 1} cửa hàng</span>}</td>
                    <td className="px-4 py-3 text-xs tabular-nums text-[#655A49]">{staff.phoneNumber || <span className="text-[#7D715E]">Chưa cập nhật</span>}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-[#655A49]"><span aria-hidden="true" className={`size-1.5 rounded-full ${staff.isActive ? 'bg-[#059669]' : 'bg-[#DC2626]'}`} />{staff.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}</span></td>
                    <td className="px-4 py-3 text-right">{staff.role === 'SYSTEM_ADMIN' ? <span aria-label="Không có thao tác khả dụng" className="text-[#7D715E]">—</span> : <button type="button" aria-label={`Thao tác nhân sự ${staff.fullName}`} aria-haspopup="dialog" aria-expanded={staffMenu?.staff.id === staff.id} onClick={(event) => {
                      if (staffMenu?.staff.id === staff.id) { setStaffMenu(null); return; }
                      staffMenuTrigger.current = event.currentTarget;
                      const rect = event.currentTarget.getBoundingClientRect();
                      setStaffMenu({ staff, left: Math.max(8, Math.min(rect.right - 224, window.innerWidth - 232)), top: rect.bottom + 58 < window.innerHeight ? rect.bottom + 6 : rect.top - 58 });
                    }} className="inline-flex size-[34px] items-center justify-center rounded-lg border border-[#EAE4D7] bg-white text-[#655A49] hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#C59B58]"><MoreHorizontal size={17} /></button>}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EAE4D7] px-4 py-3 text-xs text-[#7D715E]">
            <span className="tabular-nums">{filteredStaff.length ? `${(currentStaffPage - 1) * 10 + 1}–${Math.min(currentStaffPage * 10, filteredStaff.length)}` : '0'} / {filteredStaff.length} nhân sự</span>
            {staffTotalPages > 1 && <nav aria-label="Phân trang nhân sự" className="flex items-center gap-3"><button type="button" disabled={currentStaffPage === 1} onClick={() => setStaffPage(currentStaffPage - 1)} className="h-8 rounded-lg border border-[#EAE4D7] bg-white px-3 hover:bg-[#FBF5EB] disabled:opacity-40">Trước</button><span className="tabular-nums">{currentStaffPage}/{staffTotalPages}</span><button type="button" disabled={currentStaffPage === staffTotalPages} onClick={() => setStaffPage(currentStaffPage + 1)} className="h-8 rounded-lg border border-[#EAE4D7] bg-white px-3 hover:bg-[#FBF5EB] disabled:opacity-40">Sau</button></nav>}
          </footer>
        </section>
      )}
      {staffMenu && createPortal(<div ref={staffMenuRef} role="dialog" aria-label="Thao tác nhân sự" style={{top: staffMenu.top, left: staffMenu.left}} className="fixed z-[60] w-56 rounded-lg border border-[#EAE4D7] bg-white p-1.5 shadow-lg"><button type="button" onClick={() => { const staff = staffMenu.staff; setStaffMenu(null); void handleToggleStatus(staff); }} className={`flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-[13px] hover:bg-[#FAF8F5] ${staffMenu.staff.isActive ? 'text-[#DC2626]' : 'text-[#8F682E]'}`}><Power size={15} />{staffMenu.staff.isActive ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt tài khoản'}</button></div>, document.body)}

      {/* ================= MODAL 1: BỔ NHIỆM NHÂN SỰ NỘI BỘ ================= */}
      {isStaffModalOpen && (
        <Modal isOpen onClose={() => { if (!staffSubmitting) setIsStaffModalOpen(false); }} title="Bổ nhiệm nhân sự" stickyHeader maxWidth="2xl" className="max-w-[600px]" bodyClassName="p-4 sm:p-5"
          footer={<div className="flex justify-end gap-2">
            <button type="button" disabled={staffSubmitting} onClick={() => setIsStaffModalOpen(false)} className="h-[42px] rounded-lg border border-[#EAE4D7] bg-white px-5 text-sm disabled:opacity-50">Hủy</button>
            <button type="submit" form="create-staff-form" disabled={staffSubmitting} className="inline-flex h-[42px] items-center gap-2 rounded-lg bg-[#C59B58] px-5 text-sm font-semibold text-[#231D15] hover:bg-[#B88E4F] disabled:opacity-50">{staffSubmitting && <Loader2 size={16} className="animate-spin" />}{staffSubmitting ? 'Đang lưu…' : 'Bổ nhiệm nhân sự'}</button>
          </div>}>
<form id="create-staff-form" onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                  Vai trò quản trị <span className="text-[#DC2626]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStaffForm((prev) => ({ ...prev, role: 'SHOP_MANAGER' }))}
                    className={`h-[42px] rounded-lg border text-[13px] font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                      staffForm.role === 'SHOP_MANAGER'
                        ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8F682E]'
                        : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:border-[#EEDFC6]'
                    }`}
                  >
                    <Store size={14} />
                    <span>Quản lý cửa hàng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffForm((prev) => ({ ...prev, role: 'SYSTEM_MANAGER' }))}
                    className={`h-[42px] rounded-lg border text-[13px] font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                      staffForm.role === 'SYSTEM_MANAGER'
                        ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8F682E]'
                        : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:border-[#EEDFC6]'
                    }`}
                  >
                    <ShieldCheck size={14} />
                    <span>Vận hành</span>
                  </button>
                </div>
              </div>

              <div className={staffForm.role === 'SHOP_MANAGER' ? '' : 'invisible'} aria-hidden={staffForm.role !== 'SHOP_MANAGER'} inert={staffForm.role !== 'SHOP_MANAGER'}>
                  <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                    Cửa hàng phụ trách <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                  <select
                    disabled={staffForm.role !== 'SHOP_MANAGER'}
                    value={staffForm.storeId || ''}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, storeId: e.target.value }))}
                    aria-label="Cửa hàng phụ trách" className="h-[42px] w-full appearance-none! rounded-lg border border-[#EAE4D7] bg-white px-3 pr-10 py-0 text-sm leading-[40px] focus:outline-none focus:border-[#C59B58] [&::picker-icon]:hidden"
                  >
                    <option value="">Chọn cửa hàng phụ trách</option>
                    {stores
                      .filter((st) => !st.isDeleted)
                      .map((st) => {
                        const hasRealManager = st.owner && st.owner.role === 'SHOP_MANAGER';
                        return (
                          <option key={st.id} value={st.id}>
                            {st.name} {hasRealManager ? `(${st.owner?.fullName})` : '(Chưa có quản lý)'}
                          </option>
                        );
                      })}
                  </select>
                    <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs leading-none text-[#7D715E]">▼</span>
                  </div>
                </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                  Họ và tên nhân sự <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trần Quản Lý"
                  value={staffForm.fullName}
                  onChange={(e) => setStaffForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="h-[42px] w-full px-3 rounded-lg border border-[#EAE4D7] text-sm bg-white focus:outline-none focus:border-[#C59B58]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                    Email công ty <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="brand.sora@scanms.vn"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="h-[42px] w-full px-3 rounded-lg border border-[#EAE4D7] text-sm bg-white focus:outline-none focus:border-[#C59B58]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    placeholder="0901234567"
                    value={staffForm.phoneNumber || ''}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    className="h-[42px] w-full px-3 rounded-lg border border-[#EAE4D7] text-sm bg-white focus:outline-none focus:border-[#C59B58]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                  Mật khẩu khởi tạo <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    autoComplete="new-password" type={showPassword ? 'text' : 'password'}
                    placeholder="Tối thiểu 6 ký tự"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="h-[42px] w-full px-3 pr-10 rounded-lg border border-[#EAE4D7] text-sm bg-white focus:outline-none focus:border-[#C59B58]"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7D715E] hover:text-[#1A1612] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

</form>
        </Modal>
      )}

      {/* ================= MODAL 2: KHỞI TẠO CỬA HÀNG (Widescreen 2 Cột, Logo Upload, Address Chuẩn Customer) ================= */}
      {isStoreModalOpen && (
        <Modal isOpen onClose={() => { if (!storeSubmitting) setIsStoreModalOpen(false); }} title="Tạo cửa hàng" stickyHeader maxWidth="5xl" className="max-w-[960px]" bodyClassName="p-4 sm:p-5"
          footer={<div className="flex justify-end gap-2">
            <button type="button" disabled={storeSubmitting} onClick={() => setIsStoreModalOpen(false)} className="h-[42px] rounded-lg border border-[#EAE4D7] bg-white px-5 text-sm disabled:opacity-50">Hủy</button>
            <button type="submit" form="create-store-form" disabled={storeSubmitting || uploadingLogo} className="inline-flex h-[42px] items-center gap-2 rounded-lg bg-[#C59B58] px-5 text-sm font-semibold text-[#231D15] hover:bg-[#B88E4F] disabled:opacity-50">{storeSubmitting && <Loader2 size={16} className="animate-spin" />}{storeSubmitting ? 'Đang lưu…' : 'Tạo cửa hàng'}</button>
          </div>}>
<form id="create-store-form" onSubmit={handleCreateStore} className="space-y-4">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-0 md:divide-x md:divide-[#EAE4D7]">
                {/* Cột 1: Thông tin thương hiệu & Logo Upload */}
                <div className="space-y-4 md:pr-5">
                  <div className="text-xs font-bold text-[#1A1612] uppercase tracking-wider pb-1 border-b border-[#FAF8F5]">
                    Thông tin cửa hàng
                  </div>

                  {/* Logo Upload (Ảnh thật, không dùng URL text) */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                      Ảnh đại diện / Logo nhãn hàng
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-14 rounded-xl border border-[#EEDFC6] bg-[#FAF8F5] overflow-hidden flex items-center justify-center shrink-0">
                        {storeForm.logoUrl ? (
                          <img
                            src={storeForm.logoUrl}
                            alt="Logo nhãn hàng"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Store className="w-6 h-6 text-[#C59B58]" />
                        )}
                        {uploadingLogo && (
                          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin text-[#B88E4F]" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 min-w-0">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#FBF5EB] hover:border-[#C59B58] text-xs font-semibold text-[#1A1612] cursor-pointer transition shadow-2xs">
                          <Upload size={13} className="text-[#B88E4F]" />
                          <span>{uploadingLogo ? 'Đang tải lên...' : storeForm.logoUrl ? 'Đổi ảnh logo' : 'Tải ảnh logo'}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className="hidden"
                            disabled={uploadingLogo}
                            onChange={(e) => handleLogoFileSelected(e, 'create')}
                          />
                        </label>
                        <span className="text-[10px] text-[#7D715E]">PNG, JPG, WEBP (Tối đa 5MB)</span>
                      </div>

                      {storeForm.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setStoreForm((prev) => ({ ...prev, logoUrl: '' }))}
                          className="text-xs text-[#DC2626] hover:underline cursor-pointer ml-auto"
                        >
                          Gỡ ảnh
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Store Name */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                      Tên cửa hàng <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Sora Skincare & Cosmetics"
                      value={storeForm.name}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="h-[42px] w-full px-3 rounded-lg border border-[#EAE4D7] text-sm bg-white focus:outline-none focus:border-[#C59B58]"
                    />
                  </div>

                  {/* Category Selection (Locked to 4 In-House Core Categories) */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                      Ngành hàng <span className="text-[#DC2626]">*</span>
                    </label>

                    <select
                      value={storeForm.categoryName}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, categoryName: e.target.value }))}
                      className="h-[42px] w-full px-3 rounded-lg border border-[#EAE4D7] text-sm bg-white focus:outline-none focus:border-[#C59B58]"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                      Giới thiệu cửa hàng
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Giới thiệu sứ mệnh và dòng sản phẩm..."
                      value={storeForm.description || ''}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="h-[42px] w-full px-3 rounded-lg border border-[#EAE4D7] text-sm bg-white focus:outline-none focus:border-[#C59B58] resize-y min-h-[80px] py-2"
                    />
                  </div>
                </div>

                {/* Cột 2: Cấu hình Kho xuất hàng GHN (Chuẩn Customer: Tỉnh/Thành -> Quận/Huyện -> Phường/Xã -> Số nhà) */}
                <div className="space-y-4 md:pl-5">
                  <div className="text-xs font-bold text-[#1A1612] uppercase tracking-wider pb-1 border-b border-[#FAF8F5] flex items-center gap-1.5">
                    <MapPin size={13} className="text-[#C59B58]" />
                    <span>Kho xuất hàng GHN</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-[13px] font-medium">Người liên hệ *
                      <input required value={storeForm.contactName} onChange={(e) => setStoreForm((prev) => ({ ...prev, contactName: e.target.value }))} className="mt-1.5 h-[42px] w-full rounded-lg border border-[#EAE4D7] px-3 text-sm outline-none focus:border-[#C59B58]" />
                    </label>
                    <label className="text-[13px] font-medium">Điện thoại kho *
                      <input required type="tel" value={storeForm.contactPhone} onChange={(e) => setStoreForm((prev) => ({ ...prev, contactPhone: e.target.value }))} className="mt-1.5 h-[42px] w-full rounded-lg border border-[#EAE4D7] px-3 text-sm outline-none focus:border-[#C59B58]" />
                    </label>
                  </div>
                  {/* Tên kho */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                      Tên kho xuất hàng
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Kho Mát Dược Mỹ Phẩm GMP Thủ Đức"
                      value={storeForm.warehouseName || ''}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, warehouseName: e.target.value }))}
                      className="h-[42px] w-full px-3 rounded-lg border border-[#EAE4D7] text-sm bg-white focus:outline-none focus:border-[#C59B58]"
                    />
                  </div>


                  {/* Tỉnh / Thành phố */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                      Tỉnh / Thành phố <span className="text-[#DC2626]">*</span>
                    </label>
                    <CustomSelect
                      value={storeForm.provinceCode}
                      onChange={(code) => {
                        const p = shippingProvinces.find((item) => String(item.code) === String(code));
                        setStoreForm((prev) => ({
                          ...prev,
                          provinceCode: code,
                          provinceName: p?.name || '',
                          districtCode: '',
                          districtName: '',
                          wardCode: '',
                          wardName: '',
                        }));
                      }}
                      options={shippingProvinces.map((p) => ({ value: String(p.code), label: p.name }))}
                      placeholder="-- Chọn Tỉnh / Thành phố --"
                      required
                    />
                  </div>

                  {/* Quận / Huyện & Phường / Xã */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                        Quận / Huyện <span className="text-[#DC2626]">*</span>
                      </label>
                      <CustomSelect
                        value={storeForm.districtCode}
                        onChange={(code) => {
                          const d = createSelectedProvince?.districts.find(
                            (item) => String(item.code) === String(code),
                          );
                          setStoreForm((prev) => ({
                            ...prev,
                            districtCode: code,
                            districtName: d?.name || '',
                            wardCode: '',
                            wardName: '',
                            ghnDistrictId: Number(code) || 1442,
                          }));
                        }}
                        disabled={!createSelectedProvince}
                        options={(createSelectedProvince?.districts || []).map((d) => ({
                          value: String(d.code),
                          label: d.name,
                        }))}
                        placeholder="-- Chọn Quận / Huyện --"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                        Phường / Xã <span className="text-[#DC2626]">*</span>
                      </label>
                      <CustomSelect
                        value={storeForm.wardCode}
                        onChange={(code) => {
                          const w = createSelectedDistrict?.wards.find(
                            (item) => String(item.code) === String(code),
                          );
                          setStoreForm((prev) => ({
                            ...prev,
                            wardCode: code,
                            wardName: w?.name || '',
                            ghnWardCode: String(code || '20109'),
                          }));
                        }}
                        disabled={!createSelectedDistrict}
                        options={(createSelectedDistrict?.wards || []).map((w) => ({
                          value: String(w.code),
                          label: w.name,
                        }))}
                        placeholder="-- Chọn Phường / Xã --"
                        required
                      />
                    </div>
                  </div>

                  {/* Địa chỉ chi tiết */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                      Địa chỉ chi tiết (Số nhà, tên đường, KCN) <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Lô E2a-7, Đường D1, Khu Công nghệ cao"
                      value={storeForm.detailAddress}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, detailAddress: e.target.value }))}
                      className="h-[42px] w-full px-3 rounded-lg border border-[#EAE4D7] text-sm bg-white focus:outline-none focus:border-[#C59B58]"
                    />
                  </div>

                  {/* Address Summary Preview */}
                  {(storeForm.detailAddress || storeForm.wardName || storeForm.provinceName) && (
                    <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] text-[11px] text-[#7D715E]">
                      <span className="font-semibold text-[#1A1612] block mb-0.5">Địa chỉ xuất hàng dự kiến:</span>
                      <span>
                        {[
                          storeForm.detailAddress,
                          storeForm.wardName,
                          storeForm.districtName,
                          storeForm.provinceName,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

</form>
        </Modal>
      )}

      {/* ================= MODAL 3: XEM CHI TIẾT & CHỈNH SỬA GIAN HÀNG ================= */}
      {isStoreDetailOpen && selectedStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className={`bg-white rounded-2xl border border-[#EAE4D7] shadow-xl w-full ${isEditStoreMode ? 'max-w-[960px]' : 'max-w-[880px]'} overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col`}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE4D7] bg-white shrink-0">
              <div className="flex items-center gap-3">
                {selectedStore.logoUrl ? (
                  <img
                    src={selectedStore.logoUrl} onError={handleStoreImageError}
                    alt={selectedStore.name}
                    className="w-10 h-10 rounded-xl object-cover border border-[#EEDFC6]"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#C59B58] flex items-center justify-center font-bold text-sm">
                    {selectedStore.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#1A1612] m-0">{isEditStoreMode ? 'Chỉnh sửa cửa hàng' : selectedStore.name}</h2>
                    {selectedStore.isDeleted ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                        Đã lưu trữ
                      </span>
                    ) : selectedStore.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF5EB] text-[#059669] border border-[#EEDFC6]">
                        Đang hoạt động
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#D97706] border border-[#F5D8D4]">
                        Tạm ngưng
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#7D715E] block mt-0.5">
                    {isEditStoreMode ? selectedStore.name : selectedStore.categoryName || 'Chưa cập nhật ngành hàng'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsStoreDetailOpen(false)}
                  className="text-[#7D715E] hover:text-[#1A1612] p-1.5 rounded-md hover:bg-[#EAE4D7]/40 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Lưu ý nếu gian hàng đã lưu trữ */}
              {selectedStore.isDeleted && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] p-3 text-xs text-[#7D715E]">
                  <div className="flex items-center gap-2">
                    <Archive size={16} />
                    <span>Cửa hàng đã lưu trữ. Lịch sử đơn hàng và đối soát được giữ lại.</span>
                  </div>
                </div>
              )}

              {isEditStoreMode ? (
                /* ================= EDIT MODE ================= */
                <form id="edit-store-form" onSubmit={handleUpdateStore} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-0 md:divide-x md:divide-[#EAE4D7]">
                    {/* Cột 1: Thông tin thương hiệu */}
                    <div className="grid content-start gap-4 md:grid-rows-[20px_76px_68px_68px_68px_106px] md:pr-6">
                      <div className="text-sm font-semibold text-[#1A1612]">
                        Thông tin cửa hàng
                      </div>

                      {/* Logo Upload */}
                      <div>
                        <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                          Logo cửa hàng
                        </label>
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl border border-[#EEDFC6] bg-[#FAF8F5] overflow-hidden flex items-center justify-center shrink-0">
                            {editStoreForm.logoUrl ? (
                              <img
                                src={editStoreForm.logoUrl}
                                alt="Logo nhãn hàng"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Store className="w-6 h-6 text-[#C59B58]" />
                            )}
                            {uploadingEditLogo && (
                              <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
                                <Loader2 className="w-4 h-4 animate-spin text-[#B88E4F]" />
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-1 min-w-0">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#FBF5EB] hover:border-[#C59B58] text-xs font-semibold text-[#1A1612] cursor-pointer transition shadow-2xs">
                              <Upload size={13} className="text-[#B88E4F]" />
                              <span>{uploadingEditLogo ? 'Đang tải lên...' : editStoreForm.logoUrl ? 'Đổi logo' : 'Tải logo'}</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className="hidden"
                                disabled={uploadingEditLogo}
                                onChange={(e) => handleLogoFileSelected(e, 'edit')}
                              />
                            </label>
                            <span className="text-[10px] text-[#7D715E]">PNG, JPG, WEBP (Tối đa 5MB)</span>
                          </div>

                          {editStoreForm.logoUrl && (
                            <button
                              type="button"
                              onClick={() => setEditStoreForm((prev) => ({ ...prev, logoUrl: '' }))}
                              className="text-xs text-[#DC2626] hover:underline cursor-pointer ml-auto"
                            >
                              Gỡ ảnh
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                          Tên cửa hàng <span className="text-[#DC2626]">*</span>
                        </label>
                        <input
                          type="text"
                          value={editStoreForm.name}
                          onChange={(e) => setEditStoreForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="h-[42px] w-full px-3 py-0 rounded-lg border border-[#EAE4D7] text-sm bg-white focus:outline-none focus:border-[#C59B58]"
                        />
                      </div>

                      {/* Edit Store Category (Locked after store creation) */}
                      <div>
                        <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                          Ngành hàng <span className="text-[#DC2626]">*</span>
                        </label>

                        <div title="Ngành hàng được khóa theo cửa hàng" className="flex h-[42px] items-center rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] px-3 text-sm text-[#655A49]">{editStoreForm.categoryName || 'Chưa cập nhật'}</div>
                      </div>

                      <div>
                        <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                          Quản lý phụ trách
                        </label>
                        <div className="relative">                        <select
                          value={editStoreForm.ownerId}
                          onChange={(e) => setEditStoreForm((prev) => ({ ...prev, ownerId: e.target.value }))}
                          aria-label="Quản lý phụ trách" className="appearance-none! leading-[40px] pr-9! h-[42px] w-full px-3 py-0 rounded-lg border border-[#EAE4D7] text-sm bg-white focus:outline-none focus:border-[#C59B58]"
                        >
                          <option value="">-- Chưa chỉ định --</option>
                          {staffList
                            .filter((s) => s.role === 'SHOP_MANAGER')
                            .map((stf) => (
                              <option key={stf.id} value={stf.id}>
                                {stf.fullName} ({stf.email})
                              </option>
                            ))}
                        </select><span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7D715E]">▼</span></div>
                      </div>

                      <div>
                        <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                          Giới thiệu cửa hàng
                        </label>
                        <textarea
                          rows={3}
                          value={editStoreForm.description}
                          onChange={(e) => setEditStoreForm((prev) => ({ ...prev, description: e.target.value }))}
                          className="h-[42px] w-full px-3 py-0 rounded-lg border border-[#EAE4D7] text-sm bg-white focus:outline-none focus:border-[#C59B58] h-[80px]! py-2! resize-y"
                        />
                      </div>
                    </div>

                    {/* Cột 2: Cấu hình Kho xuất GHN (Chuẩn Customer) */}
                    <div className="grid content-start gap-4 border-t border-[#EAE4D7] pt-5 md:grid-rows-[20px_76px_68px_68px_68px_106px] md:border-t-0 md:pl-6 md:pt-0">
                      <div className="text-sm font-semibold text-[#1A1612]">
                        Kho xuất hàng GHN
                      </div>

                      <div className="space-y-1.5">
                        <p className="m-0 text-[13px] font-medium">Người phụ trách kho</p>
                        <div className="flex min-h-[48px] flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <span className="font-semibold">{editStoreForm.contactName || 'Chưa cập nhật người liên hệ'}</span>
                          <span className="tabular-nums text-[#7D715E]">{editStoreForm.contactPhone || 'Chưa cập nhật điện thoại'}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                          Tên kho
                        </label>
                        <input
                          type="text"
                          value={editStoreForm.warehouseName}
                          onChange={(e) => setEditStoreForm((prev) => ({ ...prev, warehouseName: e.target.value }))}
                          className="h-[42px] w-full px-3 py-0 rounded-lg border border-[#EAE4D7] text-sm bg-white focus:outline-none focus:border-[#C59B58]"
                        />
                      </div>

                      {/* Tỉnh / Thành phố */}
                      <div>
                        <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                          Tỉnh / Thành phố
                        </label>
                        <CustomSelect
                          className="[&>button]:h-[42px] [&>button]:min-h-[42px] [&>button]:rounded-lg [&>button]:bg-white [&>button]:py-0 [&>button]:font-normal"
                          value={editStoreForm.provinceCode}
                          onChange={(code) => {
                            const p = shippingProvinces.find((item) => String(item.code) === String(code));
                            setEditStoreForm((prev) => ({
                              ...prev,
                              provinceCode: code,
                              provinceName: p?.name || '',
                              districtCode: '',
                              districtName: '',
                              wardCode: '',
                              wardName: '',
                            }));
                          }}
                          options={shippingProvinces.map((p) => ({ value: String(p.code), label: p.name }))}
                          placeholder="-- Chọn Tỉnh / Thành phố --"
                        />
                      </div>

                      {/* Quận / Huyện & Phường / Xã */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                            Quận / Huyện
                          </label>
                          <CustomSelect
                          className="[&>button]:h-[42px] [&>button]:min-h-[42px] [&>button]:rounded-lg [&>button]:bg-white [&>button]:py-0 [&>button]:font-normal"
                            value={editStoreForm.districtCode}
                            onChange={(code) => {
                              const d = editSelectedProvince?.districts.find(
                                (item) => String(item.code) === String(code),
                              );
                              setEditStoreForm((prev) => ({
                                ...prev,
                                districtCode: code,
                                districtName: d?.name || '',
                                wardCode: '',
                                wardName: '',
                                ghnDistrictId: Number(code) || 1442,
                              }));
                            }}
                            disabled={!editSelectedProvince}
                            options={(editSelectedProvince?.districts || []).map((d) => ({
                              value: String(d.code),
                              label: d.name,
                            }))}
                            placeholder="-- Chọn Quận / Huyện --"
                          />
                        </div>

                        <div>
                          <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                            Phường / Xã
                          </label>
                          <CustomSelect
                          className="[&>button]:h-[42px] [&>button]:min-h-[42px] [&>button]:rounded-lg [&>button]:bg-white [&>button]:py-0 [&>button]:font-normal"
                            value={editStoreForm.wardCode}
                            onChange={(code) => {
                              const w = editSelectedDistrict?.wards.find(
                                (item) => String(item.code) === String(code),
                              );
                              setEditStoreForm((prev) => ({
                                ...prev,
                                wardCode: code,
                                wardName: w?.name || '',
                                ghnWardCode: String(code || '20109'),
                              }));
                            }}
                            disabled={!editSelectedDistrict}
                            options={(editSelectedDistrict?.wards || []).map((w) => ({
                              value: String(w.code),
                              label: w.name,
                            }))}
                            placeholder="-- Chọn Phường / Xã --"
                          />
                        </div>
                      </div>

                      {/* Địa chỉ chi tiết */}
                      <div>
                        <label className="block text-[13px] font-medium text-[#1A1612] mb-1.5">
                          Địa chỉ chi tiết
                        </label>
                        <textarea rows={3}
                          value={editStoreForm.detailAddress}
                          onChange={(e) => setEditStoreForm((prev) => ({ ...prev, detailAddress: e.target.value }))}
                          placeholder="Ví dụ: Lô B4 KCN Tân Bình, Tây Thạnh"
                          className="h-[80px] w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-sm bg-white focus:outline-none focus:border-[#C59B58]"
                        />
                      </div>
                    </div>
                  </div>

                </form>
              ) : (
                /* ================= VIEW MODE ================= */
                <div className="space-y-5 text-sm text-[#1A1612]">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-0 md:divide-x md:divide-[#EAE4D7]">
                    <section className="space-y-3 md:pr-5">
                      <h3 className="m-0 text-xs font-medium text-[#7D715E]">Quản lý phụ trách</h3>
                      <div className="flex items-center gap-3">
                        <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#EEDFC6] bg-[#FBF5EB] text-[#8F682E]">{selectedStore.owner?.role === 'SHOP_MANAGER' ? selectedStore.owner.fullName?.[0] : '—'}</div>
                        <div className="min-w-0"><p className="m-0 font-semibold">{selectedStore.owner?.role === 'SHOP_MANAGER' ? selectedStore.owner.fullName : 'Chưa phân công'}</p><p className="m-0 mt-1 break-all text-xs text-[#7D715E]">{selectedStore.owner?.role === 'SHOP_MANAGER' ? selectedStore.owner.email || 'Chưa cập nhật email' : 'Chưa có quản lý phụ trách'}</p></div>
                      </div>
                    </section>
                    <section className="space-y-3 border-t border-[#EAE4D7] pt-4 md:border-t-0 md:pl-5 md:pt-0">
                      <h3 className="m-0 text-xs font-medium text-[#7D715E]">Thông tin cửa hàng</h3>
                      <dl className="m-0 space-y-2.5">
                        <div className="flex justify-between gap-3"><dt className="text-[#7D715E]">Sản phẩm</dt><dd className="m-0 font-semibold tabular-nums">{selectedStore._count?.products ?? '—'}</dd></div>
                        <div className="flex justify-between gap-3"><dt className="text-[#7D715E]">Thù lao cơ sở</dt><dd className="m-0 font-semibold tabular-nums">{selectedStore.defaultCommissionRate != null ? `${selectedStore.defaultCommissionRate}%` : 'Chưa cập nhật'}</dd></div>
                      </dl>
                    </section>
                  </div>
                  <section className="space-y-2"><h3 className="m-0 text-xs font-medium text-[#7D715E]">Giới thiệu</h3><p className="m-0 whitespace-pre-wrap break-words leading-6">{selectedStore.description?.trim() || 'Chưa cập nhật'}</p></section>
                  <section className="space-y-4 border-t border-[#EAE4D7] pt-4">
                    <h3 className="m-0 flex items-center gap-2 text-sm font-semibold"><MapPin size={16} className="text-[#B88E4F]" />Kho xuất hàng</h3>
                    <dl className="m-0 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-0 md:divide-x md:divide-[#EAE4D7]">
                      <div className="space-y-1.5 md:pr-5"><dt className="text-xs text-[#7D715E]">Tên kho</dt><dd className="m-0 break-words font-medium">{selectedStore.returnWarehouse?.warehouseName?.trim() || 'Chưa cập nhật'}</dd></div>
                      <div className="space-y-1.5 md:pl-5"><dt className="text-xs text-[#7D715E]">Người liên hệ</dt><dd className="m-0 font-medium">{selectedStore.returnWarehouse?.contactName?.trim() || 'Chưa cập nhật'}</dd><dd className="m-0 tabular-nums">{selectedStore.returnWarehouse?.contactPhone?.trim() || 'Chưa cập nhật điện thoại'}</dd></div>
                    </dl>
                    <div className="space-y-1.5"><p className="m-0 text-xs text-[#7D715E]">Địa chỉ lấy hàng</p><p className="m-0 break-words leading-6">{selectedStore.returnWarehouse?.address?.trim() || [selectedStore.returnWarehouse?.detailAddress, selectedStore.returnWarehouse?.wardName, selectedStore.returnWarehouse?.districtName, selectedStore.returnWarehouse?.provinceName].filter(Boolean).join(', ') || 'Chưa cập nhật'}</p></div>
                    <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-[#7D715E]"><span>Mã địa bàn GHN</span><span>Quận/huyện: {selectedStore.returnWarehouse?.ghnDistrictId || 'Chưa cập nhật'}</span><span>Phường/xã: {selectedStore.returnWarehouse?.ghnWardCode?.trim() || 'Chưa cập nhật'}</span></p>
                  </section>

                  {/* Actions in View Mode */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#EAE4D7]">
                    {selectedStore.isDeleted ? (
                      <button
                        type="button"
                        onClick={() => handleRestoreStore(selectedStore)}
                        className="h-[42px] px-4 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] text-[#8F682E] text-sm font-medium transition flex items-center gap-2"
                      >
                        <RotateCcw size={13} />
                        <span>Khôi phục hoạt động</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleStoreStatus(selectedStore)}
                        className={`h-[42px] px-4 rounded-lg border text-sm font-medium transition flex items-center gap-2 ${
                          selectedStore.isActive
                            ? 'border-[#EAE4D7] text-[#7D715E] hover:text-[#DC2626] hover:bg-white'
                            : 'border-[#EEDFC6] text-[#059669] bg-[#FBF5EB] hover:bg-[#F3EFE6]'
                        }`}
                      >
                        <Power size={13} />
                        <span>{selectedStore.isActive ? 'Tạm ngưng cửa hàng' : 'Kích hoạt cửa hàng'}</span>
                      </button>
                    )}

                    {!selectedStore.isDeleted && (
                      <button
                        type="button"
                        onClick={() => setIsEditStoreMode(true)}
                        className="h-[42px] px-5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] text-sm font-semibold transition flex items-center gap-2"
                      >
                        <Edit2 size={13} />
                        <span>Chỉnh sửa</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            {isEditStoreMode && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-6 border-t border-[#EAE4D7]">
                    <button
                      type="button"
                      onClick={() => handleDeleteStore(selectedStore)}
                      className="h-[42px] px-4 rounded-lg border border-[#F5D8D4] text-[#DC2626] hover:bg-[#FEF2F2] text-sm font-semibold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      <span>Lưu trữ cửa hàng</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditStoreMode(false)}
                        className="h-[42px] px-4 rounded-lg border border-[#EAE4D7] text-sm font-semibold text-[#7D715E] hover:bg-[#FAF8F5] transition cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit" form="edit-store-form"
                        disabled={editStoreSubmitting || uploadingEditLogo}
                        className="inline-flex items-center gap-1.5 h-[42px] px-5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-[#231D15] text-sm font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {editStoreSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        {editStoreSubmitting ? 'Đang lưu…' : 'Lưu thay đổi'}
                      </button>
                    </div>
                  </div>
            )}
          </div>
        </div>
      )}
      {confirmation && <Modal isOpen title={confirmation.title} maxWidth="lg" stickyHeader
        onClose={closeConfirmation}
        footer={<div className="flex justify-end gap-2">
          <button type="button" disabled={confirming} onClick={closeConfirmation} className="h-[42px] rounded-lg border border-[#EAE4D7] bg-white px-5 text-sm font-medium text-[#231D15] hover:bg-[#FAF8F5] disabled:opacity-60">Hủy</button>
          <button type="button" disabled={confirming} onClick={() => {
            if (confirming) return;
            setConfirming(true);
            confirmationResolver.current?.(true);
          }} className={`inline-flex h-[42px] min-w-[140px] items-center justify-center gap-2 rounded-lg border px-5 text-sm font-semibold transition-colors disabled:opacity-60 ${confirmation.danger ? 'border-[#DC2626] bg-[#DC2626] text-white hover:bg-[#B91C1C]' : 'border-[#B88E4F] bg-[#C59B58] text-[#231D15] hover:bg-[#B88E4F]'}`}>
            {confirming && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {confirming ? 'Đang xử lý…' : confirmation.label}
          </button>
        </div>}
      >
        <div aria-busy={confirming} className="space-y-2 text-sm">
          <p className="m-0 font-semibold text-ink [overflow-wrap:anywhere]">{confirmation.name}</p>
          <p className="m-0 leading-6 text-muted">{confirmation.description}</p>
        </div>
      </Modal>}
    </div>
  );
};

export default AdminPersonnelPage;
