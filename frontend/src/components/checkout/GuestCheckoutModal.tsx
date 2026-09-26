import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Truck,
  QrCode,
  ShieldCheck,
  Tag,
  Loader2,
  Store as StoreIcon,
  Package,
  MapPin,
  Lock,
  LogIn,
  Zap,
} from 'lucide-react';
import api from '../../services/api';
import { authService, type UserProfile } from '../../services/auth.service';
import { customerService, type CustomerAddress } from '../../services/customer.service';
import { triggerGoogleSignIn, devBypassGoogleSignIn } from '../../utils/googleAuth';
import { GoogleOfficialButton } from '../auth/GoogleOfficialButton';
import { toast } from '../../utils/toast';
import {
  loadShippingAddresses,
  type ShippingProvince,
} from '../../services/order-address.service';

export interface ProductVariantItem {
  id: string;
  productId?: string;
  name: string;
  sku: string;
  price?: number | string | null;
  stockQuantity: number;
  isActive?: boolean;
}

export interface CheckoutProductItem {
  id: string;
  title: string;
  sku?: string;
  price: number | string;
  originalPrice?: number | string;
  imageUrl?: string;
  stockQuantity: number;
  variants?: ProductVariantItem[];
}

export interface CheckoutStoreInfo {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string;
}

interface GuestCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: CheckoutProductItem;
  store: CheckoutStoreInfo;
  initialQuantity?: number;
  initialCouponCode?: string;
  initialVariantId?: string;
  onOrderPlaced?: (orderData: any) => void;
}

export const GuestCheckoutModal: React.FC<GuestCheckoutModalProps> = ({
  isOpen,
  onClose,
  product,
  store,
  initialQuantity = 1,
  initialCouponCode = '',
  initialVariantId,
  onOrderPlaced,
}) => {

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([]);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string>('');

  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const onTokenSuccessInCheckout = async (idToken: string) => {
    try {
      setIsLoggingIn(true);
      setLoginError(null);
      const res: any = await authService.googleLogin(idToken, 'CUSTOMER');
      const user = res?.user || authService.getCurrentUser();
      setCurrentUser(user);
      if (user) {
        setCustomerName(user.fullName || '');
        setCustomerEmail(user.email || '');
        if (user.phoneNumber) setCustomerPhone(user.phoneNumber);
        customerService.getAddresses().then((addrs) => {
          if (Array.isArray(addrs) && addrs.length > 0) {
            setCustomerAddresses(addrs);
            const def = addrs.find((a) => a.isDefault) || addrs[0];
            if (def) {
              handleSelectSavedAddress(def.id);
            }
          }
        }).catch(() => {});
      }
      toast.success('Đăng nhập thành công! Vui lòng hoàn tất thông tin đặt hàng.');
    } catch (err: any) {
      setLoginError(err?.response?.data?.message || err?.message || 'Đăng nhập Google thất bại');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLoginInCheckout = (useDevBypass: boolean = false) => {
    if (useDevBypass) {
      devBypassGoogleSignIn(onTokenSuccessInCheckout, 'customer.checkout@scanms.vn');
      return;
    }

    triggerGoogleSignIn(
      onTokenSuccessInCheckout,
      (errMsg) => setLoginError(errMsg),
    );
  };

  const handleEmailLoginInCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res: any = await authService.login(loginEmail.trim(), loginPassword);
      const user = res?.user || authService.getCurrentUser();
      setCurrentUser(user);
      if (user) {
        setCustomerName(user.fullName || '');
        setCustomerEmail(user.email || '');
        if (user.phoneNumber) setCustomerPhone(user.phoneNumber);
        customerService.getAddresses().then((addrs) => {
          if (Array.isArray(addrs) && addrs.length > 0) {
            setCustomerAddresses(addrs);
            const def = addrs.find((a) => a.isDefault) || addrs[0];
            if (def) {
              handleSelectSavedAddress(def.id);
            }
          }
        }).catch(() => {});
      }
      toast.success('Đăng nhập thành công! Vui lòng hoàn tất thông tin đặt hàng.');
    } catch (err: any) {
      setLoginError(err?.response?.data?.message || err?.message || 'Email hoặc mật khẩu không chính xác');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingProvinces, setShippingProvinces] = useState<ShippingProvince[]>([]);
  const [provinceCode, setProvinceCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressReload, setAddressReload] = useState(0);
  const [orderNotes, setOrderNotes] = useState('');
  const [quantity, setQuantity] = useState(initialQuantity);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'VIETQR'>('COD');
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    undefined,
  );


  const [couponCode, setCouponCode] = useState(initialCouponCode);
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    discountType: string;
  } | null>(null);
  const [couponMessage, setCouponMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);


  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderId: string;
    publicOrderCode: string;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    vietqr?: {
      bankCode: string;
      accountNumber: string;
      accountName: string;
      amount: number;
      memo: string;
      qrUrl: string;
    };
    cancellationToken?: string;
    confirmationEmailQueued?: boolean;
  } | null>(null);


  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const user = authService.getCurrentUser();
      setCurrentUser(user);

      if (user) {
        setCustomerName(user.fullName || '');
        setCustomerEmail(user.email || '');
        if (user.phoneNumber) setCustomerPhone(user.phoneNumber);

        if (user.role === 'CUSTOMER') {
          customerService.getAddresses().then((addrs) => {
            if (Array.isArray(addrs) && addrs.length > 0) {
              setCustomerAddresses(addrs);
              const def = addrs.find((a) => a.isDefault) || addrs[0];
              if (def) {
                setSelectedSavedAddressId(def.id);
                setShippingAddress(def.detailAddress);
                if (def.fullName) setCustomerName(def.fullName);
                if (def.phoneNumber) setCustomerPhone(def.phoneNumber);
              }
            }
          }).catch(() => {});
        }
      }

      const newKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setIdempotencyKey(newKey);

      if (initialVariantId && product.variants?.some((v) => v.id === initialVariantId)) {
        const found = product.variants.find((v) => v.id === initialVariantId);
        setSelectedVariantId(initialVariantId);
        setQuantity(Math.max(1, Math.min(initialQuantity, found?.stockQuantity || 1)));
      } else if (product.variants && product.variants.length > 0) {
        const available =
          product.variants.find((v) => v.stockQuantity > 0) ||
          product.variants[0];
        setSelectedVariantId(available?.id);
        setQuantity(1);
      } else {
        setSelectedVariantId(undefined);
        setQuantity(
          Math.max(1, Math.min(initialQuantity, product.stockQuantity || 1)),
        );
      }

      setOrderSuccess(null);
      setErrorMessage(null);
      setAppliedCoupon(null);
      setCouponMessage(null);
      setCouponCode(initialCouponCode);
      setAddressError(null);
    }
  }, [isOpen, initialQuantity, product.stockQuantity, product.variants, initialCouponCode, initialVariantId]);

  useEffect(() => {
    if (!isOpen || shippingProvinces.length) return;
    const controller = new AbortController();
    setAddressLoading(true);
    setAddressError(null);

    void loadShippingAddresses(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setShippingProvinces(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAddressError('Không tải được danh mục Tỉnh/Thành phố. Vui lòng thử lại.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAddressLoading(false);
      });

    return () => controller.abort();
  }, [isOpen, shippingProvinces.length, addressReload]);

  const handleSelectSavedAddress = (addressId: string) => {
    setSelectedSavedAddressId(addressId);
    const addr = customerAddresses.find((a) => a.id === addressId);
    if (!addr) return;

    setShippingAddress(addr.detailAddress);
    if (addr.fullName) setCustomerName(addr.fullName);
    if (addr.phoneNumber) setCustomerPhone(addr.phoneNumber);

    if (shippingProvinces.length > 0) {
      const prov = shippingProvinces.find(
        (p) => String(p.code) === String(addr.provinceCode) || (addr.provinceName && p.name.toLowerCase().includes(addr.provinceName.toLowerCase()))
      );
      if (prov) {
        setProvinceCode(String(prov.code));
        const dist = prov.districts.find(
          (d) => String(d.code) === String(addr.districtCode) || (addr.districtName && d.name.toLowerCase().includes(addr.districtName.toLowerCase()))
        );
        if (dist) {
          setDistrictCode(String(dist.code));
          const ward = dist.wards.find(
            (w) => String(w.code) === String(addr.wardCode) || (addr.wardName && w.name.toLowerCase().includes(addr.wardName.toLowerCase()))
          );
          if (ward) setWardCode(String(ward.code));
        }
      }
    }
  };

  useEffect(() => {
    if (selectedSavedAddressId && shippingProvinces.length > 0) {
      handleSelectSavedAddress(selectedSavedAddressId);
    }
  }, [shippingProvinces.length, selectedSavedAddressId]);

  if (!isOpen) return null;

  const selectedVariant = product.variants?.find(
    (v) => v.id === selectedVariantId,
  );
  const currentPrice =
    selectedVariant?.price !== undefined && selectedVariant?.price !== null
      ? Number(selectedVariant.price)
      : Number(product.price) || 0;
  const currentStock = selectedVariant
    ? selectedVariant.stockQuantity
    : product.stockQuantity || 0;

  const unitPrice = currentPrice;
  const subtotal = unitPrice * quantity;
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const selectedProvince = shippingProvinces.find(
    (province) => String(province.code) === provinceCode,
  );
  const selectedDistrict = selectedProvince?.districts.find(
    (district) => String(district.code) === districtCode,
  );
  const selectedWard = selectedDistrict?.wards.find(
    (ward) => String(ward.code) === wardCode,
  );



  const isPhoneValid = (phone: string) => {
    const clean = phone.trim().replace(/[()\s-]/g, '');
    return /^(0|\+84)[35789]\d{8}$/.test(clean);
  };

  const isEmailValid = (email: string) =>
    !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());


  const handleValidateCoupon = async () => {
    const codeToTest = couponCode.trim().toUpperCase();
    if (!codeToTest) {
      setCouponMessage({ type: 'error', text: 'Vui lòng nhập mã giảm giá' });
      return;
    }

    setCouponLoading(true);
    setCouponMessage(null);

    try {
      const res = await api.post('/coupons/validate', {
        code: codeToTest,
        storeId: store.id,
        customerPhone: customerPhone.trim() || undefined,
        items: [
          {
            productId: product.id,
            quantity,
          },
        ],
      });

      const data = (res as any)?.data || res;
      if (data && (data.discountAmount !== undefined || data.appliedDiscountAmount !== undefined)) {
        const discount = Number(data.discountAmount || data.appliedDiscountAmount || 0);
        setAppliedCoupon({
          code: codeToTest,
          discountAmount: discount,
          discountType: data.discountType || 'PERCENTAGE',
        });
        setCouponMessage({
          type: 'success',
          text: `Áp dụng thành công! Tiết kiệm ${discount.toLocaleString('vi-VN')} ₫`,
        });
      } else {
        setCouponMessage({
          type: 'error',
          text: 'Mã giảm giá không hợp lệ cho sản phẩm này.',
        });
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Mã không hợp lệ, đã hết lượt dùng hoặc hết hạn áp dụng.';
      setAppliedCoupon(null);
      setCouponMessage({ type: 'error', text: msg });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponMessage(null);
  };


  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentUser) {
      setErrorMessage(
        'Vui lòng đăng nhập hoặc xác thực với Google trước khi hoàn tất đặt hàng để kích hoạt quyền lợi bảo hộ đơn hàng và chính sách Escrow 14 ngày.',
      );
      const gateEl = document.getElementById('mandatory-auth-gate');
      if (gateEl) {
        gateEl.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    const trimmedName = customerName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Họ và tên người nhận phải có ít nhất 2 ký tự.');
      return;
    }


    if (!isPhoneValid(customerPhone)) {
      setErrorMessage(
        'Số điện thoại không hợp lệ. Vui lòng nhập 10 số (bắt đầu bằng 03, 05, 07, 08, 09).',
      );
      return;
    }

    if (!isEmailValid(customerEmail)) {
      setErrorMessage('Email nhận thông tin đơn hàng không hợp lệ.');
      return;
    }


    const addressDetail = shippingAddress.trim();
    if (!addressDetail || addressDetail.length < 5) {
      setErrorMessage('Vui lòng nhập số nhà, tên đường hoặc tòa nhà (ít nhất 5 ký tự).');
      return;
    }

    if (!selectedProvince || !selectedDistrict || !selectedWard) {
      setErrorMessage('Vui lòng chọn đầy đủ Tỉnh/Thành phố, Quận/Huyện và Phường/Xã.');
      return;
    }

    const fullShippingAddress = [
      addressDetail,
      selectedWard.name,
      selectedDistrict.name,
      selectedProvince.name,
    ].join(', ');


    if (quantity > currentStock) {
      setErrorMessage(
        `Số lượng đặt (${quantity}) vượt quá tồn kho hiện có (${currentStock}).`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        storeId: store.id,
        customerId: currentUser?.id || undefined,
        customerName: trimmedName,
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim().toLowerCase() || undefined,
        shippingAddress: fullShippingAddress,
        orderNotes: orderNotes.trim() || undefined,
        paymentMethod,
        couponCode: appliedCoupon?.code || undefined,
        idempotencyKey,
        items: [
          {
            productId: product.id,
            variantId: selectedVariantId || undefined,
            quantity,
          },
        ],
      };


      const res = await api.post('/orders', payload);
      const rawResponse = res as any;
      const resData = rawResponse?.data?.data || rawResponse?.data || rawResponse;
      const publicOrderCode =
        resData?.publicOrderCode ||
        resData?.order?.externalOrderSn ||
        resData?.externalOrderSn;

      if (!publicOrderCode || publicOrderCode === 'undefined') {
        throw new Error('Backend chưa trả về mã đơn hàng công khai. Vui lòng liên hệ hỗ trợ và không đặt lại đơn ngay.');
      }

      const orderResult = {
        orderId: resData.orderId || resData.order?.id,
        publicOrderCode,
        totalAmount: resData.finalAmount !== undefined ? resData.finalAmount : resData.order?.finalAmount,
        paymentMethod: resData.paymentMethod || paymentMethod,
        paymentStatus: resData.paymentStatus || (paymentMethod === 'VIETQR' ? 'WAITING_PAYMENT' : 'UNPAID'),
        vietqr: resData.vietqr,
        cancellationToken: resData.cancellationToken || resData.order?.cancellationToken,
        confirmationEmailQueued: Boolean(resData.confirmationEmailQueued),
      };

      localStorage.setItem(
        'scanms-recent-guest-order',
        JSON.stringify({ publicOrderCode, createdAt: Date.now() }),
      );

      setOrderSuccess(orderResult);
      if (onOrderPlaced) {
        onOrderPlaced(orderResult);
      }
    } catch (err: any) {
      const rawMessage = err?.response?.data?.message || err?.message;
      const serverMsg =
        err?.response?.status === 429
          ? rawMessage || 'Bạn thao tác quá nhiều lần. Vui lòng chờ 5 phút rồi thử lại.'
          : Array.isArray(rawMessage)
            ? rawMessage.join(' ')
            : rawMessage ||
              'Không thể hoàn tất đặt hàng lúc này. Vui lòng kiểm tra lại thông tin và thử lại.';
      setErrorMessage(serverMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, type: 'code' | 'token') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-checkout-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FFFFFF] rounded-3xl max-w-4xl lg:max-w-5xl xl:max-w-6xl w-full p-5 sm:p-7 lg:p-8 border border-[#EAE4D7] shadow-2xl relative max-h-[92vh] overflow-y-auto font-sans"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng cửa sổ"
          className="sticky top-0 float-right -mr-2 -mt-2 sm:-mr-3 sm:-mt-3 text-[#7D715E] hover:text-[#1A1612] p-2 rounded-full hover:bg-[#F3EFE6] transition-colors cursor-pointer z-30 bg-white/90 backdrop-blur-xs border border-[#EAE4D7] shadow-xs"
        >
          <X className="w-5 h-5" />
        </button>

        {orderSuccess ? (

          <div className="max-w-2xl mx-auto py-2 text-center">
            <div className="w-16 h-16 rounded-full bg-[#FBF5EB] border-2 border-[#C59B58] text-[#C59B58] flex items-center justify-center mx-auto mb-3 shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 id="guest-checkout-title" className="text-2xl font-black text-[#1A1612] mb-1">
              Đặt Hàng Thành Công!
            </h2>
            <p className="text-xs text-[#7D715E] mb-5 max-w-md mx-auto">
              Đơn hàng của bạn đã được ghi nhận vào hệ thống SCANMS và thông báo tới gian hàng{' '}
              <strong className="text-[#1A1612]">{store.name}</strong> để đóng gói.
            </p>

            {orderSuccess.confirmationEmailQueued && customerEmail.trim() && (
              <div className="mb-4 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-left text-[11px] text-[#7D715E]">
                Mã đơn và liên kết tra cứu đang được gửi tới{' '}
                <strong className="text-[#1A1612]">{customerEmail.trim().toLowerCase()}</strong>.
              </div>
            )}


            <div className="bg-[#FAF8F5] border border-[#EEDFC6] rounded-2xl p-4 text-left space-y-3 mb-5">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#EAE4D7]">
                <div>
                  <div className="text-[11px] text-[#7D715E] font-medium">MÃ ĐƠN HÀNG CÔNG KHAI</div>
                  <div className="text-base font-black text-[#1A1612] font-mono tracking-wider">
                    {orderSuccess.publicOrderCode}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(orderSuccess.publicOrderCode, 'code')}
                  className="px-2.5 py-1.5 bg-[#F3EFE6] hover:bg-[#EAE4D7] text-[#1A1612] rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Sao chép mã đơn hàng"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#B88E4F]" />}
                  <span>{copiedCode ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>


              {orderSuccess.cancellationToken && (
                <div className="bg-[#FBF5EB] border border-[#EEDFC6] rounded-xl p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase font-bold text-[#B88E4F]">
                        MÃ BẢO MẬT HỦY / TRA CỨU ĐƠN (GUEST TOKEN)
                      </div>
                      <div className="font-mono text-[11px] text-[#1A1612] truncate mt-0.5" title={orderSuccess.cancellationToken}>
                        {orderSuccess.cancellationToken}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(orderSuccess.cancellationToken!, 'token')}
                      className="shrink-0 px-2 py-1 bg-white border border-[#EEDFC6] hover:bg-[#FAF8F5] text-[#1A1612] rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedToken ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-[#B88E4F]" />}
                      <span>{copiedToken ? 'Đã chép' : 'Chép mã'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-[#7D715E] mt-1.5 leading-relaxed">
                    💡 Khách vãng lai không cần tài khoản: Lưu mã này cùng số điện thoại để tra cứu chi tiết hoặc hủy đơn khi cần.
                  </p>
                </div>
              )}


              <div className="text-xs space-y-1.5 pt-1">
                <div className="flex justify-between text-[#7D715E]">
                  <span>Sản phẩm:</span>
                  <span className="font-semibold text-[#1A1612] text-right">
                    {product.title} (x{quantity})
                  </span>
                </div>
                <div className="flex justify-between text-[#7D715E]">
                  <span>Người nhận:</span>
                  <span className="font-medium text-[#1A1612]">{customerName}</span>
                </div>
                <div className="flex justify-between text-[#7D715E]">
                  <span>Số điện thoại:</span>
                  <span className="font-mono text-[#1A1612]">
                    {customerPhone.replace(/^(\d{3})\d+(\d{3})$/, '$1****$2')}
                  </span>
                </div>
                <div className="flex justify-between text-[#7D715E]">
                  <span>Tổng thanh toán:</span>
                  <span className="font-black text-[#B88E4F] text-sm">
                    {Number(orderSuccess.totalAmount).toLocaleString('vi-VN')} ₫
                  </span>
                </div>
                <div className="flex justify-between text-[#7D715E]">
                  <span>Hình thức:</span>
                  <span className="font-semibold text-[#1A1612]">
                    {orderSuccess.paymentMethod === 'VIETQR' ? 'Chuyển khoản VietQR 24/7' : 'Thanh toán COD khi nhận hàng'}
                  </span>
                </div>
              </div>
            </div>


            {orderSuccess.paymentMethod === 'VIETQR' && orderSuccess.vietqr && (
              <div className="bg-[#FFFFFF] border-2 border-[#C59B58] rounded-2xl p-4 text-center mb-5 shadow-sm">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FBF5EB] rounded-full text-xs font-bold text-[#B88E4F] mb-3">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QUÉT MÃ VIETQR ĐỂ HOÀN TẤT THANH TOÁN</span>
                </div>

                <div className="w-48 h-48 mx-auto bg-white p-2 rounded-xl border border-[#EAE4D7] shadow-inner mb-3 flex items-center justify-center">
                  <img
                    src={orderSuccess.vietqr.qrUrl}
                    alt="VietQR Chuyển khoản"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="bg-[#FAF8F5] rounded-xl p-3 text-xs text-left space-y-1 font-mono text-[#1A1612]">
                  <div><strong>Ngân hàng:</strong> {orderSuccess.vietqr.bankCode} (Quân Đội - MBBank)</div>
                  <div><strong>Số tài khoản:</strong> {orderSuccess.vietqr.accountNumber}</div>
                  <div><strong>Chủ tài khoản:</strong> {orderSuccess.vietqr.accountName}</div>
                  <div><strong>Số tiền:</strong> {orderSuccess.vietqr.amount.toLocaleString('vi-VN')} ₫</div>
                  <div><strong>Nội dung CK:</strong> <span className="font-black text-[#B88E4F]">{orderSuccess.vietqr.memo}</span></div>
                </div>
                <p className="text-[11px] text-[#7D715E] mt-2">
                  ⚠️ Sau khi chuyển khoản, đơn hàng sẽ được đối soát tự động và chuyển sang trạng thái chuẩn bị hàng.
                </p>
              </div>
            )}


            <div className="flex flex-col gap-2">
              {currentUser?.role === 'CUSTOMER' && (
                <Link
                  to="/customer/orders"
                  onClick={onClose}
                  className="w-full py-3 bg-gradient-to-r from-[#C59B58] to-[#B88E4F] hover:opacity-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Xem trong Đơn Mua Của Bạn (Quản lý & Hủy đơn)</span>
                </Link>
              )}
              <Link
                to={`/tracking?sn=${encodeURIComponent(orderSuccess.publicOrderCode)}`}
                className="w-full py-3 bg-[#C59B58] hover:bg-[#B88E4F] text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Truck className="w-4 h-4" />
                <span>Theo dõi tiến trình đơn hàng</span>
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 border border-[#EAE4D7] bg-white hover:bg-[#F3EFE6] text-[#1A1612] font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Tiếp tục mua sắm
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6 pb-4 border-b border-[#EAE4D7] pr-8 sm:pr-12">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] text-[10px] font-bold text-[#B88E4F] uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B88E4F]" />
                <span>SCANMS SECURE CHECKOUT • XÁC THỰC DANH TÍNH & BẢO HỘ ĐƠN HÀNG 100%</span>
              </div>
              <h2 id="guest-checkout-title" className="text-xl sm:text-2xl font-black text-[#1A1612]">
                Thông Tin Giao Hàng & Thanh Toán
              </h2>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#7D715E] mt-1.5">
                <span>Gian hàng đối tác:</span>
                <span className="font-bold text-[#1A1612] inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7]">
                  <StoreIcon className="w-3.5 h-3.5 text-[#B88E4F]" />
                  {store.name}
                </span>
                <span>•</span>
                <span className="text-[#059669] font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Bảo chứng quỹ Escrow 14 ngày (Đồng kiểm trước khi nhận)
                </span>
              </div>
            </div>

            {!currentUser ? (
              <div id="mandatory-auth-gate" className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#FBF5EB] to-[#FAF8F5] border-2 border-[#C59B58] shadow-sm text-left">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C59B58] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-[#EEDFC6] text-[10px] font-black text-[#B88E4F] uppercase tracking-wider mb-1">
                      BẮT BUỘC XÁC THỰC KHÁCH HÀNG (MANDATORY AUTH GATE)
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-[#1A1612]">
                      Đăng Nhập Hoặc Xác Thực Google Trước Khi Đặt Hàng
                    </h3>
                    <p className="text-xs text-[#7D715E] mt-1 leading-relaxed">
                      Hệ thống SCANMS yêu cầu liên kết tài khoản để đảm bảo:
                      <span className="font-semibold text-[#1A1612]"> (1) Kích hoạt Quỹ Bảo Chứng Escrow 14 ngày</span>,
                      <span className="font-semibold text-[#1A1612]"> (2) Quyền gửi khiếu nại Trọng tài độc lập</span>, và
                      <span className="font-semibold text-[#1A1612]"> (3) Tự động lưu Sổ địa chỉ giao hàng</span>.
                    </p>

                    {loginError && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 text-xs text-[#DC2626] font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="shrink-0 min-w-[200px]">
                        <GoogleOfficialButton
                          onSuccess={onTokenSuccessInCheckout}
                          onError={(errMsg) => setLoginError(errMsg)}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isLoggingIn}
                          onClick={() => handleGoogleLoginInCheckout(true)}
                          className="px-3.5 py-2.5 bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#EEDFC6] text-[#B88E4F] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Dùng chế độ Dev Test để vượt qua kiểm tra origin localhost"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>⚡ Google 1-Click (Dev Test)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowEmailLogin(!showEmailLogin)}
                          className="px-3.5 py-2.5 bg-white border border-[#EAE4D7] hover:border-[#1A1612] text-[#1A1612] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <LogIn className="w-3.5 h-3.5 text-[#7D715E]" />
                          <span>{showEmailLogin ? 'Đóng đăng nhập Email' : 'Đăng nhập Email'}</span>
                        </button>
                      </div>
                    </div>

                    {showEmailLogin && (
                      <div className="mt-3.5 p-3.5 bg-white rounded-xl border border-[#EAE4D7] space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <input
                            type="email"
                            placeholder="Email tài khoản"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="px-3 py-2 bg-[#FAF8F5] border border-[#EAE4D7] rounded-lg text-xs text-[#1A1612] focus:outline-hidden focus:border-[#C59B58]"
                          />
                          <input
                            type="password"
                            placeholder="Mật khẩu"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="px-3 py-2 bg-[#FAF8F5] border border-[#EAE4D7] rounded-lg text-xs text-[#1A1612] focus:outline-hidden focus:border-[#C59B58]"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#7D715E]">
                            Chưa có tài khoản? Nhấn nút Google ở trên để đăng ký 1 chạm.
                          </span>
                          <button
                            type="button"
                            disabled={isLoggingIn}
                            onClick={handleEmailLoginInCheckout}
                            className="px-4 py-2 bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          >
                            {isLoggingIn && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span>Đăng nhập ngay</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-xs text-[#1A1612] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                  <span>
                    Khách hàng: <strong className="text-[#1A1612]">{currentUser.fullName || currentUser.email}</strong> ({currentUser.email})
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#059669] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Đã xác thực danh tính
                </span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-[#DC2626]/10 border border-[#DC2626]/30 text-xs text-[#DC2626] flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitOrder}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                <div className="lg:col-span-7 space-y-4 text-left">
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-[#EAE4D7]">
                      <span className="w-5 h-5 rounded-full bg-[#C59B58] text-white text-[11px] font-black flex items-center justify-center">1</span>
                      <h3 className="text-xs sm:text-sm font-black text-[#1A1612]">Thông Tin Người Nhận</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#1A1612] mb-1">
                          Họ và tên người nhận <span className="text-[#DC2626]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ví dụ: Hoàng Minh Tuấn"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#EAE4D7] rounded-xl text-xs text-[#1A1612] focus:outline-hidden focus:border-[#C59B58] transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1A1612] mb-1">
                          Số điện thoại nhận hàng <span className="text-[#DC2626]">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="Ví dụ: 0987654321"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs text-[#1A1612] focus:outline-hidden transition font-mono ${
                            customerPhone && !isPhoneValid(customerPhone)
                              ? 'border-[#DC2626] focus:border-[#DC2626]'
                              : 'border-[#EAE4D7] focus:border-[#C59B58]'
                          }`}
                        />
                        {customerPhone && !isPhoneValid(customerPhone) && (
                          <span className="text-[10px] text-[#DC2626] mt-1 block">
                            Số điện thoại chưa đúng định dạng Việt Nam (10 chữ số).
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="guest-customer-email" className="block text-xs font-bold text-[#1A1612] mb-1">
                        Email nhận mã đơn <span className="font-medium text-[#7D715E]">(Tùy chọn)</span>
                      </label>
                      <input
                        id="guest-customer-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        maxLength={254}
                        placeholder="Ví dụ: khachhang@gmail.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        aria-invalid={customerEmail ? !isEmailValid(customerEmail) : undefined}
                        className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs text-[#1A1612] focus:outline-hidden transition ${
                          customerEmail && !isEmailValid(customerEmail)
                            ? 'border-[#DC2626] focus:border-[#DC2626]'
                            : 'border-[#EAE4D7] focus:border-[#C59B58]'
                        }`}
                      />
                      <p className="text-[10px] text-[#7D715E] mt-1">
                        SCANMS sẽ gửi mã đơn và liên kết tra cứu vận chuyển qua email này.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-[#EAE4D7]">
                      <span className="w-5 h-5 rounded-full bg-[#C59B58] text-white text-[11px] font-black flex items-center justify-center">2</span>
                      <h3 className="text-xs sm:text-sm font-black text-[#1A1612]">Địa Chỉ Nhận Hàng</h3>
                    </div>

                    {customerAddresses.length > 0 && (
                      <div className="p-3 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#8C6226] flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#C59B58]" />
                            Sổ địa chỉ đã lưu ({customerAddresses.length} địa chỉ)
                          </span>
                          <Link
                            to="/customer/addresses"
                            target="_blank"
                            className="text-[10px] font-bold text-[#B88E4F] hover:underline"
                          >
                            Quản lý sổ địa chỉ ↗
                          </Link>
                        </div>
                        <select
                          value={selectedSavedAddressId}
                          onChange={(e) => handleSelectSavedAddress(e.target.value)}
                          className="w-full text-xs bg-white border border-[#EAE4D7] rounded-xl px-3 py-2 text-[#1A1612] font-medium outline-hidden focus:border-[#C59B58]"
                        >
                          <option value="">-- Chọn từ sổ địa chỉ đã lưu --</option>
                          {customerAddresses.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.isDefault ? '⭐ [Mặc định] ' : ''}
                              {a.fullName} - {a.phoneNumber} ({a.detailAddress}, {a.wardName}, {a.districtName}, {a.provinceName})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {addressError && (
                      <div
                        role="alert"
                        className="flex items-center justify-between gap-2 rounded-xl border border-[#FECACA] bg-[#FFF5F5] px-3 py-2 text-[11px] text-[#B91C1C]"
                      >
                        <span>{addressError}</span>
                        <button
                          type="button"
                          onClick={() => setAddressReload((value) => value + 1)}
                          className="shrink-0 font-bold underline cursor-pointer"
                        >
                          Tải lại
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <select
                        required
                        value={provinceCode}
                        disabled={addressLoading}
                        onChange={(e) => {
                          setProvinceCode(e.target.value);
                          setDistrictCode('');
                          setWardCode('');
                        }}
                        className="w-full appearance-none rounded-xl border border-[#EAE4D7] bg-white px-3.5 py-2.5 text-xs text-[#1A1612] focus:outline-hidden focus:border-[#C59B58] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">{addressLoading ? 'Đang tải Tỉnh/Thành...' : 'Chọn Tỉnh/Thành phố *'}</option>
                        {shippingProvinces.map((province) => (
                          <option key={province.code} value={province.code}>{province.name}</option>
                        ))}
                      </select>

                      <select
                        required
                        value={districtCode}
                        disabled={!selectedProvince || addressLoading}
                        onChange={(e) => {
                          setDistrictCode(e.target.value);
                          setWardCode('');
                        }}
                        className="w-full appearance-none rounded-xl border border-[#EAE4D7] bg-white px-3.5 py-2.5 text-xs text-[#1A1612] focus:outline-hidden focus:border-[#C59B58] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">Chọn Quận/Huyện *</option>
                        {selectedProvince?.districts.map((district) => (
                          <option key={district.code} value={district.code}>{district.name}</option>
                        ))}
                      </select>
                    </div>

                    <select
                      required
                      value={wardCode}
                      disabled={!selectedDistrict || addressLoading}
                      onChange={(e) => setWardCode(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-[#EAE4D7] bg-white px-3.5 py-2.5 text-xs text-[#1A1612] focus:outline-hidden focus:border-[#C59B58] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">Chọn Phường/Xã *</option>
                      {selectedDistrict?.wards.map((ward) => (
                        <option key={ward.code} value={ward.code}>{ward.name}</option>
                      ))}
                    </select>

                    <textarea
                      required
                      rows={2}
                      placeholder="Số nhà, tên đường, tòa nhà, căn hộ... *"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#EAE4D7] rounded-xl text-xs text-[#1A1612] focus:outline-hidden focus:border-[#C59B58] transition resize-none"
                    />
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-[#EAE4D7]">
                      <span className="w-5 h-5 rounded-full bg-[#C59B58] text-white text-[11px] font-black flex items-center justify-center">3</span>
                      <h3 className="text-xs sm:text-sm font-black text-[#1A1612]">Phương Thức Thanh Toán</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('COD')}
                        className={`p-3.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          paymentMethod === 'COD'
                            ? 'border-[#C59B58] bg-[#FBF5EB] text-[#B88E4F] ring-2 ring-[#C59B58]/30 shadow-2xs'
                            : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:border-[#C59B58]/50'
                        }`}
                      >
                        <div className="font-extrabold text-[#1A1612] flex items-center gap-1.5">
                          <span>💵</span> Thanh toán COD
                        </div>
                        <div className="text-[11px] text-[#7D715E] mt-1">Trả tiền mặt khi nhận hàng & kiểm tra</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('VIETQR')}
                        className={`p-3.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          paymentMethod === 'VIETQR'
                            ? 'border-[#C59B58] bg-[#FBF5EB] text-[#B88E4F] ring-2 ring-[#C59B58]/30 shadow-2xs'
                            : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:border-[#C59B58]/50'
                        }`}
                      >
                        <div className="font-extrabold text-[#1A1612] flex items-center gap-1.5">
                          <span>📱</span> Quét mã VietQR
                        </div>
                        <div className="text-[11px] text-[#7D715E] mt-1">Chuyển khoản liên ngân hàng 24/7 tức thì</div>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1A1612] mb-1">
                        Ghi chú cho gian hàng (Tùy chọn)
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#EAE4D7] rounded-xl text-xs text-[#1A1612] focus:outline-hidden focus:border-[#C59B58] transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-4 text-left lg:sticky lg:top-3">
                  <div className="p-4 sm:p-5 bg-[#FAF8F5] border border-[#EEDFC6] rounded-2xl space-y-3.5 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#EAE4D7]">
                      <h3 className="text-xs sm:text-sm font-black text-[#1A1612] flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-[#B88E4F]" />
                        <span>Sản Phẩm Đặt Mua</span>
                      </h3>
                      <span className="text-[11px] text-[#7D715E]">
                        Kho: <strong className="text-[#1A1612]">{currentStock}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-[#F3EFE6] border border-[#EAE4D7] overflow-hidden shrink-0">
                        <img
                          src={product.imageUrl || '/assets/product-placeholder.svg'}
                          alt={product.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/assets/product-placeholder.svg';
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-[#1A1612] line-clamp-2 leading-snug">{product.title}</h4>
                        {selectedVariant && (
                          <div className="text-[11px] font-semibold text-[#B88E4F] mt-0.5">
                            Phân loại: {selectedVariant.name}
                          </div>
                        )}
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-sm font-black text-[#B88E4F]">
                            {unitPrice.toLocaleString('vi-VN')} ₫
                          </span>
                          {product.originalPrice && Number(product.originalPrice) > unitPrice && (
                            <span className="text-[10px] text-[#7D715E] line-through">
                              {Number(product.originalPrice).toLocaleString('vi-VN')} ₫
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {product.variants && product.variants.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-[#1A1612]">
                            Chọn phân loại / Phiên bản <span className="text-[#DC2626]">*</span>
                          </label>
                          <span className="text-[10px] text-[#7D715E]">
                            {product.variants.length} lựa chọn
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {product.variants.map((v) => {
                            const isSelected = selectedVariantId === v.id;
                            const isOutOfStock = v.stockQuantity <= 0;
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => {
                                  if (!isOutOfStock) {
                                    setSelectedVariantId(v.id);
                                    setQuantity(1);
                                  }
                                }}
                                disabled={isOutOfStock}
                                className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#FBF5EB] border-[#B88E4F] ring-2 ring-[#B88E4F]/20 text-[#1A1612] font-bold shadow-xs'
                                    : isOutOfStock
                                    ? 'bg-[#F3EFE6]/50 border-[#EAE4D7] text-[#7D715E]/50 opacity-50 cursor-not-allowed'
                                    : 'bg-white border-[#EAE4D7] text-[#1A1612] hover:border-[#B88E4F]/60'
                                }`}
                              >
                                <div className="font-semibold line-clamp-1">{v.name}</div>
                                <div className="text-[11px] text-[#B88E4F] font-black mt-0.5">
                                  {(v.price !== undefined && v.price !== null
                                    ? Number(v.price)
                                    : Number(product.price) || 0
                                  ).toLocaleString('vi-VN')}{' '}
                                  ₫
                                </div>
                                <div className="text-[10px] text-[#7D715E] mt-0.5">
                                  {isOutOfStock ? 'Hết hàng' : `Còn ${v.stockQuantity}`}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2.5 border-t border-[#EAE4D7]">
                      <span className="text-xs font-bold text-[#1A1612]">Số lượng mua:</span>
                      <div className="flex items-center border border-[#EAE4D7] rounded-xl bg-white overflow-hidden shrink-0 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                          disabled={quantity <= 1}
                          className="w-8 h-8 flex items-center justify-center text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] disabled:opacity-30 cursor-pointer font-bold transition"
                        >
                          -
                        </button>
                        <span className="w-10 text-center text-xs font-black text-[#1A1612] font-mono">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity((prev) => Math.min(currentStock, prev + 1))}
                          disabled={quantity >= currentStock}
                          className="w-8 h-8 flex items-center justify-center text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] disabled:opacity-30 cursor-pointer font-bold transition"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] space-y-2">
                    <label className="block text-xs font-bold text-[#1A1612]">
                      Mã giảm giá KOL / Gian hàng (Tùy chọn)
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 text-[#B88E4F] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Nhập mã ưu đãi (VD: SCANMS50K)"
                          value={couponCode}
                          disabled={!!appliedCoupon}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            setCouponMessage(null);
                          }}
                          className="w-full pl-9 pr-3.5 py-2.5 bg-white disabled:bg-[#F3EFE6] border border-[#EAE4D7] rounded-xl text-xs text-[#1A1612] uppercase font-bold focus:outline-hidden focus:border-[#C59B58] transition"
                        />
                      </div>

                      {appliedCoupon ? (
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="px-3.5 py-2 bg-[#F3EFE6] hover:bg-[#EAE4D7] text-[#DC2626] font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
                        >
                          Bỏ mã
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!couponCode.trim() || couponLoading}
                          onClick={handleValidateCoupon}
                          className="px-4 py-2 bg-[#F3EFE6] hover:bg-[#C59B58] hover:text-white disabled:opacity-50 text-[#1A1612] font-bold text-xs rounded-xl border border-[#EAE4D7] transition flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Áp dụng'}
                        </button>
                      )}
                    </div>

                    {couponMessage && (
                      <div
                        className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                          couponMessage.type === 'success' ? 'text-emerald-700' : 'text-[#DC2626]'
                        }`}
                      >
                        {couponMessage.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                        <span>{couponMessage.text}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 sm:p-5 bg-gradient-to-br from-[#FBF5EB] to-[#FAF8F5] border-2 border-[#EEDFC6] rounded-2xl space-y-2 text-xs shadow-xs">
                    <div className="flex justify-between text-[#7D715E]">
                      <span>Tiền hàng ({quantity} món):</span>
                      <span className="font-semibold text-[#1A1612]">{subtotal.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-[#B88E4F] font-bold">
                        <span>Giảm giá ({appliedCoupon.code}):</span>
                        <span>-{discountAmount.toLocaleString('vi-VN')} ₫</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#7D715E]">
                      <span>Phí vận chuyển:</span>
                      <span className="text-emerald-700 font-bold">Miễn phí (Toàn quốc)</span>
                    </div>
                    <div className="pt-2.5 border-t border-[#EEDFC6] flex justify-between items-baseline">
                      <span className="font-black text-[#1A1612] text-sm">Tổng thanh toán:</span>
                      <span className="font-black text-[#B88E4F] text-xl">
                        {finalTotal.toLocaleString('vi-VN')} ₫
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || product.stockQuantity <= 0}
                    className="w-full py-3.5 bg-gradient-to-r from-[#C59B58] to-[#B88E4F] hover:from-[#B88E4F] hover:to-[#A67D3E] disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-md hover:shadow-lg shadow-[#C59B58]/20 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer border border-[#B88E4F]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Đang xử lý đơn hàng...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>XÁC NHẬN ĐẶT HÀNG — {finalTotal.toLocaleString('vi-VN')} ₫</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Hủy bỏ và tiếp tục xem sản phẩm
                  </button>

                  <div className="text-center text-[11px] text-[#7D715E] flex items-center justify-center gap-1.5 pt-1">
                    <ShieldCheck className="w-4 h-4 text-[#B88E4F]" />
                    <span>Bảo vệ quyền lợi người mua • Kiểm tra hàng trước khi thanh toán</span>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
