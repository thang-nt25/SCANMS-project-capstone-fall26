import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  ProductReviewModal,
  type ProductReviewTarget,
} from "../../components/reviews/ProductReviewModal";
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  MapPin,
  Phone,
  User,
  ArrowLeft,
  AlertCircle,
  Check,
  ChevronDown,
  CircleX,
  ClipboardList,
  PackageCheck,
  RotateCcw,
  Sparkles,
  Store,
  Tag,
  Star,
} from "lucide-react";
import api from "../../services/api";
import { Button } from "../../components/ui/Button";
import { PublicHeader } from "../../components/layout/PublicHeader";
import { Card } from "../../components/ui/Card";
import { getSafeProductImageUrl } from "@/utils/marketplace.utils";
import { GhnTrackingTimeline } from '../../components/shipping/GhnTrackingTimeline';
import { getGhnTrackingCode } from '../../utils/ghn-tracking';
import { isGeneratedGhnTestTrackingCode } from '../../utils/ghn-tracking-code';

interface OrderItem {
  id: string;
  productId: string;
  productTitle: string;
  sku: string;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderReview {
  images?: string[];
  video?: string | null;
  id: string;
  productId: string;
  rating: number;
  comment: string;
  createdAt: string;
  customerName?: string;
}

interface OrderData {
  trackingNumber?: string | null;
  carrierName?: string | null;
  ghnEnvironment?: 'LIVE' | 'TEST' | null;
  reviewToken?: string;
  id: string;
  externalOrderSn: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  subtotalAmount: number;
  discountAmount: number;
  shippingFee?: number | null;
  hasCollaboratorDiscount?: boolean;
  finalAmount: number;
  status: string;
  statusLabel: string;
  timelineStep: number;
  createdAt: string;
  updatedAt: string;
  store: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
  };
  attributedCollaborator?: {
    id: string;
    fullName: string;
  };
  items: OrderItem[];
  reviews?: OrderReview[];
}

const trackingFieldClass = "h-11 w-full rounded-[10px] border border-line bg-white pl-10 pr-3 text-sm text-ink outline-none transition-colors focus:border-brand-strong focus:ring-1 focus:ring-brand-strong";
const formatMoney = (amount: number) => `${amount.toLocaleString("vi-VN")} ₫`;

export default function OrderTrackingPage({ embedded = false }: { embedded?: boolean }) {
  const [searchParams] = useSearchParams();
  const accountLookup = embedded || Boolean(localStorage.getItem("token"));
  const validParam = (value: string | null) => {
    const normalized = value?.trim() || "";
    return normalized.toLowerCase() === "undefined" || normalized.toLowerCase() === "null"
      ? ""
      : normalized;
  };
  const getRecentOrderCode = () => {
    try {
      const saved = localStorage.getItem("scanms-recent-guest-order");
      const parsed = saved ? JSON.parse(saved) : null;
      return validParam(parsed?.publicOrderCode || null);
    } catch {
      return "";
    }
  };
  const initialPhone = embedded ? '' : validParam(searchParams.get("phone"));
  // `orderSn` được giữ để các liên kết cũ vẫn hoạt động.
  const initialSn = embedded ? '' :
    validParam(searchParams.get("sn")) ||
    validParam(searchParams.get("orderSn")) ||
    (!accountLookup && !initialPhone ? getRecentOrderCode() : "");

  const [phoneInput, setPhoneInput] = useState(initialPhone);
  const [orderSnInput, setOrderSnInput] = useState(initialSn);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [reviewTarget, setReviewTarget] = useState<ProductReviewTarget | null>(
    null,
  );
  const searchSequence = useRef(0);
  const lastLinkedSearch = useRef<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSearchRef = useRef<
    (phoneValue?: string, orderSnValue?: string) => Promise<void>
  >(() => Promise.resolve());


  useEffect(() => {
    const linkedSearch = JSON.stringify([initialPhone, initialSn]);
    if (linkedSearch === lastLinkedSearch.current) return;
    lastLinkedSearch.current = linkedSearch;
    setPhoneInput(initialPhone);
    setOrderSnInput(initialSn);
    if (initialPhone && initialSn) {
      handleSearchRef.current(initialPhone, initialSn);
    }
  }, [initialPhone, initialSn]);

  const handleSearch = async (phoneValue?: string, orderSnValue?: string) => {
    const phone = (phoneValue !== undefined ? phoneValue : phoneInput).trim();
    const orderSn = (orderSnValue !== undefined ? orderSnValue : orderSnInput).trim().replace(/^#+\s*/, '');
    if (!orderSn && !phone) {
      setErrorMessage("Vui lòng nhập mã đơn hàng hoặc số điện thoại nhận hàng để tra cứu.");
      return;
    }
    if (!accountLookup && (!orderSn || !phone)) {
      setErrorMessage(phone ? "Nhập thêm mã đơn hàng hoặc đăng nhập để tra cứu." : "Nhập thêm số điện thoại đặt hàng hoặc đăng nhập để tra cứu.");
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    const sequence = ++searchSequence.current;
    setHasSearched(true);

    try {
      const params: Record<string, string> = {};
      if (phone) params.phone = phone;
      if (orderSn) params.orderSn = orderSn;
      const res: any = await api.get(accountLookup ? "/orders/track/mine" : "/orders/track", { params, headers: { 'x-skip-cache': 'true' } });
      if (sequence !== searchSequence.current) return;
      if (res?.orders) {
        setOrders(res.orders);
      } else if (res?.data?.orders) {
        setOrders(res.data.orders);
      } else if (Array.isArray(res)) {
        setOrders(res);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      if (sequence !== searchSequence.current) return;
      setOrders([]);
      setErrorMessage(
        err?.response?.data?.message ||
        err?.message ||
        "Không tìm thấy thông tin đơn hàng nào phù hợp với từ khóa này.",
      );
    } finally {
      if (sequence === searchSequence.current) setLoading(false);
    }
  };
  handleSearchRef.current = handleSearch;

  const handleOpenReviewModal = (order: OrderData, item: OrderItem) => {
    setReviewTarget({
      productId: item.productId,
      productTitle: item.productTitle,
      imageUrl: item.imageUrl,
      externalOrderSn: order.externalOrderSn,
      customerPhone: phoneInput || order.customerPhone || "",
    });
  };

  const getTimelineSteps = (timelineStep: number, status: string) => {
    if (status === "CANCELLED") {
      return [
        {
          title: "Đã đặt hàng",
          icon: ClipboardList,
          done: true,
          current: false,
        },
        {
          title: "Đơn hàng đã hủy",
          icon: CircleX,
          done: true,
          current: true,
          isError: true,
        },
      ];
    }
    if (status === "RETURNED") {
      return [
        {
          title: "Đã đặt hàng",
          icon: ClipboardList,
          done: true,
          current: false,
        },
        {
          title: "Giao thành công",
          icon: PackageCheck,
          done: true,
          current: false,
        },
        {
          title: "Đã trả hàng",
          icon: RotateCcw,
          done: true,
          current: true,
          isError: true,
        },
      ];
    }

    const currentStep = status === "SHIPPING" ? 3
      : status === "DELIVERED" || status === "COMPLETED" ? 4
      : timelineStep || 1;
    return [
      { title: "Tiếp nhận", icon: ClipboardList },
      { title: "Chuẩn bị", icon: Package },
      { title: "Đang giao", icon: Truck },
      { title: "Đã giao", icon: PackageCheck },
    ].map(({ title, icon }, index) => ({
      title,
      icon,
      done: index + 1 < currentStep || status === "COMPLETED",
      current: index + 1 === currentStep && status !== "COMPLETED",
      isError: false,
    }));
  };

  return (
    <div className={`${embedded ? 'rounded-xl border border-[#EAE4D7] bg-white' : 'min-h-screen bg-[#FAF8F5]'} text-left flex flex-col font-sans overflow-x-clip relative`}>
      {/* Toast alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-white text-[#1A1612] px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-[#EEDFC6]">
          <CheckCircle2 className="w-4 h-4 text-[#B88E4F]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. TOP HEADER - SCANMS OFFICIAL TRACKING HEADER */}
      {!embedded && <PublicHeader />}

      <section className={`w-full ${embedded ? "p-4" : "mx-auto max-w-6xl px-4 pb-4 pt-5 sm:px-6 sm:pt-7"}`}>
        {!embedded && <nav aria-label="Điều hướng" className="mb-3">
            <Link to="/marketplace" className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-[#EAE4D7] bg-white px-3.5 text-sm font-semibold text-ink transition-colors hover:border-[#C59B58] hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F]">
              <ArrowLeft aria-hidden="true" className="size-4 text-[#795A2D]" />
              Cổng mua sắm
            </Link>
          </nav>}
        <div className={embedded ? "" : "rounded-2xl border border-line bg-white p-4 sm:p-5"}>
          {!embedded && <h1 className="mb-3 text-xl font-bold tracking-tight text-ink sm:text-2xl">Tra cứu đơn hàng</h1>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="grid w-full items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:gap-3"
          >
            <div className="relative flex-1">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                inputMode="tel"
                aria-label="Số điện thoại nhận hàng cần tra cứu"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Số điện thoại: 0933888999"
                className={trackingFieldClass}
              />
            </div>
            <span className="text-center text-xs text-muted">{accountLookup ? "hoặc" : "và"}</span>
            <div className="relative min-w-0">
              <Package className="w-4 h-4 text-[#7D715E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSnInput}
                onChange={(e) => setOrderSnInput(e.target.value.toUpperCase())}
                placeholder="Mã đơn: DH-2026-XXXXXXXX"
                aria-label="Mã đơn hàng cần tra cứu"
                className={trackingFieldClass}
              />
            </div>
            <Button
              type="submit"
              variant="gold"
              disabled={loading}
              className="h-11 rounded-[10px] px-5"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang tìm kiếm...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Tra cứu</span>
                </>
              )}
            </Button>
          </form>


          {!accountLookup && (
            <Link
              to={`/login?redirect=${encodeURIComponent(orderSnInput.trim() ? `/tracking?orderSn=${encodeURIComponent(orderSnInput.trim())}` : "/tracking")}`}
              className="mt-3 inline-block text-xs font-semibold text-[#795A2D] underline underline-offset-4"
            >
              Đăng nhập để tra cứu bằng một thông tin
            </Link>
          )}
        </div>
      </section>


      {(hasSearched || errorMessage) && <main aria-busy={loading} className={`mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-6 ${embedded ? "" : "sm:px-6"}`}>
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}


        {hasSearched && !loading && orders.length === 0 && !errorMessage && (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <AlertCircle className="w-8 h-8" />
            </div>
            <strong className="text-base text-[#1A1612]">
              Không tìm thấy đơn hàng
            </strong>
            <p className="text-xs text-[#7D715E] max-w-md m-0">
              {accountLookup ? 'Không tìm thấy đơn hàng khớp với thông tin đã nhập trong tài khoản của bạn. Vui lòng kiểm tra lại mã đơn hoặc số điện thoại.' : 'Không tìm thấy đơn hàng khớp với số điện thoại và mã đơn đã nhập. Vui lòng kiểm tra lại cả hai thông tin.'}
            </p>
          </div>
        )}


        {orders.map((order) => {
          const steps = getTimelineSteps(order.timelineStep, order.status);
          const ghnCode = getGhnTrackingCode(order);
          const trackingCode = order.trackingNumber?.trim();
          const canTrackGhn = ghnCode && !isGeneratedGhnTestTrackingCode(ghnCode);
          const shipmentReference = trackingCode && (
            <span className="inline-flex min-w-0 items-center gap-2 text-muted">
              <Truck className="size-4 shrink-0 text-brand-strong" />
              <span className="min-w-0 break-all">
                {order.carrierName || "Vận đơn"} · <strong className="font-semibold text-ink">{trackingCode}</strong>
              </span>
            </span>
          );
          const canReview =
            order.status === "DELIVERED" || order.status === "COMPLETED";

          return (
            <Card
              key={order.id}
              className="min-w-0 overflow-hidden"
            >

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FBF5EB] border border-[#EAE4D7] text-[#B88E4F] flex items-center justify-center">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="break-all text-base font-bold text-ink">
                      #{order.externalOrderSn}
                    </h2>
                    <div className="flex flex-wrap gap-x-2 text-xs text-muted">
                      {order.store?.id && <Link to={`/shops/${order.store.id}`} className="hover:underline">{order.store.name}</Link>}
                      <time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</time>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-brand-border bg-brand-soft px-3 py-1 text-xs font-semibold text-[#795A2D]">
                    {order.statusLabel}
                  </span>
                </div>
              </div>


              <div className="border-b border-line px-4 py-4 sm:px-5">
                <ol aria-label="Tiến trình đơn hàng" className="flex">
                  {steps.map((st, idx) => (
                    <li key={st.title} aria-current={st.current ? "step" : undefined}
                      className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
                    >
                      {idx < steps.length - 1 && <span aria-hidden="true" className={`absolute left-1/2 top-[19px] h-0.5 w-full ${st.done ? "bg-[#C59B58]" : "bg-[#EAE4D7]"}`} />}
                      <div
                        className={`relative z-10 flex size-10 items-center justify-center rounded-full border ${st.isError ? "border-rose-200 bg-rose-50 text-rose-700" : st.current ? "border-[#C59B58] bg-[#FBF5EB] text-[#795A2D] ring-2 ring-inset ring-[#EEDFC6]" : st.done ? "border-[#EEDFC6] bg-[#FBF5EB] text-[#795A2D]" : "border-[#EAE4D7] bg-[#FAF8F5] text-muted"}`}
                      >
                        <st.icon aria-hidden="true" className="size-[18px]" />
                        {st.done && !st.current && !st.isError && <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 flex size-[15px] items-center justify-center rounded-full border border-white bg-[#C59B58] text-[#231D15]">
                          <Check className="size-2.5" strokeWidth={2.5} />
                        </span>}
                      </div>
                      <strong className={`px-1 text-xs leading-tight ${st.done || st.current ? "font-semibold text-ink" : "font-medium text-muted"}`}>
                        {st.title}
                      </strong>
                    </li>
                  ))}
                </ol>
                {trackingCode && <div className="mt-4 border-t border-line pt-2 text-sm">
                  {canTrackGhn ? <details className="group">
                    <summary className="flex min-h-9 cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg [&::-webkit-details-marker]:hidden">
                      {shipmentReference}
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#795A2D]">
                        Xem hành trình <ChevronDown className="size-4 group-open:rotate-180" />
                      </span>
                    </summary>
                    <div className="mt-2">
                      <GhnTrackingTimeline orderCode={ghnCode} environment={order.ghnEnvironment || undefined} />
                    </div>
                  </details> : <div className="flex min-h-9 items-center">{shipmentReference}</div>}
                </div>}
              </div>


              <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-5">

                <div className="flex min-w-0 flex-col gap-3">
                  <h3 className="text-sm font-semibold text-ink">Sản phẩm ({order.items.length})</h3>

                  <div className="divide-y divide-line">
                    {order.items.map((item) => {
                      const itemReview = order.reviews?.find(
                        (r) => r.productId === item.productId,
                      );

                      return (
                        <div
                          key={item.id}
                          className="flex min-w-0 flex-col gap-2 py-3 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-center gap-3">
                            <Link
                              to={`/products/${item.sku || item.productId}`}
                              className="size-12 shrink-0 overflow-hidden rounded-lg border border-line bg-white transition-colors hover:border-brand"
                              title="Xem chi tiết sản phẩm"
                            >
                              <img
                                src={getSafeProductImageUrl(item.imageUrl, item.productTitle)}
                                alt={item.productTitle}
                                className="w-full h-full object-contain hover:scale-105 transition-transform"
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement;
                                  if (!target.dataset.hasFallback) {
                                    target.dataset.hasFallback = 'true';
                                    target.src = getSafeProductImageUrl(null, item.productTitle);
                                  }
                                }}
                              />
                            </Link>
                            <div className="min-w-0 flex-1">
                              <Link
                                to={`/products/${item.sku || item.productId}`}
                                className="line-clamp-2 break-words text-sm font-semibold leading-snug text-ink hover:underline"
                                title={item.productTitle}
                              >
                                {item.productTitle}
                              </Link>
                              <span className="break-words text-xs text-muted">
                                {item.sku && `${item.sku} · `}SL ${item.quantity}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <strong className="text-sm font-semibold tabular-nums text-ink">
                                {formatMoney(item.totalPrice)}
                              </strong>
                              {item.quantity > 1 && <span className="block text-[11px] tabular-nums text-muted">{formatMoney(item.unitPrice)}/món</span>}
                            </div>
                          </div>


                          {(itemReview || canReview) && <div className="flex justify-end">
                            {itemReview ? (
                              <div className="w-full bg-brand-soft border border-brand-border rounded-xl p-2.5 text-xs flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                                    {[...Array(itemReview.rating)].map(
                                      (_, i) => (
                                        <Star
                                          key={i}
                                          className="w-3.5 h-3.5 fill-current"
                                        />
                                      ),
                                    )}
                                    <span className="text-[11px] text-brand-strong ml-1 font-extrabold">
                                      {itemReview.rating}/5 sao • Đã đánh giá
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-[#7D715E]">
                                    {new Date(
                                      itemReview.createdAt,
                                    ).toLocaleDateString("vi-VN")}
                                  </span>
                                </div>
                                <p className="text-[11.5px] text-ink m-0 italic">
                                  "{itemReview.comment}"
                                </p>
                                {!!itemReview.images?.length && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {itemReview.images.map((url) => (
                                      <a
                                        key={url}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <img
                                          src={url}
                                          alt="Ảnh khách hàng đánh giá"
                                          loading="lazy"
                                          className="h-16 w-16 rounded-lg border border-line object-cover"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {itemReview.video && (
                                  <video
                                    src={itemReview.video}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="mt-2 max-h-52 w-full rounded-lg"
                                  >
                                    <track kind="captions" />
                                    Trình duyệt không hỗ trợ video.
                                  </video>
                                )}
                              </div>
                            ) : canReview ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="gold"
                                  onClick={() =>
                                    handleOpenReviewModal(order, item)
                                  }
                                  className="text-[11px] py-1 px-3 rounded-lg font-bold shadow-2xs cursor-pointer flex items-center gap-1"
                                >
                                  <Star className="w-3 h-3 fill-current" />
                                  <span>Viết đánh giá</span>
                                </Button>
                              </>
                            ) : null}
                          </div>}
                        </div>
                      );
                    })}
                  </div>


                  {order.hasCollaboratorDiscount && order.attributedCollaborator && (
                    <div className="p-3 rounded-2xl bg-[#FBF5EB] border border-[#EAE4D7] flex items-center gap-2.5 text-xs text-[#B88E4F]">
                      <Sparkles className="w-4 h-4 text-[#B88E4F] shrink-0" />
                      <span>
                        Ưu đãi từ đối tác{" "}
                        <strong className="text-[#1A1612]">
                          {order.attributedCollaborator.fullName}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>


                <div className="flex min-w-0 flex-col gap-3 border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-ink">Giao đến</h3>
                    <div className="flex flex-col gap-2 text-xs">
                      <div className="flex items-center gap-2 text-[#1A1612] font-bold">
                        <User className="w-3.5 h-3.5 text-[#B88E4F] shrink-0" />
                        <span>{order.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#7D715E]">
                        <Phone className="w-3.5 h-3.5 text-[#B88E4F] shrink-0" />
                        <span>{order.customerPhone}</span>
                      </div>
                      <div className="flex items-start gap-2 text-[#7D715E]">
                        <MapPin className="w-3.5 h-3.5 text-[#B88E4F] shrink-0 mt-0.5" />
                        <span className="leading-snug">
                          {order.shippingAddress}
                        </span>
                      </div>
                    </div>
                  </div>


                  <div className="flex flex-col gap-1.5 border-t border-line pt-3 text-xs tabular-nums">
                    <h3 className="mb-1 text-sm font-semibold text-ink">Thanh toán</h3>
                    <div className="flex justify-between text-[#7D715E]">
                      <span>Tiền hàng:</span>
                      <span className="font-semibold text-[#1A1612]">
                        {formatMoney(order.subtotalAmount)}
                      </span>
                    </div>
                    {order.shippingFee != null && (
                      <div className="flex justify-between gap-2 text-muted">
                        <span>Phí giao hàng</span>
                        <span className="font-semibold text-ink">{formatMoney(order.shippingFee)}</span>
                      </div>
                    )}

                    {order.discountAmount > 0 && (
                      <div className="flex justify-between text-brand-strong">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>Giảm giá</span>
                        </span>
                        <span className="font-bold">
                          −{formatMoney(order.discountAmount)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-baseline pt-2 border-t border-[#EAE4D7] text-sm">
                      <span className="font-bold text-[#1A1612]">
                        Tổng đơn
                      </span>
                      <strong className="text-base font-black text-[#B88E4F]">
                        {formatMoney(order.finalAmount)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </main>}

      {reviewTarget && (
        <ProductReviewModal
          target={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmitted={({ order, review }) => {
            setOrders((previous) =>
              previous.map((item) =>
                item.id === order.id
                  ? { ...item, reviews: [...(item.reviews ?? []), review] }
                  : item,
              ),
            );
            showToast("Đánh giá đã được lưu thành công. Cảm ơn bạn!");
          }}
        />
      )}
    </div>
  );
}
