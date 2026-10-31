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
  CheckCircle2,
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

  // Store Modal State
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [storeSubmitting, setStoreSubmitting] = useState(false);
  const [storeForm, setStoreForm] = useState<CreateStorePayload>({
    name: '',
    categoryName: LOCKED_CATEGORIES[0],
    description: '',
    defaultCommissionRate: 10,
    warehouseName: '',
    contactName: '',
    contactPhone: '',
    warehouseAddress: '',
    ghnDistrictId: 1442,
    ghnWardCode: '20109',
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
        {/* Clean Executive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE4D7]">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#1A1612]">
                Quản trị Nhân sự & Gian Hàng Trực Thuộc
              </h1>
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-md bg-[#F3EFE6] text-[#7D715E] border border-[#EAE4D7]">
                {staffList.length} nhân sự • {stores.length} nhãn hàng
              </span>
            </div>
            <p className="text-xs text-[#7D715E] mt-1">
              Phân quyền điều hành nhãn hàng trực thuộc và thẩm định chuyên viên vận hành sàn.
            </p>
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
          /* Store & Multi-Warehouse Grid */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#7D715E]">
              <span>Hiển thị <strong>{filteredStores.length}</strong> nhãn hàng trực thuộc công ty mẹ</span>
              <span className="font-mono text-[11px] bg-[#FBF5EB] px-2 py-0.5 rounded text-[#8F682E] border border-[#EEDFC6]">
                Chiết khấu thù lao cơ sở: Cố định 10%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="p-5 rounded-2xl bg-white border border-[#EAE4D7] shadow-[0_1px_3px_rgba(35,29,21,0.03)] space-y-4 hover:border-[#C59B58]/40 transition"
                  >
                    {/* Store Title & Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#C59B58] flex items-center justify-center font-bold text-sm shrink-0">
                          {initials || 'ST'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-[#1A1612]">{st.name}</h3>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FBF5EB] text-[#8F682E] border border-[#EEDFC6]">
                              <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                              Chính hãng
                            </span>
                          </div>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F3EFE6] text-[#1A1612] border border-[#EAE4D7]">
                            {st.categoryName || 'Mỹ phẩm & Chăm sóc da chuyên sâu'}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-1 rounded text-xs font-mono font-bold bg-[#FAF8F5] text-[#1A1612] border border-[#EAE4D7]">
                        {st.defaultCommissionRate || 10}% Base
                      </span>
                    </div>

                    {/* Description */}
                    {st.description && (
                      <p className="text-xs text-[#7D715E] line-clamp-2 leading-relaxed">
                        {st.description}
                      </p>
                    )}

                    {/* Assigned Manager & Stock Status */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-[#FAF8F5]">
                      <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7]">
                        <span className="text-[10px] uppercase font-semibold text-[#7D715E] block">Quản lý trực tiếp</span>
                        <div className="font-medium text-xs text-[#1A1612] mt-0.5 truncate">
                          {st.owner?.fullName || 'Chưa phân công'}
                        </div>
                        <div className="text-[11px] text-[#7D715E] font-mono truncate">{st.owner?.email || 'N/A'}</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7]">
                        <span className="text-[10px] uppercase font-semibold text-[#7D715E] block">Sản phẩm mở bán</span>
                        <div className="font-bold text-sm text-[#1A1612] mt-0.5 font-mono">
                          {st._count?.products ?? 0} sản phẩm
                        </div>
                        <div className="text-[11px] text-[#059669] font-medium">Đang niêm yết active</div>
                      </div>
                    </div>

                    {/* Warehouse Fulfillment Info */}
                    <div className="p-3 rounded-xl bg-[#FAF8F5]/80 border border-[#EAE4D7] space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-[#1A1612] font-semibold text-[11px] uppercase tracking-wider">
                        <MapPin className="w-3.5 h-3.5 text-[#C59B58]" />
                        <span>Kho xuất hàng GHN (Pickup Warehouse)</span>
                      </div>
                      <div className="text-[11px] text-[#1A1612] font-medium">
                        {wh.warehouseName || `Kho Tổng ${st.name}`}
                      </div>
                      <div className="text-[11px] text-[#7D715E]">
                        {wh.address || 'Khu Công Nghệ Cao, Tăng Nhơn Phú B, TP.Thủ Đức, TP.HCM'}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#7D715E] pt-1 border-t border-[#EAE4D7]/60 font-mono">
                        <span>Liên hệ: {wh.contactName || 'Quản kho'} ({wh.contactPhone || '0901234567'})</span>
                        <span className="bg-white px-1.5 py-0.5 rounded border border-[#EAE4D7]">
                          GHN: {wh.ghnDistrictId || 1442} - {wh.ghnWardCode || '20109'}
                        </span>
                      </div>
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
                                Đã khóa
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {staff.role !== 'SYSTEM_ADMIN' ? (
                              <button
                                onClick={() => handleToggleStatus(staff)}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                                  staff.isActive
                                    ? 'text-[#DC2626] hover:bg-[#F5D8D4]/40 border border-[#EAE4D7]'
                                    : 'text-[#059669] hover:bg-[#FBF5EB] border border-[#EEDFC6]'
                                }`}
                              >
                                {staff.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
                              </button>
                            ) : (
                              <span className="text-[11px] text-[#7D715E] font-mono">Tối cao</span>
                            )}
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

      {/* Modal 1: Bổ nhiệm Nhân sự mới */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#EAE4D7] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE4D7] bg-[#FAF8F5]">
              <div>
                <h2 className="text-sm font-bold text-[#1A1612]">Bổ nhiệm nhân sự mới</h2>
                <p className="text-[11px] text-[#7D715E] mt-0.5">
                  Cấp tài khoản và phân công trách nhiệm điều hành nội bộ.
                </p>
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
                <label className="block text-xs font-semibold text-[#1A1612] mb-1.5">
                  Vai trò phân công <span className="text-[#DC2626]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStaffForm((prev) => ({ ...prev, role: 'SHOP_MANAGER' }))}
                    className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                      staffForm.role === 'SHOP_MANAGER'
                        ? 'bg-[#FBF5EB] border-[#C59B58] ring-1 ring-[#C59B58]'
                        : 'bg-white border-[#EAE4D7] hover:border-[#C59B58]/40'
                    }`}
                  >
                    <div className="font-semibold text-xs text-[#1A1612]">Quản lý Cửa hàng</div>
                    <div className="text-[11px] text-[#7D715E] mt-0.5">Phụ trách nhãn hàng</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStaffForm((prev) => ({ ...prev, role: 'SYSTEM_MANAGER' }))}
                    className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                      staffForm.role === 'SYSTEM_MANAGER'
                        ? 'bg-[#FBF5EB] border-[#C59B58] ring-1 ring-[#C59B58]'
                        : 'bg-white border-[#EAE4D7] hover:border-[#C59B58]/40'
                    }`}
                  >
                    <div className="font-semibold text-xs text-[#1A1612]">Chuyên viên Vận hành</div>
                    <div className="text-[11px] text-[#7D715E] mt-0.5">Pháp chế & eKYC</div>
                  </button>
                </div>
              </div>

              {staffForm.role === 'SHOP_MANAGER' && (
                <div>
                  <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                    Cửa hàng phân công <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    value={staffForm.storeId || ''}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, storeId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                  >
                    <option value="">-- Chọn Cửa hàng phụ trách --</option>
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

      {/* Modal 2: Khởi tạo Cửa hàng / Nhãn hàng mới */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#EAE4D7] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE4D7] bg-[#FAF8F5] shrink-0">
              <div>
                <h2 className="text-sm font-bold text-[#1A1612]">Khởi tạo Cửa hàng / Nhãn hàng mới</h2>
                <p className="text-[11px] text-[#7D715E] mt-0.5">
                  Thiết lập nhãn hàng trực thuộc công ty mẹ, khóa ngành hàng độc quyền và cấu hình kho GHN.
                </p>
              </div>
              <button
                onClick={() => setIsStoreModalOpen(false)}
                className="text-[#7D715E] hover:text-[#1A1612] p-1 rounded-md hover:bg-[#EAE4D7]/40 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="p-5 space-y-4 overflow-y-auto">
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
                    Khóa danh mục độc quyền
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
                <p className="text-[11px] text-[#7D715E] mt-1">
                  Mỗi cửa hàng chỉ kinh doanh đúng 1 ngành hàng để chống xung đột thương hiệu và dìm giá lẫn nhau.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                  Mô tả định vị nhãn hàng
                </label>
                <textarea
                  rows={2}
                  placeholder="Giới thiệu về dòng sản phẩm và sứ mệnh thương hiệu..."
                  value={storeForm.description || ''}
                  onChange={(e) => setStoreForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58] resize-none"
                />
              </div>

              {/* GHN Warehouse Section */}
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1612]">
                    <MapPin className="w-3.5 h-3.5 text-[#C59B58]" />
                    <span>Cấu hình Kho xuất hàng GHN (Pickup Warehouse)</span>
                  </div>
                  <span className="text-[10px] text-[#7D715E] font-mono">Bưu tá GHN sang lấy</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#1A1612] mb-1">
                    Tên kho xuất hàng
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Kho Mát Dược Mỹ Phẩm GMP Thủ Đức"
                    value={storeForm.warehouseName || ''}
                    onChange={(e) => setStoreForm((prev) => ({ ...prev, warehouseName: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#1A1612] mb-1">
                      Người phụ trách kho
                    </label>
                    <input
                      type="text"
                      placeholder="Nguyễn Quản Kho"
                      value={storeForm.contactName || ''}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, contactName: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#1A1612] mb-1">
                      SĐT kho xuất
                    </label>
                    <input
                      type="text"
                      placeholder="0901234567"
                      value={storeForm.contactPhone || ''}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#1A1612] mb-1">
                    Địa chỉ kho chi tiết <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Khu Công Nghệ Cao, Tăng Nhơn Phú B, TP.Thủ Đức, TP.HCM"
                    value={storeForm.warehouseAddress || ''}
                    onChange={(e) => setStoreForm((prev) => ({ ...prev, warehouseAddress: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#1A1612] mb-1">
                      Mã Quận/Huyện GHN
                    </label>
                    <input
                      type="number"
                      placeholder="1442 (Thủ Đức)"
                      value={storeForm.ghnDistrictId || ''}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, ghnDistrictId: Number(e.target.value) }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#EAE4D7] text-xs bg-white font-mono focus:outline-none focus:border-[#C59B58]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#1A1612] mb-1">
                      Mã Phường/Xã GHN
                    </label>
                    <input
                      type="text"
                      placeholder="20109"
                      value={storeForm.ghnWardCode || ''}
                      onChange={(e) => setStoreForm((prev) => ({ ...prev, ghnWardCode: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#EAE4D7] text-xs bg-white font-mono focus:outline-none focus:border-[#C59B58]"
                    />
                  </div>
                </div>
              </div>

              {/* Fixed 10% Base Rate Pill */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6]">
                <div>
                  <span className="text-xs font-bold text-[#1A1612] block">Tỷ lệ hoa hồng cơ sở</span>
                  <span className="text-[11px] text-[#7D715E]">Cố định 10% Open Offer</span>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-[#C59B58] text-white text-xs font-bold font-mono">
                  10.0%
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE4D7]">
                <button
                  type="button"
                  onClick={() => setIsStoreModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#EAE4D7] text-xs font-medium text-[#7D715E] hover:bg-[#FAF8F5] transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={storeSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  {storeSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Khởi tạo Cửa hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPersonnelPage;
