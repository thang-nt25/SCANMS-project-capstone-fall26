import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  User,
  MapPin,
  Heart,
  Search,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  LogOut,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Loader2,
  Store as StoreIcon,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Home,
  Scale,
  Video,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { authService, type UserProfile } from '../../services/auth.service';
import {
  customerService,
  type CustomerProfileResponse,
  type CustomerOrder,
  type CustomerAddress,
  type CustomerWishlistItem,
} from '../../services/customer.service';
import {
  loadShippingAddresses,
  type ShippingProvince,
} from '../../services/order-address.service';
import { formatMoney } from '../../features/marketplace/marketplaceUtils';
import { toast } from '../../utils/toast';
import { GuestCheckoutModal, type CheckoutProductItem, type CheckoutStoreInfo } from '../../components/checkout/GuestCheckoutModal';
import { PublicHeader } from '../../components/layout/PublicHeader';
import { PartnerUpgradeTab } from './PartnerUpgradeTab';
import api from '../../services/api';

type CustomerTab = 'orders' | 'addresses' | 'wishlist' | 'profile' | 'upgrade' | 'returns';
type OrderFilterStatus = 'ALL' | 'PENDING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';

export default function CustomerPortalPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const pathTab = location.pathname.includes('/customer/upgrade')
    ? 'upgrade'
    : location.pathname.includes('/customer/addresses')
    ? 'addresses'
    : location.pathname.includes('/customer/wishlist')
    ? 'wishlist'
    : location.pathname.includes('/customer/profile')
    ? 'profile'
    : null;
  const currentTab = pathTab || (searchParams.get('tab') as CustomerTab) || 'orders';

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [profileData, setProfileData] = useState<CustomerProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Tab 1: Orders State
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderFilterStatus>('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<CustomerOrder | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Return request modal state
  const [returnModalOrder, setReturnModalOrder] = useState<CustomerOrder | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnVideoUrl, setReturnVideoUrl] = useState('');
  const [returnImagesStr, setReturnImagesStr] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // My disputes state
  const [myDisputes, setMyDisputes] = useState<any[]>([]);
  const [disputesLoading, setDisputesLoading] = useState(false);

  // Tab 2: Addresses State
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    phoneNumber: '',
    provinceCode: '',
    provinceName: '',
    districtCode: '',
    districtName: '',
    wardCode: '',
    wardName: '',
    detailAddress: '',
    isDefault: false,
  });
  const [provinces, setProvinces] = useState<ShippingProvince[]>([]);
  const [savingAddress, setSavingAddress] = useState(false);

  // Tab 3: Wishlist State
  const [wishlist, setWishlist] = useState<CustomerWishlistItem[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Tab 4: Profile & Password Form
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Checkout modal for "Mua lại" / "Mua ngay"
  const [activeCheckoutProduct, setActiveCheckoutProduct] = useState<{
    product: CheckoutProductItem;
    store: CheckoutStoreInfo;
  } | null>(null);

  // Check login
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      toast.error('Vui lòng đăng nhập để truy cập trang cá nhân khách hàng');
      navigate('/login');
      return;
    }
    setCurrentUser(user);
    fetchProfile();
  }, [navigate]);

  // Handle Tab changes
  useEffect(() => {
    if (currentTab === 'orders') fetchOrders();
    if (currentTab === 'addresses') fetchAddresses();
    if (currentTab === 'wishlist') fetchWishlist();
  }, [currentTab, orderStatusFilter]);

  // Load Vietnam Administrative Divisions
  useEffect(() => {
    const controller = new AbortController();
    loadShippingAddresses(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setProvinces(data || []);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error('Không tải được danh mục địa chỉ:', err);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  const setTab = (tab: CustomerTab) => {
    setSearchParams({ tab });
  };

  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const data = await customerService.getProfile();
      setProfileData(data);
      setNameInput(data.user.fullName || '');
      setPhoneInput(data.user.phoneNumber || '');
    } catch (err: any) {
      console.error('Fetch profile error:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const statusParam = orderStatusFilter === 'ALL' ? undefined : orderStatusFilter;
      const res = await customerService.getOrders({
        status: statusParam,
        search: orderSearch.trim() || undefined,
      });
      setOrders(res.orders);
    } catch (err: any) {
      console.error('Fetch orders error:', err);
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancellingOrderId) return;
    setIsCancelling(true);
    try {
      await customerService.cancelOrder(cancellingOrderId, cancelReason);
      toast.success('Hủy đơn hàng thành công');
      setCancellingOrderId(null);
      setCancelReason('');
      fetchOrders();
      fetchProfile();
      if (selectedOrderDetails?.id === cancellingOrderId) {
        setSelectedOrderDetails(null);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể hủy đơn hàng');
    } finally {
      setIsCancelling(false);
    }
  };

  const fetchAddresses = async () => {
    setAddressesLoading(true);
    try {
      const data = await customerService.getAddresses();
      setAddresses(data);
    } catch (err: any) {
      console.error('Fetch addresses error:', err);
    } finally {
      setAddressesLoading(false);
    }
  };

  const openAddAddressModal = () => {
    setEditingAddressId(null);
    setAddressForm({
      fullName: profileData?.user.fullName || '',
      phoneNumber: profileData?.user.phoneNumber || '',
      provinceCode: '',
      provinceName: '',
      districtCode: '',
      districtName: '',
      wardCode: '',
      wardName: '',
      detailAddress: '',
      isDefault: addresses.length === 0,
    });
    setIsAddressModalOpen(true);
  };

  const openEditAddressModal = (addr: CustomerAddress) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      fullName: addr.fullName,
      phoneNumber: addr.phoneNumber,
      provinceCode: addr.provinceCode || '',
      provinceName: addr.provinceName,
      districtCode: addr.districtCode || '',
      districtName: addr.districtName,
      wardCode: addr.wardCode || '',
      wardName: addr.wardName,
      detailAddress: addr.detailAddress,
      isDefault: addr.isDefault,
    });
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.provinceName || !addressForm.districtName || !addressForm.wardName) {
      toast.error('Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện và Phường/Xã');
      return;
    }
    setSavingAddress(true);
    try {
      if (editingAddressId) {
        await customerService.updateAddress(editingAddressId, addressForm);
        toast.success('Cập nhật địa chỉ thành công');
      } else {
        await customerService.createAddress(addressForm);
        toast.success('Thêm địa chỉ mới thành công');
      }
      setIsAddressModalOpen(false);
      fetchAddresses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể lưu địa chỉ');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;
    try {
      await customerService.deleteAddress(id);
      toast.success('Đã xóa địa chỉ');
      fetchAddresses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể xóa địa chỉ');
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await customerService.setDefaultAddress(id);
      toast.success('Đã thiết lập địa chỉ mặc định');
      fetchAddresses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi thiết lập địa chỉ mặc định');
    }
  };

  const fetchWishlist = async () => {
    setWishlistLoading(true);
    try {
      const data = await customerService.getWishlist();
      setWishlist(data);
    } catch (err: any) {
      console.error('Fetch wishlist error:', err);
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleRemoveWishlist = async (productId: string) => {
    try {
      await customerService.removeFromWishlist(productId);
      toast.success('Đã xóa khỏi danh sách yêu thích');
      setWishlist((prev) => prev.filter((item) => item.product.id !== productId));
      fetchProfile();
    } catch {
      toast.error('Lỗi khi xóa sản phẩm yêu thích');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      await customerService.updateProfile({
        fullName: nameInput,
        phoneNumber: phoneInput,
      });
      toast.success('Cập nhật thông tin tài khoản thành công');
      fetchProfile();
      authService.getMe();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể cập nhật hồ sơ');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmNewPass) {
      toast.error('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }
    if (newPass.length < 6) {
      toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }
    setUpdatingPassword(true);
    try {
      await customerService.changePassword({
        currentPassword: currentPass,
        newPassword: newPass,
      });
      toast.success('Đổi mật khẩu thành công! Vui lòng ghi nhớ mật khẩu mới');
      setCurrentPass('');
      setNewPass('');
      setConfirmNewPass('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Mật khẩu hiện tại không đúng');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleReorder = (order: CustomerOrder) => {
    const firstItem = order.orderItems[0];
    if (!firstItem?.product) {
      toast.error('Sản phẩm không còn khả dụng để mua lại');
      return;
    }
    setActiveCheckoutProduct({
      product: {
        id: firstItem.product.id,
        title: firstItem.product.title,
        price: firstItem.unitPrice,
        imageUrl: firstItem.product.imageUrl || '',
        stockQuantity: 99,
      },
      store: {
        id: order.storeId,
        name: order.store?.name || 'Gian Hàng Đối Tác',
      },
    });
  };

  const selectedProvince = provinces.find((p) => String(p.code) === String(addressForm.provinceCode));
  const selectedDistrict = selectedProvince?.districts.find((d) => String(d.code) === String(addressForm.districtCode));

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1612]">
      <PublicHeader />

      <main className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[#7D715E] mb-6">
          <Link to="/marketplace" className="hover:text-[#B88E4F] flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Sàn Mua Sắm</span>
          </Link>
          <span>/</span>
          <span className="text-[#1A1612] font-bold">Trung Tâm Khách Hàng</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================= */}
          {/* LEFT SIDEBAR - USER CARD & SHOPEE-STYLE NAVIGATION MENU */}
          {/* ========================================================= */}
          <aside className="lg:col-span-3 bg-white border border-[#EAE4D7] rounded-3xl p-5 shadow-sm">
            {/* User Identity Banner */}
            <div className="flex items-center gap-3.5 pb-5 border-b border-[#EAE4D7]">
              <div className="w-13 h-13 rounded-2xl bg-[#FBF5EB] border-2 border-[#EEDFC6] text-[#B88E4F] font-black text-lg flex items-center justify-center shrink-0 shadow-2xs">
                {profileData?.user.fullName ? profileData.user.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <strong className="block text-sm font-black text-[#1A1612] truncate">
                  {profileData?.user.fullName || currentUser?.fullName || 'Khách Hàng'}
                </strong>
                <span className="text-[11px] font-bold text-[#8C6226] bg-[#FBF5EB] px-2 py-0.5 rounded-full border border-[#EEDFC6] inline-block mt-1">
                  ✨ Khách Mua Hàng
                </span>
                <span className="block text-[11px] text-[#7D715E] truncate mt-0.5">
                  {profileData?.user.email || currentUser?.email}
                </span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 py-4 border-b border-[#EAE4D7] text-center">
              <div className="bg-[#FAF8F5] p-2 rounded-xl border border-[#EAE4D7]">
                <span className="block text-xs font-black text-[#B88E4F]">
                  {profileData?.stats.totalOrders ?? 0}
                </span>
                <span className="text-[10px] text-[#7D715E]">Đơn mua</span>
              </div>
              <div className="bg-[#FAF8F5] p-2 rounded-xl border border-[#EAE4D7]">
                <span className="block text-xs font-black text-amber-600">
                  {profileData?.stats.pendingOrders ?? 0}
                </span>
                <span className="text-[10px] text-[#7D715E]">Chờ xử lý</span>
              </div>
              <div className="bg-[#FAF8F5] p-2 rounded-xl border border-[#EAE4D7]">
                <span className="block text-xs font-black text-rose-500">
                  {profileData?.stats.wishlistCount ?? 0}
                </span>
                <span className="text-[10px] text-[#7D715E]">Yêu thích</span>
              </div>
            </div>

            {/* Menu List */}
            <nav className="flex flex-col gap-1.5 pt-4 text-left">
              <button
                type="button"
                onClick={() => setTab('orders')}
                className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  currentTab === 'orders'
                    ? 'bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] shadow-2xs'
                    : 'text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Đơn mua của tôi</span>
                </div>
                {profileData?.stats.pendingOrders ? (
                  <span className="w-5 h-5 rounded-full bg-[#C59B58] text-white text-[10px] font-black flex items-center justify-center">
                    {profileData.stats.pendingOrders}
                  </span>
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setTab('addresses')}
                className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  currentTab === 'addresses'
                    ? 'bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] shadow-2xs'
                    : 'text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4" />
                  <span>Sổ địa chỉ nhận hàng</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                type="button"
                onClick={() => setTab('wishlist')}
                className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  currentTab === 'wishlist'
                    ? 'bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] shadow-2xs'
                    : 'text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4" />
                  <span>Sản phẩm yêu thích</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                type="button"
                onClick={() => setTab('profile')}
                className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  currentTab === 'profile'
                    ? 'bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] shadow-2xs'
                    : 'text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4" />
                  <span>Hồ sơ &amp; Bảo mật</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                type="button"
                onClick={() => setTab('upgrade')}
                className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  currentTab === 'upgrade'
                    ? 'bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] shadow-2xs'
                    : 'text-[#B88E4F] hover:bg-[#FAF8F5] bg-[#FBF5EB]/40 border border-[#EEDFC6]/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#B88E4F]" />
                  <span>Nâng cấp Đối tác</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#B88E4F] text-white font-black">
                  KOL / Shop
                </span>
              </button>

              {/* Returns tab */}
              <button
                type="button"
                onClick={async () => {
                  setTab('returns');
                  setDisputesLoading(true);
                  try {
                    const res: any = await api.get('/orders/admin/disputes');
                    const data = res?.data || res || [];
                    setMyDisputes(Array.isArray(data) ? data : []);
                  } catch { /* no disputes */ } finally { setDisputesLoading(false); }
                }}
                className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  currentTab === 'returns'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                    : 'text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Scale className="w-4 h-4" />
                  <span>Yêu cầu đổi trả / Hoàn hàng</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              <div className="pt-4 mt-2 border-t border-[#EAE4D7] flex flex-col gap-2">
                <Link
                  to="/marketplace"
                  className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5] transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Tiếp tục mua sắm</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    authService.logout();
                    navigate('/login');
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất tài khoản</span>
                </button>
              </div>
            </nav>
          </aside>

          {/* ========================================================= */}
          {/* RIGHT MAIN PANEL - CONTENT ACCORDING TO ACTIVE TAB */}
          {/* ========================================================= */}
          <div className="lg:col-span-9 flex flex-col gap-6 text-left">
            {/* ------------------------------------------------------------- */}
            {/* TAB 1: ĐƠN MUA CỦA TÔI (SHOPEE STYLE) */}
            {/* ------------------------------------------------------------- */}
            {currentTab === 'orders' && (
              <div className="bg-white border border-[#EAE4D7] rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                {/* Header & Status Filter Tabs */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black text-[#1A1612] m-0 font-display">
                        Đơn Mua Của Tôi
                      </h1>
                      <p className="text-xs text-[#7D715E] mt-1 m-0">
                        Theo dõi tiến trình vận chuyển, hủy đơn chờ hoặc mua lại sản phẩm
                      </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-[#7D715E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
                        placeholder="Tìm theo mã đơn hoặc sản phẩm..."
                        className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1A1612] placeholder-[#7D715E] focus:bg-white focus:border-[#C59B58] outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#EAE4D7]">
                    {[
                      { key: 'ALL', label: 'Tất cả' },
                      { key: 'PENDING', label: 'Chờ xác nhận' },
                      { key: 'SHIPPING', label: 'Đang giao' },
                      { key: 'DELIVERED', label: 'Đã giao' },
                      { key: 'CANCELLED', label: 'Đã hủy' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setOrderStatusFilter(tab.key as OrderFilterStatus)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                          orderStatusFilter === tab.key
                            ? 'bg-[#1A1612] text-white shadow-xs'
                            : 'bg-[#FAF8F5] text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#1A1612]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orders List */}
                {ordersLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#7D715E]">
                    <Loader2 className="w-8 h-8 text-[#B88E4F] animate-spin" />
                    <span className="text-xs font-semibold">Đang tải danh sách đơn mua...</span>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-16 text-center flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <div>
                      <strong className="text-sm font-bold text-[#1A1612] block">
                        Chưa có đơn hàng nào
                      </strong>
                      <p className="text-xs text-[#7D715E] mt-1 max-w-sm m-0">
                        {orderStatusFilter === 'ALL'
                          ? 'Bạn chưa đặt mua đơn hàng nào trên SCANMS. Hãy khám phá ngay các sản phẩm chính hãng nhé!'
                          : `Không tìm thấy đơn hàng nào ở trạng thái "${orderStatusFilter}".`}
                      </p>
                    </div>
                    <Link
                      to="/marketplace"
                      className="px-5 py-2.5 rounded-xl bg-[#B88E4F] text-white text-xs font-bold hover:bg-[#8C6226] transition shadow-xs"
                    >
                      Khám phá sản phẩm ngay
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {orders.map((order) => {
                      const isPending = order.status === 'PENDING';
                      const isDelivered = order.status === 'DELIVERED' || order.status === 'COMPLETED';
                      const isCancelled = order.status === 'CANCELLED';

                      return (
                        <div
                          key={order.id}
                          className="bg-white border border-[#EAE4D7] hover:border-[#C59B58] rounded-2xl p-5 shadow-2xs transition flex flex-col gap-4"
                        >
                          {/* Order Card Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EAE4D7]">
                            <div className="flex items-center gap-2">
                              <StoreIcon className="w-4 h-4 text-[#B88E4F]" />
                              <strong className="text-xs font-black text-[#1A1612]">
                                {order.store?.name || 'Gian Hàng Đối Tác'}
                              </strong>
                              <span className="text-[11px] font-mono text-[#7D715E] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#EAE4D7]">
                                #{order.externalOrderSn}
                              </span>
                            </div>

                            {/* Status Badge */}
                            <div>
                              {isPending && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                                  <Clock className="w-3 h-3" />
                                  <span>Chờ shop xác nhận</span>
                                </span>
                              )}
                              {order.status === 'SHIPPING' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                                  <Truck className="w-3 h-3" />
                                  <span>Đang vận chuyển</span>
                                </span>
                              )}
                              {isDelivered && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Giao hàng thành công</span>
                                </span>
                              )}
                              {isCancelled && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                                  <XCircle className="w-3 h-3" />
                                  <span>Đã hủy đơn</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Order Items */}
                          <div className="flex flex-col gap-3">
                            {order.orderItems.map((item) => (
                              <div key={item.id} className="flex items-center gap-3.5">
                                <div className="w-16 h-16 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] overflow-hidden shrink-0 flex items-center justify-center">
                                  {item.product?.imageUrl ? (
                                    <img
                                      src={item.product.imageUrl}
                                      alt={item.product.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Package className="w-6 h-6 text-[#7D715E]" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <strong className="block text-xs font-bold text-[#1A1612] line-clamp-1">
                                    {item.product?.title || 'Sản phẩm chính hãng'}
                                  </strong>
                                  {item.variant?.name && (
                                    <span className="text-[11px] text-[#7D715E] block mt-0.5">
                                      Phân loại: {item.variant.name}
                                    </span>
                                  )}
                                  <span className="text-[11px] text-[#7D715E] block mt-0.5">
                                    Số lượng: x{item.quantity}
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-black text-[#1A1612]">
                                    {formatMoney(Number(item.unitPrice) * item.quantity)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Order Card Footer */}
                          <div className="pt-3 border-t border-[#EAE4D7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex flex-col gap-0.5 text-xs">
                              <span className="text-[11px] text-[#7D715E]">
                                Ngày đặt: {new Date(order.createdAt).toLocaleString('vi-VN')}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[#7D715E]">Thành tiền:</span>
                                <strong className="text-sm font-black text-[#8C6226]">
                                  {formatMoney(order.finalAmount)}
                                </strong>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setSelectedOrderDetails(order)}
                                className="px-3.5 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#EAE4D7] text-xs font-bold text-[#1A1612] transition cursor-pointer"
                              >
                                Xem chi tiết
                              </button>

                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => setCancellingOrderId(order.id)}
                                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700 transition cursor-pointer"
                                >
                                  Hủy đơn
                                </button>
                              )}

                              {isDelivered && (
                                <Link
                                  to={`/tracking?orderSn=${encodeURIComponent(order.externalOrderSn)}`}
                                  className="px-3.5 py-2 rounded-xl bg-[#FBF5EB] hover:bg-[#F5E7CC] border border-[#EEDFC6] text-xs font-bold text-[#8C6226] transition flex items-center gap-1"
                                >
                                  <span>Đánh giá 5★</span>
                                </Link>
                              )}

                              {/* Return request button — only for DELIVERED within 14 days */}
                              {isDelivered && (() => {
                                const completedAt = order.completedAt || order.updatedAt;
                                const daysSince = Math.floor((Date.now() - new Date(completedAt).getTime()) / 86_400_000);
                                return daysSince <= 14;
                              })() && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReturnModalOrder(order);
                                    setReturnReason('');
                                    setReturnVideoUrl('');
                                    setReturnImagesStr('');
                                    setReturnNotes('');
                                  }}
                                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700 transition cursor-pointer flex items-center gap-1"
                                >
                                  <Scale className="w-3 h-3" />
                                  <span>Đổi trả 14 ngày</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleReorder(order)}
                                className="px-3.5 py-2 rounded-xl bg-[#B88E4F] hover:bg-[#8C6226] text-white text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Mua lại</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 2: SỔ ĐỊA CHỈ NHẬN HÀNG (ADDRESS BOOK) */}
            {/* ------------------------------------------------------------- */}
            {currentTab === 'addresses' && (
              <div className="bg-white border border-[#EAE4D7] rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EAE4D7]">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-[#1A1612] m-0 font-display">
                      Sổ Địa Chỉ Nhận Hàng
                    </h1>
                    <p className="text-xs text-[#7D715E] mt-1 m-0">
                      Lưu sẵn địa chỉ giao hàng để đặt hàng 1-chạm cực nhanh chóng
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openAddAddressModal}
                    className="px-4 py-2.5 rounded-xl bg-[#B88E4F] hover:bg-[#8C6226] text-white text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm địa chỉ mới</span>
                  </button>
                </div>

                {addressesLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#7D715E]">
                    <Loader2 className="w-8 h-8 text-[#B88E4F] animate-spin" />
                    <span className="text-xs font-semibold">Đang tải sổ địa chỉ...</span>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center">
                      <MapPin className="w-8 h-8" />
                    </div>
                    <div>
                      <strong className="text-sm font-bold text-[#1A1612] block">
                        Chưa có địa chỉ nhận hàng
                      </strong>
                      <p className="text-xs text-[#7D715E] mt-1 m-0">
                        Hãy thêm địa chỉ nhận hàng đầu tiên để tự động điền khi mua sắm nhé!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openAddAddressModal}
                      className="px-4 py-2 rounded-xl bg-[#B88E4F] text-white text-xs font-bold hover:bg-[#8C6226] transition"
                    >
                      Thêm ngay
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={`p-5 rounded-2xl border transition flex flex-col justify-between gap-4 text-left ${
                          addr.isDefault
                            ? 'bg-[#FBF5EB]/60 border-[#C59B58] ring-1 ring-[#C59B58]/30 shadow-xs'
                            : 'bg-white border-[#EAE4D7] hover:border-[#C59B58]'
                        }`}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <strong className="text-sm font-black text-[#1A1612]">
                                {addr.fullName}
                              </strong>
                              <span className="text-xs text-[#7D715E]">| {addr.phoneNumber}</span>
                            </div>
                            {addr.isDefault && (
                              <span className="text-[10px] font-black uppercase text-[#8C6226] bg-[#FBF5EB] px-2 py-0.5 rounded-full border border-[#EEDFC6]">
                                Mặc định
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#1A1612] leading-relaxed m-0">
                            {addr.detailAddress}
                          </p>
                          <span className="text-xs text-[#7D715E] block">
                            {addr.wardName}, {addr.districtName}, {addr.provinceName}
                          </span>
                        </div>

                        <div className="pt-3 border-t border-[#EAE4D7] flex items-center justify-between gap-2">
                          {!addr.isDefault ? (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              className="text-xs font-bold text-[#8C6226] hover:underline cursor-pointer"
                            >
                              Đặt làm mặc định
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Địa chỉ giao chính</span>
                            </span>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditAddressModal(addr)}
                              className="p-1.5 text-[#7D715E] hover:text-[#B88E4F] transition cursor-pointer"
                              title="Sửa địa chỉ"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="p-1.5 text-[#7D715E] hover:text-rose-600 transition cursor-pointer"
                              title="Xóa địa chỉ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 3: SẢN PHẨM YÊU THÍCH (WISHLIST) */}
            {/* ------------------------------------------------------------- */}
            {currentTab === 'wishlist' && (
              <div className="bg-white border border-[#EAE4D7] rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                <div className="pb-4 border-b border-[#EAE4D7]">
                  <h1 className="text-xl sm:text-2xl font-black text-[#1A1612] m-0 font-display">
                    Sản Phẩm Yêu Thích
                  </h1>
                  <p className="text-xs text-[#7D715E] mt-1 m-0">
                    Danh sách các sản phẩm bạn đã lưu lại để theo dõi giá và đặt mua sau
                  </p>
                </div>

                {wishlistLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#7D715E]">
                    <Loader2 className="w-8 h-8 text-[#B88E4F] animate-spin" />
                    <span className="text-xs font-semibold">Đang tải sản phẩm yêu thích...</span>
                  </div>
                ) : wishlist.length === 0 ? (
                  <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center">
                      <Heart className="w-8 h-8" />
                    </div>
                    <div>
                      <strong className="text-sm font-bold text-[#1A1612] block">
                        Chưa có sản phẩm yêu thích
                      </strong>
                      <p className="text-xs text-[#7D715E] mt-1 m-0">
                        Nhấn nút Trái tim ❤️ ở các sản phẩm trên sàn để lưu vào đây nhé!
                      </p>
                    </div>
                    <Link
                      to="/marketplace"
                      className="px-4 py-2 rounded-xl bg-[#B88E4F] text-white text-xs font-bold hover:bg-[#8C6226] transition"
                    >
                      Dạo chợ mua sắm
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {wishlist.map((item) => {
                      const p = item.product;
                      return (
                        <div
                          key={item.wishlistId}
                          className="bg-white border border-[#EAE4D7] hover:border-[#C59B58] rounded-2xl p-4 shadow-2xs transition flex flex-col justify-between group"
                        >
                          <div>
                            <div className="relative aspect-square rounded-xl bg-[#FAF8F5] overflow-hidden mb-3">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-10 h-10 text-[#7D715E]" />
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveWishlist(p.id)}
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 text-rose-500 hover:bg-rose-50 flex items-center justify-center shadow-xs transition cursor-pointer"
                                title="Bỏ thích"
                              >
                                <Heart className="w-4 h-4 fill-current" />
                              </button>
                            </div>

                            <span className="text-[10px] font-bold text-[#7D715E] uppercase block mb-1">
                              {p.store?.name || 'Gian hàng chính hãng'}
                            </span>
                            <Link
                              to={`/products/${p.sku || p.id}`}
                              className="text-xs font-bold text-[#1A1612] hover:text-[#B88E4F] line-clamp-2 transition mb-2 block"
                            >
                              {p.title}
                            </Link>

                            <div className="flex items-baseline gap-2 mb-3">
                              <strong className="text-sm font-black text-[#8C6226]">
                                {formatMoney(p.price)}
                              </strong>
                              {p.originalPrice && Number(p.originalPrice) > Number(p.price) && (
                                <span className="text-[11px] text-[#7D715E] line-through">
                                  {formatMoney(p.originalPrice)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-[#EAE4D7] flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveCheckoutProduct({
                                  product: {
                                    id: p.id,
                                    title: p.title,
                                    price: p.price,
                                    imageUrl: p.imageUrl || '',
                                    stockQuantity: p.stockQuantity || 99,
                                  },
                                  store: {
                                    id: p.store?.id || '',
                                    name: p.store?.name || 'Gian Hàng',
                                  },
                                });
                              }}
                              className="flex-1 py-2 rounded-xl bg-[#B88E4F] hover:bg-[#8C6226] text-white text-xs font-bold transition text-center cursor-pointer shadow-2xs"
                            >
                              Mua ngay
                            </button>
                            <Link
                              to={`/products/${p.sku || p.id}`}
                              className="p-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#EAE4D7] text-[#1A1612] transition"
                              title="Xem chi tiết"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 4: HỒ SƠ & BẢO MẬT (PROFILE & SECURITY) */}
            {/* ------------------------------------------------------------- */}
            {currentTab === 'profile' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Form */}
                <div className="bg-white border border-[#EAE4D7] rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                  <div>
                    <h2 className="text-lg font-black text-[#1A1612] m-0 font-display">
                      Thông Tin Cá Nhân
                    </h2>
                    <p className="text-xs text-[#7D715E] mt-1 m-0">
                      Cập nhật họ tên và số điện thoại liên lạc nhận hàng
                    </p>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                        Địa chỉ Email (Định danh)
                      </label>
                      <input
                        type="email"
                        value={profileData?.user.email || currentUser?.email || ''}
                        disabled
                        className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2.5 text-xs text-[#7D715E] outline-none cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        required
                        className="w-full bg-white border border-[#EAE4D7] focus:border-[#C59B58] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1612] outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="0912345678"
                        className="w-full bg-white border border-[#EAE4D7] focus:border-[#C59B58] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1612] outline-none transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={updatingProfile || profileLoading}
                      className="mt-2 py-2.5 rounded-xl bg-[#B88E4F] hover:bg-[#8C6226] text-white text-xs font-bold transition cursor-pointer shadow-xs flex items-center justify-center gap-2"
                    >
                      {(updatingProfile || profileLoading) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Lưu thay đổi</span>
                    </button>
                  </form>
                </div>

                {/* Password Form */}
                <div className="bg-white border border-[#EAE4D7] rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                  <div>
                    <h2 className="text-lg font-black text-[#1A1612] m-0 font-display">
                      Đổi Mật Khẩu
                    </h2>
                    <p className="text-xs text-[#7D715E] mt-1 m-0">
                      Bảo vệ tài khoản với mật khẩu tối thiểu 6 ký tự
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                        Mật khẩu hiện tại
                      </label>
                      <input
                        type="password"
                        value={currentPass}
                        onChange={(e) => setCurrentPass(e.target.value)}
                        required
                        className="w-full bg-white border border-[#EAE4D7] focus:border-[#C59B58] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1612] outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                        Mật khẩu mới
                      </label>
                      <input
                        type="password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        required
                        minLength={6}
                        className="w-full bg-white border border-[#EAE4D7] focus:border-[#C59B58] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1612] outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                        Xác nhận mật khẩu mới
                      </label>
                      <input
                        type="password"
                        value={confirmNewPass}
                        onChange={(e) => setConfirmNewPass(e.target.value)}
                        required
                        className="w-full bg-white border border-[#EAE4D7] focus:border-[#C59B58] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1612] outline-none transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={updatingPassword}
                      className="mt-2 py-2.5 rounded-xl bg-[#1A1612] hover:bg-black text-white text-xs font-bold transition cursor-pointer shadow-xs flex items-center justify-center gap-2"
                    >
                      {updatingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Đổi mật khẩu</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 5: NÂNG CẤP ĐỐI TÁC (KOL / SHOP MANAGER) */}
            {/* ------------------------------------------------------------- */}
            {currentTab === 'upgrade' && <PartnerUpgradeTab />}

            {/* ── TAB: YÊU CẦU ĐỔI TRẢ 14 NGÀY ── */}
            {currentTab === 'returns' && (
              <div className="bg-white border border-[#EAE4D7] rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                <div className="pb-4 border-b border-[#EAE4D7]">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700 mb-2">
                    <Scale className="w-3.5 h-3.5" />
                    SCANMS RETURN CENTER • BẢO VỆ NGUỚI MUA
                  </div>
                  <h1 className="text-xl font-black text-[#1A1612] m-0">Yêu cầu Đổi trả / Hoàn hàng</h1>
                  <p className="text-xs text-[#7D715E] mt-1 m-0">
                    Chính sách đổi trả 14 ngày kể từ ngày nhận hàng — Yêu cầu không cần lý do — Hoàn 100% nếu đủ điều kiện
                  </p>
                </div>

                {/* How it works */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { step: '01', title: 'Gửi yêu cầu', desc: 'Chọn đơn hàng và gửi video mở hộp + lý do', icon: Video },
                    { step: '02', title: 'Shop giải trình', desc: 'Shop có 24h gửi bằng chứng đóng gói xuất kho', icon: Package },
                    { step: '03', title: 'Trọng tài phân xử', desc: 'SCANMS ban hành phán quyết trong 24h', icon: Scale },
                  ].map(({ step, title, desc, icon: Icon }) => (
                    <div key={step} className="flex items-start gap-3 p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7]">
                      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center shrink-0">{step}</div>
                      <div>
                        <div className="text-xs font-bold text-[#1A1612]">{title}</div>
                        <div className="text-[10px] text-[#7D715E] mt-0.5">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Active disputes */}
                {disputesLoading ? (
                  <div className="flex items-center gap-2 py-6 justify-center text-[#7D715E] text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                  </div>
                ) : myDisputes.length > 0 ? (
                  <div>
                    <div className="text-xs font-bold text-[#4A3E2D] mb-2">Yêu cầu đang xử lý ({myDisputes.length})</div>
                    <div className="space-y-2">
                      {myDisputes.map((d: any) => (
                        <div key={d.orderId} className="p-3 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] flex items-center justify-between text-xs">
                          <div>
                            <div className="font-mono font-bold text-[#1A1612]">#{d.externalOrderSn}</div>
                            <div className="text-[10px] text-[#7D715E] mt-0.5">{d.dispute?.reason}</div>
                          </div>
                          <div className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                            d.dispute?.status === 'OPENED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            d.dispute?.status === 'RESOLVED_REFUND' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {d.dispute?.status === 'OPENED' ? 'Chờ xử lý' :
                             d.dispute?.status === 'RESOLVED_REFUND' ? 'Hoàn tiền' : 'Từ chối'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-[#7D715E] text-xs">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                    Không có yêu cầu đang xử lý
                  </div>
                )}

                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <div className="font-bold mb-1">📌 Hướng dẫn gửi yêu cầu đổi trả:</div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Quay video mở hộp <strong>liên tục từ khi cầm gói</strong> (không cắt chỉnh)</li>
                    <li>Upload video lên YouTube/Drive rồi paste link vào form</li>
                    <li>Chụp ảnh sản phẩm hư hỏng + nhãn mác rõ ràng</li>
                    <li>Yêu cầu phải gửi trong vòng <strong>14 ngày</strong> từ ngày nhận hàng</li>
                  </ul>
                </div>

                <div className="pt-3 border-t border-[#EAE4D7] text-center">
                  <p className="text-xs text-[#7D715E] mb-3">Muốn gửi yêu cầu đổi trả? Hãy vào tab <strong>"Đơn mua của tôi"</strong> và nhấn nút <strong>"Đổi trả 14 ngày"</strong> trên đơn hàng đã nhận.</p>
                  <button
                    type="button"
                    onClick={() => setTab('orders')}
                    className="px-5 py-2.5 rounded-xl bg-[#B88E4F] text-white text-xs font-bold transition hover:bg-[#8C6226] shadow-xs"
                  >
                    Đi đến Đơn mua của tôi
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ══ RETURN REQUEST MODAL ══ */}
      {returnModalOrder && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 shadow-2xl flex flex-col gap-4 text-left animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[10px] font-bold text-rose-700 mb-1.5">
                  <Scale className="w-3 h-3" /> CHÍNH SÁCH ĐỔI TRẢ 14 NGÀY
                </div>
                <h2 className="text-base font-black text-[#1A1612] m-0">Gửi Yêu cầu Đổi trả / Hoàn hàng</h2>
                <p className="text-xs text-[#7D715E] mt-0.5 m-0">
                  Đơn <span className="font-mono font-bold text-[#1A1612]">#{returnModalOrder.externalOrderSn}</span>
                  {' — '}{returnModalOrder.store?.name}
                </p>
              </div>
              <button onClick={() => setReturnModalOrder(null)} className="p-1 rounded-lg text-[#7D715E] hover:bg-rose-50 shrink-0">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Warning banner */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong>Lưu ý quan trọng:</strong> Video mở hộp phải quay <strong>liên tục từ khi cầm gói đến khi mở ra</strong>, không cắt chỉnh. Thiếu video có thể dẫn đến từ chối yêu cầu.
              </div>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-3">
              {/* Reason */}
              <div>
                <label className="text-[10px] font-bold text-[#4A3E2D] block mb-1">
                  Lý do đổi trả <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    'Hàng không đúng mô tả',
                    'Hàng bị hư hỏng / vỡ',
                    'Thiếu phụ kiện / phụ kiện sai',
                    'Nhận sai sản phẩm / sai màu',
                    'Hàng kém chất lượng',
                    'Lý do khác',
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReturnReason(r)}
                      className={`text-left px-3 py-2 rounded-xl border text-xs font-medium transition ${
                        returnReason === r
                          ? 'border-rose-400 bg-rose-50 text-rose-800 font-bold ring-2 ring-rose-300/40'
                          : 'border-[#EAE4D7] bg-white text-[#4A3E2D] hover:border-rose-300 hover:bg-rose-50'
                      }`}
                    >
                      {returnReason === r ? '✓ ' : ''}{r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Video URL */}
              <div>
                <label className="text-[10px] font-bold text-[#4A3E2D] block mb-1 flex items-center gap-1">
                  <Video className="w-3 h-3 text-blue-500" />
                  Link Video mở hộp <span className="text-rose-500">*</span>
                  <span className="text-[#7D715E] font-normal">(YouTube, Google Drive, TikTok...)</span>
                </label>
                <input
                  type="url"
                  value={returnVideoUrl}
                  onChange={(e) => setReturnVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs text-[#1A1612] focus:outline-none focus:border-rose-400"
                />
                {returnVideoUrl && (
                  <a href={returnVideoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline mt-1">
                    <ExternalLink className="w-3 h-3" /> Xem trước link video
                  </a>
                )}
              </div>

              {/* Proof images */}
              <div>
                <label className="text-[10px] font-bold text-[#4A3E2D] block mb-1">
                  URL ảnh bằng chứng (phân cách bằng dấu phẩy)
                </label>
                <textarea
                  value={returnImagesStr}
                  onChange={(e) => setReturnImagesStr(e.target.value)}
                  placeholder="https://cdn.example.com/anh1.jpg, https://cdn.example.com/anh2.jpg"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs text-[#1A1612] focus:outline-none focus:border-rose-400 resize-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] font-bold text-[#4A3E2D] block mb-1">Ghi chú thêm</label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs text-[#1A1612] focus:outline-none focus:border-rose-400 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE4D7]">
              <button
                type="button"
                disabled={isSubmittingReturn}
                onClick={() => setReturnModalOrder(null)}
                className="px-4 py-2 rounded-xl border border-[#EAE4D7] text-xs font-bold text-[#7D715E] hover:bg-[#F3EFE6] disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={isSubmittingReturn || !returnReason || !returnVideoUrl.trim()}
                onClick={async () => {
                  if (!returnReason) { alert('Vui lòng chọn lý do đổi trả!'); return; }
                  if (!returnVideoUrl.trim()) { alert('Vui lòng cung cấp link video mở hộp!'); return; }
                  setIsSubmittingReturn(true);
                  try {
                    const images = returnImagesStr.split(',').map(s => s.trim()).filter(Boolean);
                    await api.post(`/orders/${returnModalOrder.id}/dispute`, {
                      reason: returnReason,
                      customerProofVideoUrl: returnVideoUrl.trim(),
                      customerProofImages: images,
                      notes: returnNotes.trim() || undefined,
                    });
                    toast.success('✅ Yêu cầu đổi trả đã được tiếp nhận! Shop và Trọng tài SCANMS sẽ xem xét trong 24h.');
                    setReturnModalOrder(null);
                  } catch (err: any) {
                    alert(err?.response?.data?.message || err?.message || 'Gửi yêu cầu thất bại. Thử lại.');
                  } finally {
                    setIsSubmittingReturn(false);
                  }
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {isSubmittingReturn ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang gửi...</>
                ) : (
                  <><Send className="w-3.5 h-3.5" /> Gửi Yêu cầu Đổi trả</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CHI TIẾT ĐƠN HÀNG & TIMELINE VẬN CHUYỂN */}
      {/* ========================================================= */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAE4D7] rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl flex flex-col gap-5 text-left animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE4D7]">
              <div>
                <strong className="text-sm font-black text-[#1A1612] block">
                  Chi Tiết Đơn Hàng #{selectedOrderDetails.externalOrderSn}
                </strong>
                <span className="text-xs text-[#7D715E]">
                  Đặt lúc: {new Date(selectedOrderDetails.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="w-8 h-8 rounded-full bg-[#FAF8F5] hover:bg-[#F3EFE6] text-[#7D715E] flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Timeline Stepper */}
            <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EAE4D7] flex items-center justify-between text-center text-xs">
              <div className="flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  ✓
                </div>
                <span className="font-bold text-[#1A1612]">Đặt hàng</span>
              </div>
              <div className="h-0.5 flex-1 bg-[#EAE4D7] mx-2" />
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    selectedOrderDetails.status !== 'CANCELLED'
                      ? 'bg-[#B88E4F] text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {selectedOrderDetails.status === 'PENDING' ? '⏳' : '✓'}
                </div>
                <span className="font-bold text-[#1A1612]">Xác nhận</span>
              </div>
              <div className="h-0.5 flex-1 bg-[#EAE4D7] mx-2" />
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    selectedOrderDetails.status === 'SHIPPING' ||
                    selectedOrderDetails.status === 'DELIVERED' ||
                    selectedOrderDetails.status === 'COMPLETED'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  🚚
                </div>
                <span className="font-bold text-[#1A1612]">Đang giao</span>
              </div>
              <div className="h-0.5 flex-1 bg-[#EAE4D7] mx-2" />
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    selectedOrderDetails.status === 'DELIVERED' ||
                    selectedOrderDetails.status === 'COMPLETED'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  ★
                </div>
                <span className="font-bold text-[#1A1612]">Hoàn tất</span>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="p-3.5 bg-white rounded-2xl border border-[#EAE4D7] flex flex-col gap-1 text-xs">
              <strong className="text-xs font-bold text-[#1A1612] flex items-center gap-1.5 mb-1">
                <MapPin className="w-4 h-4 text-[#B88E4F]" />
                <span>Địa chỉ nhận hàng:</span>
              </strong>
              <span className="text-[#1A1612] font-semibold">
                {selectedOrderDetails.customerName} - {selectedOrderDetails.customerPhone}
              </span>
              <span className="text-[#7D715E]">{selectedOrderDetails.shippingAddress}</span>
            </div>

            {/* Product List */}
            <div className="flex flex-col gap-2">
              <strong className="text-xs font-bold text-[#1A1612]">Kiện hàng:</strong>
              {selectedOrderDetails.orderItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 text-xs p-2 bg-[#FAF8F5] rounded-xl">
                  <span>
                    {item.product?.title} (x{item.quantity})
                  </span>
                  <strong className="text-[#1A1612]">
                    {formatMoney(Number(item.unitPrice) * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>

            {/* Price Breakdown */}
            <div className="pt-3 border-t border-[#EAE4D7] flex flex-col gap-1 text-xs">
              <div className="flex justify-between text-[#7D715E]">
                <span>Tạm tính:</span>
                <span>{formatMoney(selectedOrderDetails.subtotalAmount)}</span>
              </div>
              <div className="flex justify-between text-[#7D715E]">
                <span>Phí vận chuyển:</span>
                <span>{formatMoney(selectedOrderDetails.shippingFee)}</span>
              </div>
              {Number(selectedOrderDetails.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Giảm giá coupon:</span>
                  <span>-{formatMoney(selectedOrderDetails.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-[#8C6226] pt-2 border-t border-[#EAE4D7]">
                <span>Tổng thanh toán:</span>
                <span>{formatMoney(selectedOrderDetails.finalAmount)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedOrderDetails(null)}
              className="py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFE6] text-xs font-bold text-[#1A1612] transition"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: HỦY ĐƠN HÀNG KHI PENDING */}
      {/* ========================================================= */}
      {cancellingOrderId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAE4D7] rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 text-left animate-in fade-in zoom-in-95">
            <div>
              <strong className="text-base font-black text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-5 h-5" />
                <span>Xác nhận hủy đơn hàng</span>
              </strong>
              <p className="text-xs text-[#7D715E] mt-1 m-0">
                Đơn hàng đang ở trạng thái Chờ xác nhận. Bạn có thể hủy ngay mà không mất phí.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                Lý do hủy đơn (Tùy chọn)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="VD: Muốn thay đổi địa chỉ, đổi ý không mua nữa..."
                rows={3}
                className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl p-3 text-xs text-[#1A1612] focus:bg-white focus:border-rose-400 outline-none transition"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingOrderId(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFE6] text-xs font-bold text-[#7D715E] transition cursor-pointer"
              >
                Giữ lại đơn
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancelOrder}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isCancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Xác nhận hủy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: THÊM / SỬA ĐỊA CHỈ NHẬN HÀNG */}
      {/* ========================================================= */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAE4D7] rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-5 text-left animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE4D7]">
              <strong className="text-base font-black text-[#1A1612]">
                {editingAddressId ? 'Chỉnh Sửa Địa Chỉ' : 'Thêm Địa Chỉ Nhận Hàng Mới'}
              </strong>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FAF8F5] hover:bg-[#F3EFE6] text-[#7D715E] flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1">
                    Họ và tên người nhận
                  </label>
                  <input
                    type="text"
                    value={addressForm.fullName}
                    onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                    required
                    placeholder="Nguyễn Văn A"
                    className="w-full bg-[#FAF8F5] border border-[#EAE4D7] focus:bg-white focus:border-[#C59B58] rounded-xl px-3 py-2 text-xs text-[#1A1612] outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={addressForm.phoneNumber}
                    onChange={(e) => setAddressForm({ ...addressForm, phoneNumber: e.target.value })}
                    required
                    placeholder="0912345678"
                    className="w-full bg-[#FAF8F5] border border-[#EAE4D7] focus:bg-white focus:border-[#C59B58] rounded-xl px-3 py-2 text-xs text-[#1A1612] outline-none transition"
                  />
                </div>
              </div>

              {/* Tỉnh / Thành phố */}
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Tỉnh / Thành phố
                </label>
                <select
                  value={addressForm.provinceCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const p = provinces.find((item) => String(item.code) === String(code));
                    setAddressForm({
                      ...addressForm,
                      provinceCode: code,
                      provinceName: p?.name || '',
                      districtCode: '',
                      districtName: '',
                      wardCode: '',
                      wardName: '',
                    });
                  }}
                  required
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] focus:bg-white focus:border-[#C59B58] rounded-xl px-3 py-2 text-xs text-[#1A1612] outline-none transition"
                >
                  <option value="">-- Chọn Tỉnh / Thành phố --</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quận / Huyện */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1">
                    Quận / Huyện
                  </label>
                  <select
                    value={addressForm.districtCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const d = selectedProvince?.districts.find((item) => String(item.code) === String(code));
                      setAddressForm({
                        ...addressForm,
                        districtCode: code,
                        districtName: d?.name || '',
                        wardCode: '',
                        wardName: '',
                      });
                    }}
                    disabled={!selectedProvince}
                    required
                    className="w-full bg-[#FAF8F5] border border-[#EAE4D7] focus:bg-white focus:border-[#C59B58] rounded-xl px-3 py-2 text-xs text-[#1A1612] outline-none transition disabled:opacity-50"
                  >
                    <option value="">-- Chọn Quận / Huyện --</option>
                    {selectedProvince?.districts.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phường / Xã */}
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1">
                    Phường / Xã
                  </label>
                  <select
                    value={addressForm.wardCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const w = selectedDistrict?.wards.find((item) => String(item.code) === String(code));
                      setAddressForm({
                        ...addressForm,
                        wardCode: code,
                        wardName: w?.name || '',
                      });
                    }}
                    disabled={!selectedDistrict}
                    required
                    className="w-full bg-[#FAF8F5] border border-[#EAE4D7] focus:bg-white focus:border-[#C59B58] rounded-xl px-3 py-2 text-xs text-[#1A1612] outline-none transition disabled:opacity-50"
                  >
                    <option value="">-- Chọn Phường / Xã --</option>
                    {selectedDistrict?.wards.map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Địa chỉ chi tiết */}
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Địa chỉ chi tiết (Số nhà, tên đường, tòa nhà)
                </label>
                <input
                  type="text"
                  value={addressForm.detailAddress}
                  onChange={(e) => setAddressForm({ ...addressForm, detailAddress: e.target.value })}
                  required
                  placeholder="Ví dụ: Số 123 Đường D1, Chung cư ABC"
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] focus:bg-white focus:border-[#C59B58] rounded-xl px-3 py-2 text-xs text-[#1A1612] outline-none transition"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-default-address"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="rounded text-[#B88E4F] focus:ring-[#B88E4F]"
                />
                <label htmlFor="chk-default-address" className="text-xs text-[#1A1612] font-semibold cursor-pointer">
                  Đặt làm địa chỉ nhận hàng mặc định
                </label>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[#EAE4D7]">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFE6] text-xs font-bold text-[#7D715E] transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="flex-1 py-2.5 rounded-xl bg-[#B88E4F] hover:bg-[#8C6226] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                >
                  {savingAddress && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu địa chỉ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guest/Connected Checkout Modal */}
      {activeCheckoutProduct && (
        <GuestCheckoutModal
          isOpen={true}
          onClose={() => setActiveCheckoutProduct(null)}
          product={activeCheckoutProduct.product}
          store={activeCheckoutProduct.store}
          onOrderPlaced={() => {
            setActiveCheckoutProduct(null);
            toast.success('Đặt hàng thành công!');
            fetchOrders();
            fetchProfile();
          }}
        />
      )}
    </div>
  );
}
