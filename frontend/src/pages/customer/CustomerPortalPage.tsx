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
  ExternalLink,
  Wallet,
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
import './CustomerOrdersTab.css';
import './CustomerSecurityTab.css';
import './CustomerAddressBookTab.css';
import './CustomerIdentityTab.css';
import { getNotificationSection } from '../../utils/notificationCategories';
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

  // Keep submenu open if active tab is in account
  useEffect(() => {
    if (currentTab === 'profile' || currentTab === 'identity' || currentTab === 'addresses' || currentTab === 'security') {
      setIsAccountSubmenuOpen(true);
    }
  }, [currentTab]);
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

      <main className="max-w-[1520px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex-1">
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* ========================================================= */}
          {/* LEFT SIDEBAR - USER CARD & SCANMS Standard NAVIGATION MENU */}
          {/* ========================================================= */}
          <aside className="w-full lg:w-[250px] shrink-0 bg-white border border-[#EAE4D7] rounded-2xl p-3.5 shadow-2xs sticky top-20 self-start text-left select-none flex flex-col gap-2.5 z-30">
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

            <div className="border-t border-[#EAE4D7] my-1" />

            {/* SCANMS Standard Minimalist Navigation List */}
            <nav className="flex flex-col gap-0.5 text-xs sm:text-[13px]" aria-label="Menu chức năng khách hàng">
              {/* SECTION 1: ĐƠN HÀNG & TÀI CHÍNH */}
              <span className="text-[10px] font-bold text-[#A89D8E] uppercase tracking-wider px-3 pt-2 pb-1 select-none">
                ĐƠN HÀNG & TÀI CHÍNH
              </span>
              <button
                type="button"
                onClick={() => setTab('orders')}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer ${
                  currentTab === 'orders'
                    ? 'bg-[#FAF5EB] text-[#B88E4F] font-bold shadow-2xs border border-[#EEDFC6]'
                    : 'text-[#574C3D] hover:bg-[#FAF8F5] hover:text-[#B88E4F] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className={`w-4 h-4 shrink-0 ${currentTab === 'orders' ? 'text-[#B88E4F]' : 'text-[#7D715E] group-hover:text-[#B88E4F]'}`} />
                  <span>Đơn Mua Của Tôi</span>
                </div>
                {(profileData?.stats.pendingOrders ?? 0) > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#C59B58] text-white text-[10px] font-bold shrink-0">
                    {profileData?.stats.pendingOrders}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setTab('wallet')}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer ${
                  currentTab === 'wallet'
                    ? 'bg-[#FAF5EB] text-[#B88E4F] font-bold shadow-2xs border border-[#EEDFC6]'
                    : 'text-[#574C3D] hover:bg-[#FAF8F5] hover:text-[#B88E4F] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wallet className={`w-4 h-4 shrink-0 ${currentTab === 'wallet' ? 'text-[#B88E4F]' : 'text-[#7D715E] group-hover:text-[#B88E4F]'}`} />
                  <span>Ví Mua Sắm SCANMS</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-[#F3EFE6] text-[#B88E4F] border border-[#EEDFC6] text-[9.5px] font-bold uppercase tracking-wider shrink-0">
                  Ví
                </span>
              </button>

              {/* SECTION 2: ƯU ĐÃI & TƯƠNG TÁC */}
              <span className="text-[10px] font-bold text-[#A89D8E] uppercase tracking-wider px-3 pt-3 pb-1 select-none">
                ƯU ĐÃI & TƯƠNG TÁC
              </span>
              <button
                type="button"
                onClick={() => setTab('vouchers')}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer ${
                  currentTab === 'vouchers'
                    ? 'bg-[#FAF5EB] text-[#B88E4F] font-bold shadow-2xs border border-[#EEDFC6]'
                    : 'text-[#574C3D] hover:bg-[#FAF8F5] hover:text-[#B88E4F] font-medium'
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
                    ? 'bg-[#FAF5EB] text-[#B88E4F] font-bold shadow-2xs border border-[#EEDFC6]'
                    : 'text-[#574C3D] hover:bg-[#FAF8F5] hover:text-[#B88E4F] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Heart className={`w-4 h-4 shrink-0 ${currentTab === 'wishlist' ? 'text-[#B88E4F]' : 'text-[#7D715E] group-hover:text-[#B88E4F]'}`} />
                  <span>Sản Phẩm Yêu Thích</span>
                </div>
                {(profileData?.stats.wishlistCount ?? 0) > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#FAF0DD] border border-[#E8D4B0] text-[#8C6226] text-[10px] font-bold shrink-0">
                    {profileData?.stats.wishlistCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setTab('notifications')}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer ${
                  currentTab === 'notifications'
                    ? 'bg-[#FAF5EB] text-[#B88E4F] font-bold shadow-2xs border border-[#EEDFC6]'
                    : 'text-[#574C3D] hover:bg-[#FAF8F5] hover:text-[#B88E4F] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bell className={`w-4 h-4 shrink-0 ${currentTab === 'notifications' ? 'text-[#B88E4F]' : 'text-[#7D715E] group-hover:text-[#B88E4F]'}`} />
                  <span>Thông Báo</span>
                </div>
                {unreadNotifCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#DC2626] text-white text-[10px] font-bold shrink-0">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {/* SECTION 3: TÀI KHOẢN & BẢO MẬT */}
              <span className="text-[10px] font-bold text-[#A89D8E] uppercase tracking-wider px-3 pt-3 pb-1 select-none">
                TÀI KHOẢN & BẢO MẬT
              </span>
              <button
                type="button"
                onClick={() => setTab('profile')}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer ${
                  currentTab === 'profile'
                    ? 'bg-[#FAF5EB] text-[#B88E4F] font-bold shadow-2xs border border-[#EEDFC6]'
                    : 'text-[#574C3D] hover:bg-[#FAF8F5] hover:text-[#B88E4F] font-medium'
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
                    ? 'bg-[#FAF5EB] text-[#B88E4F] font-bold shadow-2xs border border-[#EEDFC6]'
                    : 'text-[#574C3D] hover:bg-[#FAF8F5] hover:text-[#B88E4F] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className={`w-4 h-4 shrink-0 ${currentTab === 'identity' ? 'text-[#B88E4F]' : 'text-[#7D715E] group-hover:text-[#B88E4F]'}`} />
                  <span>Xác Minh CCCD</span>
                </div>
                {cccdVerified && (
                  <span className="text-[9.5px] font-bold text-[#059669] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Đã duyệt
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setTab('addresses')}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer ${
                  currentTab === 'addresses'
                    ? 'bg-[#FAF5EB] text-[#B88E4F] font-bold shadow-2xs border border-[#EEDFC6]'
                    : 'text-[#574C3D] hover:bg-[#FAF8F5] hover:text-[#B88E4F] font-medium'
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
                    ? 'bg-[#FAF5EB] text-[#B88E4F] font-bold shadow-2xs border border-[#EEDFC6]'
                    : 'text-[#574C3D] hover:bg-[#FAF8F5] hover:text-[#B88E4F] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Lock className={`w-4 h-4 shrink-0 ${currentTab === 'security' ? 'text-[#B88E4F]' : 'text-[#7D715E] group-hover:text-[#B88E4F]'}`} />
                  <span>Đổi Mật Khẩu</span>
                </div>
              </button>
            </nav>

            {/* Bottom Actions (SCANMS UI Reference Style matching Sidebar.tsx) */}
            <div className="pt-2 border-t border-[#EAE4D7] flex flex-col gap-1 text-xs sm:text-[13px]">
              <Link
                to="/marketplace"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-medium text-[#7D715E] hover:text-[#B88E4F] hover:bg-[#FAF8F5] transition cursor-pointer group"
                title="Quay lại Sàn Mua Sắm SCANMS"
              >
                <ArrowLeft className="w-4 h-4 text-[#7D715E] group-hover:text-[#B88E4F] transition-colors shrink-0" aria-hidden="true" />
                <Store className="w-4 h-4 text-[#7D715E] group-hover:text-[#B88E4F] shrink-0" />
                <span>Sàn Mua Sắm</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  authService.logout();
                  navigate('/login');
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer text-left w-full"
              >
                <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </aside>

          {/* ========================================================= */}
          {/* RIGHT MAIN PANEL - CONTENT ACCORDING TO ACTIVE TAB */}
          {/* ========================================================= */}
          <div className="flex-1 min-w-0 flex flex-col gap-4 text-left">
            {/* ------------------------------------------------------------- */}
            {/* TAB 1: ĐƠN MUA CỦA TÔI (SCANMS Standard - IMAGE 1) */}
            {/* ------------------------------------------------------------- */}
            {currentTab === 'orders' && (
              <div className="customer-orders">
                <header className="co-heading">
                  <div className="co-heading-main">
                    <span className="co-heading-icon" aria-hidden="true"><ShoppingBag size={21} /></span>
                    <div><h1>Đơn mua</h1><p>Theo dõi và quản lý các đơn hàng của bạn.</p></div>
                  </div>
                  <Link to="/marketplace">Tiếp tục mua sắm <ArrowLeft size={15} className="rotate-180" /></Link>
                </header>
                {/* 1. SCANMS Standard Top Status Filter Tabs Bar (Image 1) */}
                <div className="co-controls bg-white border border-[#EAE4D7] rounded-xl shadow-2xs overflow-hidden">
                  <div className="co-filters" role="group" aria-label="Lọc trạng thái đơn mua">
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
                          onClick={() => setOrderStatusFilter(tab.key as OrderFilterStatus)} aria-pressed={orderStatusFilter === tab.key}
                          className={`relative flex-1 py-3.5 px-3 sm:px-4 text-xs sm:text-sm transition-colors cursor-pointer text-center whitespace-nowrap ${
                            isActive
                              ? 'text-[#C59B58] font-bold'
                              : 'text-[#574C3D] hover:text-[#C59B58] font-medium'
                          }`}
                        >
                          <span>{tab.label}</span>
                          {isActive && (
                            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#C59B58] rounded-t-full shadow-xs" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* 2. SCANMS Standard Search Bar (Image 1) */}
                  <div className="co-search-wrap">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        fetchOrders();
                      }}
                      className="co-search relative flex items-center bg-white border border-[#EAE4D7] focus-within:border-[#C59B58] focus-within:ring-2 focus-within:ring-[#C59B58]/20 rounded-lg px-3 py-2 transition shadow-2xs group"
                    >
                      <Search className="w-4 h-4 text-[#7D715E] group-focus-within:text-[#B88E4F] shrink-0 mr-2.5 transition-colors" />
                      <input
                        type="text"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        aria-label="Tìm đơn mua" placeholder="Tìm theo gian hàng, mã đơn hoặc tên sản phẩm…"
                        className="min-w-0 flex-1 bg-transparent text-xs sm:text-sm text-[#1A1612] placeholder-[#8C7E6C] outline-none font-normal"
                      />
                      {orderSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setOrderSearch('');
                            void fetchOrders('');
                          }}
                          className="p-1 text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] rounded-md transition mr-1 cursor-pointer shrink-0"
                          title="Xóa tìm kiếm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-md bg-[#C59B58] hover:bg-[#B88E4F] text-white font-bold text-xs transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                      >
                        Tìm kiếm
                      </button>
                    </form>
                  </div>
                </div>

                {/* 3. Orders List (SCANMS UI Reference Cards) */}
                {ordersLoading ? (
                  <div className="py-16 bg-white border border-[#EAE4D7] rounded-xl flex flex-col items-center justify-center gap-3 text-[#7D715E]">
                    <Loader2 className="w-8 h-8 text-[#B88E4F] animate-spin" />
                    <span className="text-xs font-semibold">Đang tải danh sách đơn mua...</span>
                  </div>
                ) : ordersError ? (
                  <div className="py-16 bg-white border border-[#EAE4D7] rounded-xl text-center flex flex-col items-center justify-center gap-4 p-6">
                    <div className="w-16 h-16 rounded-full bg-[#FBF5EB] border border-[#EAE4D7] text-[#B88E4F] flex items-center justify-center">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <strong className="text-sm font-bold text-[#1A1612] block">Chưa tải được đơn mua</strong>
                      <p className="text-xs text-[#7D715E] mt-1 max-w-sm m-0">
                        Kiểm tra kết nối rồi thử tải lại. Đơn hàng của bạn vẫn được giữ an toàn trên hệ thống.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void fetchOrders()}
                      className="px-5 py-2.5 rounded-lg bg-[#C59B58] text-white text-xs font-bold hover:bg-[#B88E4F] transition shadow-xs cursor-pointer"
                    >
                      Thử tải lại
                    </button>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-16 bg-white border border-[#EAE4D7] rounded-xl text-center flex flex-col items-center justify-center gap-4 p-6">
                    <div className="w-16 h-16 rounded-full bg-[#FBF5EB] border border-[#EAE4D7] text-[#B88E4F] flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <div>
                      <strong className="text-sm font-bold text-[#1A1612] block">
                        Chưa có đơn hàng nào
                      </strong>
                      <p className="text-xs text-[#7D715E] mt-1 max-w-sm m-0">
                        {orderStatusFilter === 'ALL'
                          ? 'Bạn chưa có đơn mua nào trên SCANMS. Hãy khám phá ngay các sản phẩm chính hãng với nhiều ưu đãi nhé!'
                          : `Không tìm thấy đơn hàng nào ở mục "${orderStatusFilter}".`}
                      </p>
                    </div>
                    <Link
                      to="/marketplace"
                      className="px-5 py-2.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition shadow-xs"
                    >
                      Khám phá sản phẩm ngay
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5">
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

                      return (
                        <div
                          key={order.id}
                          className="co-card bg-white border border-[#EAE4D7] hover:border-[#C59B58]/60 rounded-xl shadow-2xs hover:shadow-xs transition flex flex-col overflow-hidden"
                        >
                          {/* Order Card Header (SCANMS Standard) */}
                          <div className="co-card-header flex flex-wrap items-center justify-between gap-3 p-3.5 sm:px-5 sm:py-3.5 border-b border-[#F0EBE0]">
                            <div className="co-store-group flex items-center flex-wrap gap-2">
                              <Link
                                to={`/shop/${order.store?.slug || order.storeId}`}
                                className="text-xs sm:text-sm font-bold text-[#1A1612] hover:text-[#B88E4F] transition flex items-center gap-1"
                              >
                                <StoreIcon className="w-3.5 h-3.5 text-[#B88E4F]" />
                                <span>{order.store?.name || 'Gian Hàng Đối Tác'}</span>
                              </Link>
                              <span className="text-[11px] font-mono text-[#7D715E] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#EAE4D7]">
                                #{order.externalOrderSn}
                              </span>

                              <div className="flex items-center gap-1.5 ml-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenChat(order)}
                                  className="px-2.5 py-1 rounded-[4px] text-[11px] font-medium text-[#1A1612] bg-white hover:bg-[#FAF8F5] border border-[#EAE4D7] hover:border-[#C59B58]/50 transition flex items-center gap-1 cursor-pointer active:scale-95"
                                  title="Chat ngay với người bán"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-[#B88E4F]" />
                                  <span>Chat</span>
                                </button>

                                <Link
                                  to={`/shop/${order.store?.slug || order.storeId}`}
                                  className="px-2.5 py-1 rounded-[4px] text-[11px] font-medium text-[#7D715E] hover:text-[#1A1612] bg-white hover:bg-[#FAF8F5] border border-[#EAE4D7] hover:border-[#C59B58]/50 transition flex items-center gap-1 active:scale-95"
                                >
                                  <StoreIcon className="w-3.5 h-3.5 text-[#7D715E]" />
                                  <span>Xem Shop</span>
                                </Link>
                              </div>
                            </div>

                            <div className={`co-status flex items-center gap-2${isCancelled ? ' is-cancelled' : ''}`}>
                              {hasReturnRequest ? (
                                <><RotateCcw size={13} /><span>{order.returnRequest?.status === 'SHOP_APPROVED' ? 'Shop đã duyệt · chờ xử lý tiền/hàng'
                                  : order.returnRequest?.status === 'SHOP_REJECTED' ? 'Shop đã từ chối đổi trả'
                                  : order.returnRequest?.status === 'REFUNDED' ? 'Đã hoàn tiền'
                                  : 'Đang xử lý trả hàng'}</span></>
                              ) : isCancelled ? (
                                <><XCircle size={13} /><span>Đã hủy đơn</span></>
                              ) : isCompleted ? (
                                <><CheckCircle2 size={13} /><span>Hoàn thành</span></>
                              ) : isDelivered ? (
                                <><CheckCircle2 size={13} /><span>Đã giao hàng</span></>
                              ) : isShipping ? (
                                <><Truck size={13} /><span>Đang vận chuyển</span></>
                              ) : isPending ? (
                                <><Clock size={13} /><span>Chờ xác nhận</span></>
                              ) : (
                                <><Clock size={13} /><span>Đang xử lý</span></>
                              )}
                            </div>
                          </div>
                          {order.returnRequest?.shopResponse && (
                            <div className="mx-3.5 sm:mx-5 mt-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs text-[#1A1612]">
                              <strong>Phản hồi của Shop:</strong> {order.returnRequest.shopResponse}
                            </div>
                          )}

                          {/* Order Items List (SCANMS Standard) */}
                          <div className="co-items divide-y divide-[#F5EFE6] px-3.5 sm:px-5">
                            {order.orderItems.map((item) => (
                              <div key={item.id} className="co-item py-3.5 flex items-start gap-3.5">
                                <div className="co-product-image w-20 h-20 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] overflow-hidden shrink-0 flex items-center justify-center">
                                  <img
                                    src={getSafeProductImageUrl(item.product?.imageUrl, item.product?.title)}
                                    alt={item.product?.title || 'Sản phẩm'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.currentTarget as HTMLImageElement;
                                      if (!target.dataset.hasFallback) {
                                        target.dataset.hasFallback = 'true';
                                        target.src = getSafeProductImageUrl(null, item.product?.title);
                                      }
                                    }}
                                  />
                                </div>

                                <div className="co-product-info min-w-0 flex-1">
                                  <strong className="block text-xs sm:text-sm font-medium text-[#1A1612] line-clamp-2 leading-snug hover:text-[#B88E4F] transition">
                                    {item.product?.title || 'Sản phẩm chính hãng SCANMS'}
                                  </strong>
                                  {item.variant?.name && (
                                    <span className="text-xs text-[#7D715E] block mt-1">
                                      Phân loại hàng: {item.variant.name}
                                    </span>
                                  )}
                                  <span className="text-xs text-[#7D715E] block mt-0.5">
                                    x{item.quantity}
                                  </span>
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenChat(order, item)}
                                      className="inline-flex items-center gap-1 text-[11px] text-[#7D715E] hover:text-[#C59B58] font-medium transition cursor-pointer hover:underline"
                                      title="Trao đổi với người bán về sản phẩm này"
                                    >
                                      <MessageCircle className="w-3 h-3 text-[#B88E4F]" />
                                      <span>Chat về sản phẩm</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="co-product-price text-xs sm:text-sm font-semibold text-[#1A1612] font-mono">
                                    {formatMoney(Number(item.unitPrice) * item.quantity)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Dispute / Return Banner if Returned */}
                          {isReturned && (
                            <div className="mx-3.5 sm:mx-5 my-2.5 p-3 rounded-lg bg-amber-50/90 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <strong className="font-bold text-amber-950">Yêu cầu Trả hàng / Hoàn tiền đang được xử lý</strong>
                                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">ĐANG XÉT DUYỆT</span>
                                </div>
                                <p className="mt-1 text-amber-800/90 leading-relaxed m-0">
                                  {order.overrideReason || (order.rawPayload?.dispute?.reason ? `Lý do: ${order.rawPayload.dispute.reason}` : 'Hệ thống SCANMS đang chuyển yêu cầu tới gian hàng đối tác và trọng tài sàn.')}
                                </p>
                                <span className="text-[11px] text-amber-700 font-mono mt-1.5 block">
                                  Số tiền hoàn dự kiến: <strong className="text-amber-950 font-bold">{formatMoney(order.finalAmount)}</strong>
                                </span>

                                {/* Display uploaded proof images & videos */}
                                {(order.rawPayload?.dispute?.customerProofImages?.length > 0 || order.rawPayload?.dispute?.customerProofVideos?.length > 0) && (
                                  <div className="mt-2.5 pt-2 border-t border-amber-200/80 flex items-center gap-2 overflow-x-auto">
                                    <span className="text-[11px] font-bold text-amber-950 shrink-0">Bằng chứng khui hàng:</span>
                                    {order.rawPayload.dispute.customerProofImages?.map((url: string, idx: number) => (
                                      <a
                                        key={`img-${idx}`}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-12 h-12 rounded-lg border border-amber-300 overflow-hidden shrink-0 hover:opacity-90 block bg-white"
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
                                        className="h-12 px-3 rounded-lg bg-amber-900 text-white text-[11px] font-bold flex items-center gap-1.5 shrink-0 hover:bg-amber-800 transition"
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

                          {/* Order Footer: Summary & Action Buttons (Image 1 Style) */}
                          <div className="co-footer p-3.5 sm:px-5 sm:py-4 bg-[#FAF8F5]/80 border-t border-[#F0EBE0] flex flex-col gap-3">
                            <div className="co-summary flex flex-wrap items-center justify-between gap-2">
                              <div className="text-xs text-[#7D715E]">
                                {isCancelled ? (
                                  <span className="text-[#DC2626] font-medium">Đơn đã hủy</span>
                                ) : isReturned ? (
                                  <span className="text-amber-700 font-medium">Mã đơn: <strong className="font-mono text-[#1A1612]">#{order.externalOrderSn}</strong> • Đang xử lý hoàn tiền</span>
                                ) : (
                                  <span>Mã đơn: <strong className="font-mono text-[#1A1612]">#{order.externalOrderSn}</strong> • Đặt lúc: {new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                                )}
                              </div>

                              <div className="co-total flex items-center gap-2">
                                <span className="text-xs sm:text-sm text-[#7D715E]">Thành tiền:</span>
                                <strong className="text-lg sm:text-xl font-bold text-[#C59B58] font-mono">
                                  {formatMoney(order.finalAmount)}
                                </strong>
                              </div>
                            </div>

                            {/* Action Buttons Row (SCANMS Standard) */}
                            <div className="co-actions flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-[#EAE4D7]/70">
                              {/* Primary Button: Mua lại */}
                              <button
                                type="button"
                                onClick={() => handleReorder(order)}
                                className="co-primary px-5 sm:px-6 py-2 rounded-md bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Mua lại</span>
                              </button>

                              {/* Secondary Button: Xem chi tiết */}
                              <button
                                type="button"
                                onClick={() => setSelectedOrderDetails(order)}
                                className="px-4 py-2 rounded-md bg-white hover:bg-[#FAF8F5] border border-[#EAE4D7] hover:border-[#C59B58]/50 text-xs font-medium text-[#1A1612] transition cursor-pointer"
                              >
                                {isCancelled ? 'Chi tiết hủy đơn' : isReturned ? 'Chi tiết đổi trả' : 'Chi tiết đơn'}
                              </button>

                              {/* Cancel Button if Pending */}
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => setCancellingOrderId(order.id)}
                                  className="px-4 py-2 rounded-md bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-medium text-rose-700 transition cursor-pointer"
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
                                  className="co-primary px-4 py-2 rounded-md bg-[#C59B58] hover:bg-[#B88E4F] disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                >
                                  {confirmingOrderId === order.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                  <span>Đã nhận hàng</span>
                                </button>
                              )}

                              {/* Return Request Button */}
                              {canRequestReturn && (
                                <button
                                  type="button"
                                  onClick={() => setReturnOrder(order)}
                                  className="co-return px-4 py-2 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs font-semibold text-amber-800 transition cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                                  <span>Trả hàng / Hoàn tiền</span>
                                </button>
                              )}

                              {/* Verified Review Button if Completed */}
                              {isCompleted && !hasReturnRequest && (
                                <button
                                  type="button"
                                  onClick={() => setReviewOrder(order)}
                                  className="px-4 py-2 rounded-md bg-[#231D15] hover:bg-[#1A1612] text-white text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-[#C59B58]" />
                                  <span>Đánh giá sản phẩm</span>
                                </button>
                              )}
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
              <section className="customer-address-book">
                <div className="address-book-header">
                  <div>
                    <span className="address-book-eyebrow">TÀI KHOẢN CỦA BẠN</span>
                    <h1>
                      Sổ Địa Chỉ Nhận Hàng
                    </h1>
                    <p>
                      Lưu địa chỉ để hoàn tất đơn hàng nhanh chóng hơn.
                    </p>
                  </div>
                  <div className="address-header-actions">
                    {!addressesLoading && addresses.length > 0 && (
                      <span className="address-count">{addresses.length} địa chỉ</span>
                    )}
                    <button type="button" onClick={openAddAddressModal} className="address-add-button">
                      <Plus size={17} aria-hidden="true" />
                      <span>Thêm địa chỉ</span>
                    </button>
                  </div>
                </div>

                {addressesLoading ? (
                  <div className="address-empty-state" aria-live="polite">
                    <Loader2 className="animate-spin" size={25} aria-hidden="true" />
                    <span>Đang tải sổ địa chỉ…</span>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="address-empty-state">
                    <span className="address-empty-icon" aria-hidden="true"><MapPin size={23} /></span>
                    <div>
                      <strong>Chưa có địa chỉ nhận hàng</strong>
                      <p>Thêm địa chỉ đầu tiên để thuận tiện hơn khi đặt mua.</p>
                    </div>
                    <button type="button" onClick={openAddAddressModal} className="address-empty-button">
                      <Plus size={15} aria-hidden="true" /> Thêm địa chỉ
                    </button>
                  </div>
                ) : (
                  <div className="address-list">
                    {addresses.map((addr) => (
                      <article key={addr.id} className={`address-card${addr.isDefault ? ' is-default' : ''}`}>
                        <div className="address-card-content">
                          <div className="address-recipient-row">
                            <div className="address-recipient">
                              <strong>{addr.fullName}</strong>
                              <span>{addr.phoneNumber}</span>
                            </div>
                            {addr.isDefault && (
                              <span className="address-default-badge">Mặc định</span>
                            )}
                          </div>
                          <p className="address-detail">{addr.detailAddress}</p>
                          <p className="address-region">{addr.wardName}, {addr.districtName}, {addr.provinceName}</p>
                        </div>

                        <div className="address-card-footer">
                          {!addr.isDefault ? (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              className="address-set-default"
                            >
                              Đặt làm mặc định
                            </button>
                          ) : (
                            <span className="address-primary-status">
                              <CheckCircle2 size={15} aria-hidden="true" />
                              <span>Địa chỉ giao chính</span>
                            </span>
                          )}

                          <div className="address-card-actions">
                            <button
                              type="button"
                              onClick={() => openEditAddressModal(addr)}
                              title="Sửa địa chỉ"
                              aria-label={`Sửa địa chỉ của ${addr.fullName}`}
                              className="address-icon-button"
                            >
                              <Edit2 size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setAddressPendingDeletion(addr)}
                              title="Xóa địa chỉ"
                              aria-label={`Xóa địa chỉ của ${addr.fullName}`}
                              className="address-icon-button is-danger"
                            >
                              <Trash2 size={15} aria-hidden="true" />
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
              <div className="bg-white border border-[#EAE4D7] rounded-xl p-6 sm:p-8 shadow-2xs text-left">
                {/* Header */}
                <div className="pb-4 border-b border-[#EAE4D7]">
                  <h1 className="text-xl font-bold text-[#1A1612] m-0 font-display">
                    Hồ Sơ Của Tôi
                  </h1>
                  <p className="text-xs text-[#7D715E] mt-1 m-0">
                    Quản lý thông tin hồ sơ để bảo mật tài khoản
                  </p>
                </div>

                {/* Form & Avatar Body */}
                <div className="pt-6 flex flex-col-reverse md:flex-row items-start gap-8 lg:gap-12">
                  {/* Left Column: Form Fields (SCANMS UI Reference) */}
                  <form onSubmit={handleUpdateProfile} className="flex-1 w-full space-y-5">
                    {/* 1. Tên đăng nhập */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                      <label className="sm:w-32 sm:text-right text-xs text-[#7D715E] font-medium shrink-0">
                        Tên đăng nhập
                      </label>
                      <div className="flex-1">
                        <span className="text-xs sm:text-sm text-[#1A1612] font-semibold">
                          {username}
                        </span>
                        <p className="text-[11px] text-[#A89D8E] mt-0.5 m-0">
                          Tên đăng nhập chỉ có thể thay đổi một lần.
                        </p>
                      </div>
                    </div>

                    {/* 2. Tên */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                      <label className="sm:w-32 sm:text-right text-xs text-[#7D715E] font-medium shrink-0">
                        Tên
                      </label>
                      <div className="flex-1 max-w-md">
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          required
                          placeholder="Nhập họ và tên"
                          className="w-full bg-white border border-[#EAE4D7] focus:border-[#C59B58] focus:ring-1 focus:ring-[#C59B58] rounded-md px-3.5 py-2 text-xs sm:text-sm text-[#1A1612] outline-none transition"
                        />
                      </div>
                    </div>

                    {/* 3. Email */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                      <label className="sm:w-32 sm:text-right text-xs text-[#7D715E] font-medium shrink-0">
                        Email
                      </label>
                      <div className="flex-1 flex items-center gap-3">
                        <span className="text-xs sm:text-sm text-[#1A1612]">
                          {maskEmail(profileData?.user.email || currentUser?.email)}
                        </span>
                        <button
                          type="button"
                          onClick={() => toast.info('Email đã được bảo mật theo chuẩn định danh')}
                          className="text-xs text-blue-600 hover:text-blue-700 underline font-medium cursor-pointer"
                        >
                          Thay Đổi
                        </button>
                      </div>
                    </div>

                    {/* 4. Số điện thoại */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                      <label className="sm:w-32 sm:text-right text-xs text-[#7D715E] font-medium shrink-0">
                        Số điện thoại
                      </label>
                      <div className="flex-1">
                        {isEditingPhone ? (
                          <div className="flex items-center gap-2 max-w-xs">
                            <input
                              type="tel"
                              value={phoneInput}
                              onChange={(e) => setPhoneInput(e.target.value)}
                              placeholder="0912345678"
                              className="w-full bg-white border border-[#C59B58] rounded-md px-3 py-1.5 text-xs text-[#1A1612] outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => setIsEditingPhone(false)}
                              className="px-2.5 py-1.5 rounded bg-[#FAF5EB] text-xs font-semibold text-[#8C6226] border border-[#EEDFC6] hover:bg-[#C59B58] hover:text-white transition cursor-pointer shrink-0"
                            >
                              Xong
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-xs sm:text-sm text-[#1A1612]">
                              {phoneInput ? maskPhone(phoneInput) : 'Chưa cập nhật'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsEditingPhone(true)}
                              className="text-xs text-blue-600 hover:text-blue-700 underline font-medium cursor-pointer"
                            >
                              Thay Đổi
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 5. Giới tính */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                      <label className="sm:w-32 sm:text-right text-xs text-[#7D715E] font-medium shrink-0 flex items-center sm:justify-end gap-1">
                        <span>Giới tính</span>
                        <HelpCircle className="w-3 h-3 text-[#A89D8E]" />
                      </label>
                      <div className="flex items-center gap-5 text-xs sm:text-sm text-[#1A1612]">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            checked={gender === 'MALE'}
                            onChange={() => setGender('MALE')}
                            className="accent-[#C59B58] w-4 h-4 cursor-pointer"
                          />
                          <span>Nam</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            checked={gender === 'FEMALE'}
                            onChange={() => setGender('FEMALE')}
                            className="accent-[#C59B58] w-4 h-4 cursor-pointer"
                          />
                          <span>Nữ</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            checked={gender === 'OTHER'}
                            onChange={() => setGender('OTHER')}
                            className="accent-[#C59B58] w-4 h-4 cursor-pointer"
                          />
                          <span>Khác</span>
                        </label>
                      </div>
                    </div>

                    {/* 6. Ngày sinh */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                      <label className="sm:w-32 sm:text-right text-xs text-[#7D715E] font-medium shrink-0 flex items-center sm:justify-end gap-1">
                        <span>Ngày sinh</span>
                        <HelpCircle className="w-3 h-3 text-[#A89D8E]" />
                      </label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={birthDay}
                          onChange={(e) => setBirthDay(e.target.value)}
                          className="w-28 text-xs font-semibold"
                        >
                          {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => (
                            <option key={d} value={d}>
                              Ngày {d}
                            </option>
                          ))}
                        </Select>
                        <Select
                          value={birthMonth}
                          onChange={(e) => setBirthMonth(e.target.value)}
                          className="w-28 text-xs font-semibold"
                        >
                          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                            <option key={m} value={m}>
                              Tháng {m}
                            </option>
                          ))}
                        </Select>
                        <Select
                          value={birthYear}
                          onChange={(e) => setBirthYear(e.target.value)}
                          className="w-28 text-xs font-semibold"
                        >
                          {Array.from({ length: 70 }, (_, i) => String(2015 - i)).map((y) => (
                            <option key={y} value={y}>
                              Năm {y}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    {/* 7. Nút Lưu (SCANMS Standard) */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 pt-3">
                      <div className="sm:w-32 shrink-0" />
                      <button
                        type="submit"
                        disabled={updatingProfile || profileLoading}
                        className="px-8 py-2.5 rounded-md bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs sm:text-sm font-semibold transition cursor-pointer shadow-xs flex items-center justify-center gap-2 self-start"
                      >
                        {(updatingProfile || profileLoading) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Lưu</span>
                      </button>
                    </div>
                  </form>

                  {/* Vertical Divider */}
                  <div className="hidden md:block w-px bg-[#EAE4D7] self-stretch mx-2" />

                  {/* Right Column: Avatar Upload (SCANMS UI Reference) */}
                  <div className="w-full md:w-64 flex flex-col items-center justify-center py-4 px-2">
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="w-28 h-28 rounded-full border border-[#EAE4D7] bg-[#FAF8F5] overflow-hidden flex items-center justify-center relative shadow-xs cursor-pointer group hover:border-[#C59B58] transition"
                        title="Bấm để chọn ảnh đại diện mới"
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="w-8 h-8 text-[#B88E4F] animate-spin" />
                        ) : profileData?.user.avatarUrl || currentUser?.avatarUrl ? (
                          <img
                            src={profileData?.user.avatarUrl || currentUser?.avatarUrl || ''}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-12 h-12 text-[#A89D8E]" />
                        )}
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                          <Camera className="w-5 h-5 text-white drop-shadow" />
                          <span className="text-[10px] font-bold mt-1">Đổi ảnh</span>
                        </div>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="mt-4 px-5 py-2 rounded-md border border-[#EAE4D7] hover:border-[#C59B58] bg-white hover:bg-[#FAF8F5] text-xs font-medium text-[#1A1612] hover:text-[#C59B58] transition cursor-pointer shadow-2xs"
                    >
                      {uploadingAvatar ? 'Đang tải...' : 'Chọn Ảnh'}
                    </button>

                    <div className="mt-3 text-center text-[11px] text-[#7D715E] leading-relaxed space-y-0.5">
                      <p className="m-0">Dụng lượng file tối đa 1 MB</p>
                      <p className="m-0">Định dạng:.JPEG, .PNG</p>
                    </div>
                  </div>
                </div>
              </div>
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
              <section className="customer-identity-card" aria-labelledby="customer-identity-title">
                <header className="identity-header">
                  <div className="identity-heading-icon" aria-hidden="true"><User size={20} /></div>
                  <div className="identity-heading-copy">
                    <span className="identity-eyebrow">HỒ SƠ CÁ NHÂN</span>
                    <div className="identity-title-row">
                      <h1 id="customer-identity-title">Thông tin cá nhân</h1>
                      {cccdVerified && (
                        <span className="identity-verified-badge">
                          <CheckCircle2 size={14} aria-hidden="true" />
                          Đã xác thực
                        </span>
                      )}
                    </div>
                    <p>
                      Nhập thông tin trùng khớp với CCCD để đơn hàng được thông quan theo quy định từ ngày 9/7.
                      Thông tin được bảo mật theo Chính sách Bảo mật SCANMS.
                    </p>
                </header>

                <div className="identity-form-content">
                  {loadingIdentity ? (
                    <div className="identity-loading" aria-live="polite">
                      <Loader2 className="animate-spin" size={24} aria-hidden="true" />
                      <span>Đang tải thông tin cá nhân…</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitIdentity} className="identity-form">
                      <div className="identity-field">
                        <label htmlFor="customer-identity-name">Họ và tên <span>*</span></label>
                        <input
                          id="customer-identity-name"
                          type="text"
                          autoComplete="name"
                          value={cccdFullName}
                          onChange={(e) => setCccdFullName(e.target.value)}
                          placeholder="Nhập họ và tên trên CCCD"
                        />
                      </div>

                      <div className="identity-field">
                        <label htmlFor="customer-identity-number">Số CCCD <span>*</span></label>
                        <input
                          id="customer-identity-number"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={12}
                          value={cccdIdNumber}
                          onChange={(e) => setCccdIdNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="Nhập 12 chữ số trên CCCD"
                        />
                        <span className="identity-field-hint">Dùng số định danh cá nhân trên CCCD.</span>
                      </div>

                      <div className="identity-field identity-field-wide">
                        <label htmlFor="customer-identity-address">Địa chỉ thường trú <span>*</span></label>
                        <input
                          id="customer-identity-address"
                          type="text"
                          autoComplete="street-address"
                          maxLength={200}
                          value={cccdAddress}
                          onChange={(e) => setCccdAddress(e.target.value)}
                          placeholder="Nhập địa chỉ thường trú trên CCCD"
                          aria-describedby="customer-identity-address-count"
                        />
                        <span className="identity-field-hint identity-character-count" id="customer-identity-address-count">
                          {cccdAddress.length}/200 ký tự
                        </span>
                      </div>

                      <div className="identity-form-footer">
                        <span className="identity-privacy-note">
                          <Lock size={14} aria-hidden="true" />
                          Vui lòng nhập thông tin chính xác như trên CCCD.
                        </span>
                        <button
                          type="submit"
                          disabled={
                            submittingIdentity ||
                            !cccdFullName.trim() ||
                            !cccdIdNumber.trim() ||
                            !cccdAddress.trim()
                          }
                          className="identity-submit"
                        >
                          {submittingIdentity && <Loader2 className="animate-spin" size={16} aria-hidden="true" />}
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
            {/* TAB: ĐỔI MẬT KHẨU & BẢO MẬT */}
            {/* ------------------------------------------------------------- */}
            {/* ------------------------------------------------------------- */}
            {/* TAB: ĐỔI MẬT KHẨU & BẢO MẬT (Chuẩn SCANMS XÁC THỰC EMAIL) */}
            {/* ------------------------------------------------------------- */}
            {currentTab === 'security' && (
              <div className="customer-security">
                {/* 1. MÀN HÌNH CHỌN PHƯƠNG THỨC XÁC MINH (Chuẩn SCANMS Ảnh 2) */}
                {securityMode === 'VERIFY_METHOD' && (
                  <div className="security-method-page">
                    <header className="security-page-heading">
                      <span className="security-heading-icon" aria-hidden="true"><Shield size={20} /></span>
                      <div>
                        <span className="security-eyebrow">TÀI KHOẢN SCANMS</span>
                        <h1>Bảo mật tài khoản</h1>
                        <p>Xác minh danh tính để bảo vệ quyền truy cập và thông tin của bạn.</p>
                      </div>
                    </header>

                    <div className="security-method-layout">
                      <section className="security-method-card" aria-labelledby="security-method-title">
                        <div className="security-method-intro">
                          <div className="security-card-icon" aria-hidden="true"><Mail size={21} /></div>
                          <div>
                            <span className="security-card-kicker">XÁC MINH AN TOÀN</span>
                            <h2 id="security-method-title">Chọn cách xác minh</h2>
                          </div>
                        </div>
                        <p className="security-card-description">
                          Xác minh email để tiếp tục bảo vệ tài khoản và thiết lập mật khẩu của bạn.
                        </p>
                        <p className="security-email-destination">
                          Gửi đến <strong>{maskedSecurityEmail || maskEmail(currentUser?.email)}</strong>
                        </p>

                        <button
                          type="button"
                          onClick={handleSendSecurityOtp}
                          disabled={sendingSecurityOtp}
                          className="security-email-button"
                        >
                          {sendingSecurityOtp ? (
                            <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                          ) : (
                            <Mail size={18} aria-hidden="true" />
                          )}
                          <span>{sendingSecurityOtp ? 'Đang gửi email xác minh…' : 'Gửi liên kết / mã OTP qua Email'}</span>
                        </button>

                        <div className="security-direct-change">
                          <Lock size={15} aria-hidden="true" />
                          <button type="button" onClick={() => setSecurityMode('DIRECT_CHANGE')}>
                            Đã có mật khẩu? Đổi bằng mật khẩu hiện tại
                            <span aria-hidden="true"> →</span>
                          </button>
                        </div>
                      </section>

                      <aside className="security-help-card" aria-labelledby="security-help-title">
                        <div className="security-help-heading">
                          <span className="security-help-icon" aria-hidden="true"><HelpCircle size={17} /></span>
                          <div>
                            <span className="security-eyebrow">CẦN HỖ TRỢ?</span>
                            <h2 id="security-help-title">Trợ giúp xác minh</h2>
                          </div>
                        </div>
                        <div className="security-faq-item">
                          <h3>Vì sao cần xác minh tài khoản?</h3>
                          <p>SCANMS xác minh để bảo đảm chỉ bạn có thể đăng nhập và thay đổi thông tin bảo mật.</p>
                        </div>
                        <div className="security-faq-item">
                          <h3>Nếu tôi không nhận được email thì sao?</h3>
                          <p>Kiểm tra thư mục Spam. Nếu vẫn chưa nhận được, hãy liên hệ CSKH qua Chat hỗ trợ để được trợ giúp.</p>
                        </div>
                      </aside>
                    </div>
                  </div>
                )}

                {/* 2. MÀN HÌNH CHỜ NHẬP MÃ OTP GỬI QUA EMAIL */}
                {securityMode === 'AWAIT_OTP' && (
                  <div className="bg-white border border-[#EAE4D7] rounded-2xl p-6 sm:p-8 shadow-2xs text-center flex flex-col items-center relative">
                    <button
                      type="button"
                      onClick={() => setSecurityMode('VERIFY_METHOD')}
                      className="absolute left-5 top-5 p-2 rounded-xl text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5] border border-transparent hover:border-[#EAE4D7] transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Quay lại</span>
                    </button>

                    <h2 className="text-base sm:text-lg font-black text-[#1A1612] m-0 font-display mt-2 sm:mt-0">
                      Nhập mã xác thực
                    </h2>
                    <p className="text-xs text-[#7D715E] mt-1.5 max-w-sm">
                      Mã 6 số đã được gửi đến:
                    </p>
                    <strong className="text-xs sm:text-sm font-bold text-[#1A1612] bg-[#FAF8F5] px-3 py-1 rounded-lg border border-[#EAE4D7] mt-1 inline-block">
                      {maskedSecurityEmail || maskEmail(currentUser?.email)}
                    </strong>

                    {/* Envelope Icon */}
                    <div className="w-14 h-14 rounded-full bg-[#FAF5EB] border border-[#EEDFC6] text-[#C59B58] flex items-center justify-center my-5 shadow-xs">
                      <Mail className="w-7 h-7 text-[#C59B58]" />
                    </div>

                    <form onSubmit={handleVerifySecurityOtp} className="w-full max-w-xs flex flex-col gap-4">
                      <div>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          autoFocus
                          value={securityOtp}
                          onChange={(e) => setSecurityOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••••"
                          className="w-full text-center tracking-[0.5em] font-mono text-2xl font-black py-3 px-4 border-2 border-[#EAE4D7] focus:border-[#C59B58] focus:ring-4 focus:ring-[#C59B58]/15 rounded-xl outline-none transition bg-white text-[#1A1612]"
                        />
                      </div>

                      <div className="text-xs text-[#7D715E]">
                        {otpCountdown > 0 ? (
                          <span>
                            Gửi lại sau <strong className="text-[#C59B58] font-bold">{otpCountdown}</strong>s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendSecurityOtp}
                            disabled={sendingSecurityOtp}
                            className="text-[#C59B58] hover:text-[#B88E4F] font-bold underline transition cursor-pointer"
                          >
                            {sendingSecurityOtp ? 'Đang gửi...' : 'Gửi lại mã OTP'}
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={verifyingSecurityOtp || securityOtp.length < 6}
                        className="mt-2 py-2.5 px-6 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-xs flex items-center justify-center gap-2"
                      >
                        {verifyingSecurityOtp && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>Xác nhận</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* 3. MÀN HÌNH THIẾT LẬP MẬT KHẨU MỚI (Sau khi xác thực Email) */}
                {securityMode === 'SET_NEW_PASSWORD' && (
                  <div className="bg-white border border-[#EAE4D7] rounded-2xl p-6 sm:p-8 shadow-2xs text-left flex flex-col gap-6">
                    <div className="pb-4 border-b border-[#EAE4D7]">
                      <h1 className="text-xl sm:text-2xl font-black text-[#1A1612] m-0 font-display flex items-center gap-2">
                        <KeyRound className="w-6 h-6 text-[#C59B58]" />
                        <span>Thiết Lập Mật Khẩu Mới</span>
                      </h1>
                      <p className="text-xs text-[#7D715E] mt-1 m-0">
                        Nhập mật khẩu mới (tối thiểu 6 ký tự)
                      </p>
                    </div>

                    <form onSubmit={handleSaveNewPasswordWithOtp} className="flex flex-col gap-4">
                      {/* Hidden username input for Browser Password Managers (Edge, Chrome) */}
                      <input
                        type="email"
                        name="username"
                        value={currentUser?.email || ''}
                        autoComplete="username"
                        readOnly
                        tabIndex={-1}
                        aria-hidden="true"
                        className="sr-only"
                        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }}
                      />
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
                          autoComplete="new-password"
                          placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
                          className="w-full bg-white border border-[#EAE4D7] focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 rounded-lg px-3.5 py-2.5 text-xs text-[#1A1612] outline-none transition"
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
                          autoComplete="new-password"
                          placeholder="Nhập lại mật khẩu mới..."
                          className="w-full bg-white border border-[#EAE4D7] focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 rounded-lg px-3.5 py-2.5 text-xs text-[#1A1612] outline-none transition"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={settingNewPassword}
                        className="mt-2 py-3 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-xs flex items-center justify-center gap-2"
                      >
                        {settingNewPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>Lưu Mật Khẩu Mới</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* 4. MÀN HÌNH ĐỔI TRỰC TIẾP BẰNG MẬT KHẨU CŨ */}
                {securityMode === 'DIRECT_CHANGE' && (
                  <div className="bg-white border border-[#EAE4D7] rounded-2xl p-6 sm:p-8 shadow-2xs text-left flex flex-col gap-6">
                    <div className="pb-4 border-b border-[#EAE4D7]">
                      <h1 className="text-xl sm:text-2xl font-black text-[#1A1612] m-0 font-display flex items-center gap-2">
                        <Lock className="w-6 h-6 text-[#C59B58]" />
                        <span>Đổi Mật Khẩu Bằng Mật Khẩu Hiện Tại</span>
                      </h1>
                      <p className="text-xs text-[#7D715E] mt-1 m-0">
                        Để bảo vệ tài khoản, vui lòng không chia sẻ mật khẩu cho người khác
                      </p>
                    </div>

                    <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                      {/* Hidden username input for Browser Password Managers (Edge, Chrome) */}
                      <input
                        type="email"
                        name="username"
                        value={currentUser?.email || ''}
                        autoComplete="username"
                        readOnly
                        tabIndex={-1}
                        aria-hidden="true"
                        className="sr-only"
                        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }}
                      />
                      <div>
                        <label className="text-xs font-bold text-[#1A1612] block mb-1.5">
                          Mật khẩu hiện tại
                        </label>
                        <input
                          type="password"
                          value={currentPass}
                          onChange={(e) => setCurrentPass(e.target.value)}
                          required
                          autoComplete="current-password"
                          placeholder="Nhập mật khẩu hiện tại..."
                          className="w-full bg-white border border-[#EAE4D7] focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 rounded-lg px-3.5 py-2.5 text-xs text-[#1A1612] outline-none transition"
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
                          autoComplete="new-password"
                          placeholder="Tối thiểu 6 ký tự..."
                          className="w-full bg-white border border-[#EAE4D7] focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 rounded-lg px-3.5 py-2.5 text-xs text-[#1A1612] outline-none transition"
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
                          autoComplete="new-password"
                          placeholder="Nhập lại mật khẩu mới..."
                          className="w-full bg-white border border-[#EAE4D7] focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 rounded-lg px-3.5 py-2.5 text-xs text-[#1A1612] outline-none transition"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={updatingPassword}
                        className="mt-2 py-3 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-xs flex items-center justify-center gap-2"
                      >
                        {updatingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Xác nhận đổi mật khẩu</span>
                      </button>

                      <div className="text-center pt-3 border-t border-[#F0EBE0]">
                        <button
                          type="button"
                          onClick={() => setSecurityMode('VERIFY_METHOD')}
                          className="text-xs text-[#C59B58] hover:text-[#B88E4F] font-bold transition cursor-pointer"
                        >
                          Quên mật khẩu cũ hoặc đăng ký bằng Google? Xác minh qua Email →
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
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
          className="fixed inset-0 z-[70] bg-[#231D15]/55 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
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
            className="w-full max-w-md overflow-hidden rounded-3xl border border-[#EAE4D7] bg-white shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="p-6 sm:p-7 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>

              <h2 id="delete-address-title" className="mt-4 text-lg font-black text-[#1A1612]">
                Xóa địa chỉ nhận hàng?
              </h2>
              <p id="delete-address-description" className="mt-2 text-xs leading-relaxed text-[#7D715E]">
                Địa chỉ này sẽ bị xóa khỏi sổ địa chỉ của bạn. Thao tác này không thể hoàn tác.
              </p>

              <div className="mt-5 rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-left">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm font-black text-[#1A1612] truncate">
                    {addressPendingDeletion.fullName}
                  </strong>
                  <span className="text-[11px] font-semibold text-[#7D715E] shrink-0">
                    {addressPendingDeletion.phoneNumber}
                  </span>
                </div>
                <p className="m-0 mt-2 text-xs font-semibold text-[#1A1612]">
                  {addressPendingDeletion.detailAddress}
                </p>
                <p className="m-0 mt-1 text-[11px] leading-relaxed text-[#7D715E]">
                  {addressPendingDeletion.wardName}, {addressPendingDeletion.districtName}, {addressPendingDeletion.provinceName}
                </p>
                {addressPendingDeletion.isDefault && (
                  <span className="inline-flex mt-3 rounded-full border border-[#EEDFC6] bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#B88E4F]">
                    Địa chỉ mặc định
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-[#EAE4D7] bg-[#FAF8F5] p-4 sm:px-7">
              <button
                type="button"
                disabled={isDeletingAddress}
                onClick={() => setAddressPendingDeletion(null)}
                className="rounded-xl border border-[#EAE4D7] bg-white px-4 py-2.5 text-xs font-bold text-[#7D715E] transition hover:bg-[#F3EFE6] hover:text-[#1A1612] disabled:opacity-50"
              >
                Giữ lại địa chỉ
              </button>
              <button
                type="button"
                disabled={isDeletingAddress}
                onClick={handleDeleteAddress}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isDeletingAddress ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
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
      {/* MODAL: XÁC NHẬN XÓA ĐỊA CHỈ */}
      {/* ========================================================= */}
      {addressPendingDeletion && (
        <div
          className="fixed inset-0 z-[70] bg-[#231D15]/55 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
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
            className="w-full max-w-md overflow-hidden rounded-3xl border border-[#EAE4D7] bg-white shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="p-6 sm:p-7 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>

              <h2 id="delete-address-title" className="mt-4 text-lg font-black text-[#1A1612]">
                Xóa địa chỉ nhận hàng?
              </h2>
              <p id="delete-address-description" className="mt-2 text-xs leading-relaxed text-[#7D715E]">
                Địa chỉ này sẽ bị xóa khỏi sổ địa chỉ của bạn. Thao tác này không thể hoàn tác.
              </p>

              <div className="mt-5 rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-left">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm font-black text-[#1A1612] truncate">
                    {addressPendingDeletion.fullName}
                  </strong>
                  <span className="text-[11px] font-semibold text-[#7D715E] shrink-0">
                    {addressPendingDeletion.phoneNumber}
                  </span>
                </div>
                <p className="m-0 mt-2 text-xs font-semibold text-[#1A1612]">
                  {addressPendingDeletion.detailAddress}
                </p>
                <p className="m-0 mt-1 text-[11px] leading-relaxed text-[#7D715E]">
                  {addressPendingDeletion.wardName}, {addressPendingDeletion.districtName}, {addressPendingDeletion.provinceName}
                </p>
                {addressPendingDeletion.isDefault && (
                  <span className="inline-flex mt-3 rounded-full border border-[#EEDFC6] bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#B88E4F]">
                    Địa chỉ mặc định
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-[#EAE4D7] bg-[#FAF8F5] p-4 sm:px-7">
              <button
                type="button"
                disabled={isDeletingAddress}
                onClick={() => setAddressPendingDeletion(null)}
                className="rounded-xl border border-[#EAE4D7] bg-white px-4 py-2.5 text-xs font-bold text-[#7D715E] transition hover:bg-[#F3EFE6] hover:text-[#1A1612] disabled:opacity-50"
              >
                Giữ lại địa chỉ
              </button>
              <button
                type="button"
                disabled={isDeletingAddress}
                onClick={handleDeleteAddress}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isDeletingAddress ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAE4D7] rounded-3xl w-full max-w-2xl max-h-[94vh] overflow-y-auto p-6 shadow-2xl flex flex-col gap-5 text-left animate-in fade-in zoom-in-95">
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
                    placeholder="VD: Nguyễn Văn A"
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
                    placeholder="VD: 0912345678"
                    className="w-full bg-[#FAF8F5] border border-[#EAE4D7] focus:bg-white focus:border-[#C59B58] rounded-xl px-3 py-2 text-xs text-[#1A1612] outline-none transition"
                  />
                </div>
              </div>

              {/* Tỉnh / Thành phố */}
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Tỉnh / Thành phố
                </label>
                <CustomSelect
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
                  placeholder="-- Chọn Tỉnh / Thành phố --"
                  required
                />
              </div>

              {/* Quận / Huyện */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1">
                    Quận / Huyện
                  </label>
                  <CustomSelect
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
                    placeholder="-- Chọn Quận / Huyện --"
                    required
                  />
                </div>

                {/* Phường / Xã */}
                <div>
                  <label className="text-xs font-bold text-[#1A1612] block mb-1">
                    Phường / Xã
                  </label>
                  <CustomSelect
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
                    placeholder="-- Chọn Phường / Xã --"
                    required
                  />
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
                  onChange={(e) => setAddressForm({
                    ...addressForm,
                    detailAddress: e.target.value,
                    latitude: null,
                    longitude: null,
                  })}
                  required
                  placeholder="Ví dụ: Số 123 Đường D1, Chung cư ABC"
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] focus:bg-white focus:border-[#C59B58] rounded-xl px-3 py-2 text-xs text-[#1A1612] outline-none transition"
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
                  className="flex-1 py-2.5 rounded-xl bg-[#EBD08C] hover:bg-[#DEC07A] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
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
