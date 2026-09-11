import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  MapPin,
  Phone,
  User,
  ShoppingBag,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Store,
  Tag,
  Star,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

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
  id: string;
  productId: string;
  rating: number;
  comment: string;
  createdAt: string;
  customerName?: string;
}

interface OrderData {
  id: string;
  externalOrderSn: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  subtotalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: string;
  statusLabel: string;
  statusColor: string;
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

export default function OrderTrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPhone = searchParams.get('phone') || '';
  const initialSn = searchParams.get('sn') || '';

  const [searchInput, setSearchInput] = useState(initialPhone || initialSn || '');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Review Modal State (FR-18)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Tự động tìm kiếm nếu URL có sẵn param
  useEffect(() => {
    if (initialPhone || initialSn) {
      handleSearch(initialPhone || initialSn);
    }
  }, []);

  const handleSearch = async (queryStr?: string) => {
    const query = (queryStr !== undefined ? queryStr : searchInput).trim();
    if (!query) {
      setErrorMessage('Vui lòng nhập số điện thoại hoặc mã đơn hàng để tra cứu.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    setHasSearched(true);

    try {
      const isPhoneNumber = /^[0-9+() -]{9,15}$/.test(query);
      const params: Record<string, string> = {};
      if (isPhoneNumber) {
        params.phone = query;
        setSearchParams({ phone: query });
      } else {
        params.orderSn = query;
        setSearchParams({ sn: query });
      }

      const res: any = await api.get('/orders/track', { params });
      if (res?.orders) {
        setOrders(res.orders);
      } else if (res?.data?.orders) {
        setOrders(res.data.orders);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      setOrders([]);
      setErrorMessage(
        err.message || 'Không tìm thấy thông tin đơn hàng nào phù hợp với từ khóa này.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Mở Modal viết đánh giá cho 1 món trong đơn hàng
  const handleOpenReviewModal = (order: OrderData, item: OrderItem) => {
    setSelectedOrder(order);
    setSelectedItem(item);
    setRating(5);
    setComment('');
    setReviewerName(order.customerName || '');
    setReviewModalOpen(true);
  };

  // Gửi đánh giá 1-5 sao lên API (FR-18)
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedItem) return;

    if (comment.trim().length < 5) {
      showToast('Nội dung nhận xét tối thiểu 5 ký tự!');
      return;
    }

    setSubmittingReview(true);
    try {
      const res: any = await api.post(`/orders/${selectedOrder.id}/review`, {
        productId: selectedItem.productId,
        rating,
        comment: comment.trim(),
        customerName: reviewerName.trim() || selectedOrder.customerName,
      });

      const newReview: OrderReview = {
        id: res?.review?.id || `rev-${Date.now()}`,
        productId: selectedItem.productId,
        rating,
        comment: comment.trim(),
        customerName: reviewerName.trim() || selectedOrder.customerName,
        createdAt: new Date().toISOString(),
      };

      // Cập nhật ngay vào danh sách reviews của đơn hàng trong state
      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.id === selectedOrder.id) {
            return {
              ...ord,
              reviews: [...(ord.reviews || []), newReview],
            };
          }
          return ord;
        }),
      );

      setReviewModalOpen(false);
      showToast('Cảm ơn bạn đã gửi đánh giá 5 sao cho sản phẩm! ⭐⭐⭐⭐⭐');
    } catch (err: any) {
      showToast(err.message || 'Gửi đánh giá thất bại, vui lòng thử lại!');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getTimelineSteps = (currentStep: number, status: string) => {
    if (status === 'CANCELLED') {
      return [
        { title: 'Đã đặt hàng', desc: 'Đơn hàng được ghi nhận', done: true, current: false },
        { title: 'Đơn hàng đã hủy', desc: 'Giao dịch không tiếp tục', done: true, current: true, isError: true },
      ];
    }
    if (status === 'RETURNED') {
      return [
        { title: 'Đã đặt hàng', desc: 'Đơn hàng được ghi nhận', done: true, current: false },
        { title: 'Giao thành công', desc: 'Khách đã nhận hàng', done: true, current: false },
        { title: 'Đã hoàn trả (Return)', desc: 'Thu hồi & hoàn tiền', done: true, current: true, isError: true },
      ];
    }

    return [
      {
        step: 1,
        title: 'Tiếp nhận đơn',
        desc: 'Shop đã xác nhận',
        done: currentStep >= 1,
        current: currentStep === 1,
      },
      {
        step: 2,
        title: 'Đang đóng gói',
        desc: 'Chuẩn bị kiện hàng',
        done: currentStep >= 2,
        current: currentStep === 2,
      },
      {
        step: 3,
        title: 'Đang giao hàng',
        desc: 'Bàn giao GHN / GHTK',
        done: currentStep >= 3,
        current: currentStep === 3,
      },
      {
        step: 4,
        title: 'Giao thành công',
        desc: 'Khách đã nhận hàng',
        done: currentStep >= 4,
        current: currentStep === 4,
      },
    ];
  };

  const getRatingLabel = (stars: number) => {
    switch (stars) {
      case 1:
        return '1★ Rất thất vọng';
      case 2:
        return '2★ Chưa hài lòng';
      case 3:
        return '3★ Bình thường';
      case 4:
        return '4★ Hài lòng';
      case 5:
        return '5★ Cực kỳ hài lòng / Tuyệt vời!';
      default:
        return `${stars} sao`;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-left flex flex-col font-sans">
      {/* TOAST ALERT */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-[#231D15] text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-[#C59B58]">
          <CheckCircle2 className="w-4 h-4 text-[#B88E4F]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. TOP HEADER */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#EAE4D7] px-4 sm:px-8 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            to="/storefront"
            className="flex items-center gap-1.5 text-xs font-bold text-[#7D715E] hover:text-[#1A1612] transition"
          >
            <ArrowLeft className="w-4 h-4 text-[#B88E4F]" />
            <span>Quay lại Cửa hàng</span>
          </Link>
          <span className="text-[#D8D0C3]">|</span>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#C59B58] text-white font-extrabold text-sm flex items-center justify-center">
              S
            </span>
            <strong className="text-sm font-extrabold text-[#1A1612]">SCANMS Tracking</strong>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/storefront"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#1A1612] bg-[#FAF8F5] border border-[#EAE4D7] hover:bg-[#F3EFE6] transition"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#B88E4F]" />
            <span>Mua sắm</span>
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#C59B58] hover:bg-[#B88E4F] transition shadow-xs"
          >
            <span>Đăng nhập Đối tác</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* 2. HERO & SEARCH SECTION */}
      <section className="bg-gradient-to-b from-white to-[#F3EFE6]/60 border-b border-[#EAE4D7] px-4 sm:px-8 py-10">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide text-[#8A662C] bg-[#FBF5EB] border border-[#EEDFC6]">
            <Truck className="w-3.5 h-3.5 text-[#B88E4F]" />
            HỆ THỐNG TRA CỨU ĐƠN HÀNG & ĐÁNH GIÁ 5 SAO (FR-17 & FR-18)
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1612] tracking-tight leading-tight m-0">
            Theo Dõi Hành Trình Đơn Hàng Của Bạn
          </h1>
          <p className="text-xs sm:text-sm text-[#7D715E] max-w-xl m-0 leading-relaxed">
            Nhập <strong className="text-[#1A1612]">Số điện thoại đặt hàng</strong> hoặc{' '}
            <strong className="text-[#1A1612]">Mã vận đơn</strong> để kiểm tra tiến trình đóng gói, giao
            hàng và gửi đánh giá nhận quà ưu đãi.
          </p>

          {/* Search Box Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="w-full max-w-xl mt-2 flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#7D715E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="VD: 0933888999 hoặc ORD-20260909-001..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border-2 border-[#EAE4D7] text-xs sm:text-sm text-[#1A1612] outline-none focus:border-[#C59B58] shadow-xs transition"
              />
            </div>
            <Button
              type="submit"
              variant="gold"
              disabled={loading}
              className="py-3 px-6 rounded-2xl font-black text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang tìm kiếm...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Tra Cứu Đơn</span>
                </>
              )}
            </Button>
          </form>

          {/* Sample Tags for 1-Click Testing */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="text-[11px] text-[#7D715E] font-medium">Gợi ý kiểm thử:</span>
            <button
              type="button"
              onClick={() => {
                setSearchInput('0933888999');
                handleSearch('0933888999');
              }}
              className="text-[11px] font-bold text-[#8A662C] bg-[#FBF5EB] hover:bg-[#F5E7CC] border border-[#EEDFC6] px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              📱 0933888999 (Đơn mẫu hoàn tất)
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchInput('ORD-20260909-001');
                handleSearch('ORD-20260909-001');
              }}
              className="text-[11px] font-bold text-[#8A662C] bg-[#FBF5EB] hover:bg-[#F5E7CC] border border-[#EEDFC6] px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              📦 ORD-20260909-001
            </button>
          </div>
        </div>
      </section>

      {/* 3. ORDER RESULTS LIST */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Empty state before searching */}
        {!hasSearched && !loading && (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-3xl bg-[#FAF8F5] border border-[#EAE4D7] flex items-center justify-center text-[#B88E4F]">
              <Package className="w-8 h-8" />
            </div>
            <strong className="text-base text-[#1A1612]">Sẵn sàng tra cứu đơn hàng</strong>
            <p className="text-xs text-[#7D715E] max-w-md m-0">
              Vui lòng nhập số điện thoại hoặc mã đơn hàng ở thanh tìm kiếm phía trên để hiển thị trạng
              thái vận chuyển chi tiết.
            </p>
          </div>
        )}

        {/* Search result found 0 */}
        {hasSearched && !loading && orders.length === 0 && !errorMessage && (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <AlertCircle className="w-8 h-8" />
            </div>
            <strong className="text-base text-[#1A1612]">Không tìm thấy đơn hàng</strong>
            <p className="text-xs text-[#7D715E] max-w-md m-0">
              Không tìm thấy đơn hàng nào liên kết với thông tin <strong>"{searchInput}"</strong>. Vui lòng
              kiểm tra lại số điện thoại hoặc mã đơn.
            </p>
          </div>
        )}

        {/* Orders list */}
        {orders.map((order) => {
          const steps = getTimelineSteps(order.timelineStep, order.status);
          const canReview = order.status === 'DELIVERED' || order.status === 'COMPLETED';

          return (
            <Card
              key={order.id}
              className="bg-white border border-[#EAE4D7] rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition duration-200 flex flex-col"
            >
              {/* Order Header Bar */}
              <div className="p-4 sm:p-5 border-b border-[#EAE4D7] bg-[#FAF8F5]/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-[#7D715E] block">
                      {order.store?.name || 'Sora Skin Flagship'}
                    </span>
                    <strong className="text-sm sm:text-base font-black text-[#1A1612]">
                      #{order.externalOrderSn}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-black"
                    style={{
                      backgroundColor: `${order.statusColor}15`,
                      color: order.statusColor,
                      border: `1px solid ${order.statusColor}40`,
                    }}
                  >
                    {order.statusLabel}
                  </span>
                  <span className="text-[11px] text-[#7D715E] font-medium hidden sm:inline">
                    {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* TIMELINE PROGRESS BAR */}
              <div className="px-4 sm:px-6 py-6 border-b border-[#EAE4D7] bg-white">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative">
                  {steps.map((st, idx) => (
                    <div key={idx} className="flex flex-col items-center text-center gap-1.5 relative z-10">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition ${
                          st.done
                            ? 'bg-[#B88E4F] text-white shadow-xs'
                            : 'bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E]'
                        }`}
                      >
                        {st.done ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                      </div>
                      <strong className="text-xs font-bold text-[#1A1612] leading-tight">
                        {st.title}
                      </strong>
                      <small className="text-[10.5px] text-[#7D715E] leading-none">{st.desc}</small>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Body Details */}
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Col 1 & 2: Items List */}
                <div className="md:col-span-2 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-[#7D715E]">
                      Sản phẩm trong đơn ({order.items.length})
                    </span>
                    {canReview && (
                      <span className="text-[11px] font-bold text-[#8A662C] bg-[#FBF5EB] px-2 py-0.5 rounded-md border border-[#EEDFC6]">
                        ✓ Đủ điều kiện đánh giá 5 sao
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    {order.items.map((item) => {
                      const itemReview = order.reviews?.find(
                        (r) => r.productId === item.productId,
                      );

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE4D7] flex flex-col gap-2.5"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={item.imageUrl || '/assets/serum-hero-optimized.jpg'}
                              alt={item.productTitle}
                              className="w-14 h-14 rounded-xl object-contain bg-white border border-[#EAE4D7] shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <strong className="text-xs font-bold text-[#1A1612] block truncate">
                                {item.productTitle}
                              </strong>
                              <span className="text-[11px] text-[#7D715E] font-mono">
                                SKU: {item.sku} • Số lượng: x{item.quantity}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <strong className="text-xs sm:text-sm font-black text-[#B88E4F]">
                                {item.totalPrice.toLocaleString('vi-VN')} ₫
                              </strong>
                              <span className="text-[10px] text-[#7D715E] block">
                                {item.unitPrice.toLocaleString('vi-VN')} ₫/món
                              </span>
                            </div>
                          </div>

                          {/* REVIEW SECTION FOR THIS ITEM (FR-18) */}
                          <div className="border-t border-[#EAE4D7]/70 pt-2 flex items-center justify-between gap-2">
                            {itemReview ? (
                              <div className="w-full bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-2.5 text-xs flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                                    {[...Array(itemReview.rating)].map((_, i) => (
                                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                                    ))}
                                    <span className="text-[11px] text-emerald-800 ml-1 font-extrabold">
                                      {itemReview.rating}/5 sao • Đã đánh giá
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-[#7D715E]">
                                    {new Date(itemReview.createdAt).toLocaleDateString('vi-VN')}
                                  </span>
                                </div>
                                <p className="text-[11.5px] text-emerald-950 m-0 italic">
                                  "{itemReview.comment}"
                                </p>
                              </div>
                            ) : canReview ? (
                              <div className="w-full flex items-center justify-between gap-2 bg-white p-2 rounded-xl border border-[#EEDFC6]">
                                <div className="flex items-center gap-1.5 text-xs text-[#8A662C]">
                                  <Star className="w-4 h-4 text-amber-500" />
                                  <span className="text-[11.5px]">Bạn đã nhận sản phẩm này?</span>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="gold"
                                  onClick={() => handleOpenReviewModal(order, item)}
                                  className="text-[11px] py-1 px-3 rounded-lg font-bold shadow-2xs cursor-pointer flex items-center gap-1"
                                >
                                  <Star className="w-3 h-3 fill-current" />
                                  <span>Viết đánh giá</span>
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[10.5px] text-[#A49B8B] italic">
                                Đánh giá sẽ mở sau khi đơn hàng được giao thành công.
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* KOL ATTRIBUTION BADGE */}
                  {order.attributedCollaborator && (
                    <div className="p-3 rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6] flex items-center gap-2.5 text-xs text-[#8A662C]">
                      <Sparkles className="w-4 h-4 text-[#B88E4F] shrink-0" />
                      <span>
                        Đơn hàng nhận được ưu đãi độc quyền từ Đối tác Tiếp thị:{' '}
                        <strong className="text-[#1A1612]">
                          {order.attributedCollaborator.fullName}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Col 3: Customer & Payment Summary */}
                <div className="flex flex-col gap-4 border-t md:border-t-0 md:border-l border-[#EAE4D7] md:pl-6 pt-4 md:pt-0">
                  {/* Delivery Info */}
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-[#7D715E] block mb-2">
                      Thông tin giao nhận
                    </span>
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
                        <span className="leading-snug">{order.shippingAddress}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="pt-2 border-t border-[#EAE4D7] flex flex-col gap-1.5 text-xs">
                    <span className="text-xs font-black uppercase tracking-wider text-[#7D715E] block mb-1">
                      Chi tiết thanh toán
                    </span>
                    <div className="flex justify-between text-[#7D715E]">
                      <span>Tiền hàng:</span>
                      <span className="font-semibold text-[#1A1612]">
                        {order.subtotalAmount.toLocaleString('vi-VN')} ₫
                      </span>
                    </div>

                    {order.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>Ưu đãi giảm giá:</span>
                        </span>
                        <span className="font-bold">
                          -{order.discountAmount.toLocaleString('vi-VN')} ₫
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-baseline pt-2 border-t border-[#EAE4D7] text-sm">
                      <span className="font-bold text-[#1A1612]">Tổng thanh toán:</span>
                      <strong className="text-base font-black text-[#B88E4F]">
                        {order.finalAmount.toLocaleString('vi-VN')} ₫
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </main>

      {/* 4. MODAL VIẾT ĐÁNH GIÁ 5 SAO (FR-18) */}
      {reviewModalOpen && selectedItem && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAE4D7] rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-3">
              <div>
                <span className="text-[10.5px] font-black uppercase tracking-wider text-[#B88E4F]">
                  ĐÁNH GIÁ TRẢI NGHIỆM SẢN PHẨM
                </span>
                <h3 className="text-base font-black text-[#1A1612] m-0 mt-0.5">
                  Gửi Đánh Giá & Review 5 Sao
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="text-[#7D715E] hover:text-[#1A1612] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Summary Header */}
            <div className="flex items-center gap-3 p-3 bg-[#FAF8F5] rounded-2xl border border-[#EAE4D7]">
              <img
                src={selectedItem.imageUrl || '/assets/serum-hero-optimized.jpg'}
                alt={selectedItem.productTitle}
                className="w-12 h-12 rounded-xl object-contain bg-white border border-[#EAE4D7] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <strong className="text-xs font-bold text-[#1A1612] block truncate">
                  {selectedItem.productTitle}
                </strong>
                <span className="text-[11px] text-[#7D715E] font-mono">
                  Mã đơn: #{selectedOrder.externalOrderSn}
                </span>
              </div>
            </div>

            {/* Review Form */}
            <form onSubmit={handleSubmitReview} className="flex flex-col gap-4">
              {/* Star Rating Selector */}
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#FBF5EB] border border-[#EEDFC6]">
                <span className="text-xs font-bold text-[#8A662C]">Bạn cảm thấy thế nào về sản phẩm?</span>
                <div className="flex items-center gap-2 my-1">
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const isFilled = (hoverRating || rating) >= starValue;
                    return (
                      <button
                        key={starValue}
                        type="button"
                        onClick={() => setRating(starValue)}
                        onMouseEnter={() => setHoverRating(starValue)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-amber-500 hover:scale-125 transition duration-150 cursor-pointer outline-none"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            isFilled ? 'fill-amber-500 text-amber-500' : 'text-[#D8D0C3]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <strong className="text-xs font-black text-[#B88E4F]">
                  {getRatingLabel(hoverRating || rating)}
                </strong>
              </div>

              {/* Reviewer Name */}
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Họ tên của bạn
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="VD: Hoàng Minh Tuấn"
                  required
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl px-3.5 py-2 text-xs text-[#1A1612] outline-none focus:bg-white focus:border-[#C59B58]"
                />
              </div>

              {/* Review Comment Textarea */}
              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Nhận xét chi tiết * (Tối thiểu 5 ký tự)
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Chia sẻ cảm nhận thực tế của bạn về chất lượng sản phẩm, hiệu quả phục hồi da, mùi hương hoặc dịch vụ đóng gói giao hàng..."
                  required
                  className="w-full bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl p-3 text-xs text-[#1A1612] outline-none focus:bg-white focus:border-[#C59B58] resize-none"
                />
                <div className="flex justify-between items-center text-[10px] text-[#7D715E] mt-0.5">
                  <span>Khuyên dùng nhận xét khách quan giúp cộng đồng</span>
                  <span>{comment.length}/500 ký tự</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => setReviewModalOpen(false)}
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  disabled={submittingReview}
                  className="flex-1 text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                >
                  {submittingReview ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>Gửi Đánh Giá Ngay</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
