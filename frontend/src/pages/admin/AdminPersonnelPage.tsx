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
} from 'lucide-react';
import {
  personnelService,
  type InternalStaffMember,
  type CreateStaffPayload,
  type AdminStoreOption,
} from '../../services/personnel.service';
import { toast } from '../../utils/toast';

export const AdminPersonnelPage: React.FC = () => {
  const [staffList, setStaffList] = useState<InternalStaffMember[]>([]);
  const [stores, setStores] = useState<AdminStoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SHOP_MANAGER' | 'SYSTEM_MANAGER' | 'SYSTEM_ADMIN'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<CreateStaffPayload>({
    email: '',
    fullName: '',
    phoneNumber: '',
    password: '',
    role: 'SHOP_MANAGER',
    storeId: '',
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
      if (storeData.length > 0 && !form.storeId) {
        setForm((prev) => ({ ...prev, storeId: storeData[0].id }));
      }
    } catch (err: any) {
      toast.error('Không thể tải danh sách nhân sự nội bộ');
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
    if (!form.fullName.trim()) {
      toast.error('Vui lòng nhập họ và tên nhân sự');
      return;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      toast.error('Vui lòng nhập email công ty hợp lệ');
      return;
    }
    if (!form.password || form.password.length < 6) {
      toast.error('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    if (form.role === 'SHOP_MANAGER' && !form.storeId) {
      toast.error('Vui lòng chọn Cửa hàng phân công phụ trách');
      return;
    }

    setSubmitting(true);
    try {
      await personnelService.createStaff({
        ...form,
        email: form.email.trim().toLowerCase(),
        fullName: form.fullName.trim(),
        storeId: form.role === 'SHOP_MANAGER' ? form.storeId : undefined,
      });
      toast.success(`Đã bổ nhiệm nhân sự ${form.fullName}`);
      setIsModalOpen(false);
      setForm({
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
      setSubmitting(false);
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
                Quản trị Nhân sự & Phân quyền
              </h1>
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-md bg-[#F3EFE6] text-[#7D715E] border border-[#EAE4D7]">
                {staffList.length} tài khoản
              </span>
            </div>
            <p className="text-xs text-[#7D715E] mt-1">
              Phân quyền điều hành nhãn hàng trực thuộc và chuyên viên vận hành sàn.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white font-medium text-xs shadow-xs transition active:scale-[0.98] self-start sm:self-auto cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Bổ nhiệm nhân sự mới
          </button>
        </div>

        {/* Dense Professional KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-white border border-[#EAE4D7] shadow-[0_1px_2px_rgba(35,29,21,0.02)]">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#7D715E]">
              Tổng nhân sự
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#1A1612] mt-1 tabular-nums">
              {staffList.length}
            </div>
            <div className="text-[11px] text-[#7D715E] mt-0.5">Đang hoạt động</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#EAE4D7] shadow-[0_1px_2px_rgba(35,29,21,0.02)]">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#7D715E]">
              Quản lý Cửa hàng
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#1A1612] mt-1 tabular-nums">
              {totalShopManagers}
            </div>
            <div className="text-[11px] text-[#7D715E] mt-0.5">Phụ trách nhãn hàng</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#EAE4D7] shadow-[0_1px_2px_rgba(35,29,21,0.02)]">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#7D715E]">
              Chuyên viên Vận hành
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#1A1612] mt-1 tabular-nums">
              {totalSystemManagers}
            </div>
            <div className="text-[11px] text-[#7D715E] mt-0.5">Pháp chế & eKYC</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#EAE4D7] shadow-[0_1px_2px_rgba(35,29,21,0.02)]">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#7D715E]">
              Cửa hàng trực thuộc
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#1A1612] mt-1 tabular-nums">
              {stores.length}
            </div>
            <div className="text-[11px] text-[#7D715E] mt-0.5">Sora, Aura, GreenBio...</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#EAE4D7]">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D715E]" />
            <input
              type="text"
              placeholder="Tìm họ tên, email, SĐT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#EAE4D7] text-xs bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#C59B58] transition"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'SHOP_MANAGER', label: 'Quản lý Shop' },
              { id: 'SYSTEM_MANAGER', label: 'Chuyên viên Sàn' },
              { id: 'SYSTEM_ADMIN', label: 'Super Admin' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  roleFilter === tab.id
                    ? 'bg-[#1A1612] text-white font-semibold'
                    : 'bg-transparent hover:bg-[#FAF8F5] text-[#7D715E]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* High-Density Personnel Table */}
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
                    <th className="py-2.5 px-4">Ngày tạo</th>
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
                            <span className="text-xs font-medium text-[#1A1612]">
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
                              {staff.isActive ? 'Khóa' : 'Mở khóa'}
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
      </div>

      {/* Sleek Appointment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#EAE4D7] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE4D7] bg-[#FAF8F5]">
              <div>
                <h2 className="text-sm font-bold text-[#1A1612]">Bổ nhiệm nhân sự mới</h2>
                <p className="text-[11px] text-[#7D715E] mt-0.5">
                  Cấp tài khoản và phân công trách nhiệm điều hành.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#7D715E] hover:text-[#1A1612] p-1 rounded-md hover:bg-[#EAE4D7]/40 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateStaff} className="p-5 space-y-3.5">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1612] mb-1.5">
                  Vai trò phân công <span className="text-[#DC2626]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, role: 'SHOP_MANAGER' }))}
                    className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                      form.role === 'SHOP_MANAGER'
                        ? 'bg-[#FBF5EB] border-[#C59B58] ring-1 ring-[#C59B58]'
                        : 'bg-white border-[#EAE4D7] hover:border-[#C59B58]/40'
                    }`}
                  >
                    <div className="font-semibold text-xs text-[#1A1612]">Quản lý Cửa hàng</div>
                    <div className="text-[11px] text-[#7D715E] mt-0.5">Phụ trách nhãn hàng</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, role: 'SYSTEM_MANAGER' }))}
                    className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                      form.role === 'SYSTEM_MANAGER'
                        ? 'bg-[#FBF5EB] border-[#C59B58] ring-1 ring-[#C59B58]'
                        : 'bg-white border-[#EAE4D7] hover:border-[#C59B58]/40'
                    }`}
                  >
                    <div className="font-semibold text-xs text-[#1A1612]">Chuyên viên Vận hành</div>
                    <div className="text-[11px] text-[#7D715E] mt-0.5">Pháp chế & eKYC</div>
                  </button>
                </div>
              </div>

              {/* Store Assignment (If SHOP_MANAGER) */}
              {form.role === 'SHOP_MANAGER' && (
                <div>
                  <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                    Cửa hàng phân công <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    value={form.storeId || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, storeId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                  >
                    <option value="">-- Chọn Cửa hàng phụ trách --</option>
                    {stores.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} {st.owner ? `(${st.owner.fullName})` : '(Chưa gán)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                  Họ và tên <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={form.fullName}
                  onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                    Email công ty <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="ten.nv@scanms.vn"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    placeholder="0912 345 678"
                    value={form.phoneNumber || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#EAE4D7] text-xs bg-white focus:outline-none focus:border-[#C59B58]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1612] mb-1">
                  Mật khẩu khởi tạo <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tối thiểu 6 ký tự"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
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

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE4D7]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#EAE4D7] text-xs font-medium text-[#7D715E] hover:bg-[#FAF8F5] transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Xác nhận bổ nhiệm
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
