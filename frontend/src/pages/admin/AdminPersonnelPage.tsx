import React, { useState, useEffect } from 'react';
import {
  UserPlus,
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

const LOCKED_CATEGORIES = [
  'Mỹ phẩm & Chăm sóc da chuyên sâu',
  'Thời trang & May mặc thể thao năng động',
  'Dinh dưỡng, Thảo mộc & Sức khỏe thiên nhiên',
  'Thiết bị gia dụng & Đồ bếp thông minh',
];

export const AdminPersonnelPage: React.FC = () => {
  const [staffList, setStaffList] = useState<InternalStaffMember[]>([]);
  const [stores, setStores] = useState<AdminStoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SHOP_MANAGER' | 'SYSTEM_MANAGER' | 'SYSTEM_ADMIN' | 'STORES'>('ALL');
  const [storeStatusFilter, setStoreStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'>('ALL');

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
    categoryName: LOCKED_CATEGORIES[0],
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
    setLoading(true);
    try {
      const [staffData, storeData] = await Promise.all([
        personnelService.getStaffList(),
        personnelService.getAdminStores(true),
      ]);
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
    if (!window.confirm(`Bạn có chắc muốn ${actionText} tài khoản "${staff.fullName}"?`)) {
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
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.email.trim() || !staffForm.fullName.trim() || !staffForm.password.trim()) {
      toast.error('Vui lòng điền đầy đủ Email, Họ tên và Mật khẩu');
      return;
    }
    if (staffForm.password.length < 6) {
      toast.error('Mật khẩu khởi tạo tối thiểu 6 ký tự');
      return;
    }
    if (staffForm.role === 'SHOP_MANAGER' && !staffForm.storeId) {
      toast.error('Giám đốc nhãn hàng bắt buộc phải được gán vào 1 gian hàng cụ thể');
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
      categoryName: LOCKED_CATEGORIES[0],
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
        contactName: storeForm.contactName.trim() || 'Bộ phận kho vận',
        contactPhone: storeForm.contactPhone.trim() || '0901234567',
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
    setEditStoreForm({
      name: store.name,
      categoryName: store.categoryName || LOCKED_CATEGORIES[0],
      description: store.description || '',
      logoUrl: store.logoUrl || '',
      warehouseName: wh.warehouseName || `Kho Tổng ${store.name}`,
      contactName: wh.contactName || 'Quản lý kho',
      contactPhone: wh.contactPhone || '0901234567',
      provinceCode: wh.provinceCode || '',
      provinceName: wh.provinceName || '',
      districtCode: wh.districtCode || '',
      districtName: wh.districtName || '',
      wardCode: wh.wardCode || '',
      wardName: wh.wardName || '',
      detailAddress: wh.detailAddress || wh.address || '',
      warehouseAddress: wh.address || 'Khu Công Nghệ Cao, TP.Thủ Đức, TP.HCM',
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
    if (!window.confirm(`Xác nhận ${actionText} nhãn hàng "${store.name}"?`)) {
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
    }
  };

  // Restore Soft-Deleted Store
  const handleRestoreStore = async (store: AdminStoreOption) => {
    if (!window.confirm(`Xác nhận khôi phục hoạt động cho nhãn hàng "${store.name}" từ kho lưu trữ?`)) {
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
    }
  };

  // Update Store Details
  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;
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
    if (
      !window.confirm(
        `Xác nhận chuyển nhãn hàng "${store.name}" vào Kho Lưu Trữ (xóa mềm)? Toàn bộ dữ liệu đơn hàng và hoa hồng vẫn được bảo lưu an toàn và có thể khôi phục lại bất kỳ lúc nào.`,
      )
    ) {
      return;
    }
    try {
      await personnelService.deleteStore(store.id);
      toast.success(`Đã chuyển nhãn hàng "${store.name}" vào kho lưu trữ!`);
      setIsStoreDetailOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi lưu trữ gian hàng');
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

  const filteredStores = stores.filter((st) => {
    const matchQuery =
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.categoryName && st.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (st.owner?.fullName && st.owner.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

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
      {/* 1. Header Tinh Gọn (Loại bỏ câu chữ thừa) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EAE4D7]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#1A1612] m-0">Quản trị Nhân sự & Gian Hàng Trực Thuộc</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
              {staffList.length} nhân sự • {stores.length} nhãn hàng
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreateStoreModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#8F682E] hover:bg-[#F3EFE6] text-xs font-semibold transition cursor-pointer shadow-2xs"
          >
            <Store size={14} className="text-[#C59B58]" />
            <span>Thêm Gian Hàng</span>
          </button>
          <button
            onClick={() => setIsStaffModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
          >
            <UserPlus size={14} />
            <span>Bổ nhiệm Nhân sự</span>
          </button>
        </div>
      </div>

      {/* 2. Bộ Lọc Vai Trò & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#7D715E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={roleFilter === 'STORES' ? 'Tìm tên nhãn hàng, ngành hàng...' : 'Tìm họ tên, email công ty, SĐT nhân sự...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#EAE4D7] bg-white text-xs text-[#1A1612] placeholder-[#7D715E]/60 focus:outline-none focus:border-[#C59B58] transition"
          />
        </div>

        {/* Tab switcher */}
        <div className="flex items-center p-1 rounded-xl bg-[#F3EFE6] border border-[#EAE4D7] text-xs font-medium self-start sm:self-auto overflow-x-auto">
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
              roleFilter === 'ALL'
                ? 'bg-white text-[#1A1612] font-semibold shadow-2xs'
                : 'text-[#7D715E] hover:text-[#1A1612]'
            }`}
          >
            Tất cả nhân sự
          </button>
          <button
            onClick={() => setRoleFilter('SHOP_MANAGER')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
              roleFilter === 'SHOP_MANAGER'
                ? 'bg-white text-[#1A1612] font-semibold shadow-2xs'
                : 'text-[#7D715E] hover:text-[#1A1612]'
            }`}
          >
            Quản lý Shop ({totalShopManagers})
          </button>
          <button
            onClick={() => setRoleFilter('SYSTEM_MANAGER')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
              roleFilter === 'SYSTEM_MANAGER'
                ? 'bg-white text-[#1A1612] font-semibold shadow-2xs'
                : 'text-[#7D715E] hover:text-[#1A1612]'
            }`}
          >
            Chuyên viên Sàn ({totalSystemManagers})
          </button>
          <button
            onClick={() => setRoleFilter('SYSTEM_ADMIN')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
              roleFilter === 'SYSTEM_ADMIN'
                ? 'bg-white text-[#1A1612] font-semibold shadow-2xs'
                : 'text-[#7D715E] hover:text-[#1A1612]'
            }`}
          >
            Super Admin
          </button>
          <button
            onClick={() => setRoleFilter('STORES')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              roleFilter === 'STORES'
                ? 'bg-[#1A1612] text-white font-semibold shadow-2xs'
                : 'text-[#7D715E] hover:text-[#1A1612]'
            }`}
          >
            <Store size={12} className={roleFilter === 'STORES' ? 'text-[#C59B58]' : ''} />
            <span>Gian hàng & Kho GHN</span>
          </button>
        </div>
      </div>

      {/* 3. Vùng Nội Dung */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-[#EAE4D7] text-[#7D715E]">
          <RefreshCw className="w-6 h-6 animate-spin text-[#B88E4F] mb-2" />
          <p className="text-xs">Đang tải dữ liệu nhân sự & gian hàng...</p>
        </div>
      ) : roleFilter === 'STORES' ? (
        /* ================= TAB GIAN HÀNG & KHO GHN (BRAND GRID) ================= */
        <div className="space-y-4">
          {/* Sub-Filter Vòng đời Cửa hàng */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] text-xs">
              <button
                type="button"
                onClick={() => setStoreStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-medium ${
                  storeStatusFilter === 'ALL'
                    ? 'bg-white text-[#1A1612] font-bold shadow-2xs border border-[#EEDFC6]'
                    : 'text-[#7D715E] hover:text-[#1A1612]'
                }`}
              >
                Tất cả ({stores.length})
              </button>
              <button
                type="button"
                onClick={() => setStoreStatusFilter('ACTIVE')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-medium flex items-center gap-1 ${
                  storeStatusFilter === 'ACTIVE'
                    ? 'bg-white text-[#059669] font-bold shadow-2xs border border-[#EEDFC6]'
                    : 'text-[#7D715E] hover:text-[#1A1612]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                Đang hoạt động ({activeStoresCount})
              </button>
              <button
                type="button"
                onClick={() => setStoreStatusFilter('PAUSED')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-medium flex items-center gap-1 ${
                  storeStatusFilter === 'PAUSED'
                    ? 'bg-white text-[#D97706] font-bold shadow-2xs border border-[#EEDFC6]'
                    : 'text-[#7D715E] hover:text-[#1A1612]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                Tạm ngưng ({pausedStoresCount})
              </button>
              <button
                type="button"
                onClick={() => setStoreStatusFilter('ARCHIVED')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-medium flex items-center gap-1 ${
                  storeStatusFilter === 'ARCHIVED'
                    ? 'bg-white text-[#DC2626] font-bold shadow-2xs border border-[#FECACA]'
                    : 'text-[#7D715E] hover:text-[#1A1612]'
                }`}
              >
                <Archive size={12} className="text-[#DC2626]" />
                Kho lưu trữ ({archivedStoresCount})
              </button>
            </div>

            <button
              onClick={handleOpenCreateStoreModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-xs cursor-pointer ml-auto"
            >
              <Store size={13} />
              <span>Khởi tạo Nhãn hàng mới</span>
            </button>
          </div>

          {filteredStores.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-[#EAE4D7] text-[#7D715E] text-xs">
              Không tìm thấy gian hàng nào phù hợp với bộ lọc.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStores.map((st) => {
                const wh = st.returnWarehouse || {};
                const isArchived = !!st.isDeleted;
                return (
                  <div
                    key={st.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isArchived
                        ? 'bg-[#FAF8F5]/80 border-[#EAE4D7] opacity-85'
                        : 'bg-white border-[#EAE4D7] hover:border-[#C59B58] hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top row: Avatar/Logo + Name + Badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {st.logoUrl ? (
                            <img
                              src={st.logoUrl}
                              alt={st.name}
                              className="w-10 h-10 rounded-xl object-cover border border-[#EEDFC6] shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#C59B58] flex items-center justify-center font-bold text-xs shrink-0">
                              {st.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-bold text-xs text-[#1A1612] truncate m-0 leading-tight" title={st.name}>
                              {st.name}
                            </h3>
                            <span className="text-[10px] text-[#7D715E] block truncate mt-0.5">
                              {st.categoryName || 'Khối bán lẻ trực thuộc'}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isArchived ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] shrink-0">
                            Đã lưu trữ
                          </span>
                        ) : st.isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF5EB] text-[#059669] border border-[#EEDFC6] shrink-0 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#D97706] border border-[#F5D8D4] shrink-0 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                            Tạm ngưng
                          </span>
                        )}
                      </div>

                      {/* Info lines */}
                      <div className="space-y-1.5 py-2.5 border-y border-[#FAF8F5] text-[11px]">
                        <div className="flex items-center justify-between text-[#7D715E]">
                          <span>Quản lý phụ trách:</span>
                          <span className="font-semibold text-[#1A1612] truncate max-w-[150px]">
                            {st.owner?.fullName || 'Chưa phân công'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[#7D715E]">
                          <span>Quy mô sản phẩm:</span>
                          <span className="font-mono font-bold text-[#1A1612]">
                            {st._count?.products ?? 0} sản phẩm
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[#7D715E]">
                          <span>Kho bưu tá GHN:</span>
                          <span className="text-[10px] font-mono text-[#8F682E] bg-[#FBF5EB] px-1.5 py-0.5 rounded border border-[#EEDFC6]">
                            GHN {wh.ghnDistrictId || 1442}-{wh.ghnWardCode || '20109'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between gap-2 pt-3 mt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenStoreDetail(st)}
                        className="px-3 py-1.5 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] hover:bg-white text-xs font-semibold text-[#1A1612] transition cursor-pointer flex items-center gap-1"
                      >
                        <Eye size={12} className="text-[#8F682E]" />
                        <span>Chi tiết</span>
                      </button>

                      {isArchived ? (
                        <button
                          type="button"
                          onClick={() => handleRestoreStore(st)}
                          className="px-3 py-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-xs font-bold text-[#8F682E] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <RotateCcw size={12} />
                          <span>Khôi phục</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleStoreStatus(st)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                            st.isActive
                              ? 'border-[#EAE4D7] text-[#7D715E] hover:text-[#DC2626] hover:bg-white'
                              : 'border-[#EEDFC6] text-[#059669] bg-[#FBF5EB] hover:bg-[#F3EFE6]'
                          }`}
                        >
                          <Power size={11} />
                          <span>{st.isActive ? 'Tạm ngưng' : 'Kích hoạt'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ================= TAB NHÂN SỰ NỘI BỘ ================= */
        <div className="bg-white rounded-2xl border border-[#EAE4D7] overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EAE4D7] text-[#7D715E] uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">Nhân sự</th>
                  <th className="py-3 px-4">Vai trò quản trị</th>
                  <th className="py-3 px-4">Gian hàng điều hành</th>
                  <th className="py-3 px-4">Liên hệ</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF8F5]">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#7D715E]">
                      Không tìm thấy nhân sự phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => {
                    const assignedStore = staff.stores?.[0];
                    return (
                      <tr key={staff.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                        {/* Họ tên & Email */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#F3EFE6] border border-[#EEDFC6] flex items-center justify-center font-bold text-xs text-[#8F682E]">
                              {staff.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <strong className="block text-xs font-semibold text-[#1A1612]">
                                {staff.fullName}
                              </strong>
                              <span className="text-[11px] text-[#7D715E] font-mono">{staff.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Vai trò */}
                        <td className="py-3 px-4">
                          {staff.role === 'SYSTEM_ADMIN' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1A1612] text-white">
                              <ShieldCheck size={10} className="text-[#C59B58]" />
                              Super Admin
                            </span>
                          ) : staff.role === 'SYSTEM_MANAGER' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF5EB] text-[#8F682E] border border-[#EEDFC6]">
                              Chuyên viên Sàn
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] text-[#1A1612] border border-[#EAE4D7]">
                              <Store size={10} className="text-[#C59B58]" />
                              Quản lý Shop
                            </span>
                          )}
                        </td>

                        {/* Gian hàng phụ trách */}
                        <td className="py-3 px-4">
                          {assignedStore ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-[#1A1612]">{assignedStore.name}</span>
                              {assignedStore.isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#7D715E] italic">
                              {staff.role === 'SHOP_MANAGER' ? 'Chưa gán shop' : 'Toàn sàn'}
                            </span>
                          )}
                        </td>

                        {/* Liên hệ */}
                        <td className="py-3 px-4 text-[#7D715E]">
                          {staff.phoneNumber ? (
                            <span className="font-mono text-[11px]">{staff.phoneNumber}</span>
                          ) : (
                            <span className="italic text-[11px]">Chưa cập nhật</span>
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td className="py-3 px-4 text-center">
                          {staff.isActive ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF5EB] text-[#059669] border border-[#EEDFC6]">
                              Hoạt động
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] text-[#DC2626] border border-[#F5D8D4]">
                              Vô hiệu hóa
                            </span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3 px-4 text-right">
                          {staff.role !== 'SYSTEM_ADMIN' && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(staff)}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
                                staff.isActive
                                  ? 'border-[#EAE4D7] text-[#7D715E] hover:text-[#DC2626] hover:bg-white'
                                  : 'border-[#EEDFC6] text-[#059669] bg-[#FBF5EB] hover:bg-[#F3EFE6]'
                              }`}
                            >
                              {staff.isActive ? 'Khóa' : 'Kích hoạt'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: BỔ NHIỆM NHÂN SỰ NỘI BỘ ================= */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#EAE4D7] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EAE4D7] bg-[#FAF8F5]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#C59B58]" />
                <h2 className="text-sm font-bold text-[#1A1612] m-0">Bổ nhiệm nhân sự mới</h2>
              </div>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="text-[#7D715E] hover:text-[#1A1612] p-1 rounded-md hover:bg-[#EAE4D7]/40 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                  Vai trò quản trị <span className="text-[#DC2626]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStaffForm((prev) => ({ ...prev, role: 'SHOP_MANAGER' }))}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                      staffForm.role === 'SHOP_MANAGER'
                        ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8F682E]'
                        : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:border-[#EEDFC6]'
                    }`}
                  >
                    <Store size={14} />
                    <span>Giám đốc Shop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffForm((prev) => ({ ...prev, role: 'SYSTEM_MANAGER' }))}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                      staffForm.role === 'SYSTEM_MANAGER'
                        ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8F682E]'
                        : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:border-[#EEDFC6]'
                    }`}
                  >
                    <ShieldCheck size={14} />
                    <span>Chuyên viên Sàn</span>
                  </button>
                </div>
              </div>

              {staffForm.role === 'SHOP_MANAGER' && (
                <div>
                  <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                    Gian hàng phụ trách <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    value={staffForm.storeId || ''}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, storeId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                  >
                    {stores
                      .filter((st) => !st.isDeleted)
                      .map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} {st.owner ? `(${st.owner.fullName})` : '(Chưa có quản lý)'}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                  Họ và tên nhân sự <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trần Quản Lý"
                  value={staffForm.fullName}
                  onChange={(e) => setStaffForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                    Email công ty <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="brand.sora@scanms.vn"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    placeholder="0901234567"
                    value={staffForm.phoneNumber || ''}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                  Mật khẩu khởi tạo <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tối thiểu 6 ký tự"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 pr-9 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7D715E] hover:text-[#1A1612] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE4D7]">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#EAE4D7] text-xs font-medium text-[#7D715E] hover:bg-[#FAF8F5] transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={staffSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  {staffSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Xác nhận bổ nhiệm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: KHỞI TẠO CỬA HÀNG (Widescreen 2 Cột, Logo Upload, Address Chuẩn Customer) ================= */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#EAE4D7] shadow-xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE4D7] bg-[#FAF8F5]">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-[#C59B58]" />
                <h2 className="text-sm font-bold text-[#1A1612] m-0">Khởi tạo Cửa hàng / Nhãn hàng mới</h2>
              </div>
              <button
                onClick={() => setIsStoreModalOpen(false)}
                className="text-[#7D715E] hover:text-[#1A1612] p-1 rounded-md hover:bg-[#EAE4D7]/40 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cột 1: Thông tin thương hiệu & Logo Upload */}
                <div className="space-y-3.5">
                  <div className="text-xs font-bold text-[#1A1612] uppercase tracking-wider pb-1 border-b border-[#FAF8F5]">
                    1. Thông tin Nhãn hàng
                  </div>

                  {/* Logo Upload (Ảnh thật, không dùng URL text) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1A1612] mb-1">
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
                    <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                      Tên Cửa hàng / Nhãn hàng <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Sora Skincare & Cosmetics"
                      value={storeForm.name}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                    />
                  </div>

                  {/* Locked Category Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[#1A1612]">
                        Ngành hàng kinh doanh cố định <span className="text-[#DC2626]">*</span>
                      </label>
                      <span className="text-[10px] text-[#8F682E] font-medium bg-[#FBF5EB] px-1.5 py-0.5 rounded border border-[#EEDFC6]">
                        Khóa danh mục
                      </span>
                    </div>
                    <select
                      value={storeForm.categoryName}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, categoryName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                    >
                      {LOCKED_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                      Mô tả định vị nhãn hàng
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Giới thiệu sứ mệnh và dòng sản phẩm..."
                      value={storeForm.description || ''}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58] resize-none"
                    />
                  </div>
                </div>

                {/* Cột 2: Cấu hình Kho xuất hàng GHN (Chuẩn Customer: Tỉnh/Thành -> Quận/Huyện -> Phường/Xã -> Số nhà) */}
                <div className="space-y-3.5">
                  <div className="text-xs font-bold text-[#1A1612] uppercase tracking-wider pb-1 border-b border-[#FAF8F5] flex items-center gap-1.5">
                    <MapPin size={13} className="text-[#C59B58]" />
                    <span>2. Kho xuất hàng GHN (Pickup Warehouse)</span>
                  </div>

                  {/* Tên kho */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                      Tên kho xuất hàng
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Kho Mát Dược Mỹ Phẩm GMP Thủ Đức"
                      value={storeForm.warehouseName || ''}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, warehouseName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                    />
                  </div>

                  {/* Người phụ trách & SĐT */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                        Người phụ trách kho
                      </label>
                      <input
                        type="text"
                        placeholder="Nguyễn Quản Kho"
                        value={storeForm.contactName || ''}
                        onChange={(e) => setStoreForm((prev) => ({ ...prev, contactName: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                        SĐT kho xuất
                      </label>
                      <input
                        type="text"
                        placeholder="0901234567"
                        value={storeForm.contactPhone || ''}
                        onChange={(e) => setStoreForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                      />
                    </div>
                  </div>

                  {/* Tỉnh / Thành phố */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1A1612] mb-1">
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
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-[#1A1612] mb-1">
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
                      <label className="block text-xs font-semibold text-[#1A1612] mb-1">
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
                    <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                      Địa chỉ chi tiết (Số nhà, tên đường, KCN) <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Lô E2a-7, Đường D1, Khu Công nghệ cao"
                      value={storeForm.detailAddress}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, detailAddress: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
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

              <div className="flex items-center justify-end gap-2 pt-5 mt-5 border-t border-[#EAE4D7]">
                <button
                  type="button"
                  onClick={() => setIsStoreModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#EAE4D7] text-xs font-semibold text-[#7D715E] hover:bg-[#FAF8F5] transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={storeSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {storeSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Khởi tạo Cửa hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: XEM CHI TIẾT & CHỈNH SỬA GIAN HÀNG ================= */}
      {isStoreDetailOpen && selectedStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#EAE4D7] shadow-xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE4D7] bg-[#FAF8F5] shrink-0">
              <div className="flex items-center gap-3">
                {selectedStore.logoUrl ? (
                  <img
                    src={selectedStore.logoUrl}
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
                    <h2 className="text-base font-bold text-[#1A1612] m-0">{selectedStore.name}</h2>
                    {selectedStore.isDeleted ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                        Đã lưu trữ (xóa mềm)
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
                    {selectedStore.categoryName} • Thù lao cơ sở: {selectedStore.defaultCommissionRate || 10}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isEditStoreMode && !selectedStore.isDeleted && (
                  <button
                    type="button"
                    onClick={() => setIsEditStoreMode(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] text-[#8F682E] text-xs font-bold hover:bg-[#F3EFE6] transition cursor-pointer"
                  >
                    <Edit2 size={12} />
                    <span>Chỉnh sửa</span>
                  </button>
                )}
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
                <div className="mb-5 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-between gap-3 text-xs text-[#DC2626]">
                  <div className="flex items-center gap-2">
                    <Archive size={16} />
                    <span>Gian hàng này hiện đang ở trạng thái <strong>Lưu trữ (xóa mềm)</strong>. Lịch sử đơn hàng và đối soát vẫn được bảo lưu an toàn.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestoreStore(selectedStore)}
                    className="px-3 py-1 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <RotateCcw size={12} />
                    <span>Khôi phục ngay</span>
                  </button>
                </div>
              )}

              {isEditStoreMode ? (
                /* ================= EDIT MODE ================= */
                <form onSubmit={handleUpdateStore} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Cột 1: Thông tin thương hiệu */}
                    <div className="space-y-3.5">
                      <div className="text-xs font-bold text-[#1A1612] uppercase tracking-wider pb-1 border-b border-[#FAF8F5]">
                        Thông tin Gian hàng
                      </div>

                      {/* Logo Upload */}
                      <div>
                        <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                          Ảnh đại diện / Logo nhãn hàng
                        </label>
                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-14 rounded-xl border border-[#EEDFC6] bg-[#FAF8F5] overflow-hidden flex items-center justify-center shrink-0">
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
                              <span>{uploadingEditLogo ? 'Đang tải lên...' : editStoreForm.logoUrl ? 'Đổi ảnh logo' : 'Tải ảnh logo'}</span>
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
                        <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                          Tên Gian hàng / Nhãn hàng <span className="text-[#DC2626]">*</span>
                        </label>
                        <input
                          type="text"
                          value={editStoreForm.name}
                          onChange={(e) => setEditStoreForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                          Giám đốc Nhãn hàng phân công
                        </label>
                        <select
                          value={editStoreForm.ownerId}
                          onChange={(e) => setEditStoreForm((prev) => ({ ...prev, ownerId: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                        >
                          <option value="">-- Chưa chỉ định --</option>
                          {staffList
                            .filter((s) => s.role === 'SHOP_MANAGER')
                            .map((stf) => (
                              <option key={stf.id} value={stf.id}>
                                {stf.fullName} ({stf.email})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                          Mô tả định vị
                        </label>
                        <textarea
                          rows={3}
                          value={editStoreForm.description}
                          onChange={(e) => setEditStoreForm((prev) => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58] resize-none"
                        />
                      </div>
                    </div>

                    {/* Cột 2: Cấu hình Kho xuất GHN (Chuẩn Customer) */}
                    <div className="space-y-3.5">
                      <div className="text-xs font-bold text-[#1A1612] uppercase tracking-wider pb-1 border-b border-[#FAF8F5]">
                        Cấu hình Kho xuất hàng GHN
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                          Tên điểm kho
                        </label>
                        <input
                          type="text"
                          value={editStoreForm.warehouseName}
                          onChange={(e) => setEditStoreForm((prev) => ({ ...prev, warehouseName: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                            Người phụ trách kho
                          </label>
                          <input
                            type="text"
                            value={editStoreForm.contactName}
                            onChange={(e) => setEditStoreForm((prev) => ({ ...prev, contactName: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                            SĐT kho xuất
                          </label>
                          <input
                            type="text"
                            value={editStoreForm.contactPhone}
                            onChange={(e) => setEditStoreForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                          />
                        </div>
                      </div>

                      {/* Tỉnh / Thành phố */}
                      <div>
                        <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                          Tỉnh / Thành phố
                        </label>
                        <CustomSelect
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
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                            Quận / Huyện
                          </label>
                          <CustomSelect
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
                          <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                            Phường / Xã
                          </label>
                          <CustomSelect
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
                        <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                          Địa chỉ chi tiết (Số nhà, tên đường, KCN)
                        </label>
                        <input
                          type="text"
                          value={editStoreForm.detailAddress}
                          onChange={(e) => setEditStoreForm((prev) => ({ ...prev, detailAddress: e.target.value }))}
                          placeholder="Ví dụ: Lô B4 KCN Tân Bình, Tây Thạnh"
                          className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions in Edit Mode */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#EAE4D7]">
                    <button
                      type="button"
                      onClick={() => handleDeleteStore(selectedStore)}
                      className="px-3 py-2 rounded-lg border border-[#F5D8D4] text-[#DC2626] hover:bg-[#FEF2F2] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      <span>Chuyển vào Kho Lưu Trữ (xóa mềm)</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditStoreMode(false)}
                        className="px-4 py-2 rounded-lg border border-[#EAE4D7] text-xs font-semibold text-[#7D715E] hover:bg-[#FAF8F5] transition cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={editStoreSubmitting}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {editStoreSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        Lưu thay đổi
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* ================= VIEW MODE ================= */
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Block 1: Brand & Manager */}
                    <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] space-y-3">
                      <div className="text-xs font-bold text-[#1A1612] uppercase tracking-wider">
                        Phân công Điều hành
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center font-bold text-sm">
                          {selectedStore.owner?.fullName?.[0] || 'Q'}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-[#1A1612]">
                            {selectedStore.owner?.fullName || 'Chưa phân công'}
                          </div>
                          <div className="text-[11px] text-[#7D715E] font-mono">
                            {selectedStore.owner?.email || 'N/A'}
                          </div>
                        </div>
                      </div>

                      {selectedStore.description && (
                        <div className="pt-2 border-t border-[#EAE4D7] text-xs text-[#7D715E] leading-relaxed">
                          {selectedStore.description}
                        </div>
                      )}
                    </div>

                    {/* Block 2: Performance stats */}
                    <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] space-y-3">
                      <div className="text-xs font-bold text-[#1A1612] uppercase tracking-wider">
                        Quy mô Sản phẩm
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold font-mono text-[#1A1612]">
                            {selectedStore._count?.products ?? 0}
                          </div>
                          <div className="text-[11px] text-[#059669] font-medium">Sản phẩm mở bán tiếp thị</div>
                        </div>
                        <span className="px-3 py-1.5 rounded-lg bg-white border border-[#EEDFC6] text-xs font-mono font-bold text-[#8F682E]">
                          10.0% Base Rate
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Warehouse Card */}
                  <div className="p-4 rounded-xl bg-white border border-[#EAE4D7] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#1A1612] uppercase tracking-wider">
                        <MapPin size={14} className="text-[#C59B58]" />
                        <span>Kho xuất hàng bưu cục GHN vệ tinh</span>
                      </div>
                      <span className="font-mono text-xs text-[#8F682E] bg-[#FBF5EB] px-2 py-0.5 rounded border border-[#EEDFC6]">
                        Mã GHN: {selectedStore.returnWarehouse?.ghnDistrictId || 1442} - {selectedStore.returnWarehouse?.ghnWardCode || '20109'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#7D715E] block">Tên điểm kho</span>
                        <div className="font-semibold text-xs text-[#1A1612] mt-0.5">
                          {selectedStore.returnWarehouse?.warehouseName || `Kho Tổng ${selectedStore.name}`}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#7D715E] block">Liên hệ điều phối</span>
                        <div className="font-semibold text-xs text-[#1A1612] mt-0.5">
                          {selectedStore.returnWarehouse?.contactName || 'Quản kho'} ({selectedStore.returnWarehouse?.contactPhone || '0901234567'})
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-[10px] uppercase font-bold text-[#7D715E] block">Địa chỉ kho lấy hàng thực tế</span>
                        <div className="font-medium text-xs text-[#1A1612] mt-0.5">
                          {selectedStore.returnWarehouse?.address || 'Khu Công Nghệ Cao, TP.Thủ Đức, TP.HCM'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions in View Mode */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#EAE4D7]">
                    {selectedStore.isDeleted ? (
                      <button
                        type="button"
                        onClick={() => handleRestoreStore(selectedStore)}
                        className="px-4 py-2 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <RotateCcw size={13} />
                        <span>Khôi phục hoạt động</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleStoreStatus(selectedStore)}
                        className={`px-4 py-2 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          selectedStore.isActive
                            ? 'border-[#EAE4D7] text-[#7D715E] hover:text-[#DC2626] hover:bg-white'
                            : 'border-[#EEDFC6] text-[#059669] bg-[#FBF5EB] hover:bg-[#F3EFE6]'
                        }`}
                      >
                        <Power size={13} />
                        <span>{selectedStore.isActive ? 'Tạm ngưng gian hàng' : 'Kích hoạt hoạt động'}</span>
                      </button>
                    )}

                    {!selectedStore.isDeleted && (
                      <button
                        type="button"
                        onClick={() => setIsEditStoreMode(true)}
                        className="px-5 py-2 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <Edit2 size={13} />
                        <span>Chỉnh sửa thông tin</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPersonnelPage;
