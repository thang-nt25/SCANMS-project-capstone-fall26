import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  MapPin,
  Heart,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  LogOut,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Loader2,
  Store,
  Store as StoreIcon,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  X,
  XCircle,
  Camera,
  Bell,
  Ticket,
  MessageCircle,
  User,
  HelpCircle,
  Shield,
  Mail,
  KeyRound,
  Lock,
  Wallet,
  ChevronDown,
} from 'lucide-react';
import { getSafeProductImageUrl } from '@/utils/marketplace.utils';
import { authService, type UserProfile } from '../../services/auth.service';
import { uploadService } from '../../services/upload.service';
import { Select } from '../../components/ui/Select';
import {
  customerService,
  type CustomerProfileResponse,
  type CustomerOrder,
  type CustomerOrderItem,
  type CustomerAddress,
  type CustomerWishlistItem,
} from '../../services/customer.service';
import {
  loadShippingAddresses,
  type ShippingProvince,
} from '../../services/order-address.service';
import { formatMoney } from '@/utils/marketplace.utils';
import { toast } from '../../utils/toast';
import { GuestCheckoutModal, type CheckoutProductItem, type CheckoutStoreInfo } from '../../components/checkout/GuestCheckoutModal';
import { Topbar } from '../../components/layout/Topbar';
import { PartnerUpgradeTab } from './PartnerUpgradeTab';
import { CustomerWishlistTab } from './CustomerWishlistTab';
import { CustomerVouchersTab } from './CustomerVouchersTab';
import { CustomerNotificationsTab } from './CustomerNotificationsTab';
import { CustomerWalletTab } from './CustomerWalletTab';
import { getNotificationSection } from '../../utils/notification-categories.utils';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { useScanmsChat, type ChatProductInfo } from '../../context/ScanmsChatContext';
import {
  notificationsService,
  type AppNotification,
  type NotificationCategory,
} from '../../services/notifications.service';
import { ReturnRequestModal } from '../../components/customer/ReturnRequestModal';
import { VerifiedReviewModal } from '../../components/customer/VerifiedReviewModal';
import {
  AddressLocationPicker,
  type AddressLocationResult,
} from '../../components/customer/AddressLocationPicker';

type CustomerTab = 'orders' | 'addresses' | 'wishlist' | 'profile' | 'identity' | 'upgrade' | 'vouchers' | 'notifications' | 'security' | 'wallet';
type OrderFilterStatus = 'ALL' | 'UNPAID' | 'PENDING' | 'SHIPPING' | 'DELIVERED' | 'RECEIVING' | 'COMPLETED' | 'RETURN_REQUESTED' | 'CANCELLED' | 'RETURNED';

const normalizeAdministrativeName = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .toLowerCase()
  .replace(/\b(thanh pho|tinh|quan|huyen|thi xa|thi tran|phuong|xa)\b/g, '')
  .replace(/[^a-z0-9]/g, '');

const administrativeNamesMatch = (left: string, right: string) => {
  const normalizedLeft = normalizeAdministrativeName(left);
  const normalizedRight = normalizeAdministrativeName(right);
  return Boolean(
    normalizedLeft &&
    normalizedRight &&
    (normalizedLeft === normalizedRight ||
      normalizedLeft.includes(normalizedRight) ||
      normalizedRight.includes(normalizedLeft))
  );
};

export default function CustomerPortalPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const pathTab = location.pathname.includes('/customer/wallet')
    ? 'wallet'
    : location.pathname.includes('/customer/upgrade')
    ? 'upgrade'
    : location.pathname.includes('/customer/identity')
    ? 'identity'
    : location.pathname.includes('/customer/addresses')
    ? 'addresses'
    : location.pathname.includes('/customer/wishlist')
    ? 'wishlist'
    : location.pathname.includes('/customer/profile')
    ? 'profile'
    : location.pathname.includes('/customer/security')
    ? 'security'
    : location.pathname.includes('/customer/vouchers')
    ? 'vouchers'
    : location.pathname.includes('/customer/notifications')
    ? 'notifications'
    : location.pathname.includes('/customer/orders')
    ? 'orders'
    : null;
  const currentTab = pathTab || (searchParams.get('tab') as CustomerTab) || 'orders';

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [profileData, setProfileData] = useState<CustomerProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Active notification category from URL query (?cat=ALL | ORDER | PROMOTION | WALLET | SYSTEM)
  const requestedNotifCategory = searchParams.get('cat');
  const activeNotifCategory: NotificationCategory =
    requestedNotifCategory === 'ORDER' ||
    requestedNotifCategory === 'PROMOTION' ||
    requestedNotifCategory === 'SYSTEM'
      ? requestedNotifCategory
      : 'ALL';

  // Floating Chat hook
  const { openChat } = useScanmsChat();

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notificationsRequestId = useRef(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsLoadingMore, setNotificationsLoadingMore] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationsPage, setNotificationsPage] = useState(1);
  const [notificationsTotalPages, setNotificationsTotalPages] = useState(1);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [categoryUnread, setCategoryUnread] = useState<{
    ORDER: number;
    PROMOTION: number;
    SYSTEM: number;
  }>({ ORDER: 0, PROMOTION: 0, SYSTEM: 0 });

  // Tab 1: Orders State
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderFilterStatus>('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<CustomerOrder | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [returnOrder, setReturnOrder] = useState<CustomerOrder | null>(null);
  const [reviewOrder, setReviewOrder] = useState<CustomerOrder | null>(null);


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
    latitude: null as number | null,
    longitude: null as number | null,
    isDefault: false,
  });
  const [provinces, setProvinces] = useState<ShippingProvince[]>([]);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressPendingDeletion, setAddressPendingDeletion] = useState<CustomerAddress | null>(null);
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);

  // Tab 3: Wishlist State
  const [wishlist, setWishlist] = useState<CustomerWishlistItem[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Tab 4: Profile & Password Form (SCANMS Standard)
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [birthDay, setBirthDay] = useState('02');
  const [birthMonth, setBirthMonth] = useState('01');
  const [birthYear, setBirthYear] = useState('2000');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Security / Password Setting Flow (SCANMS Standard)
  const [securityMode, setSecurityMode] = useState<'VERIFY_METHOD' | 'AWAIT_OTP' | 'SET_NEW_PASSWORD' | 'DIRECT_CHANGE'>('VERIFY_METHOD');
  const [securityOtp, setSecurityOtp] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [maskedSecurityEmail, setMaskedSecurityEmail] = useState('');
  const [sendingSecurityOtp, setSendingSecurityOtp] = useState(false);
  const [verifyingSecurityOtp, setVerifyingSecurityOtp] = useState(false);
  const [settingNewPassword, setSettingNewPassword] = useState(false);

  // Identity CCCD State (SCANMS Standard)
  const [cccdFullName, setCccdFullName] = useState('');
  const [cccdIdNumber, setCccdIdNumber] = useState('');
  const [cccdAddress, setCccdAddress] = useState('');
  const [cccdVerified, setCccdVerified] = useState(false);
  const [, setCccdVerifiedAt] = useState<string | null>(null);
  const [loadingIdentity, setLoadingIdentity] = useState(false);
  const [submittingIdentity, setSubmittingIdentity] = useState(false);

  useEffect(() => {
    let timer: any;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  // Masking helpers for SCANMS Profile Display
  const maskEmail = (email?: string) => {
    if (!email) return 'chua-co-email@scanms.vn';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const visible = name.slice(0, 2);
    return `${visible}***********@${parts[1]}`;
  };

  const maskPhone = (phone?: string) => {
    if (!phone) return 'Chưa cập nhật';
    const clean = phone.trim();
    if (clean.length < 4) return clean;
    const last2 = clean.slice(-2);
    return `*********${last2}`;
  };

  const displayName =
    profileData?.user?.fullName?.trim() ||
    currentUser?.fullName?.trim() ||
    profileData?.user?.email?.split('@')[0] ||
    currentUser?.email?.split('@')[0] ||
    'Khách Hàng SCANMS';

  const username =
    profileData?.user?.email?.split('@')[0] ||
    currentUser?.email?.split('@')[0] ||
    'khachhang';

  // Avatar Upload State & Handler
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      const secureUrl = await uploadService.uploadImage(file, 'scanms/avatars');
      await authService.updateAvatar(secureUrl);

      // Cập nhật state nội bộ
      if (profileData) {
        setProfileData({
          ...profileData,
          user: {
            ...profileData.user,
            avatarUrl: secureUrl,
          },
        });
      }
      setCurrentUser(authService.getCurrentUser());
      toast.success('Cập nhật ảnh đại diện thành công!');
    } catch (error: any) {
      console.error('Lỗi khi tải ảnh đại diện:', error);
      toast.error(error?.message || 'Không thể tải ảnh lên. Vui lòng thử lại!');
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  // Checkout modal for "Mua lại" / "Mua ngay"
  const [activeCheckoutProduct, setActiveCheckoutProduct] = useState<{
    product: CheckoutProductItem;
    store: CheckoutStoreInfo;
  } | null>(null);

  // Check login & listen for auth user updates
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      toast.error('Vui lòng đăng nhập để truy cập trang cá nhân khách hàng');
      navigate('/login');
      return;
    }
    setCurrentUser(user);
    fetchProfile();

    const handleUserUpdated = () => {
      const u = authService.getCurrentUser();
      setCurrentUser(u);
    };
    window.addEventListener('auth-user-updated', handleUserUpdated);
    return () => window.removeEventListener('auth-user-updated', handleUserUpdated);
  }, [navigate]);

  // Handle Tab changes
  useEffect(() => {
    if (currentTab === 'orders') fetchOrders();
    if (currentTab === 'addresses') fetchAddresses();
    if (currentTab === 'wishlist') fetchWishlist();
    if (currentTab === 'identity') fetchIdentity();
  }, [currentTab, orderStatusFilter]);

  // Handle Notifications load & tab changes
  useEffect(() => {
    if (currentTab === 'notifications') {
      fetchNotifications(activeNotifCategory);
    }
    refreshUnreadCounts();
  }, [currentTab, activeNotifCategory]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const interval = window.setInterval(() => {
      void refreshUnreadCounts();
      if (currentTab === 'notifications' && notificationsPage === 1) {
        void fetchNotifications(activeNotifCategory, 1, false, true);
      }
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [currentUser?.id, currentTab, activeNotifCategory, notificationsPage]);

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
    navigate(`/customer/${tab}`);
  };

  const handleOpenChat = (order: CustomerOrder, specificItem?: CustomerOrderItem) => {
    const item = specificItem || order.orderItems?.[0];
    const productInfo: ChatProductInfo | undefined = item
      ? {
          id: item.productId || item.product?.id || `prod-${order.id}`,
          title: item.product?.title || `Sản phẩm trong đơn #${order.externalOrderSn}`,
          price: Number(item.unitPrice) || Number(order.finalAmount) || 0,
          originalPrice: Math.round((Number(item.unitPrice) || Number(order.finalAmount) || 0) * 1.2),
          imageUrl: item.product?.imageUrl || undefined,
          sku: item.variant?.name || item.product?.sku || undefined,
          soldCount: 99,
        }
      : undefined;

    openChat(
      {
        id: order.storeId,
        name: order.store?.name || 'Gian Hàng Đối Tác',
        logoUrl: order.store?.logoUrl || undefined,
      },
      productInfo,
    );
  };

  const refreshUnreadCounts = async () => {
    try {
      const details = await notificationsService.getUnreadDetails();
      if (!details) return;
      setUnreadNotifCount(details.unreadCount);
      if (details.categoryUnreadCounts) {
        setCategoryUnread(details.categoryUnreadCounts);
      }
    } catch {}
  };

  const fetchNotifications = async (
    cat: NotificationCategory = activeNotifCategory,
    page = 1,
    append = false,
    quiet = false,
  ) => {
    const requestId = ++notificationsRequestId.current;
    setNotificationsError(null);
    if (append) setNotificationsLoadingMore(true);
    else if (!quiet) {
      setNotificationsLoading(true);
      setNotifications([]);
    }
    try {
      const res = await notificationsService.getNotifications(cat, page, 40);
      if (requestId !== notificationsRequestId.current) return;
      setNotifications((previous) =>
        append
          ? [
              ...previous,
              ...(res.items || []).filter(
                (item) => !previous.some((existing) => existing.id === item.id),
              ),
            ]
          : res.items || [],
      );
      setNotificationsPage(res.page || page);
      setNotificationsTotalPages(res.totalPages || 1);
      setUnreadNotifCount(res.unreadCount || 0);
      if (res.categoryUnreadCounts) {
        setCategoryUnread(res.categoryUnreadCounts);
      }
    } catch (err) {
      if (requestId !== notificationsRequestId.current) return;
      console.error('Lỗi khi tải thông báo:', err);
      setNotificationsError('Không tải được thông báo. Vui lòng thử lại.');
    } finally {
      if (requestId === notificationsRequestId.current) {
        if (!append && !quiet) setNotificationsLoading(false);
        setNotificationsLoadingMore(false);
      }
    }
  };

  const loadMoreNotifications = () => {
    if (notificationsLoadingMore || notificationsPage >= notificationsTotalPages) return;
    void fetchNotifications(activeNotifCategory, notificationsPage + 1, true);
  };

  const handleSelectNotifCategory = (cat: NotificationCategory) => {
    if (cat === 'ALL') {
      navigate('/customer/notifications');
    } else {
      navigate(`/customer/notifications?cat=${cat}`);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      const updated = await notificationsService.markAllAsRead();
      if (!updated) throw new Error('Không thể cập nhật trạng thái thông báo');
      setUnreadNotifCount(0);
      setCategoryUnread({ ORDER: 0, PROMOTION: 0, SYSTEM: 0 });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
    } catch {
      toast.error('Lỗi khi cập nhật thông báo');
    }
  };

  const getCategoryFromType = (type: string): 'ORDER' | 'PROMOTION' | 'SYSTEM' => {
    return getNotificationSection(type);
  };

  const handleNotificationAction = async (notif: AppNotification) => {
    if (!notif.isRead) {
      const updated = await notificationsService.markAsRead(notif.id);
      if (updated) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadNotifCount((prev) => Math.max(0, prev - 1));
        const catKey = getCategoryFromType(notif.type);
        setCategoryUnread((prev) => ({
          ...prev,
          [catKey]: Math.max(0, (prev[catKey] || 1) - 1),
        }));
      }
    }

    let targetUrl = notif.data?.actionUrl;

    // Chan triet de viec cac thong bao chung (WELCOME, SYSTEM) bi ep chuyen huong sang /customer/upgrade
    if (targetUrl === '/customer/upgrade' && (notif.type === 'WELCOME' || notif.type === 'SYSTEM' || !notif.type.includes('UPGRADE'))) {
      targetUrl = '/marketplace';
    }

    if (targetUrl) {
      navigate(targetUrl);
    } else {
      const type = notif.type;
      if (getNotificationSection(type) === 'ORDER') {
        navigate('/customer/orders');
      } else if (getNotificationSection(type) === 'PROMOTION') {
        const liveUrl = notif.data?.liveUrl;
        if (typeof liveUrl === 'string' && liveUrl.startsWith('/')) {
          navigate(liveUrl);
        } else if (typeof liveUrl === 'string' && /^https?:\/\//i.test(liveUrl)) {
          try {
            const target = new URL(liveUrl);
            if (target.origin === window.location.origin) {
              navigate(`${target.pathname}${target.search}${target.hash}`);
            } else {
              window.open(liveUrl, '_blank', 'noopener,noreferrer');
            }
          } catch {
            navigate('/customer/vouchers');
          }
        } else if (type.startsWith('LIVE_SESSION_') && notif.data?.sessionId) {
          navigate(`/live/${encodeURIComponent(notif.data.sessionId)}`);
        } else {
          navigate('/customer/vouchers');
        }
      } else if (type.startsWith('WALLET_') || type.startsWith('COMMISSION_') || type.startsWith('PAYOUT_')) {
        navigate('/customer/orders');
      } else if (type.startsWith('KYC_') || type.startsWith('IDENTITY_')) {
        navigate('/customer/identity');
      } else if (type.startsWith('LIVE_') || type.includes('LIVE')) {
        const sId = (notif.data as any)?.sessionId;
        if (sId) {
          navigate(`/live/${sId}`);
        } else {
          navigate('/marketplace');
        }
      } else if (type.startsWith('UPGRADE_') || type.startsWith('PARTNER_')) {
        navigate('/customer/upgrade');
      } else {
        // Mac dinh: Thong bao he thong hoac tin tuc thi giu nguoi dung o trang thong bao hien tai, khong ep sang upgrade
        setTab('notifications');
      }
    }
  };

  const handleMarkSingleAsRead = async (e: React.MouseEvent, notif: AppNotification) => {
    e.stopPropagation();
    if (notif.isRead) return;
    try {
      const updated = await notificationsService.markAsRead(notif.id);
      if (!updated) throw new Error('Không thể cập nhật trạng thái thông báo');
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
      const catKey = getCategoryFromType(notif.type);
      setCategoryUnread((prev) => ({
        ...prev,
        [catKey]: Math.max(0, (prev[catKey] || 1) - 1),
      }));
      toast.success('Đã đánh dấu đã đọc');
    } catch {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
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

  const fetchIdentity = async () => {
    setLoadingIdentity(true);
    try {
      const data = await customerService.getIdentity();
      if (data) {
        setCccdFullName(data.fullName || currentUser?.fullName || '');
        setCccdIdNumber(data.idCardNumber || '');
        setCccdAddress(data.address || '');
        setCccdVerified(Boolean(data.isVerified));
        setCccdVerifiedAt(data.verifiedAt || null);
      }
    } catch (err: any) {
      console.error('Fetch identity error:', err);
    } finally {
      setLoadingIdentity(false);
    }
  };

  const handleSubmitIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cccdFullName.trim()) {
      toast.error('Vui lòng nhập họ và tên đầy đủ trên CCCD');
      return;
    }
    const cleanId = cccdIdNumber.trim().replace(/\s+/g, '');
    if (!/^\d{9,12}$/.test(cleanId)) {
      toast.error('Số CCCD phải gồm 9 hoặc 12 chữ số hợp lệ');
      return;
    }
    if (!cccdAddress.trim() || cccdAddress.trim().length < 5) {
      toast.error('Vui lòng nhập địa chỉ nơi thường trú đầy đủ trên CCCD');
      return;
    }

    setSubmittingIdentity(true);
    try {
      const res = await customerService.verifyIdentity({
        fullName: cccdFullName.trim(),
        idCardNumber: cleanId,
        address: cccdAddress.trim(),
      });
      toast.success(res.message || 'Xác nhận thông tin CCCD thành công');
      setCccdVerified(true);
      setCccdVerifiedAt(new Date().toISOString());
      fetchProfile();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể lưu thông tin CCCD';
      toast.error(msg);
    } finally {
      setSubmittingIdentity(false);
    }
  };

  const fetchOrders = async (searchOverride?: string) => {
    setOrdersLoading(true);
    setOrdersError(false);
    try {
      const statusParam = orderStatusFilter === 'ALL' ? undefined : orderStatusFilter;

      const res = await customerService.getOrders({
        status: statusParam,
        search: (searchOverride ?? orderSearch).trim() || undefined,
      });
      const loadedOrders = res.orders || [];
      setOrders(loadedOrders);

      const targetOrderId = searchParams.get('orderId');
      if (targetOrderId && loadedOrders.length > 0) {
        const found = loadedOrders.find((o) => o.id === targetOrderId || o.externalOrderSn === targetOrderId);
        if (found) {
          setSelectedOrderDetails(found);
        }
      }
    } catch (err: any) {
      console.error('Fetch orders error:', err);
      setOrdersError(true);
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

  const handleConfirmReceipt = async (order: CustomerOrder) => {
    setConfirmingOrderId(order.id);
    try {
      await customerService.confirmReceipt(order.id);
      toast.success('Đơn hàng đã hoàn tất. Bạn có thể gửi đánh giá đã xác minh.');
      await Promise.all([fetchOrders(), fetchProfile()]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể xác nhận đã nhận hàng');
    } finally {
      setConfirmingOrderId(null);
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
      latitude: null,
      longitude: null,
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
      latitude: addr.latitude == null ? null : Number(addr.latitude),
      longitude: addr.longitude == null ? null : Number(addr.longitude),
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

  const handleDeleteAddress = async () => {
    if (!addressPendingDeletion) return;
    setIsDeletingAddress(true);
    try {
      await customerService.deleteAddress(addressPendingDeletion.id);
      toast.success('Đã xóa địa chỉ');
      setAddressPendingDeletion(null);
      await fetchAddresses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể xóa địa chỉ');
    } finally {
      setIsDeletingAddress(false);
    }
  };

  const handleAddressLocationChange = (locationResult: AddressLocationResult) => {
    const matchedProvince = provinces.find((province) =>
      administrativeNamesMatch(province.name, locationResult.provinceName),
    );
    const matchedDistrict = matchedProvince?.districts.find((district) =>
      administrativeNamesMatch(district.name, locationResult.districtName),
    );
    const matchedWard = matchedDistrict?.wards.find((ward) =>
      administrativeNamesMatch(ward.name, locationResult.wardName),
    );

    setAddressForm((current) => ({
      ...current,
      latitude: locationResult.latitude,
      longitude: locationResult.longitude,
      detailAddress: locationResult.detailAddress || current.detailAddress,
      provinceCode: matchedProvince ? String(matchedProvince.code) : current.provinceCode,
      provinceName: matchedProvince?.name || current.provinceName,
      districtCode: matchedDistrict ? String(matchedDistrict.code) : current.districtCode,
      districtName: matchedDistrict?.name || current.districtName,
      wardCode: matchedWard ? String(matchedWard.code) : current.wardCode,
      wardName: matchedWard?.name || current.wardName,
    }));

    if (!matchedProvince || !matchedDistrict || !matchedWard) {
      toast.info('Đã ghim tọa độ. Vui lòng kiểm tra lại Tỉnh/Quận/Phường trước khi lưu.');
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

  const handleSendSecurityOtp = async () => {
    setSendingSecurityOtp(true);
    try {
      const res = await customerService.sendPasswordOtp();
      setMaskedSecurityEmail(res.maskedEmail || maskEmail(currentUser?.email));
      setSecurityMode('AWAIT_OTP');
      setOtpCountdown(60);
      toast.success(res.message || 'Mã xác thực đã được gửi về Gmail của bạn!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể gửi mã xác thực. Vui lòng thử lại!');
    } finally {
      setSendingSecurityOtp(false);
    }
  };

  const handleVerifySecurityOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityOtp.trim()) {
      toast.error('Vui lòng nhập mã OTP 6 số');
      return;
    }
    setVerifyingSecurityOtp(true);
    try {
      await customerService.verifyPasswordOtp(securityOtp.trim());
      toast.success('Xác thực Email thành công! Hãy thiết lập mật khẩu mới.');
      setSecurityMode('SET_NEW_PASSWORD');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn');
    } finally {
      setVerifyingSecurityOtp(false);
    }
  };

  const handleSaveNewPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmNewPass) {
      toast.error('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }
    if (newPass.length < 6) {
      toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }
    setSettingNewPassword(true);
    try {
      await customerService.setPasswordWithOtp({
        otp: securityOtp.trim(),
        newPassword: newPass,
      });
      toast.success('Thiết lập mật khẩu mới thành công! Bạn có thể sử dụng mật khẩu này để đăng nhập.');
      setNewPass('');
      setConfirmNewPass('');
      setSecurityOtp('');
      setSecurityMode('VERIFY_METHOD');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi lưu mật khẩu mới. Vui lòng thử lại!');
    } finally {
      setSettingNewPassword(false);
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
      <Topbar
        currentUser={currentUser}
        onLogout={() => {
          authService.logout();
          navigate('/login');
        }}
      />

      <main className="max-w-[1520px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-4 sm:pb-5 flex-1">
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* ========================================================= */}
          {/* LEFT SIDEBAR - USER CARD & SCANMS Standard NAVIGATION MENU */}
          {/* ========================================================= */}
          <div className="workspace-sidebar-slot relative lg:self-stretch after:content-[''] after:absolute after:pointer-events-none after:left-3 after:right-3 after:-bottom-2.5 after:h-px after:bg-gradient-to-r after:from-transparent after:via-[#EEDFC6] after:to-transparent lg:after:top-7 lg:after:bottom-5 lg:after:left-auto lg:after:-right-2.5 lg:after:w-px lg:after:h-auto lg:after:bg-gradient-to-b lg:after:from-transparent lg:after:via-[#EEDFC6] lg:after:to-transparent">
          <aside className="customer-portal-sidebar w-full lg:w-[250px] shrink-0 bg-transparent px-2 py-3.5 sticky top-[var(--workspace-header-height,69px)] self-start text-left select-none flex flex-col gap-2.5 z-30">
            {/* User Identity Header (SCANMS UI Reference Style matching Sidebar.tsx) */}
            <div className="flex items-center gap-3 px-1 py-1">
              {/* Hidden file input for avatar upload */}
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarFileSelected}
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="hidden"
              />

              <div className="relative shrink-0 group">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="w-12 h-12 rounded-full border border-[#EAE4D7] overflow-hidden bg-[#FAF8F5] flex items-center justify-center text-[#8C6226] font-bold text-lg select-none relative cursor-pointer group-hover:opacity-90 transition shadow-2xs"
                  title="Bấm vào để tải/đổi ảnh đại diện"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-4 h-4 text-[#B88E4F] animate-spin" />
                  ) : (profileData?.user.avatarUrl || currentUser?.avatarUrl) ? (
                    <img
                      src={profileData?.user.avatarUrl || currentUser?.avatarUrl || ''}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>
                      {profileData?.user.fullName ? profileData.user.fullName.charAt(0).toUpperCase() : currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                    </span>
                  )}
                  {/* Hover Camera Overlay */}
                  {!uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Camera className="w-4 h-4 text-white drop-shadow" />
                    </div>
                  )}
                </button>
              </div>

              <div className="min-w-0 flex-1 text-left">
                <strong className="block text-sm font-bold text-[#1A1612] truncate" title={displayName}>
                  {displayName}
                </strong>
                <button
                  type="button"
                  onClick={() => setTab('profile')}
                  className="inline-flex items-center gap-1 text-xs text-[#7D715E] hover:text-[#C59B58] transition-colors mt-0.5 cursor-pointer font-normal"
                >
                  <Edit2 className="w-3 h-3 text-[#7D715E]" />
                  <span>Sửa Hồ Sơ</span>
                </button>
              </div>
            </div>

            {/* SCANMS Standard Minimalist Navigation List */}
            <nav className="flex flex-col gap-0.5 text-xs sm:text-[13px]" aria-label="Menu chức năng khách hàng">
              <button
                type="button"
                onClick={() => setTab('orders')}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer ${
                  currentTab === 'orders'
                    ? 'text-[#B88E4F] font-bold'
                    : 'text-[#574C3D] hover:text-[#B88E4F] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className={`w-4 h-4 shrink-0 ${currentTab === 'orders' ? 'text-[#B88E4F]' : 'text-[#7D715E] group-hover:text-[#B88E4F]'}`} />
                  <span>Đơn Mua Của Tôi</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTab('wallet')}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer ${
                  currentTab === 'wallet'
                    ? 'text-[#B88E4F] font-bold'
                    : 'text-[#574C3D] hover:text-[#B88E4F] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wallet className={`w-4 h-4 shrink-0 ${currentTab === 'wallet' ? 'text-[#B88E4F]' : 'text-[#7D715E] group-hover:text-[#B88E4F]'}`} />
                  <span>Ví Mua Sắm SCANMS</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setTab('vouchers')}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer ${
                  currentTab === 'vouchers'
                    ? 'text-[#B88E4F] font-bold'
                    : 'text-[#574C3D] hover:text-[#B88E4F] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Ticket className={`w-4 h-4 shrink-0 ${currentTab === 'vouchers' ? 'text-[#B88E4F]' : 'text-[#7D715E] group-hover:text-[#B88E4F]'}`} />
                  <span>Kho Voucher</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTab('wishlist')}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer ${
                  currentTab === 'wishlist'
                    ? 'text-[#B88E4F] font-bold'
                    : 'text-[#574C3D] hover:text-[#B88E4F] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Heart className={`w-4 h-4 shrink-0 ${currentTab === 'wishlist' ? 'text-[#B88E4F]' : 'text-[#7D715E] group-hover:text-[#B88E4F]'}`} />
                  <span>Sản Phẩm Yêu Thích</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTab('notifications')}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer ${
                  currentTab === 'notifications'
                    ? 'text-[#B88E4F] font-bold'
                    : 'text-[#574C3D] hover:text-[#B88E4F] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bell className={`w-4 h-4 shrink-0 ${currentTab === 'notifications' ? 'text-[#B88E4F]' : 'text-[#7D715E] group-hover:text-[#B88E4F]'}`} />
                  <span>Thông Báo</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setTab('profile')}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer ${
                  currentTab === 'profile'
                    ? 'text-[#B88E4F] font-bold'
                    : 'text-[#574C3D] hover:text-[#B88E4F] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className={`w-4 h-4 shrink-0 ${currentTab === 'profile' ? 'text-[#B88E4F]' : 'text-[#7D715E] group-hover:text-[#B88E4F]'}`} />
                  <span>Hồ Sơ Cá Nhân</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTab('identity')}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer ${
                  currentTab === 'identity'
                    ? 'text-[#B88E4F] font-bold'
                    : 'text-[#574C3D] hover:text-[#B88E4F] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className={`w-4 h-4 shrink-0 ${currentTab === 'identity' ? 'text-[#B88E4F]' : 'text-[#7D715E] group-hover:text-[#B88E4F]'}`} />
                  <span>Xác Minh CCCD</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTab('addresses')}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer ${
                  currentTab === 'addresses'
                    ? 'text-[#B88E4F] font-bold'
                    : 'text-[#574C3D] hover:text-[#B88E4F] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin className={`w-4 h-4 shrink-0 ${currentTab === 'addresses' ? 'text-[#B88E4F]' : 'text-[#7D715E] group-hover:text-[#B88E4F]'}`} />
                  <span>Sổ Địa Chỉ</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTab('security')}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer ${
                  currentTab === 'security'
                    ? 'text-[#B88E4F] font-bold'
                    : 'text-[#574C3D] hover:text-[#B88E4F] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Lock className={`w-4 h-4 shrink-0 ${currentTab === 'security' ? 'text-[#B88E4F]' : 'text-[#7D715E] group-hover:text-[#B88E4F]'}`} />
                  <span>Đổi Mật Khẩu</span>
                </div>
              </button>
            </nav>

            {/* Bottom Actions (SCANMS UI Reference Style matching Sidebar.tsx) */}
            <div className="pt-2 flex flex-col gap-1 text-xs sm:text-[13px]">
              <Link
                to="/marketplace"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-medium text-[#7D715E] hover:text-[#B88E4F] transition cursor-pointer group"
                title="Quay lại Sàn Mua Sắm SCANMS"
              >
                <ArrowLeft className="w-4 h-4 text-[#7D715E] group-hover:text-[#B88E4F] shrink-0" aria-hidden="true" />
                <Store className="w-4 h-4 text-[#7D715E] group-hover:text-[#B88E4F] shrink-0" />
                <span>Sàn Mua Sắm</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  authService.logout();
                  navigate('/login');
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-semibold text-rose-600 hover:text-rose-700 transition cursor-pointer text-left w-full"
              >
                <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </aside>
          </div>

          {/* ========================================================= */}
          {/* RIGHT MAIN PANEL - CONTENT ACCORDING TO ACTIVE TAB */}
          {/* ========================================================= */}
          <div className="workspace-page-column w-full flex-1 min-w-0 flex flex-col gap-4 text-left">
            {/* ------------------------------------------------------------- */}
            {/* TAB 1: ĐƠN MUA CỦA TÔI (SCANMS Standard - IMAGE 1) */}
            {/* ------------------------------------------------------------- */}
            {currentTab === 'orders' && (
              <section className="@container/orders grid gap-[14px] w-full max-w-[1120px] min-w-0 text-[#1A1612] pb-[64px] md:pb-0" aria-labelledby="customer-orders-title">
                <header className="flex items-center flex-wrap gap-[10px_12px] pt-[4px] pb-[14px] border-b border-[#EAE4D7] @max-[499px]:grid @max-[499px]:grid-cols-[40px_minmax(0,1fr)]">
                  <span className="grid place-items-center shrink-0 w-[40px] h-[42px] border border-[#EEDFC6] rounded-[11px] bg-white text-[#B88E4F]" aria-hidden="true"><ShoppingBag size={21} /></span>
                  <div className="flex-1 min-w-[200px] @max-[499px]:min-w-0">
                    <h1 id="customer-orders-title" className="m-0 text-[20px] @max-[499px]:text-[19px] font-[650] leading-[1.4] tracking-[-0.4px] text-[#1A1612]">Đơn mua của tôi</h1>
                    <p className="mt-[3px] mb-0 text-[#7D715E] text-[12px] @max-[499px]:text-[11px] leading-[1.5]">Theo dõi đơn hàng và quản lý các lần mua sắm.</p>
                  </div>
                  <Link to="/marketplace" className="inline-flex items-center justify-center shrink-0 gap-[6px] min-h-[36px] px-[12px] py-[7px] border border-[#EAE4D7] rounded-[9px] bg-[#FBF5EB] text-[#1A1612] text-[11px] font-[600] leading-[1.4] no-underline whitespace-nowrap hover:border-[#C59B58] hover:bg-[#F3EFE6] transition-colors @max-[499px]:col-start-2 @max-[499px]:justify-self-start @max-[499px]:self-end">
                    <span>Tiếp tục mua sắm</span>
                    <ArrowLeft size={14} className="rotate-180 text-[#B88E4F]" aria-hidden="true" />
                  </Link>
                </header>

                {/* 1. Status Filter Tabs & Search Controls */}
                <div className="grid gap-[10px] min-w-0 bg-white border border-[#EAE4D7] rounded-[12px] overflow-hidden @max-[499px]:p-0">
                  <div className="flex gap-[4px] min-w-0 p-[4px] overflow-x-auto border-b border-[#EAE4D7] bg-[#F3EFE6] [scrollbar-width:thin]" role="group" aria-label="Lọc trạng thái đơn mua">
                    {[
                      { key: 'ALL', label: 'Tất cả' },
                      { key: 'PENDING', label: 'Chờ xác nhận' },
                      { key: 'SHIPPING', label: 'Vận chuyển' },
                      { key: 'DELIVERED', label: 'Chờ nhận hàng' },
                      { key: 'COMPLETED', label: 'Hoàn thành' },
                      { key: 'CANCELLED', label: 'Đã hủy' },
                      { key: 'RETURNED', label: 'Trả hàng/Hoàn tiền' },
                    ].map((tab) => {
                      const isActive = orderStatusFilter === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setOrderStatusFilter(tab.key as OrderFilterStatus)}
                          aria-pressed={orderStatusFilter === tab.key}
                          className={`relative flex-1 @max-[849px]:flex-none @max-[849px]:shrink-0 min-h-[38px] @max-[499px]:min-h-[34px] py-[8px] @max-[499px]:py-[7px] px-[12px] @max-[499px]:px-[9px] text-[12px] rounded-[8px] transition-colors cursor-pointer text-center whitespace-nowrap ${
                            isActive
                              ? 'bg-white text-[#1A1612] font-[600] shadow-[0_1px_3px_rgba(26,22,18,0.06)]'
                              : 'text-[#7D715E] hover:text-[#B88E4F] hover:bg-[#FBF5EB] font-[500]'
                          }`}
                        >
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 2. Order Search Bar */}
                  <div className="p-[10px_12px] @max-[499px]:p-[8px_10px]">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        fetchOrders();
                      }}
                      className="relative flex items-center border border-[#EAE4D7] rounded-[8px] bg-white px-[10px] py-[6px] focus-within:border-[#C59B58] focus-within:shadow-[0_0_0_2px_rgba(197,155,88,0.15)] transition group"
                    >
                      <Search className="w-[16px] h-[16px] text-[#7D715E] group-focus-within:text-[#B88E4F] shrink-0 mr-[10px] transition-colors" />
                      <input
                        type="text"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        aria-label="Tìm đơn mua"
                        placeholder="Tìm mã đơn, sản phẩm hoặc gian hàng…"
                        className="min-w-0 flex-1 bg-transparent text-[13px] @max-[499px]:text-[12px] text-[#1A1612] placeholder-[#7D715E]/85 outline-none font-normal"
                      />
                      {orderSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setOrderSearch('');
                            void fetchOrders('');
                          }}
                          className="p-[4px] text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] rounded-[6px] transition mr-[4px] cursor-pointer shrink-0"
                          title="Xóa tìm kiếm"
                        >
                          <X className="w-[16px] h-[16px]" />
                        </button>
                      )}
                      <button
                        type="submit"
                        className="px-[14px] @max-[499px]:px-[10px] py-[6px] rounded-[6px] bg-[#C59B58] hover:bg-[#B88E4F] text-white font-[600] text-[12px] @max-[499px]:text-[11px] transition cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                      >
                        Tìm kiếm
                      </button>
                    </form>
                  </div>
                </div>

                {!ordersLoading && !ordersError && (
                  <div className="flex items-center justify-between gap-[10px] py-[2px] text-[#7D715E]">
                    <h2 className="m-0 font-[600] text-[12px] text-[#1A1612]">Danh sách đơn hàng</h2>
                    <span className="text-[11px]">{orders.length} đơn hiển thị</span>
                  </div>
                )}

                {/* 3. Orders List */}
                {ordersLoading ? (
                  <div className="flex flex-col items-center justify-center gap-[12px] min-h-[190px] p-[24px_16px] bg-white border border-[#EAE4D7] rounded-[12px] text-[#7D715E]">
                    <Loader2 className="w-[22px] h-[22px] text-[#B88E4F] animate-spin" />
                    <span className="text-[12px] font-[500]">Đang tải danh sách đơn mua...</span>
                  </div>
                ) : ordersError ? (
                  <div className="flex flex-col items-center justify-center gap-[12px] min-h-[190px] p-[24px_16px] bg-white border border-[#EAE4D7] rounded-[12px] text-center">
                    <div className="w-[44px] h-[44px] rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center">
                      <AlertCircle className="w-[22px] h-[22px]" />
                    </div>
                    <div>
                      <strong className="text-[14px] font-[600] text-[#1A1612] block">Chưa tải được đơn mua</strong>
                      <p className="text-[12px] text-[#7D715E] mt-[3px] max-w-sm m-0">
                        Kiểm tra kết nối rồi thử tải lại. Đơn hàng của bạn vẫn được giữ an toàn trên hệ thống.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void fetchOrders()}
                      className="px-[14px] py-[7px] rounded-[8px] bg-[#C59B58] text-white text-[12px] font-[600] hover:bg-[#B88E4F] transition cursor-pointer"
                    >
                      Thử tải lại
                    </button>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-[12px] min-h-[190px] p-[24px_16px] bg-white border border-[#EAE4D7] rounded-[12px] text-center">
                    <div className="w-[44px] h-[44px] rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center">
                      <ShoppingBag className="w-[22px] h-[22px]" />
                    </div>
                    <div>
                      <strong className="text-[14px] font-[600] text-[#1A1612] block">
                        Chưa có đơn hàng nào
                      </strong>
                      <p className="text-[12px] text-[#7D715E] mt-[3px] max-w-sm m-0">
                        {orderStatusFilter === 'ALL'
                          ? 'Bạn chưa có đơn mua nào trên SCANMS. Hãy khám phá ngay các sản phẩm chính hãng với nhiều ưu đãi nhé!'
                          : `Không tìm thấy đơn hàng nào ở mục "${orderStatusFilter}".`}
                      </p>
                    </div>
                    <Link
                      to="/marketplace"
                      className="inline-flex items-center justify-center min-h-[36px] px-[16px] py-[7px] rounded-[8px] bg-[#C59B58] hover:bg-[#B88E4F] text-white text-[12px] font-[600] transition no-underline"
                    >
                      Khám phá sản phẩm ngay
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-[12px]">
                    {orders.map((order) => {
                      const isPending = order.status === 'PENDING';
                      const isShipping = order.status === 'SHIPPING';
                      const isDelivered = order.status === 'DELIVERED';
                      const isCompleted = order.status === 'COMPLETED';
                      const isCancelled = order.status === 'CANCELLED';
                      const isReturned = order.status === 'RETURNED' || order.status === 'RETURN_REQUESTED';
                      const hasReturnRequest = Boolean(order.returnRequest) || ['RETURN_REQUESTED', 'DISPUTED', 'RETURNED'].includes(order.status);
                      const returnAnchor = new Date(order.deliveredAt || order.completedAt || 0).getTime();
                      const canRequestReturn =
                        (isDelivered || isCompleted) &&
                        !hasReturnRequest &&
                        Date.now() <= returnAnchor + 14 * 24 * 60 * 60 * 1000;
                      const previewItem = order.orderItems[0];
                      const productCount = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
                      const statusLabel = hasReturnRequest
                        ? order.returnRequest?.status === 'SHOP_APPROVED' ? 'Shop đã duyệt · chờ xử lý tiền/hàng'
                          : order.returnRequest?.status === 'SHOP_REJECTED' ? 'Shop đã từ chối đổi trả'
                          : order.returnRequest?.status === 'REFUNDED' ? 'Đã hoàn tiền'
                          : 'Đang xử lý trả hàng'
                        : isCancelled ? 'Đã hủy đơn' : isCompleted ? 'Hoàn thành' : isDelivered ? 'Đã giao hàng'
                        : isShipping ? 'Đang vận chuyển' : isPending ? 'Chờ xác nhận' : 'Đang xử lý';
                      const StatusIcon = hasReturnRequest ? RotateCcw : isCancelled ? XCircle : isCompleted || isDelivered ? CheckCircle2 : isShipping ? Truck : Clock;

                      return (
                        <details
                          key={order.id}
                          className="block min-w-0 border border-[#EAE4D7] rounded-[12px] bg-white overflow-hidden group/order"
                        >
                          <summary className="grid grid-cols-[56px_minmax(0,1fr)_170px_130px_28px] @max-[849px]:grid-cols-[52px_minmax(0,1fr)_110px_28px] @max-[499px]:grid-cols-[44px_minmax(0,1fr)_28px] items-center gap-[10px_14px] @max-[849px]:gap-[10px_12px] @max-[499px]:gap-[8px_10px] min-h-[88px] p-[12px_14px] @max-[499px]:p-[12px] list-none cursor-pointer outline-none bg-white hover:bg-[#FAF8F5] group-open/order:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#B88E4F] focus-visible:outline-offset-[-3px] transition-colors [&::-webkit-details-marker]:hidden">
                            <span className="grid place-items-center w-[56px] h-[56px] @max-[499px]:w-[44px] @max-[499px]:h-[44px] @max-[849px]:row-span-2 @max-[499px]:row-span-1 @max-[499px]:self-start overflow-hidden border border-[#EAE4D7] rounded-[9px] bg-[#FAF8F5]" aria-hidden="true">
                              <img
                                src={getSafeProductImageUrl(previewItem?.product?.imageUrl, previewItem?.product?.title)}
                                alt=""
                                className="w-full h-full object-contain p-[3px]"
                                onError={event => {
                                  if (!event.currentTarget.dataset.hasFallback) {
                                    event.currentTarget.dataset.hasFallback = 'true';
                                    event.currentTarget.src = getSafeProductImageUrl(null, previewItem?.product?.title);
                                  }
                                }}
                              />
                            </span>
                            <span className="flex flex-col gap-[3px] min-w-0 @max-[849px]:col-start-2">
                              <strong className="text-[#1A1612] text-[14px] @max-[499px]:text-[13px] font-[600] leading-[1.4] break-words">{order.store?.name || 'Gian hàng đối tác'}</strong>
                              <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[#7D715E] text-[12px] leading-[1.5]" title={previewItem?.product?.title}>{previewItem?.product?.title || 'Sản phẩm trong đơn hàng'}{order.orderItems.length > 1 && ` · +${order.orderItems.length - 1} sản phẩm khác`}</span>
                              <span className="flex flex-wrap gap-[3px_10px] text-[#7D715E] text-[11px] @max-[499px]:text-[10px] leading-[1.5] break-words [&>span+span]:border-l [&>span+span]:border-[#EAE4D7] [&>span+span]:pl-[10px]">
                                <span>#{order.externalOrderSn}</span>
                                <span>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                              </span>
                            </span>
                            <span data-status={order.status} className={`inline-flex items-center gap-[5px] px-[9px] py-[5px] border rounded-[7px] text-[11px] font-[500] leading-[1.5] justify-self-end @max-[849px]:col-start-2 @max-[849px]:row-start-2 @max-[849px]:justify-self-start @max-[499px]:col-start-2 @max-[499px]:row-start-3 @max-[499px]:max-w-full ${isCancelled ? 'bg-white border-[#FECACA] text-[#DC2626]' : isCompleted || isDelivered ? 'bg-[#FAF8F5] border-[#EAE4D7] text-[#7D715E]' : 'bg-[#FBF5EB] border-[#EEDFC6] text-[#B88E4F]'}`}>
                              <StatusIcon size={13} className="shrink-0" aria-hidden="true" />
                              <span>{statusLabel}</span>
                            </span>
                            <span className="flex flex-col gap-[4px] min-w-0 text-right @max-[849px]:col-start-3 @max-[849px]:row-span-2 @max-[499px]:col-start-2 @max-[499px]:row-start-2 @max-[499px]:flex-row @max-[499px]:items-baseline @max-[499px]:flex-wrap @max-[499px]:gap-[5px_8px] @max-[499px]:text-left">
                              <strong className="text-[#1A1612] text-[18px] @max-[499px]:text-[17px] font-[600] leading-[1.3] font-mono tabular-nums break-words">{formatMoney(order.finalAmount)}</strong>
                              <small className="text-[#7D715E] text-[11px] leading-[1.4]">{productCount} sản phẩm</small>
                            </span>
                            <span className="grid place-items-center w-[28px] h-[28px] border border-[#EAE4D7] rounded-full text-[#7D715E] bg-white @max-[849px]:col-start-4 @max-[849px]:row-span-2 @max-[499px]:col-start-3 @max-[499px]:row-span-3" aria-label="Mở hoặc thu gọn đơn hàng">
                              <ChevronDown size={16} className="text-[#B88E4F] group-open/order:rotate-180 transition-transform" aria-hidden="true" />
                            </span>
                          </summary>

                          <div className="border-t border-[#EAE4D7]">
                            {/* Order Card Header Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-[12px] p-[10px_16px] @max-[499px]:p-[10px_12px] border-b-0 bg-white">
                              <div className="flex items-center gap-[6px] ml-0 pl-0 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenChat(order)}
                                  className="inline-flex items-center justify-center gap-[5px] min-h-[30px] px-[8px] py-[5px] border border-[#EAE4D7] rounded-[7px] bg-white text-[#7D715E] text-[11px] font-[500] hover:border-[#C59B58] hover:text-[#1A1612] cursor-pointer"
                                  title="Chat ngay với người bán"
                                >
                                  <MessageCircle className="w-[13px] h-[13px] text-[#B88E4F]" />
                                  <span>Chat</span>
                                </button>
                                <Link
                                  to={`/shop/${order.store?.slug || order.storeId}`}
                                  className="inline-flex items-center justify-center gap-[5px] min-h-[30px] px-[8px] py-[5px] border border-[#EAE4D7] rounded-[7px] bg-white text-[#7D715E] text-[11px] font-[500] hover:border-[#C59B58] hover:text-[#1A1612] no-underline"
                                >
                                  <StoreIcon className="w-[13px] h-[13px] text-[#B88E4F]" />
                                  <span>Xem Shop</span>
                                </Link>
                              </div>
                            </div>

                            {!isCancelled && order.rawPayload?.paymentMethod === 'PAYOS' && order.rawPayload?.paymentStatus !== 'PAID' && (
                              <div className="mx-[16px] @max-[499px]:mx-[12px] mb-[12px] flex flex-wrap items-center justify-between gap-[8px] rounded-[8px] border border-[#EEDFC6] bg-[#FBF5EB] p-[10px_12px] text-[12px] text-[#7D715E]">
                                <span>Đơn đang chờ thanh toán PayOS.</span>
                                <Link to={`/payment/payos-return?order=${encodeURIComponent(order.externalOrderSn)}`} className="rounded-[8px] bg-[#C59B58] hover:bg-[#B88E4F] px-[12px] py-[6px] font-[600] text-white text-[11px] no-underline">Thanh toán bằng QR</Link>
                              </div>
                            )}

                            {order.returnRequest?.shopResponse && (
                              <div className="mx-[16px] @max-[499px]:mx-[12px] mb-[12px] rounded-[8px] border border-[#EEDFC6] bg-[#FBF5EB] p-[10px_12px] text-[12px] text-[#1A1612]">
                                <strong>Phản hồi của Shop:</strong> {order.returnRequest.shopResponse}
                              </div>
                            )}

                            {/* Order Items List */}
                            <div className="min-w-0 px-[16px] @max-[499px]:px-[12px] divide-y divide-[#EAE4D7]">
                              {order.orderItems.map((item) => (
                                <div key={item.id} className="grid grid-cols-[64px_minmax(0,1fr)_auto] @max-[499px]:grid-cols-[56px_minmax(0,1fr)] items-center @max-[499px]:items-start gap-[12px] @max-[499px]:gap-[8px_10px] py-[14px] @max-[499px]:py-[12px]">
                                  <div className="w-[64px] h-[64px] @max-[499px]:w-[56px] @max-[499px]:h-[56px] @max-[499px]:row-span-2 border border-[#EAE4D7] rounded-[9px] bg-[#FAF8F5] flex items-center justify-center shrink-0 overflow-hidden">
                                    <img
                                      src={getSafeProductImageUrl(item.product?.imageUrl, item.product?.title)}
                                      alt={item.product?.title || 'Sản phẩm'}
                                      className="w-full h-full object-contain p-[4px]"
                                      onError={(e) => {
                                        const target = e.currentTarget as HTMLImageElement;
                                        if (!target.dataset.hasFallback) {
                                          target.dataset.hasFallback = 'true';
                                          target.src = getSafeProductImageUrl(null, item.product?.title);
                                        }
                                      }}
                                    />
                                  </div>

                                  <div className="min-w-0">
                                    <strong className="block text-[14px] @max-[499px]:text-[13px] font-[550] leading-[1.45] text-[#1A1612] line-clamp-2">
                                      {item.product?.title || 'Sản phẩm chính hãng SCANMS'}
                                    </strong>
                                    {item.variant?.name && (
                                      <span className="block text-[12px] text-[#7D715E] leading-[1.45] mt-[2px]">
                                        Phân loại hàng: {item.variant.name}
                                      </span>
                                    )}
                                    <span className="block text-[12px] text-[#7D715E] leading-[1.45] mt-[2px]">
                                      x{item.quantity}
                                    </span>
                                    <div className="flex items-center gap-[8px] mt-[4px]">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenChat(order, item)}
                                        className="inline-flex items-center gap-[4px] text-[11px] font-[400] text-[#7D715E] hover:text-[#C59B58] transition cursor-pointer"
                                        title="Trao đổi với người bán về sản phẩm này"
                                      >
                                        <MessageCircle className="w-[12px] h-[12px] text-[#B88E4F]" />
                                        <span>Chat về sản phẩm</span>
                                      </button>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0 @max-[499px]:col-start-2">
                                    <span className="text-[14px] @max-[499px]:text-[13px] font-[550] text-[#1A1612] font-mono tabular-nums whitespace-nowrap">
                                      {formatMoney(Number(item.unitPrice) * item.quantity)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Dispute / Return Banner if Returned */}
                            {isReturned && (
                              <div className="mx-[16px] @max-[499px]:mx-[12px] my-[10px] p-[12px] rounded-[8px] bg-[#FBF5EB] border border-[#EEDFC6] text-[12px] text-[#7D715E] flex items-start gap-[10px]">
                                <AlertCircle className="w-[16px] h-[16px] text-[#B88E4F] shrink-0 mt-[1px]" />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <strong className="font-[600] text-[#1A1612]">Yêu cầu Trả hàng / Hoàn tiền đang được xử lý</strong>
                                    <span className="text-[10px] font-[600] text-[#B88E4F] bg-[#F3EFE6] px-[8px] py-[2px] rounded-[5px]">ĐANG XÉT DUYỆT</span>
                                  </div>
                                  <p className="mt-[4px] text-[#7D715E] leading-relaxed m-0">
                                    {order.overrideReason || (order.rawPayload?.dispute?.reason ? `Lý do: ${order.rawPayload.dispute.reason}` : 'Hệ thống SCANMS đang chuyển yêu cầu tới gian hàng đối tác và trọng tài sàn.')}
                                  </p>
                                  <span className="text-[11px] text-[#7D715E] font-mono mt-[6px] block">
                                    Số tiền hoàn dự kiến: <strong className="text-[#1A1612] font-[600]">{formatMoney(order.finalAmount)}</strong>
                                  </span>

                                  {/* Uploaded proof images & videos */}
                                  {(order.rawPayload?.dispute?.customerProofImages?.length > 0 || order.rawPayload?.dispute?.customerProofVideos?.length > 0) && (
                                    <div className="mt-[10px] pt-[8px] border-t border-[#EEDFC6] flex items-center gap-[8px] overflow-x-auto">
                                      <span className="text-[11px] font-[600] text-[#1A1612] shrink-0">Bằng chứng:</span>
                                      {order.rawPayload.dispute.customerProofImages?.map((url: string, idx: number) => (
                                        <a
                                          key={`img-${idx}`}
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="w-[48px] h-[48px] rounded-[8px] border border-[#EEDFC6] overflow-hidden shrink-0 hover:opacity-90 block bg-white"
                                          title="Bấm để xem ảnh phóng to"
                                        >
                                          <img src={url} alt={`Bằng chứng ${idx + 1}`} className="w-full h-full object-cover" />
                                        </a>
                                      ))}
                                      {order.rawPayload.dispute.customerProofVideos?.map((url: string, idx: number) => (
                                        <a
                                          key={`vid-${idx}`}
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="h-[48px] px-[12px] rounded-[8px] bg-[#231D15] text-white text-[11px] font-[600] flex items-center gap-[6px] shrink-0 hover:bg-[#1A1612] transition no-underline"
                                          title="Bấm để xem video mở hộp"
                                        >
                                          <span>▶ Xem Video ({idx + 1})</span>
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Order Footer: Summary & Action Buttons */}
                            <div className="flex flex-row items-center justify-between flex-wrap gap-[12px] p-[12px_16px] @max-[499px]:p-[12px] border-t border-[#EAE4D7] bg-[#FAF8F5]">
                              <div className="flex items-baseline gap-[8px] @max-[499px]:w-full @max-[499px]:justify-between">
                                <span className="text-[12px] text-[#7D715E]">Thành tiền:</span>
                                <strong className="text-[21px] @max-[499px]:text-[20px] font-[650] tracking-[-0.02em] font-mono tabular-nums leading-[1.3] text-[#1A1612]">
                                  {formatMoney(order.finalAmount)}
                                </strong>
                              </div>

                              {/* Action Buttons Row */}
                              <div className="flex items-center justify-end flex-wrap gap-[7px] ml-auto @max-[499px]:w-full @max-[499px]:grid @max-[499px]:grid-cols-2">
                                {/* Primary Button: Mua lại */}
                                <button
                                  type="button"
                                  onClick={() => handleReorder(order)}
                                  className="inline-flex items-center justify-center gap-[5px] min-h-[34px] px-[11px] py-[7px] border border-[#EEDFC6] rounded-[8px] bg-[#C59B58] hover:bg-[#B88E4F] text-white text-[12px] font-[500] leading-[1.5] cursor-pointer @max-[499px]:min-w-0 @max-[499px]:whitespace-normal transition-colors"
                                >
                                  <RotateCcw className="w-[14px] h-[14px]" />
                                  <span>Mua lại</span>
                                </button>

                                {/* Secondary Button: Xem chi tiết */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrderDetails(order)}
                                  className="inline-flex items-center justify-center gap-[5px] min-h-[34px] px-[11px] py-[7px] border border-[#EEDFC6] rounded-[8px] bg-[#FBF5EB] hover:border-[#C59B58] text-[#1A1612] text-[12px] font-[550] leading-[1.5] cursor-pointer @max-[499px]:min-w-0 @max-[499px]:whitespace-normal transition-colors"
                                >
                                  {isCancelled ? 'Chi tiết hủy đơn' : isReturned ? 'Chi tiết đổi trả' : 'Chi tiết đơn'}
                                </button>

                                {/* Cancel Button if Pending */}
                                {isPending && (
                                  <button
                                    type="button"
                                    onClick={() => setCancellingOrderId(order.id)}
                                    className="inline-flex items-center justify-center gap-[5px] min-h-[34px] px-[11px] py-[7px] border border-[#FECACA] hover:border-[#DC2626] rounded-[8px] bg-white hover:bg-[#FEF2F2] text-[#DC2626] text-[12px] font-[500] leading-[1.5] cursor-pointer @max-[499px]:min-w-0 @max-[499px]:whitespace-normal transition-colors"
                                  >
                                    Hủy đơn
                                  </button>
                                )}

                                {/* Confirm Receipt Button if Delivered */}
                                {isDelivered && !hasReturnRequest && (
                                  <button
                                    type="button"
                                    disabled={confirmingOrderId === order.id}
                                    onClick={() => handleConfirmReceipt(order)}
                                    className="inline-flex items-center justify-center gap-[5px] min-h-[34px] px-[11px] py-[7px] border border-[#EEDFC6] rounded-[8px] bg-[#C59B58] hover:bg-[#B88E4F] text-white text-[12px] font-[500] leading-[1.5] disabled:opacity-50 cursor-pointer @max-[499px]:min-w-0 @max-[499px]:whitespace-normal transition-colors"
                                  >
                                    {confirmingOrderId === order.id && <Loader2 className="w-[14px] h-[14px] animate-spin" />}
                                    <span>Đã nhận hàng</span>
                                  </button>
                                )}

                                {/* Return Request Button */}
                                {canRequestReturn && (
                                  <button
                                    type="button"
                                    onClick={() => setReturnOrder(order)}
                                    className="inline-flex items-center justify-center gap-[5px] min-h-[34px] px-[11px] py-[7px] border border-[#EAE4D7] hover:border-[#C59B58] rounded-[8px] bg-white text-[#B88E4F] text-[12px] font-[500] leading-[1.5] cursor-pointer @max-[499px]:min-w-0 @max-[499px]:whitespace-normal transition-colors"
                                  >
                                    <RotateCcw className="w-[14px] h-[14px] text-[#B88E4F]" />
                                    <span>Trả hàng / Hoàn tiền</span>
                                  </button>
                                )}

                                {/* Verified Review Button if Completed */}
                                {isCompleted && !hasReturnRequest && (
                                  <button
                                    type="button"
                                    onClick={() => setReviewOrder(order)}
                                    className="inline-flex items-center justify-center gap-[5px] min-h-[34px] px-[11px] py-[7px] border border-[#EAE4D7] hover:border-[#C59B58] rounded-[8px] bg-white text-[#B88E4F] text-[12px] font-[500] leading-[1.5] cursor-pointer @max-[499px]:min-w-0 @max-[499px]:whitespace-normal transition-colors"
                                  >
                                    <Sparkles className="w-[14px] h-[14px] text-[#B88E4F]" />
                                    <span>Đánh giá</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 2: SỔ ĐỊA CHỈ NHẬN HÀNG (ADDRESS BOOK) */}
            {/* ------------------------------------------------------------- */}
            {currentTab === 'addresses' && (
              <section className="@container/addresses grid gap-[14px] w-full max-w-[1120px] min-w-0 text-[#1A1612] pb-[64px] md:pb-0" aria-labelledby="customer-address-book-title">
                <div className="flex items-center justify-between flex-wrap gap-[12px] @max-[419px]:gap-[10px] pt-[4px] pb-[16px] @max-[419px]:pb-[12px] border-b border-[#EAE4D7]">
                  <div className="flex items-center gap-[10px] min-w-0">
                    <span className="grid place-items-center shrink-0 w-[40px] h-[40px] @max-[419px]:w-[34px] @max-[419px]:h-[36px] border border-[#EEDFC6] rounded-[11px] @max-[419px]:rounded-[9px] bg-white text-[#B88E4F]" aria-hidden="true"><MapPin size={18} /></span>
                    <div>
                      <div className="flex items-center flex-wrap gap-[8px]">
                        <h1 id="customer-address-book-title" className="m-0 text-[20px] @max-[419px]:text-[18px] font-[650] leading-[1.4] tracking-[-0.4px] text-[#1A1612]">Địa chỉ nhận hàng</h1>
                        {!addressesLoading && (
                          <span className="px-[7px] py-[2px] rounded-[5px] bg-[#F3EFE6] text-[#7D715E] text-[11px] leading-[1.5] whitespace-nowrap" aria-live="polite">{addresses.length} địa chỉ</span>
                        )}
                      </div>
                      <p className="mt-[3px] mb-0 text-[#7D715E] text-[12px] @max-[419px]:text-[11px] leading-[1.5]">Lưu địa chỉ để đặt hàng thuận tiện hơn.</p>
                    </div>
                  </div>
                  <div className="flex items-center shrink-0 gap-[8px] @max-[419px]:ml-[44px]">
                    <button type="button" onClick={openAddAddressModal} className="inline-flex items-center justify-center gap-[6px] min-h-[40px] px-[12px] py-[7px] border border-[#EEDFC6] rounded-[9px] bg-[#FBF5EB] text-[#1A1612] text-[12px] font-[600] leading-[1.4] whitespace-nowrap cursor-pointer hover:border-[#C59B58] hover:bg-[#F3EFE6] focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[3px] transition-colors">
                      <Plus size={15} className="text-[#B88E4F]" aria-hidden="true" />
                      <span>Thêm địa chỉ</span>
                    </button>
                  </div>
                </div>

                {addressesLoading ? (
                  <div className="flex flex-col items-center justify-center gap-[10px] min-h-[160px] p-[28px_14px] border border-[#EAE4D7] rounded-[13px] bg-white text-[#7D715E] text-center text-[12px]" aria-live="polite">
                    <Loader2 className="animate-spin text-[#B88E4F]" size={25} aria-hidden="true" />
                    <span>Đang tải sổ địa chỉ…</span>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-[10px] min-h-[160px] p-[28px_14px] border border-[#EAE4D7] rounded-[13px] bg-white text-[#7D715E] text-center text-[12px]">
                    <span className="grid place-items-center w-[40px] h-[40px] rounded-[10px] bg-[#FBF5EB] text-[#B88E4F]" aria-hidden="true"><MapPin size={23} /></span>
                    <div>
                      <strong className="text-[#1A1612] text-[16px] font-[600]">Chưa có địa chỉ nhận hàng</strong>
                      <p className="mt-[4px] mb-0 text-[#7D715E] text-[12px] leading-[1.5]">Thêm địa chỉ đầu tiên để thuận tiện hơn khi đặt mua.</p>
                    </div>
                    <button type="button" onClick={openAddAddressModal} className="inline-flex items-center justify-center gap-[6px] min-h-[40px] px-[12px] py-[7px] border border-[#EEDFC6] rounded-[9px] bg-[#FBF5EB] text-[#1A1612] text-[12px] font-[600] leading-[1.4] whitespace-nowrap cursor-pointer hover:border-[#C59B58] hover:bg-[#F3EFE6] focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[3px] transition-colors">
                      <Plus size={15} className="text-[#B88E4F]" aria-hidden="true" /> Thêm địa chỉ
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 @max-[719px]:grid-cols-1 items-stretch gap-[14px]">
                    {addresses.map((addr) => (
                      <article key={addr.id} className={`relative grid grid-cols-[38px_minmax(0,1fr)] content-start gap-[12px] min-w-0 @max-[719px]:max-w-[580px] p-[20px_20px_12px] border rounded-[13px] bg-white shadow-[0_2px_5px_rgba(35,29,21,0.02)] text-left transition-colors ${addr.isDefault ? 'border-[#EEDFC6] before:content-[\'\'] before:absolute before:-top-px before:left-[20px] before:w-[34px] before:h-[3px] before:rounded-b-[3px] before:bg-[#C59B58]' : 'border-[#EAE4D7] hover:border-[#EEDFC6]'}`}>
                        <span className="grid place-items-center w-[38px] h-[42px] rounded-[9px] bg-[#FBF5EB] text-[#B88E4F]" aria-hidden="true"><MapPin size={19} /></span>
                        <div className="flex flex-col gap-[5px] min-w-0">
                          <div className="flex justify-between items-start flex-wrap gap-[6px_8px] mb-[3px]">
                            <div className="flex flex-col items-start gap-[2px] min-w-0">
                              <strong className="text-[#1A1612] text-[16px] font-[650] leading-[1.4] break-words">{addr.fullName}</strong>
                              <span className="text-[#7D715E] text-[12px] leading-[1.5] font-mono tabular-nums">{addr.phoneNumber}</span>
                            </div>
                            {addr.isDefault && (
                              <span className="inline-flex items-center gap-[4px] shrink-0 px-[6px] py-[3px] rounded-[5px] bg-[#FBF5EB] text-[#B88E4F] text-[10px] font-[550] leading-[1.5] whitespace-nowrap"><CheckCircle2 size={11} aria-hidden="true" />Mặc định</span>
                            )}
                          </div>
                          <p className="m-0 text-[#1A1612] font-[500] text-[12px] leading-[1.6] break-words">{addr.detailAddress}</p>
                          <p className="m-0 text-[#7D715E] text-[12px] leading-[1.6] break-words">{addr.wardName}, {addr.districtName}, {addr.provinceName}</p>
                        </div>

                        <div className="col-span-full flex items-center justify-between flex-wrap gap-[6px] mt-[1px] pt-[10px] border-t border-[#EAE4D7]">
                          {!addr.isDefault ? (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              className="min-h-[30px] py-[5px] border-0 bg-transparent text-[#B88E4F] text-[11px] font-[550] text-left cursor-pointer hover:underline hover:underline-offset-[3px] focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[3px]"
                            >
                              Đặt làm mặc định
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-[5px] text-[#7D715E] text-[11px] leading-[1.5]">
                              <CheckCircle2 size={14} className="text-[#059669] shrink-0" aria-hidden="true" />
                              <span>Giao đến địa chỉ này</span>
                            </span>
                          )}

                          <div className="flex items-center shrink-0 gap-[4px]">
                            <button
                              type="button"
                              onClick={() => openEditAddressModal(addr)}
                              title="Sửa địa chỉ"
                              aria-label={`Sửa địa chỉ của ${addr.fullName}`}
                              className="inline-flex items-center justify-center gap-[5px] min-h-[30px] px-[8px] py-[5px] border border-transparent rounded-[7px] bg-transparent text-[#7D715E] text-[11px] font-[550] cursor-pointer hover:border-[#EEDFC6] hover:bg-[#FBF5EB] hover:text-[#1A1612] focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[3px] transition-colors"
                            >
                              <Edit2 size={15} className="text-[#B88E4F]" aria-hidden="true" />
                              <span>Sửa</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setAddressPendingDeletion(addr)}
                              title="Xóa địa chỉ"
                              aria-label={`Xóa địa chỉ của ${addr.fullName}`}
                              className="inline-flex items-center justify-center gap-[5px] min-h-[30px] px-[8px] py-[5px] border border-transparent rounded-[7px] bg-transparent text-[#7D715E] text-[11px] font-[550] cursor-pointer hover:border-[#EAE4D7] hover:bg-[#FAF8F5] hover:text-[#DC2626] focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[3px] transition-colors"
                            >
                              <Trash2 size={15} aria-hidden="true" />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 3: SẢN PHẨM YÊU THÍCH (WISHLIST) */}
            {/* ------------------------------------------------------------- */}
            {currentTab === 'wishlist' && (
              <CustomerWishlistTab
                items={wishlist}
                loading={wishlistLoading}
                onRemove={handleRemoveWishlist}
                onBuy={(p) => {
                  setActiveCheckoutProduct({
                    product: {
                      id: p.id,
                      title: p.title,
                      price: p.price,
                      imageUrl: p.imageUrl || '',
                      stockQuantity: p.stockQuantity,
                    },
                    store: {
                      id: p.store?.id || '',
                      name: p.store?.name || 'Gian hàng',
                    },
                  });
                }}
              />
            )}
            {/* ------------------------------------------------------------- */}
            {/* TAB 4: HỒ SƠ CỦA TÔI (SCANMS Standard - IMAGE 1) */}
            {/* ------------------------------------------------------------- */}
            {currentTab === 'profile' && (
              <section className="@container/profile grid gap-[14px] w-full max-w-[1040px] min-w-0 text-[#1A1612] text-left pb-[64px] md:pb-0" aria-labelledby="customer-profile-title">
                <header className="flex items-center gap-[10px] pt-[4px] pb-[14px] border-b border-[#EAE4D7]">
                  <span className="grid place-items-center shrink-0 w-[40px] h-[42px] border border-[#EEDFC6] rounded-[11px] bg-white text-[#B88E4F]" aria-hidden="true"><User size={18} /></span>
                  <div>
                    <h1 id="customer-profile-title" className="m-0 text-[20px] font-[650] leading-[1.4] tracking-[-0.4px] text-[#1A1612]">Hồ sơ của tôi</h1>
                    <p className="mt-[3px] mb-0 text-[#7D715E] text-[12px] leading-[1.5]">Quản lý thông tin cá nhân và thông tin liên hệ.</p>
                  </div>
                </header>

                <div className="grid grid-cols-[minmax(0,1fr)_220px] @max-[719px]:grid-cols-1 items-start gap-[14px] min-w-0">
                  <div className="relative min-w-0 border border-[#EAE4D7] rounded-[13px] bg-white shadow-[0_2px_5px_rgba(35,29,21,0.02)] before:content-[''] before:absolute before:-top-px before:left-[20px] before:w-[34px] before:h-[3px] before:rounded-b-[3px] before:bg-[#C59B58]">
                    <form onSubmit={handleUpdateProfile} className="flex flex-col gap-[16px] @max-[519px]:gap-[14px] min-w-0 p-[20px_20px_0] @max-[519px]:p-[16px_16px_0]">
                      <div className="flex items-center gap-[10px] p-[10px_12px] border border-[#EAE4D7] rounded-[9px] bg-[#FAF8F5]">
                        <span className="grid place-items-center shrink-0 w-[34px] h-[36px] rounded-[8px] bg-white text-[#B88E4F]" aria-hidden="true"><User size={16} /></span>
                        <div className="min-w-0">
                          <span className="block text-[#7D715E] text-[10px] leading-[1.5]">Tên đăng nhập</span>
                          <strong className="block text-[13px] font-[600] leading-[1.5] break-words text-[#1A1612]">{username}</strong>
                          <p className="mt-[2px] mb-0 text-[#7D715E] text-[11px] leading-[1.5]">Tên đăng nhập chỉ có thể thay đổi một lần.</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-[6px] min-w-0">
                        <label htmlFor="customer-profile-name" className="text-[12px] font-[550] leading-[1.5] text-[#1A1612]">Họ và tên</label>
                        <input id="customer-profile-name" type="text" autoComplete="name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} required placeholder="Nhập họ và tên" className="w-full min-w-0 h-[40px] px-[10px] py-[8px] border border-[#EAE4D7] rounded-[8px] bg-[#FAF8F5] text-[#1A1612] text-[13px] outline-none hover:border-[#EEDFC6] focus:border-[#C59B58] focus:bg-white focus:shadow-[0_0_0_2px_rgba(197,155,88,0.12)] transition" />
                      </div>

                      <div className="grid grid-cols-2 @max-[519px]:grid-cols-1 gap-[12px]">
                        <div className="flex flex-col gap-[6px] min-w-0">
                          <span className="text-[12px] font-[550] leading-[1.5] text-[#1A1612]">Email</span>
                          <div className="flex items-center justify-between flex-wrap gap-[4px_8px] min-h-[40px] p-[5px_8px_5px_10px] border border-[#EAE4D7] rounded-[8px] bg-[#FAF8F5]">
                            <span className="min-w-0 text-[#7D715E] text-[12px] leading-[1.5] break-words">{maskEmail(profileData?.user.email || currentUser?.email)}</span>
                            <button type="button" className="inline-flex items-center justify-center shrink-0 gap-[4px] min-h-[24px] px-[5px] py-[3px] border-0 rounded-[5px] bg-transparent text-[#B88E4F] text-[11px] font-[550] whitespace-nowrap cursor-pointer hover:bg-[#FBF5EB] transition-colors" onClick={() => toast.info('Email đã được bảo mật theo chuẩn định danh')} aria-label="Thay đổi email"><Edit2 size={12} aria-hidden="true" />Thay đổi</button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-[6px] min-w-0">
                          <label htmlFor={isEditingPhone ? 'customer-profile-phone' : undefined} className="text-[12px] font-[550] leading-[1.5] text-[#1A1612]">Số điện thoại</label>
                          {isEditingPhone ? (
                            <div className="flex gap-[6px] items-center">
                              <input id="customer-profile-phone" type="tel" autoComplete="tel" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="0912345678" autoFocus className="w-full min-w-0 h-[40px] px-[10px] py-[8px] border border-[#EAE4D7] rounded-[8px] bg-[#FAF8F5] text-[#1A1612] text-[13px] outline-none hover:border-[#EEDFC6] focus:border-[#C59B58] focus:bg-white focus:shadow-[0_0_0_2px_rgba(197,155,88,0.12)] transition" />
                              <button type="button" className="inline-flex items-center justify-center shrink-0 min-h-[30px] px-[8px] py-[5px] border border-[#EEDFC6] rounded-[6px] bg-[#FBF5EB] text-[#B88E4F] text-[11px] font-[550] cursor-pointer" onClick={() => setIsEditingPhone(false)}>Xong</button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between flex-wrap gap-[4px_8px] min-h-[40px] p-[5px_8px_5px_10px] border border-[#EAE4D7] rounded-[8px] bg-[#FAF8F5]">
                              <span className="min-w-0 text-[#7D715E] text-[12px] leading-[1.5] break-words">{phoneInput ? maskPhone(phoneInput) : 'Chưa cập nhật'}</span>
                              <button type="button" className="inline-flex items-center justify-center shrink-0 gap-[4px] min-h-[24px] px-[5px] py-[3px] border-0 rounded-[5px] bg-transparent text-[#B88E4F] text-[11px] font-[550] whitespace-nowrap cursor-pointer hover:bg-[#FBF5EB] transition-colors" onClick={() => setIsEditingPhone(true)} aria-label="Thay đổi số điện thoại"><Edit2 size={12} aria-hidden="true" />Thay đổi</button>
                            </div>
                          )}
                        </div>
                      </div>

                      <fieldset className="m-0 p-0 border-0 min-w-0">
                        <legend className="p-0 mb-[6px] text-[12px] font-[550] leading-[1.5] text-[#1A1612]">Giới tính</legend>
                        <div className="inline-flex flex-wrap gap-[6px]">
                          {([{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }, { value: 'OTHER', label: 'Khác' }] as const).map((option) => (
                            <label key={option.value} className={`inline-flex items-center gap-[6px] min-h-[36px] px-[12px] py-[7px] border rounded-[7px] text-[12px] cursor-pointer transition-colors ${gender === option.value ? 'border-[#EEDFC6] bg-[#FBF5EB] text-[#1A1612] font-[550]' : 'border-[#EAE4D7] bg-white text-[#7D715E]'}`}>
                              <input type="radio" name="gender" checked={gender === option.value} onChange={() => setGender(option.value)} className="m-0 w-[14px] h-[14px] accent-[#B88E4F]" />
                              <span>{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      <div className="flex flex-col gap-[6px] min-w-0">
                        <span className="text-[12px] font-[550] leading-[1.5] text-[#1A1612]" id="customer-profile-birthday-label">Ngày sinh</span>
                        <div className="grid grid-cols-3 gap-[8px] @max-[339px]:gap-[5px]" role="group" aria-labelledby="customer-profile-birthday-label">
                          <Select value={birthDay} onChange={(e) => setBirthDay(e.target.value)} className="w-full" aria-label="Ngày sinh">
                            {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => <option key={d} value={d}>Ngày {d}</option>)}
                          </Select>
                          <Select value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} className="w-full" aria-label="Tháng sinh">
                            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => <option key={m} value={m}>Tháng {m}</option>)}
                          </Select>
                          <Select value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className="w-full" aria-label="Năm sinh">
                            {Array.from({ length: 70 }, (_, i) => String(2015 - i)).map((y) => <option key={y} value={y}>Năm {y}</option>)}
                          </Select>
                        </div>
                      </div>

                      <div className="flex justify-end -mx-[20px] @max-[519px]:-mx-[16px] p-[14px_20px] @max-[519px]:p-[14px_16px] border-t border-[#EAE4D7] rounded-b-[13px] bg-[#FAF8F5]">
                        <button type="submit" disabled={updatingProfile || profileLoading} className="inline-flex items-center justify-center gap-[6px] min-h-[40px] px-[12px] py-[7px] border border-[#EEDFC6] rounded-[8px] bg-[#FBF5EB] text-[#1A1612] text-[12px] font-[600] cursor-pointer hover:border-[#C59B58] transition-colors disabled:opacity-60 disabled:cursor-wait">
                          {(updatingProfile || profileLoading) ? <Loader2 size={14} className="animate-spin text-[#B88E4F]" aria-hidden="true" /> : <CheckCircle2 size={14} className="text-[#B88E4F]" aria-hidden="true" />}
                          <span>{updatingProfile ? 'Đang lưu…' : 'Lưu thay đổi'}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  <aside className="flex flex-col items-center gap-[14px] min-w-0 p-[20px_14px] border border-[#EAE4D7] rounded-[13px] bg-white shadow-[0_2px_5px_rgba(35,29,21,0.02)] @max-[719px]:row-start-1 @max-[719px]:grid @max-[719px]:grid-cols-[64px_minmax(0,1fr)] @max-[719px]:gap-[5px_12px] @max-[719px]:items-center @max-[719px]:justify-items-start @max-[719px]:p-[12px_14px]" aria-labelledby="customer-profile-avatar-title">
                    <h2 id="customer-profile-avatar-title" className="m-0 text-[13px] font-[600] text-[#1A1612] @max-[719px]:col-start-2 @max-[719px]:row-start-1">Ảnh đại diện</h2>
                    <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} className="relative grid place-items-center w-[88px] h-[88px] @max-[719px]:w-[64px] @max-[719px]:h-[64px] @max-[719px]:col-start-1 @max-[719px]:row-span-2 p-0 border border-[#EEDFC6] rounded-full bg-[#FAF8F5] text-[#B88E4F] cursor-pointer overflow-hidden" aria-label="Chọn ảnh đại diện mới">
                      {uploadingAvatar ? <Loader2 size={24} className="animate-spin" /> : profileData?.user.avatarUrl || currentUser?.avatarUrl ? (
                        <img src={profileData?.user.avatarUrl || currentUser?.avatarUrl || ''} alt="Ảnh đại diện của bạn" className="w-full h-full object-cover" />
                      ) : <User size={32} aria-hidden="true" />}
                      <span className="absolute -bottom-px -right-px grid place-items-center w-[28px] h-[28px] border border-[#EEDFC6] rounded-[8px] bg-[#FBF5EB] text-[#B88E4F]" aria-hidden="true"><Camera size={12} /></span>
                    </button>
                    <div className="flex flex-col items-center gap-[8px] @max-[719px]:col-start-2 @max-[719px]:row-start-2 @max-[719px]:flex-row @max-[719px]:flex-wrap @max-[719px]:justify-start @max-[719px]:gap-[6px_10px]">
                      <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} className="inline-flex items-center justify-center gap-[6px] min-h-[40px] @max-[719px]:min-h-[32px] px-[12px] @max-[719px]:px-[10px] py-[7px] @max-[719px]:py-[6px] border border-[#EEDFC6] rounded-[8px] bg-[#FBF5EB] text-[#1A1612] text-[12px] @max-[719px]:text-[11px] font-[600] cursor-pointer hover:border-[#C59B58] transition-colors disabled:opacity-60 disabled:cursor-wait"><Camera size={13} className="text-[#B88E4F]" aria-hidden="true" />{uploadingAvatar ? 'Đang tải…' : 'Chọn ảnh'}</button>
                      <p className="m-0 text-[#7D715E] text-[10px] leading-[1.5] text-center">JPEG, PNG, WEBP · Tối đa 5 MB</p>
                    </div>
                  </aside>
                </div>
              </section>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB: VÍ MUA SẮM SCANMS */}
            {/* ------------------------------------------------------------- */}
            {currentTab === 'wallet' && <CustomerWalletTab />}

            {/* ------------------------------------------------------------- */}
            {/* TAB 5: NÂNG CẤP ĐỐI TÁC (KOL / SHOP MANAGER) */}
            {/* ------------------------------------------------------------- */}
            {currentTab === 'upgrade' && <PartnerUpgradeTab />}

            {currentTab === 'identity' && (
              <section className="@container/identity grid gap-[14px] w-full max-w-[820px] min-w-0 text-[#1A1612] max-md:pb-[64px]" aria-labelledby="customer-identity-title">
                <header className="flex items-center gap-[10px] p-[4px_0_14px] border-b border-[#EAE4D7]">
                  <div className="grid place-items-center shrink-0 w-[40px] h-[42px] border border-[#EEDFC6] rounded-[11px] bg-white text-[#B88E4F]" aria-hidden="true"><ShieldCheck size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-[8px]">
                      <h1 id="customer-identity-title" className="m-0 font-inherit text-[20px] @max-[519px]:text-[19px] font-[650] leading-[1.4] tracking-[-0.4px] text-[#1A1612]">Xác minh CCCD</h1>
                      {cccdVerified && (
                        <span className="inline-flex items-center gap-[4px] p-[2px_6px] border border-[#EEDFC6] rounded-[5px] bg-[#FBF5EB] text-[#7D715E] text-[11px] leading-[1.5] whitespace-nowrap">
                          <CheckCircle2 size={12} className="text-[#059669] shrink-0" aria-hidden="true" />
                          Đã xác thực
                        </span>
                      )}
                    </div>
                    <p className="m-0 mt-[3px] text-[12px] leading-[1.5] text-[#7D715E]">
                      Điền thông tin đúng như trên CCCD của bạn.
                    </p>
                  </div>
                </header>

                <div className="relative min-w-0 border border-[#EAE4D7] rounded-[13px] bg-white shadow-[0_2px_5px_rgba(35,29,21,0.02)] before:content-[''] before:absolute before:-top-px before:left-[20px] before:w-[36px] before:h-[3px] before:rounded-[0_0_3px_3px] before:bg-[#C59B58]">
                  {loadingIdentity ? (
                    <div className="flex flex-col items-center justify-center gap-[10px] min-h-[140px] text-[#7D715E] text-[12px]" aria-live="polite">
                      <Loader2 className="animate-spin text-[#B88E4F]" size={24} aria-hidden="true" />
                      <span>Đang tải thông tin cá nhân…</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitIdentity} className="grid grid-cols-2 @max-[519px]:grid-cols-1 gap-[16px] @max-[519px]:gap-[12px] p-[20px_20px_0] @max-[519px]:p-[16px_16px_0]">
                      <div className="flex flex-col gap-[6px] min-w-0">
                        <label htmlFor="customer-identity-name" className="text-[#1A1612] text-[12px] font-[550] leading-[1.5]">Họ và tên <span className="text-[#B88E4F]">*</span></label>
                        <div className="relative min-w-0">
                          <User size={15} className="absolute top-1/2 left-[11px] -translate-y-1/2 text-[#B88E4F] pointer-events-none" aria-hidden="true" />
                          <input
                            id="customer-identity-name"
                            type="text"
                            autoComplete="name"
                            aria-describedby="customer-identity-name-hint"
                            value={cccdFullName}
                            onChange={(e) => setCccdFullName(e.target.value)}
                            placeholder="Nhập họ và tên trên CCCD"
                            className="w-full min-w-0 h-[42px] box-border p-[8px_10px_8px_34px] border border-[#EAE4D7] rounded-[8px] outline-none bg-[#FAF8F5] text-[#1A1612] font-inherit text-[13px] leading-[1.5] placeholder:text-[#7D715E] placeholder:opacity-80 hover:border-[#EEDFC6] focus:border-[#C59B58] focus:bg-white focus:shadow-[0_0_0_2px_rgba(197,155,88,0.12)] transition-colors"
                          />
                        </div>
                        <span className="text-[#7D715E] text-[11px] leading-[1.5]" id="customer-identity-name-hint">Họ tên đầy đủ theo giấy tờ.</span>
                      </div>

                      <div className="flex flex-col gap-[6px] min-w-0">
                        <label htmlFor="customer-identity-number" className="text-[#1A1612] text-[12px] font-[550] leading-[1.5]">Số CCCD <span className="text-[#B88E4F]">*</span></label>
                        <div className="relative min-w-0">
                          <Shield size={15} className="absolute top-1/2 left-[11px] -translate-y-1/2 text-[#B88E4F] pointer-events-none" aria-hidden="true" />
                          <input
                            id="customer-identity-number"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={12}
                            aria-describedby="customer-identity-number-hint"
                            value={cccdIdNumber}
                            onChange={(e) => setCccdIdNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="Nhập 12 chữ số trên CCCD"
                            className="w-full min-w-0 h-[42px] box-border p-[8px_10px_8px_34px] border border-[#EAE4D7] rounded-[8px] outline-none bg-[#FAF8F5] text-[#1A1612] font-inherit text-[13px] leading-[1.5] placeholder:text-[#7D715E] placeholder:opacity-80 hover:border-[#EEDFC6] focus:border-[#C59B58] focus:bg-white focus:shadow-[0_0_0_2px_rgba(197,155,88,0.12)] transition-colors"
                          />
                        </div>
                        <span className="text-[#7D715E] text-[11px] leading-[1.5]" id="customer-identity-number-hint">Số định danh cá nhân trên CCCD.</span>
                      </div>

                      <div className="col-span-2 @max-[519px]:col-auto flex flex-col gap-[6px] min-w-0">
                        <div className="flex items-center justify-between gap-[10px]">
                          <label htmlFor="customer-identity-address" className="text-[#1A1612] text-[12px] font-[550] leading-[1.5]">Địa chỉ thường trú <span className="text-[#B88E4F]">*</span></label>
                          <span className="text-[#7D715E] text-[11px] leading-[1.5] tabular-nums whitespace-nowrap" id="customer-identity-address-count">
                            {cccdAddress.length}/200
                          </span>
                        </div>
                        <div className="relative min-w-0">
                          <MapPin size={15} className="absolute top-1/2 left-[11px] -translate-y-1/2 text-[#B88E4F] pointer-events-none" aria-hidden="true" />
                          <input
                            id="customer-identity-address"
                            type="text"
                            autoComplete="street-address"
                            maxLength={200}
                            value={cccdAddress}
                            onChange={(e) => setCccdAddress(e.target.value)}
                            placeholder="Nhập địa chỉ thường trú trên CCCD"
                            aria-describedby="customer-identity-address-count"
                            className="w-full min-w-0 h-[42px] box-border p-[8px_10px_8px_34px] border border-[#EAE4D7] rounded-[8px] outline-none bg-[#FAF8F5] text-[#1A1612] font-inherit text-[13px] leading-[1.5] placeholder:text-[#7D715E] placeholder:opacity-80 hover:border-[#EEDFC6] focus:border-[#C59B58] focus:bg-white focus:shadow-[0_0_0_2px_rgba(197,155,88,0.12)] transition-colors"
                          />
                        </div>
                      </div>

                      <div className="col-span-2 @max-[519px]:col-auto flex items-center justify-between flex-wrap @max-[519px]:flex-col-reverse @max-[519px]:items-stretch gap-[10px] m-[2px_-20px_0] @max-[519px]:m-[2px_-16px_0] p-[14px_20px] @max-[519px]:p-[14px_16px] border-t border-[#EAE4D7] rounded-[0_0_13px_13px] bg-[#FAF8F5]">
                        <span className="inline-flex items-center gap-[6px] max-w-[310px] @max-[519px]:max-w-none @max-[519px]:justify-center text-[#7D715E] text-[11px] @max-[519px]:text-[10px] leading-[1.6]">
                          <Lock size={12} className="shrink-0 text-[#B88E4F]" aria-hidden="true" />
                          Thông tin được bảo mật theo chính sách SCANMS.
                        </span>
                        <button
                          type="submit"
                          disabled={
                            submittingIdentity ||
                            !cccdFullName.trim() ||
                            !cccdIdNumber.trim() ||
                            !cccdAddress.trim()
                          }
                          className="w-auto @max-[519px]:w-full inline-flex items-center justify-center gap-[6px] min-h-[40px] p-[7px_12px] border border-[#EEDFC6] rounded-[8px] bg-[#FBF5EB] text-[#1A1612] font-inherit text-[12px] font-[600] leading-[1.5] cursor-pointer hover:not-disabled:border-[#C59B58] hover:not-disabled:bg-[#F3EFE6] focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[3px] disabled:border-[#EAE4D7] disabled:bg-white disabled:text-[#7D715E] disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
                        >
                          {submittingIdentity ? <Loader2 className="animate-spin text-[#B88E4F]" size={14} aria-hidden="true" /> : <ShieldCheck size={14} className="text-[#B88E4F]" aria-hidden="true" />}
                          <span>{submittingIdentity ? 'Đang xác nhận…' : 'Xác nhận thông tin'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </section>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB: KHO VOUCHER (COUPONS & DISCOUNTS) */}
            {/* ------------------------------------------------------------- */}
            {currentTab === 'vouchers' && <CustomerVouchersTab />}

            {/* ------------------------------------------------------------- */}
            {/* TAB: THÔNG BÁO (SCANMS Standard NOTIFICATION CENTER) */}
            {/* ------------------------------------------------------------- */}
            {currentTab === 'notifications' && (
              <CustomerNotificationsTab
                items={notifications}
                loading={notificationsLoading}
                category={activeNotifCategory}
                unreadCount={unreadNotifCount}
                categoryUnread={categoryUnread}
                error={notificationsError}
                hasMore={notificationsPage < notificationsTotalPages}
                loadingMore={notificationsLoadingMore}
                onSelectCategory={handleSelectNotifCategory}
                onOpen={handleNotificationAction}
                onMarkRead={handleMarkSingleAsRead}
                onMarkAllRead={handleMarkAllNotificationsRead}
                onLoadMore={loadMoreNotifications}
                onRetry={() => void fetchNotifications(activeNotifCategory)}
                getCategory={getCategoryFromType}
              />
            )}
            {/* ------------------------------------------------------------- */}
            {/* TAB: ĐỔI MẬT KHẨU & BẢO MẬT (Chuẩn SCANMS XÁC THỰC EMAIL) */}
            {/* ------------------------------------------------------------- */}
            {currentTab === 'security' && (
              <section className="@container/security grid gap-[14px] w-full max-w-[900px] min-w-0 text-[#1A1612] text-left max-md:pb-[64px]" aria-labelledby="customer-security-title">
                <header className="flex items-center gap-[10px] p-[4px_0_14px] border-b border-[#EAE4D7]">
                  <span className="grid place-items-center shrink-0 w-[40px] h-[42px] border border-[#EEDFC6] rounded-[11px] bg-white text-[#B88E4F]" aria-hidden="true"><Shield size={18} /></span>
                  <div>
                    <h1 id="customer-security-title" className="m-0 font-inherit text-[20px] @max-[379px]:text-[19px] font-[650] leading-[1.4] tracking-[-0.4px] text-[#1A1612]">Bảo mật tài khoản</h1>
                    <p className="m-0 mt-[3px] text-[#7D715E] text-[12px] leading-[1.5]">Xác minh email và quản lý mật khẩu của bạn.</p>
                  </div>
                </header>
                {securityMode === 'VERIFY_METHOD' && (
                  <div className="grid grid-cols-[minmax(0,1fr)_264px] @max-[659px]:grid-cols-[minmax(0,1fr)] items-start gap-[14px]">
                    <section className="relative min-w-0 p-[20px] @max-[379px]:p-[16px] border border-[#EAE4D7] rounded-[13px] bg-white shadow-[0_2px_5px_rgba(35,29,21,0.02)] flex flex-col gap-[12px] before:content-[''] before:absolute before:-top-px before:left-[20px] before:w-[34px] before:h-[3px] before:rounded-[0_0_3px_3px] before:bg-[#C59B58]" aria-labelledby="security-method-title">
                      <div className="flex items-center gap-[9px]">
                        <span className="grid place-items-center shrink-0 w-[36px] h-[38px] rounded-[9px] bg-[#FBF5EB] text-[#B88E4F]" aria-hidden="true"><Mail size={17} /></span>
                        <div>
                          <h2 id="security-method-title" className="m-0 font-inherit text-[16px] font-[600] leading-[1.4]">Xác minh qua email</h2>
                          <p className="m-0 mt-[3px] text-[#7D715E] text-[11px] leading-[1.5]">Nhận mã OTP để thiết lập mật khẩu mới.</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between flex-wrap gap-[4px_10px] p-[10px_12px] border border-[#EAE4D7] rounded-[8px] bg-[#FAF8F5] text-[12px] leading-[1.5]">
                        <span className="text-[#7D715E] text-[11px]">Email nhận mã</span>
                        <strong className="text-[12px] font-[550] break-all">{maskedSecurityEmail || maskEmail(currentUser?.email)}</strong>
                      </div>
                      <button type="button" onClick={handleSendSecurityOtp} disabled={sendingSecurityOtp} className="w-full inline-flex items-center justify-center gap-[6px] min-h-[40px] p-[8px_12px] border border-[#EEDFC6] rounded-[8px] bg-[#FBF5EB] text-[#1A1612] font-inherit text-[12px] font-[600] leading-[1.5] cursor-pointer hover:not-disabled:border-[#C59B58] hover:not-disabled:bg-[#F3EFE6] focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[2px] disabled:opacity-60 disabled:cursor-wait transition-colors">
                        {sendingSecurityOtp ? <Loader2 className="animate-spin text-[#B88E4F]" size={14} aria-hidden="true" /> : <Mail size={14} className="text-[#B88E4F] shrink-0" aria-hidden="true" />}
                        <span>{sendingSecurityOtp ? 'Đang gửi mã xác minh…' : 'Gửi mã xác minh qua email'}</span>
                      </button>
                      <div className="flex items-center gap-[6px] pt-[10px] border-t border-[#EAE4D7]">
                        <Lock size={13} className="shrink-0 text-[#B88E4F]" aria-hidden="true" />
                        <button type="button" onClick={() => setSecurityMode('DIRECT_CHANGE')} className="inline-flex items-center justify-between flex-1 gap-[6px] p-[3px_0] border-0 bg-transparent text-[#7D715E] hover:text-[#B88E4F] font-inherit text-[11px] font-[550] leading-[1.5] text-left cursor-pointer transition-colors">Đổi bằng mật khẩu hiện tại <ArrowLeft size={13} className="rotate-180" aria-hidden="true" /></button>
                      </div>
                    </section>
                    <aside className="min-w-0 p-[14px_16px] border border-[#EAE4D7] rounded-[13px] bg-white shadow-none" aria-labelledby="security-help-title">
                      <h2 id="security-help-title" className="flex items-center gap-[6px] m-0 mb-[8px] font-inherit text-[13px] font-[600] leading-[1.5]"><HelpCircle size={15} className="text-[#B88E4F]" aria-hidden="true" /> Trợ giúp xác minh</h2>
                      <details className="border-t border-[#EAE4D7] first:border-t-0 group">
                        <summary className="flex items-center justify-between gap-[6px] p-[10px_0] list-none text-[11px] font-[500] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[2px] select-none [&::-webkit-details-marker]:hidden">Vì sao cần xác minh? <ChevronDown size={13} className="shrink-0 text-[#7D715E] transition-transform duration-200 group-open:rotate-180" aria-hidden="true" /></summary>
                        <p className="m-0 pb-[10px] text-[#7D715E] text-[11px] leading-[1.7]">SCANMS xác minh email trước khi cho phép thiết lập mật khẩu mới để bảo vệ tài khoản của bạn.</p>
                      </details>
                      <details className="border-t border-[#EAE4D7] first:border-t-0 group">
                        <summary className="flex items-center justify-between gap-[6px] p-[10px_0] list-none text-[11px] font-[500] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[2px] select-none [&::-webkit-details-marker]:hidden">Chưa nhận được email? <ChevronDown size={13} className="shrink-0 text-[#7D715E] transition-transform duration-200 group-open:rotate-180" aria-hidden="true" /></summary>
                        <p className="m-0 pb-[10px] text-[#7D715E] text-[11px] leading-[1.7]">Kiểm tra thư mục Spam. Nếu vẫn chưa nhận được, hãy liên hệ CSKH qua Chat hỗ trợ.</p>
                      </details>
                    </aside>
                  </div>
                )}
                {securityMode === 'AWAIT_OTP' && (
                  <section className="flex flex-col gap-[14px] w-full max-w-[460px] p-[20px] @max-[379px]:p-[16px] border border-[#EAE4D7] rounded-[13px] bg-white shadow-[0_2px_5px_rgba(35,29,21,0.02)] min-w-0" aria-labelledby="security-otp-title">
                    <button type="button" className="inline-flex items-center gap-[5px] self-start p-0 border-0 bg-transparent text-[#7D715E] hover:text-[#B88E4F] font-inherit text-[11px] leading-[1.5] cursor-pointer transition-colors" onClick={() => setSecurityMode('VERIFY_METHOD')}><ArrowLeft size={13} aria-hidden="true" /> Quay lại</button>
                    <div className="flex items-center gap-[9px]">
                      <span className="grid place-items-center shrink-0 w-[36px] h-[38px] rounded-[9px] bg-[#FBF5EB] text-[#B88E4F]" aria-hidden="true"><Mail size={17} /></span>
                      <div><h2 id="security-otp-title" className="m-0 font-inherit text-[16px] font-[600] leading-[1.4]">Nhập mã xác thực</h2><p className="m-0 mt-[3px] text-[#7D715E] text-[11px] leading-[1.5]">Mã 6 số đã được gửi đến email của bạn.</p></div>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-[4px_10px] p-[10px_12px] border border-[#EAE4D7] rounded-[8px] bg-[#FAF8F5] text-[12px] leading-[1.5]"><span className="text-[#7D715E] text-[11px]">Email nhận mã</span><strong className="text-[12px] font-[550] break-all">{maskedSecurityEmail || maskEmail(currentUser?.email)}</strong></div>
                    <form onSubmit={handleVerifySecurityOtp} className="flex flex-col gap-[12px] min-w-0">
                      <div className="flex flex-col gap-[6px]">
                        <label htmlFor="customer-security-otp" className="text-[12px] font-[550] leading-[1.5] text-[#1A1612]">Mã OTP</label>
                        <input id="customer-security-otp" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" maxLength={6} autoFocus value={securityOtp} onChange={(e) => setSecurityOtp(e.target.value.replace(/\D/g, ''))} placeholder="••••••" className="w-full min-w-0 h-[46px] p-[8px_10px] border border-[#EAE4D7] rounded-[8px] bg-[#FAF8F5] text-[#1A1612] font-mono text-[22px] tracking-[0.45em] text-center outline-none hover:border-[#EEDFC6] focus:border-[#C59B58] focus:bg-white focus:shadow-[0_0_0_2px_rgba(197,155,88,0.12)] placeholder:text-[#7D715E] transition-colors" />
                      </div>
                      <div className="text-[#7D715E] text-[11px] leading-[1.5]">
                        {otpCountdown > 0 ? <span>Gửi lại sau <strong className="text-[#B88E4F] font-[550]">{otpCountdown}s</strong></span> : <button type="button" onClick={handleSendSecurityOtp} disabled={sendingSecurityOtp} className="p-0 border-0 bg-transparent text-[#B88E4F] font-inherit text-[11px] cursor-pointer hover:underline disabled:opacity-60 disabled:cursor-wait">{sendingSecurityOtp ? 'Đang gửi…' : 'Gửi lại mã OTP'}</button>}
                      </div>
                      <button type="submit" disabled={verifyingSecurityOtp || securityOtp.length < 6} className="inline-flex items-center justify-center gap-[6px] min-h-[40px] p-[8px_12px] border border-[#EEDFC6] rounded-[8px] bg-[#FBF5EB] text-[#1A1612] font-inherit text-[12px] font-[600] leading-[1.5] cursor-pointer hover:not-disabled:border-[#C59B58] hover:not-disabled:bg-[#F3EFE6] focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[2px] disabled:opacity-60 disabled:cursor-wait transition-colors">
                        {verifyingSecurityOtp ? <Loader2 size={14} className="animate-spin text-[#B88E4F] shrink-0" aria-hidden="true" /> : <ShieldCheck size={14} className="text-[#B88E4F] shrink-0" aria-hidden="true" />}
                        <span>{verifyingSecurityOtp ? 'Đang xác thực…' : 'Xác nhận mã'}</span>
                      </button>
                    </form>
                  </section>
                )}
                {(securityMode === 'SET_NEW_PASSWORD' || securityMode === 'DIRECT_CHANGE') && (
                  <section className="flex flex-col gap-[14px] w-full max-w-[560px] p-[20px] @max-[379px]:p-[16px] border border-[#EAE4D7] rounded-[13px] bg-white shadow-[0_2px_5px_rgba(35,29,21,0.02)] min-w-0" aria-labelledby="security-password-title">
                    <button type="button" className="inline-flex items-center gap-[5px] self-start p-0 border-0 bg-transparent text-[#7D715E] hover:text-[#B88E4F] font-inherit text-[11px] leading-[1.5] cursor-pointer transition-colors" onClick={() => setSecurityMode('VERIFY_METHOD')}><ArrowLeft size={13} aria-hidden="true" /> Quay lại</button>
                    <div className="flex items-center gap-[9px]">
                      <span className="grid place-items-center shrink-0 w-[36px] h-[38px] rounded-[9px] bg-[#FBF5EB] text-[#B88E4F]" aria-hidden="true"><KeyRound size={17} /></span>
                      <div><h2 id="security-password-title" className="m-0 font-inherit text-[16px] font-[600] leading-[1.4]">{securityMode === 'DIRECT_CHANGE' ? 'Đổi mật khẩu' : 'Thiết lập mật khẩu mới'}</h2><p className="m-0 mt-[3px] text-[#7D715E] text-[11px] leading-[1.5]">Mật khẩu mới cần có tối thiểu 6 ký tự.</p></div>
                    </div>
                    <form onSubmit={securityMode === 'DIRECT_CHANGE' ? handleChangePassword : handleSaveNewPasswordWithOtp} className="flex flex-col gap-[12px] min-w-0">
                      <input type="email" name="username" value={currentUser?.email || ''} autoComplete="username" readOnly tabIndex={-1} aria-hidden="true" className="sr-only" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }} />
                      {securityMode === 'DIRECT_CHANGE' && (
                        <div className="flex flex-col gap-[6px]"><label htmlFor="customer-security-current" className="text-[12px] font-[550] leading-[1.5] text-[#1A1612]">Mật khẩu hiện tại</label><input id="customer-security-current" type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} required autoComplete="current-password" placeholder="Nhập mật khẩu hiện tại" className="w-full min-w-0 h-[40px] p-[8px_10px] border border-[#EAE4D7] rounded-[8px] bg-[#FAF8F5] text-[#1A1612] font-inherit text-[13px] outline-none hover:border-[#EEDFC6] focus:border-[#C59B58] focus:bg-white focus:shadow-[0_0_0_2px_rgba(197,155,88,0.12)] placeholder:text-[#7D715E] transition-colors" /></div>
                      )}
                      <div className="flex flex-col gap-[6px]"><label htmlFor="customer-security-new" className="text-[12px] font-[550] leading-[1.5] text-[#1A1612]">Mật khẩu mới</label><input id="customer-security-new" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} required minLength={6} autoComplete="new-password" placeholder="Tối thiểu 6 ký tự" className="w-full min-w-0 h-[40px] p-[8px_10px] border border-[#EAE4D7] rounded-[8px] bg-[#FAF8F5] text-[#1A1612] font-inherit text-[13px] outline-none hover:border-[#EEDFC6] focus:border-[#C59B58] focus:bg-white focus:shadow-[0_0_0_2px_rgba(197,155,88,0.12)] placeholder:text-[#7D715E] transition-colors" /></div>
                      <div className="flex flex-col gap-[6px]"><label htmlFor="customer-security-confirm" className="text-[12px] font-[550] leading-[1.5] text-[#1A1612]">Xác nhận mật khẩu mới</label><input id="customer-security-confirm" type="password" value={confirmNewPass} onChange={(e) => setConfirmNewPass(e.target.value)} required autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" className="w-full min-w-0 h-[40px] p-[8px_10px] border border-[#EAE4D7] rounded-[8px] bg-[#FAF8F5] text-[#1A1612] font-inherit text-[13px] outline-none hover:border-[#EEDFC6] focus:border-[#C59B58] focus:bg-white focus:shadow-[0_0_0_2px_rgba(197,155,88,0.12)] placeholder:text-[#7D715E] transition-colors" /></div>
                      <div className="flex items-center justify-between flex-wrap @max-[379px]:flex-col @max-[379px]:items-stretch gap-[10px] pt-[12px] border-t border-[#EAE4D7]">
                        <span className="inline-flex items-center gap-[5px] text-[#7D715E] text-[11px] leading-[1.5]"><Lock size={12} className="shrink-0 text-[#B88E4F]" aria-hidden="true" /> Không chia sẻ mật khẩu của bạn.</span>
                        <button type="submit" disabled={securityMode === 'DIRECT_CHANGE' ? updatingPassword : settingNewPassword} className="inline-flex items-center justify-center gap-[6px] min-h-[40px] p-[8px_12px] border border-[#EEDFC6] rounded-[8px] bg-[#FBF5EB] text-[#1A1612] font-inherit text-[12px] font-[600] leading-[1.5] cursor-pointer hover:not-disabled:border-[#C59B58] hover:not-disabled:bg-[#F3EFE6] focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[2px] disabled:opacity-60 disabled:cursor-wait transition-colors">
                          {(updatingPassword || settingNewPassword) ? <Loader2 size={14} className="animate-spin text-[#B88E4F] shrink-0" aria-hidden="true" /> : <CheckCircle2 size={14} className="text-[#B88E4F] shrink-0" aria-hidden="true" />}
                          <span>{(updatingPassword || settingNewPassword) ? 'Đang lưu…' : 'Lưu mật khẩu mới'}</span>
                        </button>
                      </div>
                      {securityMode === 'DIRECT_CHANGE' && <button type="button" className="inline-flex items-center justify-start gap-[5px] p-0 border-0 bg-transparent text-[#B88E4F] hover:text-[#B88E4F]/80 font-inherit text-[11px] leading-[1.6] text-left cursor-pointer transition-colors" onClick={() => setSecurityMode('VERIFY_METHOD')}>Quên mật khẩu hoặc dùng Google? Xác minh qua email <ArrowLeft size={12} className="rotate-180 shrink-0" aria-hidden="true" /></button>}
                    </form>
                  </section>
                )}
              </section>
            )}
          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* MODAL: CHI TIẾT ĐƠN HÀNG & TIMELINE VẬN CHUYỂN */}
      {/* ========================================================= */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAE4D7] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl flex flex-col gap-4 text-left animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE4D7]">
              <div>
                <strong className="text-base font-black text-[#1A1612] block">
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

            {/* Store Info Banner */}
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE4D7] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <StoreIcon className="w-4 h-4 text-[#C59B58]" />
                <strong className="text-xs sm:text-sm font-bold text-[#1A1612]">
                  {selectedOrderDetails.store?.name || 'Gian Hàng Đối Tác'}
                </strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenChat(selectedOrderDetails)}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#1A1612] bg-white border border-[#EAE4D7] hover:border-[#C59B58] transition flex items-center gap-1 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#C59B58]" />
                  <span>Chat Shop</span>
                </button>
                <Link
                  to={`/shop/${selectedOrderDetails.store?.slug || selectedOrderDetails.storeId}`}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] bg-white border border-[#EAE4D7] hover:border-[#C59B58] transition"
                >
                  Xem Shop
                </Link>
              </div>
            </div>

            {/* Timeline Stepper */}
            <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#EAE4D7] flex items-center justify-between text-center text-xs">
              <div className="flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
                <span className="font-bold text-[#1A1612]">Đặt hàng</span>
              </div>
              <div className="h-0.5 flex-1 bg-[#EAE4D7] mx-2" />
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                    selectedOrderDetails.status !== 'CANCELLED'
                      ? 'bg-[#C59B58] text-white'
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
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
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
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
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

            {/* Dispute / Return Banner if Returned */}
            {selectedOrderDetails.status === 'RETURNED' && (
              <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <RotateCcw className="w-4 h-4 text-amber-700" />
                    <span>Yêu cầu Trả hàng / Hoàn tiền đang chờ xử lý</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                    ĐANG XÉT DUYỆT
                  </span>
                </div>
                <p className="text-amber-800/90 leading-relaxed m-0">
                  {selectedOrderDetails.overrideReason || (selectedOrderDetails.rawPayload?.dispute?.reason ? `Lý do: ${selectedOrderDetails.rawPayload.dispute.reason}` : 'Đang được sàn SCANMS & gian hàng xác minh.')}
                </p>
                {selectedOrderDetails.rawPayload?.dispute?.customerNotes && (
                  <p className="text-[#574C3D] bg-white/70 p-2 rounded-lg border border-amber-200/60 m-0">
                    <strong>Ghi chú:</strong> {selectedOrderDetails.rawPayload.dispute.customerNotes}
                  </p>
                )}
                {/* Proof Media Preview */}
                {(selectedOrderDetails.rawPayload?.dispute?.customerProofImages?.length > 0 ||
                  selectedOrderDetails.rawPayload?.dispute?.customerProofVideos?.length > 0) && (
                  <div className="pt-2 border-t border-amber-200 flex flex-col gap-1.5">
                    <span className="font-bold text-amber-950 text-[11px]">Bằng chứng khui hàng & kiểm tra:</span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {selectedOrderDetails.rawPayload.dispute.customerProofImages?.map((url: string, idx: number) => (
                        <a
                          key={`dt-img-${idx}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-14 h-14 rounded-lg border border-amber-300 overflow-hidden shrink-0 hover:opacity-90 block bg-white shadow-2xs"
                          title="Bấm để xem ảnh phóng to"
                        >
                          <img src={url} alt={`Bằng chứng ${idx + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                      {selectedOrderDetails.rawPayload.dispute.customerProofVideos?.map((url: string, idx: number) => (
                        <a
                          key={`dt-vid-${idx}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-14 px-3 rounded-lg bg-amber-950 text-white text-[11px] font-bold flex flex-col items-center justify-center shrink-0 hover:bg-amber-900 transition shadow-2xs gap-0.5"
                          title="Bấm để xem video mở hộp"
                        >
                          <span className="text-amber-300 text-xs">▶</span>
                          <span>Video ({idx + 1})</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Shipping Info */}
            <div className="p-3.5 bg-white rounded-xl border border-[#EAE4D7] flex flex-col gap-1 text-xs">
              <strong className="text-xs font-bold text-[#1A1612] flex items-center gap-1.5 mb-1">
                <MapPin className="w-4 h-4 text-[#C59B58]" />
                <span>Địa chỉ nhận hàng:</span>
              </strong>
              <span className="text-[#1A1612] font-bold">
                {selectedOrderDetails.customerName} • {selectedOrderDetails.customerPhone}
              </span>
              <span className="text-[#7D715E] leading-relaxed">{selectedOrderDetails.shippingAddress}</span>
            </div>

            {/* Product List */}
            <div className="flex flex-col gap-2">
              <strong className="text-xs font-bold text-[#1A1612]">Kiện hàng chi tiết:</strong>
              <div className="divide-y divide-[#F0EBE0] border border-[#EAE4D7] rounded-xl overflow-hidden bg-white">
                {selectedOrderDetails.orderItems.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] overflow-hidden shrink-0">
                        <img
                          src={getSafeProductImageUrl(item.product?.imageUrl, item.product?.title)}
                          alt={item.product?.title || 'Sản phẩm'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <strong className="block text-xs font-medium text-[#1A1612] truncate">
                          {item.product?.title}
                        </strong>
                        {item.variant?.name && (
                          <span className="text-[11px] text-[#7D715E] block">
                            Phân loại: {item.variant.name}
                          </span>
                        )}
                        <span className="text-[11px] text-[#7D715E] block">
                          Số lượng: x{item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrderDetails(null);
                            handleOpenChat(selectedOrderDetails, item);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-[#B88E4F] hover:underline font-semibold mt-1 cursor-pointer"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>Chat về sản phẩm này</span>
                        </button>
                      </div>
                    </div>
                    <strong className="text-xs font-mono font-bold text-[#1A1612] shrink-0">
                      {formatMoney(Number(item.unitPrice) * item.quantity)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="pt-2 border-t border-[#EAE4D7] flex flex-col gap-1.5 text-xs">
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
              <div className="flex justify-between text-sm sm:text-base font-bold text-[#C59B58] pt-2 border-t border-[#EAE4D7]">
                <span>Tổng thanh toán:</span>
                <span>{formatMoney(selectedOrderDetails.finalAmount)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#EAE4D7]">
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="px-4 py-2 rounded-lg bg-[#FAF8F5] hover:bg-[#F3EFE6] text-xs font-semibold text-[#1A1612] transition cursor-pointer"
              >
                Đóng
              </button>

              {/* Return button if eligible */}
              {selectedOrderDetails.status !== 'CANCELLED' && selectedOrderDetails.status !== 'RETURNED' && (
                <button
                  type="button"
                  onClick={() => {
                    const ord = selectedOrderDetails;
                    setSelectedOrderDetails(null);
                    setReturnOrder(ord);
                  }}
                  className="px-4 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs font-semibold text-amber-800 transition cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Yêu Cầu Trả Hàng / Hoàn Tiền</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const order = selectedOrderDetails;
                  setSelectedOrderDetails(null);
                  handleReorder(order);
                }}
                className="px-5 py-2 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Mua Lại Đơn Này</span>
              </button>
            </div>
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
      {/* MODAL: XÁC NHẬN XÓA ĐỊA CHỈ */}
      {/* ========================================================= */}
      {addressPendingDeletion && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-[#231D15]/[0.38] backdrop-blur-[3px] animate-in fade-in duration-150"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeletingAddress) {
              setAddressPendingDeletion(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-address-title"
            aria-describedby="delete-address-description"
            className="w-full max-w-[400px] max-h-[92dvh] overflow-y-auto border border-[#EAE4D7] rounded-[14px] bg-white text-[#1A1612] shadow-[0_16px_60px_rgba(35,29,21,0.18)] text-left animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-start gap-[10px] max-[419px]:gap-[8px] p-[18px_16px_0] max-[419px]:p-[14px_12px_0]">
              <span className="grid place-items-center w-[34px] h-[36px] shrink-0 border border-[#EEDFC6] rounded-[9px] bg-[#FBF5EB] text-[#B88E4F]" aria-hidden="true"><Trash2 size={17} /></span>
              <div className="flex-1 min-w-0">
                <h2 id="delete-address-title" className="m-0 font-inherit text-[15px] max-[419px]:text-[14px] font-[650] leading-[1.45] tracking-[-0.3px] text-[#1A1612]">Xóa địa chỉ nhận hàng?</h2>
                <p id="delete-address-description" className="m-0 mt-[5px] text-[#7D715E] text-[11px] leading-[1.6]">Địa chỉ sẽ bị xóa khỏi sổ. Thao tác này không thể hoàn tác.</p>
              </div>
              <button type="button" className="grid place-items-center shrink-0 w-[26px] h-[26px] p-0 border-0 rounded-[7px] bg-[#FAF8F5] text-[#7D715E] cursor-pointer hover:bg-[#F3EFE6] transition-colors" aria-label="Đóng xác nhận xóa địa chỉ" disabled={isDeletingAddress} onClick={() => setAddressPendingDeletion(null)}><X size={16} aria-hidden="true" /></button>
            </div>
            <div className="p-[14px_16px_16px] max-[419px]:p-[12px]">
              <div className="flex gap-[10px] p-[12px] border border-[#EAE4D7] rounded-[10px] bg-[#FAF8F5]">
                <span className="grid place-items-center w-[26px] h-[30px] shrink-0 rounded-[7px] bg-white text-[#B88E4F]" aria-hidden="true"><MapPin size={17} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-[2px]">
                    <strong className="text-[12px] font-[600] leading-[1.5] break-words text-[#1A1612]">
                      {addressPendingDeletion.fullName}
                    </strong>
                    <span className="text-[10px] leading-[1.5] text-[#7D715E] font-mono tabular-nums">
                      {addressPendingDeletion.phoneNumber}
                    </span>
                  </div>
                  <p className="m-0 mt-[7px] text-[11px] font-[500] leading-[1.6] break-words text-[#1A1612]">
                    {addressPendingDeletion.detailAddress}
                  </p>
                  <p className="m-0 mt-[2px] text-[#7D715E] text-[10px] leading-[1.6] break-words">
                    {addressPendingDeletion.wardName}, {addressPendingDeletion.districtName}, {addressPendingDeletion.provinceName}
                  </p>
                  {addressPendingDeletion.isDefault && (
                    <span className="inline-flex items-center gap-[4px] mt-[7px] p-[2px_6px] border border-[#EEDFC6] rounded-[5px] bg-[#FBF5EB] text-[#B88E4F] text-[9px] font-[500] leading-[1.5]">
                      <CheckCircle2 size={11} aria-hidden="true" /> Địa chỉ mặc định
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[8px] p-[12px_16px] max-[419px]:p-[10px_12px] border-t border-[#EAE4D7] bg-[#FAF8F5]">
              <button
                type="button"
                disabled={isDeletingAddress}
                autoFocus
                onClick={() => setAddressPendingDeletion(null)}
                className="inline-flex items-center justify-center gap-[6px] min-h-[36px] p-[7px_8px] border border-[#EAE4D7] rounded-[8px] font-inherit text-[11px] font-[600] leading-[1.5] bg-white text-[#1A1612] hover:border-[#EEDFC6] hover:bg-[#FBF5EB] cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[2px]"
              >
                Giữ lại địa chỉ
              </button>
              <button
                type="button"
                disabled={isDeletingAddress}
                onClick={handleDeleteAddress}
                className="inline-flex items-center justify-center gap-[6px] min-h-[36px] p-[7px_8px] border border-[#FECACA] rounded-[8px] font-inherit text-[11px] font-[600] leading-[1.5] bg-[#FFF7F7] text-[#DC2626] hover:border-[#DC2626] cursor-pointer transition-colors disabled:opacity-55 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[2px]"
              >
                {isDeletingAddress ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeletingAddress ? 'Đang xóa...' : 'Xóa địa chỉ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: THÊM / SỬA ĐỊA CHỈ NHẬN HÀNG */}
      {/* ========================================================= */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[#231D15]/[0.38] backdrop-blur-[3px] animate-in fade-in duration-150">
          <div role="dialog" aria-modal="true" aria-labelledby="customer-address-modal-title" aria-describedby="customer-address-modal-description" className="flex flex-col w-full max-w-[620px] max-h-[min(92dvh,780px)] max-[419px]:max-h-[94dvh] min-h-0 overflow-hidden border border-[#EAE4D7] rounded-[16px] max-[419px]:rounded-[13px] bg-white text-[#1A1612] shadow-[0_20px_70px_rgba(35,29,21,0.18)] text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between shrink-0 gap-[12px] max-[419px]:gap-[8px] p-[16px_18px] max-[419px]:p-[12px] border-b border-[#EAE4D7]">
              <div className="flex items-center gap-[10px] max-[419px]:gap-[7px] min-w-0">
                <span className="grid place-items-center shrink-0 w-[36px] h-[38px] max-[419px]:w-[30px] max-[419px]:h-[34px] border border-[#EEDFC6] rounded-[10px] bg-[#FBF5EB] text-[#B88E4F]" aria-hidden="true"><MapPin size={19} /></span>
                <div>
                  <h2 id="customer-address-modal-title" className="m-0 font-inherit text-[16px] max-[419px]:text-[14px] leading-[1.4] font-[650] tracking-[-0.3px] text-[#1A1612]">{editingAddressId ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ nhận hàng'}</h2>
                  <p id="customer-address-modal-description" className="m-0 mt-[3px] text-[11px] max-[419px]:text-[10px] leading-[1.5] text-[#7D715E]">Thông tin người nhận và vị trí giao hàng.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                aria-label="Đóng cửa sổ địa chỉ"
                className="grid place-items-center shrink-0 w-[30px] h-[30px] p-0 border border-[#EAE4D7] rounded-[9px] bg-[#FAF8F5] text-[#7D715E] cursor-pointer hover:bg-[#F3EFE6] transition-colors"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="flex flex-col min-h-0 overflow-hidden">
              <div className="flex flex-col gap-[12px] max-[419px]:gap-[10px] min-h-0 p-[16px_18px] max-[419px]:p-[12px] overflow-y-auto [overscroll-behavior:contain] [scrollbar-width:thin] [scrollbar-color:#EEDFC6_transparent]">
                <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] max-[419px]:grid-cols-[minmax(0,1fr)] gap-[12px] max-[419px]:gap-[10px]">
                  <div className="min-w-0">
                    <label htmlFor="address-recipient-name" className="text-[11px] font-[550] leading-[1.5] text-[#1A1612] block mb-1">
                      Họ và tên người nhận
                    </label>
                    <input
                      type="text"
                      id="address-recipient-name"
                      autoComplete="name"
                      value={addressForm.fullName}
                      onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                      required
                      placeholder="VD: Nguyễn Văn A"
                      className="w-full h-[36px] min-h-[36px] p-[8px_10px] border border-[#EAE4D7] rounded-[8px] bg-[#FAF8F5] text-[#1A1612] text-[12px] outline-none hover:border-[#EEDFC6] focus:border-[#C59B58] focus:bg-white focus:shadow-[0_0_0_2px_rgba(197,155,88,0.12)] transition-colors"
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="address-recipient-phone" className="text-[11px] font-[550] leading-[1.5] text-[#1A1612] block mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      id="address-recipient-phone"
                      autoComplete="tel"
                      value={addressForm.phoneNumber}
                      onChange={(e) => setAddressForm({ ...addressForm, phoneNumber: e.target.value })}
                      required
                      placeholder="VD: 0912345678"
                      className="w-full h-[36px] min-h-[36px] p-[8px_10px] border border-[#EAE4D7] rounded-[8px] bg-[#FAF8F5] text-[#1A1612] text-[12px] outline-none hover:border-[#EEDFC6] focus:border-[#C59B58] focus:bg-white focus:shadow-[0_0_0_2px_rgba(197,155,88,0.12)] transition-colors"
                    />
                  </div>
                </div>

                {/* Tỉnh / Thành phố */}
                <div>
                  <label htmlFor="address-province" className="text-[11px] font-[550] leading-[1.5] text-[#1A1612] block mb-1">
                    Tỉnh / Thành phố
                  </label>
                  <CustomSelect
                    id="address-province"
                    value={addressForm.provinceCode}
                    onChange={(code) => {
                      const p = provinces.find((item) => String(item.code) === String(code));
                      setAddressForm({
                        ...addressForm,
                        provinceCode: code,
                        provinceName: p?.name || '',
                        districtCode: '',
                        districtName: '',
                        wardCode: '',
                        wardName: '',
                        latitude: null,
                        longitude: null,
                      });
                    }}
                    options={provinces.map((p) => ({ value: String(p.code), label: p.name }))}
                    placeholder="Chọn tỉnh / thành phố"
                    required
                  />
                </div>

                {/* Quận / Huyện & Phường / Xã */}
                <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] max-[419px]:grid-cols-[minmax(0,1fr)] gap-[12px] max-[419px]:gap-[10px]">
                  <div className="min-w-0">
                    <label htmlFor="address-district" className="text-[11px] font-[550] leading-[1.5] text-[#1A1612] block mb-1">
                      Quận / Huyện
                    </label>
                    <CustomSelect
                      id="address-district"
                      value={addressForm.districtCode}
                      onChange={(code) => {
                        const d = selectedProvince?.districts.find((item) => String(item.code) === String(code));
                        setAddressForm({
                          ...addressForm,
                          districtCode: code,
                          districtName: d?.name || '',
                          wardCode: '',
                          wardName: '',
                          latitude: null,
                          longitude: null,
                        });
                      }}
                      disabled={!selectedProvince}
                      options={(selectedProvince?.districts || []).map((d) => ({ value: String(d.code), label: d.name }))}
                      placeholder="Chọn quận / huyện"
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <label htmlFor="address-ward" className="text-[11px] font-[550] leading-[1.5] text-[#1A1612] block mb-1">
                      Phường / Xã
                    </label>
                    <CustomSelect
                      id="address-ward"
                      value={addressForm.wardCode}
                      onChange={(code) => {
                        const w = selectedDistrict?.wards.find((item) => String(item.code) === String(code));
                        setAddressForm({
                          ...addressForm,
                          wardCode: code,
                          wardName: w?.name || '',
                          latitude: null,
                          longitude: null,
                        });
                      }}
                      disabled={!selectedDistrict}
                      options={(selectedDistrict?.wards || []).map((w) => ({ value: String(w.code), label: w.name }))}
                      placeholder="Chọn phường / xã"
                      required
                    />
                  </div>
                </div>

                {/* Địa chỉ chi tiết */}
                <div>
                  <label htmlFor="address-detail-input" className="text-[11px] font-[550] leading-[1.5] text-[#1A1612] block mb-1">
                    Địa chỉ chi tiết <span className="text-[10px] font-normal text-[#7D715E] max-[419px]:block">· Số nhà, đường, tòa nhà</span>
                  </label>
                  <input
                    type="text"
                    id="address-detail-input"
                    autoComplete="street-address"
                    value={addressForm.detailAddress}
                    onChange={(e) => setAddressForm({
                      ...addressForm,
                      detailAddress: e.target.value,
                      latitude: null,
                      longitude: null,
                    })}
                    required
                    placeholder="Ví dụ: Số 123 Đường D1, Chung cư ABC"
                    className="w-full h-[36px] min-h-[36px] p-[8px_10px] border border-[#EAE4D7] rounded-[8px] bg-[#FAF8F5] text-[#1A1612] text-[12px] outline-none hover:border-[#EEDFC6] focus:border-[#C59B58] focus:bg-white focus:shadow-[0_0_0_2px_rgba(197,155,88,0.12)] transition-colors"
                  />
                </div>

                <AddressLocationPicker
                  latitude={addressForm.latitude}
                  longitude={addressForm.longitude}
                  addressQuery={[
                    addressForm.detailAddress,
                    addressForm.wardName,
                    addressForm.districtName,
                    addressForm.provinceName,
                    'Việt Nam',
                  ].filter(Boolean).join(', ')}
                  onChange={handleAddressLocationChange}
                />

                <div className="flex items-center gap-[7px]">
                  <input
                    type="checkbox"
                    id="chk-default-address"
                    checked={addressForm.isDefault}
                    onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    className="w-[14px] h-[14px] m-0 accent-[#B88E4F]"
                  />
                  <label htmlFor="chk-default-address" className="text-[#7D715E] text-[11px] font-[500] cursor-pointer">
                    Dùng làm địa chỉ mặc định
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between shrink-0 gap-[12px] p-[12px_18px] max-[419px]:p-[10px_12px] border-t border-[#EAE4D7] bg-[#FAF8F5]">
                <span className="hidden max-[419px]:!hidden sm:inline-flex items-center gap-[5px] text-[#7D715E] text-[10px] leading-[1.5]"><CheckCircle2 size={13} aria-hidden="true" className="shrink-0 text-[#B88E4F]" /> Kiểm tra thông tin trước khi lưu.</span>
                <div className="flex items-center gap-[8px] shrink-0 w-full sm:w-auto max-[419px]:w-full">
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(false)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-[6px] min-h-[36px] p-[8px_14px] border border-[#EAE4D7] rounded-[8px] font-inherit text-[11px] font-[600] bg-white text-[#7D715E] hover:border-[#C59B58] hover:bg-[#F3EFE6] cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[2px]"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-[6px] min-h-[36px] min-w-[112px] p-[8px_14px] border border-[#EEDFC6] rounded-[8px] font-inherit text-[11px] font-[600] bg-[#FBF5EB] text-[#1A1612] hover:border-[#C59B58] hover:bg-[#F3EFE6] cursor-pointer transition-colors disabled:opacity-55 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[2px]"
                  >
                    {savingAddress && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Lưu địa chỉ</span>
                  </button>
                </div>
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

      {returnOrder && (
        <ReturnRequestModal
          order={returnOrder}
          onClose={() => setReturnOrder(null)}
          onSubmitted={() => {
            setReturnOrder(null);
            fetchOrders();
          }}
        />
      )}

      {reviewOrder && (
        <VerifiedReviewModal
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onSubmitted={() => {
            setReviewOrder(null);
            fetchOrders();
          }}
        />
      )}
    </div>
  );
}
