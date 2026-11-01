import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Store,
  ShieldCheck,
  Search,
  Eye,
  EyeOff,
  RefreshCw,
  Mail,
  Phone,
  AlertCircle,
  Briefcase,
  X,
  MapPin,
  Edit2,
  Trash2,
  Power,
  Package,
  User,
  ArrowRight,
} from 'lucide-react';
import {
  personnelService,
  type InternalStaffMember,
  type CreateStaffPayload,
  type AdminStoreOption,
  type CreateStorePayload,
} from '../../services/personnel.service';
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
  const [storeForm, setStoreForm] = useState<CreateStorePayload>({
    name: '',
    categoryName: LOCKED_CATEGORIES[0],
    description: '',
    logoUrl: '',
    defaultCommissionRate: 10,
    warehouseName: '',
    contactName: '',
    contactPhone: '',
    warehouseAddress: '',
    ghnDistrictId: 1442,
    ghnWardCode: '20109',
  });

  // Store Detail & Edit Modal State
  const [selectedStore, setSelectedStore] = useState<AdminStoreOption | null>(null);
  const [isStoreDetailOpen, setIsStoreDetailOpen] = useState(false);
  const [isEditStoreMode, setIsEditStoreMode] = useState(false);
  const [editStoreSubmitting, setEditStoreSubmitting] = useState(false);
  const [editStoreForm, setEditStoreForm] = useState({
    name: '',
    categoryName: '',
    description: '',
    logoUrl: '',
    warehouseName: '',
    contactName: '',
    contactPhone: '',
    warehouseAddress: '',
    ghnDistrictId: 1442,
    ghnWardCode: '20109',
    ownerId: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffData, storeData] = await Promise.all([
        personnelService.getStaffList(),
        personnelService.getAdminStores(),
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

  const handleToggleStatus = async (staff: InternalStaffMember) => {
    const nextStatus = !staff.isActive;
    const actionText = nextStatus ? 'mở khóa' : 'tạm khóa';
    if (!window.confirm(`Xác nhận ${actionText} tài khoản của ${staff.fullName}?`)) {
      return;
    }
    try {
      await personnelService.toggleStaffStatus(staff.id, nextStatus);
      toast.success(`Đã ${actionText} tài khoản ${staff.fullName}`);
      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, isActive: nextStatus } : s)),
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Lỗi khi ${actionText} tài khoản`);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.fullName.trim()) {
      toast.error('Vui lòng nhập họ và tên nhân sự');
      return;
    }
    if (!staffForm.email.trim() || !staffForm.email.includes('@')) {
      toast.error('Vui lòng nhập email công ty hợp lệ');
      return;
    }
    if (!staffForm.password || staffForm.password.length < 6) {
      toast.error('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    if (staffForm.role === 'SHOP_MANAGER' && !staffForm.storeId) {
      toast.error('Vui lòng chọn Cửa hàng phân công phụ trách');
      return;
    }

    setStaffSubmitting(true);
    try {
      await personnelService.createStaff({
        ...staffForm,
        email: staffForm.email.trim().toLowerCase(),
        fullName: staffForm.fullName.trim(),
        storeId: staffForm.role === 'SHOP_MANAGER' ? staffForm.storeId : undefined,
      });
      toast.success(`Đã bổ nhiệm nhân sự ${staffForm.fullName}`);
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
      toast.error(err?.response?.data?.message || 'Không thể tạo nhân sự nội bộ');
    } finally {
      setStaffSubmitting(false);
    }
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
    if (!storeForm.warehouseAddress?.trim()) {
      toast.error('Vui lòng nhập địa chỉ kho xuất hàng GHN');
      return;
    }

    setStoreSubmitting(true);
    try {
      await personnelService.createStore({
        ...storeForm,
        name: storeForm.name.trim(),
        categoryName: storeForm.categoryName.trim(),
        defaultCommissionRate: 10,
        logoUrl: storeForm.logoUrl?.trim() || undefined,
        warehouseName: storeForm.warehouseName?.trim() || `Kho ${storeForm.name.trim()}`,
        contactName: storeForm.contactName?.trim() || 'Quản Lý Kho Vận',
        contactPhone: storeForm.contactPhone?.trim() || '0901234567',
        warehouseAddress: storeForm.warehouseAddress.trim(),
        ghnDistrictId: Number(storeForm.ghnDistrictId) || 1442,
        ghnWardCode: String(storeForm.ghnWardCode || '20109'),
      });
      toast.success(`Đã khởi tạo nhãn hàng "${storeForm.name}" thành công!`);
      setIsStoreModalOpen(false);
      setStoreForm({
        name: '',
        categoryName: LOCKED_CATEGORIES[0],
        description: '',
        logoUrl: '',
        defaultCommissionRate: 10,
        warehouseName: '',
        contactName: '',
        contactPhone: '',
        warehouseAddress: '',
        ghnDistrictId: 1442,
        ghnWardCode: '20109',
      });
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

  // Update Store Details
  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;
    if (!editStoreForm.name.trim()) {
      toast.error('Tên gian hàng không được để trống');
      return;
    }
    if (!editStoreForm.warehouseAddress.trim()) {
      toast.error('Địa chỉ kho không được để trống');
      return;
    }

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
        warehouseAddress: editStoreForm.warehouseAddress.trim(),
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

  // Archive Store
  const handleDeleteStore = async (store: AdminStoreOption) => {
    if (!window.confirm(`Bạn có chắc chắn muốn lưu trữ / ngừng kinh doanh nhãn hàng "${store.name}"? Lịch sử đơn hàng và đối soát vẫn được bảo lưu an toàn.`)) {
      return;
    }
    try {
      await personnelService.deleteStore(store.id);
      toast.success(`Đã lưu trữ nhãn hàng "${store.name}" thành công!`);
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
    return (
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.categoryName && st.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (st.owner?.fullName && st.owner.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const totalShopManagers = staffList.filter((s) => s.role === 'SHOP_MANAGER').length;
  const totalSystemManagers = staffList.filter((s) => s.role === 'SYSTEM_MANAGER').length;

  return (
    <div className="min-h-screen bg-[#FAF8F5] p-5 lg:p-7 text-[#1A1612]">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Clean Executive Header (Không còn dòng mô tả dài dòng) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE4D7]">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#1A1612] m-0">
                Quản trị Nhân sự & Gian Hàng Trực Thuộc
              </h1>
              <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded-md bg-[#F3EFE6] text-[#7D715E] border border-[#EAE4D7]">
                {staffList.length} nhân sự • {stores.length} nhãn hàng
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setIsStoreModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#F3EFE6] hover:bg-[#EAE4D7] text-[#1A1612] font-semibold text-xs border border-[#EAE4D7] transition active:scale-[0.98] cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-[#C59B58]" />
              Thêm gian hàng
            </button>
            <button
              onClick={() => setIsStaffModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white font-semibold text-xs shadow-xs transition active:scale-[0.98] cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Bổ nhiệm nhân sự
            </button>
          </div>
        </div>

        {/* Dense Professional KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-white border border-[#EAE4D7] shadow-[0_1px_2px_rgba(35,29,21,0.02)]">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#7D715E]">
              Tổng nhân sự nội bộ
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#1A1612] mt-1 tabular-nums">
              {staffList.length}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#EAE4D7] shadow-[0_1px_2px_rgba(35,29,21,0.02)]">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#7D715E]">
              Quản lý Cửa hàng
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#1A1612] mt-1 tabular-nums">
              {totalShopManagers}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#EAE4D7] shadow-[0_1px_2px_rgba(35,29,21,0.02)]">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#7D715E]">
              Chuyên viên Vận hành
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#1A1612] mt-1 tabular-nums">
              {totalSystemManagers}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#EAE4D7] shadow-[0_1px_2px_rgba(35,29,21,0.02)]">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#7D715E]">
              Cửa hàng & Kho GHN
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#1A1612] mt-1 tabular-nums">
              {stores.length}
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#EAE4D7]">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D715E]" />
            <input
              type="text"
              placeholder={roleFilter === 'STORES' ? 'Tìm tên nhãn hàng, ngành hàng...' : 'Tìm họ tên, email, SĐT...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#EAE4D7] text-xs bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#C59B58] transition"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0">
            {[
              { id: 'ALL', label: 'Tất cả nhân sự' },
              { id: 'SHOP_MANAGER', label: 'Quản lý Shop' },
              { id: 'SYSTEM_MANAGER', label: 'Chuyên viên Sàn' },
              { id: 'SYSTEM_ADMIN', label: 'Super Admin' },
              { id: 'STORES', label: 'Gian hàng & Kho GHN' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  roleFilter === tab.id
                    ? 'bg-[#1A1612] text-white font-semibold shadow-xs'
                    : 'bg-transparent hover:bg-[#FAF8F5] text-[#7D715E]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Display: Personnel Table or Stores Grid */}
        {roleFilter === 'STORES' ? (
          /* Store Grid - Chuẩn B2B SaaS Tinh Gọn */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#7D715E]">
              <span>Hiển thị <strong>{filteredStores.length}</strong> nhãn hàng trực thuộc</span>
              <span className="font-mono text-[11px] bg-[#FBF5EB] px-2.5 py-1 rounded text-[#8F682E] border border-[#EEDFC6] font-semibold">
                Thù lao cơ sở: 10% chuẩn sàn
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStores.map((st) => {
                const wh = st.returnWarehouse || {};
                const initials = st.name
                  .split(' ')
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase();

                return (
                  <div
                    key={st.id}
                    className="p-5 rounded-2xl bg-white border border-[#EAE4D7] shadow-[0_1px_3px_rgba(35,29,21,0.03)] flex flex-col justify-between hover:border-[#C59B58] transition group"
                  >
                    <div className="space-y-3.5">
                      {/* Top Row: Logo, Name & Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {st.logoUrl ? (
                            <img
                              src={st.logoUrl}
                              alt={st.name}
                              className="w-11 h-11 rounded-xl object-cover border border-[#EEDFC6] shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FAF8F5] to-[#F3EFE6] border border-[#EEDFC6] text-[#C59B58] flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                              {initials || 'ST'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-[#1A1612] truncate m-0 group-hover:text-[#B88E4F] transition-colors" title={st.name}>
                              {st.name}
                            </h3>
                            <span className="inline-block text-[11px] font-medium text-[#7D715E] truncate mt-0.5 max-w-full">
                              {st.categoryName || 'Mỹ phẩm & Chăm sóc da chuyên sâu'}
                            </span>
                          </div>
                        </div>

                        {st.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF5EB] text-[#059669] border border-[#EEDFC6] shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#D97706] border border-[#F5D8D4] shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
                            Tạm ngưng
                          </span>
                        )}
                      </div>

                      {/* Middle Row: Manager & Stats */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-[#FAF8F5]">
                        <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7]">
                          <span className="text-[10px] uppercase font-semibold text-[#7D715E] block flex items-center gap-1">
                            <User size={11} className="text-[#B88E4F]" /> Quản lý
                          </span>
                          <div className="font-bold text-xs text-[#1A1612] mt-0.5 truncate" title={st.owner?.fullName || 'Chưa phân công'}>
                            {st.owner?.fullName || 'Chưa phân công'}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7]">
                          <span className="text-[10px] uppercase font-semibold text-[#7D715E] block flex items-center gap-1">
                            <Package size={11} className="text-[#B88E4F]" /> Sản phẩm
                          </span>
                          <div className="font-bold text-xs text-[#1A1612] mt-0.5 font-mono">
                            {st._count?.products ?? 0} sản phẩm
                          </div>
                        </div>
                      </div>

                      {/* Warehouse Chip */}
                      <div className="px-3 py-2 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] flex items-center gap-2 text-[11px] text-[#7D715E]">
                        <MapPin size={12} className="text-[#C59B58] shrink-0" />
                        <span className="truncate">{wh.warehouseName || `Kho Tổng ${st.name}`}</span>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="pt-3 mt-3 border-t border-[#EAE4D7] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStoreStatus(st)}
                        className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                          st.isActive
                            ? 'border-[#EAE4D7] text-[#7D715E] hover:text-[#DC2626] hover:bg-white'
                            : 'border-[#EEDFC6] text-[#059669] bg-[#FBF5EB] hover:bg-[#F3EFE6]'
                        }`}
                      >
                        <Power size={11} />
                        <span>{st.isActive ? 'Tạm ngưng' : 'Kích hoạt'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenStoreDetail(st)}
                        className="text-xs font-bold text-[#1A1612] hover:text-[#C59B58] px-3 py-1.5 rounded-lg bg-[#F3EFE6] hover:bg-[#EAE4D7] transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Chi tiết</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* High-Density Personnel Table */
          <div className="bg-white rounded-xl border border-[#EAE4D7] overflow-hidden shadow-[0_1px_2px_rgba(35,29,21,0.02)]">
            {loading ? (
              <div className="p-10 text-center text-[#7D715E]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#C59B58] mb-2" />
                <p className="text-xs">Đang tải danh sách nhân sự...</p>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-10 text-center text-[#7D715E]">
                <AlertCircle className="w-6 h-6 mx-auto text-[#7D715E] mb-1.5" />
                <p className="text-xs font-medium text-[#1A1612]">Không tìm thấy nhân sự phù hợp</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#EAE4D7] text-[#7D715E] text-[11px] font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-4">Nhân sự</th>
                      <th className="py-2.5 px-4">Vai trò</th>
                      <th className="py-2.5 px-4">Cửa hàng phụ trách</th>
                      <th className="py-2.5 px-4">Ngày bổ nhiệm</th>
                      <th className="py-2.5 px-4">Trạng thái</th>
                      <th className="py-2.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE4D7]/70">
                    {filteredStaff.map((staff) => {
                      const initials = staff.fullName
                        .split(' ')
                        .slice(-2)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase();
                      const assignedStore = staff.stores?.[0];

                      return (
                        <tr key={staff.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-[#F3EFE6] border border-[#EAE4D7] flex items-center justify-center font-bold text-[11px] text-[#8F682E] shrink-0">
                                {initials || 'NV'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-[#1A1612] truncate">
                                  {staff.fullName}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-[#7D715E] font-mono mt-0.5">
                                  <span className="inline-flex items-center gap-1 truncate">
                                    <Mail className="w-3 h-3 text-[#7D715E] shrink-0" />
                                    {staff.email}
                                  </span>
                                  {staff.phoneNumber && (
                                    <span className="hidden md:inline-flex items-center gap-1 text-[#7D715E]">
                                      <Phone className="w-3 h-3 text-[#7D715E] shrink-0" />
                                      {staff.phoneNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {staff.role === 'SHOP_MANAGER' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FBF5EB] border border-[#EEDFC6] text-[#8F682E]">
                                <Store className="w-3 h-3 text-[#C59B58]" />
                                Quản lý Cửa hàng
                              </span>
                            )}
                            {staff.role === 'SYSTEM_MANAGER' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F3EFE6] border border-[#EAE4D7] text-[#1A1612]">
                                <ShieldCheck className="w-3 h-3 text-[#7D715E]" />
                                Chuyên viên Sàn
                              </span>
                            )}
                            {staff.role === 'SYSTEM_ADMIN' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#231D15] text-[#FAF8F5]">
                                <Briefcase className="w-3 h-3 text-[#C59B58]" />
                                Super Admin
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {assignedStore ? (
                              <span className="text-xs font-semibold text-[#1A1612]">
                                {assignedStore.name}
                              </span>
                            ) : staff.role === 'SHOP_MANAGER' ? (
                              <span className="text-xs text-[#DC2626]">Chưa gán</span>
                            ) : (
                              <span className="text-xs text-[#7D715E]">Toàn hệ thống</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-xs font-mono text-[#7D715E] whitespace-nowrap">
                            {new Date(staff.createdAt).toLocaleDateString('vi-VN')}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {staff.isActive ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#059669]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>
                                Hoạt động
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#DC2626]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
                                Tạm khóa
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleToggleStatus(staff)}
                              className={`text-xs font-medium px-2.5 py-1 rounded-md transition cursor-pointer ${
                                staff.isActive
                                  ? 'text-[#DC2626] hover:bg-[#F5D8D4]/30'
                                  : 'text-[#059669] hover:bg-[#FBF5EB]'
                              }`}
                            >
                              {staff.isActive ? 'Tạm khóa' : 'Mở khóa'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal 1: Bổ nhiệm Nhân sự Quản trị */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#EAE4D7] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE4D7] bg-[#FAF8F5]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#C59B58]" />
                <h2 className="text-sm font-bold text-[#1A1612] m-0">Bổ nhiệm Nhân sự Quản trị</h2>
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
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm((prev) => ({ ...prev, role: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                >
                  <option value="SHOP_MANAGER">SHOP_MANAGER (Giám đốc Nhãn hàng)</option>
                  <option value="SYSTEM_MANAGER">SYSTEM_MANAGER (Chuyên viên Vận hành Sàn)</option>
                </select>
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
                    {stores.map((st) => (
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

      {/* Modal 2: Khởi tạo Cửa hàng / Nhãn hàng mới (Widescreen 2-Cột, không cần cuộn) */}
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
                {/* Cột 1: Thông tin thương hiệu & Logo */}
                <div className="space-y-3.5">
                  <div className="text-xs font-bold text-[#1A1612] uppercase tracking-wider pb-1 border-b border-[#FAF8F5]">
                    1. Thông tin Nhãn hàng
                  </div>

                  {/* Logo URL & Preview */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                      Ảnh đại diện / Logo nhãn hàng
                    </label>
                    <div className="flex items-center gap-3">
                      {storeForm.logoUrl ? (
                        <img
                          src={storeForm.logoUrl}
                          alt="Logo Preview"
                          className="w-12 h-12 rounded-xl object-cover border border-[#EEDFC6] shrink-0"
                          onError={(e) => ((e.target as any).style.display = 'none')}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] flex items-center justify-center text-[#7D715E] shrink-0">
                          <Store size={20} className="text-[#C59B58]" />
                        </div>
                      )}
                      <input
                        type="url"
                        placeholder="https://... (URL ảnh logo gian hàng)"
                        value={storeForm.logoUrl || ''}
                        onChange={(e) => setStoreForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                      />
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

                {/* Cột 2: Cấu hình Kho xuất hàng GHN vệ tinh */}
                <div className="space-y-3.5">
                  <div className="text-xs font-bold text-[#1A1612] uppercase tracking-wider pb-1 border-b border-[#FAF8F5] flex items-center gap-1.5">
                    <MapPin size={13} className="text-[#C59B58]" />
                    <span>2. Kho xuất hàng GHN (Pickup Warehouse)</span>
                  </div>

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

                  <div>
                    <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                      Địa chỉ kho chi tiết <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Khu Công Nghệ Cao, Tăng Nhơn Phú B, TP.Thủ Đức, TP.HCM"
                      value={storeForm.warehouseAddress || ''}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, warehouseAddress: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                        Mã Quận/Huyện GHN
                      </label>
                      <input
                        type="number"
                        placeholder="1442 (Thủ Đức)"
                        value={storeForm.ghnDistrictId || ''}
                        onChange={(e) => setStoreForm((prev) => ({ ...prev, ghnDistrictId: Number(e.target.value) }))}
                        className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white font-mono focus:outline-none focus:border-[#C59B58]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                        Mã Phường/Xã GHN
                      </label>
                      <input
                        type="text"
                        placeholder="20109"
                        value={storeForm.ghnWardCode || ''}
                        onChange={(e) => setStoreForm((prev) => ({ ...prev, ghnWardCode: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white font-mono focus:outline-none focus:border-[#C59B58]"
                      />
                    </div>
                  </div>
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

      {/* Modal 3: Xem Chi Tiết & Chỉnh Sửa Gian Hàng (Store Detail & Edit) */}
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
                    {selectedStore.isActive ? (
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
                {!isEditStoreMode && (
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
              {isEditStoreMode ? (
                /* Edit Form */
                <form onSubmit={handleUpdateStore} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Cột 1 */}
                    <div className="space-y-3.5">
                      <div className="text-xs font-bold text-[#1A1612] uppercase tracking-wider pb-1 border-b border-[#FAF8F5]">
                        Thông tin Gian hàng
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
                          Ảnh đại diện / Logo URL
                        </label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={editStoreForm.logoUrl}
                          onChange={(e) => setEditStoreForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
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

                    {/* Cột 2 */}
                    <div className="space-y-3.5">
                      <div className="text-xs font-bold text-[#1A1612] uppercase tracking-wider pb-1 border-b border-[#FAF8F5]">
                        Cấu hình Kho xuất hàng GHN
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                          Tên kho xuất hàng
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

                      <div>
                        <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                          Địa chỉ kho chi tiết <span className="text-[#DC2626]">*</span>
                        </label>
                        <input
                          type="text"
                          value={editStoreForm.warehouseAddress}
                          onChange={(e) => setEditStoreForm((prev) => ({ ...prev, warehouseAddress: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                            Mã Quận/Huyện GHN
                          </label>
                          <input
                            type="number"
                            value={editStoreForm.ghnDistrictId}
                            onChange={(e) => setEditStoreForm((prev) => ({ ...prev, ghnDistrictId: Number(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white font-mono focus:outline-none focus:border-[#C59B58]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                            Mã Phường/Xã GHN
                          </label>
                          <input
                            type="text"
                            value={editStoreForm.ghnWardCode}
                            onChange={(e) => setEditStoreForm((prev) => ({ ...prev, ghnWardCode: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white font-mono focus:outline-none focus:border-[#C59B58]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions in Edit Mode */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#EAE4D7]">
                    <button
                      type="button"
                      onClick={() => handleDeleteStore(selectedStore)}
                      className="px-3 py-2 rounded-lg border border-[#F5D8D4] text-[#DC2626] hover:bg-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      <span>Ngừng kinh doanh & Lưu trữ</span>
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
                /* View Mode */
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

                    <button
                      type="button"
                      onClick={() => setIsEditStoreMode(true)}
                      className="px-5 py-2 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Edit2 size={13} />
                      <span>Chỉnh sửa thông tin</span>
                    </button>
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
