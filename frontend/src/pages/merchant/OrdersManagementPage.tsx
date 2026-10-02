import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  FileSpreadsheet,
  PackagePlus,
  Plus,
  Trash2,
  Upload,
  X,
  Search,
  Truck,
  CheckCircle2,
  Eye,
  RefreshCw,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Printer,
  Zap,
} from "lucide-react";
import { productService, type Product } from "../../services/product.service";
import {
  orderService,
  type ExcelImportResult,
  type StoreOrderRecord,
} from "../../services/order.service";
import { storeService } from "../../services/store.service";
import {
  loadShippingAddresses,
  type ShippingProvince,
} from "../../services/order-address.service";
import {
  moneyInCents,
  validateExcelFile,
  validateManualItems,
  type ManualItemForm,
} from "../../components/orders/manualOrderValidation";
import {
  ShippingLabel,
  generateTrackingCode,
  printShippingLabel,
} from "../../components/orders/ShippingLabel";
import { CustomSelect } from "../../components/ui/CustomSelect";

type OrderAction = "manual" | "excel";
interface Props {
  initialAction?: OrderAction;
  onClose?: () => void;
  onCompleted?: (message: string) => void;
}
const inputClass =
  "mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-surface-sand disabled:opacity-60";
const buttonClass =
  "rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-brand-soft disabled:opacity-50";
const newItem = (): ManualItemForm => ({
  id: crypto.randomUUID(),
  productId: "",
  quantity: "1",
  unitPrice: "",
});
const currency = (cents: number) =>
  (cents / 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 }) + " ₫";
const messageOf = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Không thể xử lý yêu cầu. Vui lòng thử lại";

export default function OrdersManagementPage({
  initialAction,
  onClose,
  onCompleted,
}: Props = {}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const [action, setAction] = useState<OrderAction | null>(
    initialAction ?? null,
  );
  const [storeId, setStoreId] = useState<string>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");
  const [reload, setReload] = useState(0);
  const [addresses, setAddresses] = useState<ShippingProvince[]>([]);
  const [addressError, setAddressError] = useState("");
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressReload, setAddressReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [notice, setNotice] = useState<{
    error: boolean;
    message: string;
  } | null>(null);
  const [orderCode, setOrderCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const [wardCode, setWardCode] = useState("");
  const [payment, setPayment] = useState<"COD" | "BANK_TRANSFER" | "E_WALLET">(
    "COD",
  );
  const [shippingFee, setShippingFee] = useState("0");
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState<{
    code: string;
    amount: number;
    fingerprint: string;
  } | null>(null);
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ManualItemForm[]>([newItem()]);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File>();
  const [result, setResult] = useState<ExcelImportResult>();

  // Real store orders list state
  const [orders, setOrders] = useState<StoreOrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [ordersRefreshCount, setOrdersRefreshCount] = useState(0);

  // Modals for order fulfillment & viewing
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<StoreOrderRecord | null>(null);
  const [returnResponse, setReturnResponse] = useState('');
  const [returnError, setReturnError] = useState('');
  const [respondingReturn, setRespondingReturn] = useState(false);
  const [shippingModalOrder, setShippingModalOrder] = useState<StoreOrderRecord | null>(null);
  const [shippingCarrier, setShippingCarrier] = useState("GHTK");
  const [shippingTrackingNumber, setShippingTrackingNumber] = useState("");
  const [shippingNote, setShippingNote] = useState("");
  const [updatingFulfillment, setUpdatingFulfillment] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [printPreviewOrder, setPrintPreviewOrder] = useState<StoreOrderRecord | null>(null);

  // ────── SHOP CANCEL ORDER ──────
  const [cancelModalOrder, setCancelModalOrder] = useState<StoreOrderRecord | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelCustomReason, setCancelCustomReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const CANCEL_REASONS = [
    "Khách hàng yêu cầu hủy đơn",
    "Sản phẩm tạm hết hàng trong kho",
    "Địa chỉ giao hàng không hợp lệ hoặc ngoài vùng phủ",
    "Không liên lạc được với khách hàng",
    "Khách đặt nhầm / thay đổi ý định",
    "Phát hiện đơn hàng nghi ngờ gian lận",
    "Lý do khác (nhập bên dưới)",
  ];

  useEffect(() => {
    let active = true;
    setOrdersLoading(true);
    orderService
      .getMyStoreOrders({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: orderSearchQuery.trim() || undefined,
        page: ordersPage,
        limit: 12,
        storeId,
      })
      .then((res) => {
        if (active && res) {
          setOrders(res.items || []);
          setOrdersTotal(res.pagination?.total || 0);
          setOrdersTotalPages(res.pagination?.totalPages || 1);
        }
      })
      .catch((err) => {
        console.error("Lỗi tải danh sách đơn hàng:", err);
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [storeId, statusFilter, ordersPage, ordersRefreshCount, orderSearchQuery]);

  const handleOpenShippingModal = (order: StoreOrderRecord) => {
    setShippingModalOrder(order);
    setShippingCarrier(order.carrierName || "GHTK");
    setShippingTrackingNumber(order.trackingNumber || "");
    setShippingNote("");
  };

  const handleSubmitShipping = async () => {
    if (!shippingModalOrder) return;
    if (!shippingTrackingNumber.trim()) {
      alert("Vui lòng nhập mã vận đơn bưu cục!");
      return;
    }
    setUpdatingFulfillment(true);
    try {
      await orderService.updateOrderFulfillment(shippingModalOrder.id, {
        status: "SHIPPING",
        carrierName: shippingCarrier,
        trackingNumber: shippingTrackingNumber.trim(),
        note: shippingNote.trim() || undefined,
      });
      setActionSuccessMsg(`Đã cập nhật đơn #${shippingModalOrder.externalOrderSn} sang Đang giao hàng!`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      setShippingModalOrder(null);
      setOrdersRefreshCount((c) => c + 1);
    } catch (err: any) {
      alert(err.message || "Không thể cập nhật trạng thái vận đơn");
    } finally {
      setUpdatingFulfillment(false);
    }
  };

  const handleConfirmDelivered = async (order: StoreOrderRecord) => {
    if (
      !window.confirm(
        `Xác nhận đơn hàng #${order.externalOrderSn} đã giao thành công? Tiền hoa hồng sẽ bắt đầu chu kỳ đối soát.`
      )
    ) {
      return;
    }
    setUpdatingFulfillment(true);
    try {
      await orderService.updateOrderFulfillment(order.id, {
        status: "DELIVERED",
      });
      setActionSuccessMsg(`Đã xác nhận giao thành công đơn #${order.externalOrderSn}!`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      setOrdersRefreshCount((c) => c + 1);
    } catch (err: any) {
      alert(err.message || "Không thể cập nhật trạng thái đơn hàng");
    } finally {
      setUpdatingFulfillment(false);
    }
  };

  const handleShopCancelOrder = async () => {
    if (!cancelModalOrder) return;
    const finalReason =
      cancelReason === "Lý do khác (nhập bên dưới)"
        ? cancelCustomReason.trim()
        : cancelReason;
    if (!finalReason) {
      alert("Vui lòng chọn hoặc nhập lý do hủy đơn!");
      return;
    }
    setCancelling(true);
    try {
      await orderService.shopCancelOrder(cancelModalOrder.id, finalReason);
      setActionSuccessMsg(
        `Đã hủy đơn #${cancelModalOrder.externalOrderSn} — Kho hàng đã được hoàn lại, hoa hồng KOL đã thu hồi.`
      );
      setTimeout(() => setActionSuccessMsg(null), 6000);
      setCancelModalOrder(null);
      setCancelReason("");
      setCancelCustomReason("");
      setOrdersRefreshCount((c) => c + 1);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể hủy đơn hàng. Vui lòng thử lại."
      );
    } finally {
      setCancelling(false);
    }
  };

  const handleReturnDecision = async (decision: 'APPROVE' | 'REJECT') => {
    if (!selectedOrderDetails?.returnRequest || returnResponse.trim().length < 10) {
      setReturnError('Vui lòng ghi rõ hướng xử lý (ít nhất 10 ký tự).');
      return;
    }
    if (!window.confirm(decision === 'APPROVE'
      ? 'Duyệt yêu cầu đổi trả? Thao tác này chưa chuyển hoặc hoàn tiền cho khách.'
      : 'Từ chối yêu cầu đổi trả và gửi lý do cho khách?')) return;
    setRespondingReturn(true);
    setReturnError('');
    try {
      const result = await orderService.respondReturnRequest(selectedOrderDetails.id, {
        decision,
        response: returnResponse.trim(),
      });
      setActionSuccessMsg(result.message);
      setSelectedOrderDetails(null);
      setReturnResponse('');
      setOrdersRefreshCount((count) => count + 1);
    } catch (error) {
      setReturnError(messageOf(error));
    } finally {
      setRespondingReturn(false);
    }
  };
    }
  };

  useEffect(() => {
    let active = true;
    setLoadingProducts(true);
    setProductError("");
    void (async () => {
      try {
        const store = await storeService.getMyStore();
        const all: Product[] = [];
        let page = 1;
        while (true) {
          const data = (await productService.getProducts({
            storeId: store.id,
            page,
            limit: 100,
          })) as { items: Product[]; pagination: { totalPages: number } };
          all.push(...data.items.filter((p) => p.isActive));
          if (page >= data.pagination.totalPages) break;
          page++;
          if (!active) return;
        }
        if (active) {
          setStoreId(store.id);
          setProducts(all);
        }
      } catch (error) {
        if (active) setProductError(messageOf(error));
      } finally {
        if (active) setLoadingProducts(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reload]);

  useEffect(() => {
    if (action !== "manual" || addresses.length) return;
    const controller = new AbortController();
    setLoadingAddresses(true);
    setAddressError("");
    void loadShippingAddresses(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setAddresses(data);
          setLoadingAddresses(false);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setAddressError(messageOf(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingAddresses(false);
      });
    return () => controller.abort();
  }, [action, addressReload, addresses.length]);

  useEffect(() => {
    if (!action || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [action]);

  useEffect(() => {
    if (!notice || !action) return;
    noticeRef.current?.scrollIntoView({ block: "nearest" });
    noticeRef.current?.focus({ preventScroll: true });
  }, [notice, action]);

  const province = addresses.find((p) => String(p.code) === provinceCode);
  const district = province?.districts.find(
    (d) => String(d.code) === districtCode,
  );
  const ward = district?.wards.find((w) => String(w.code) === wardCode);
  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          (moneyInCents(item.unitPrice) ?? 0) * (Number(item.quantity) || 0),
        0,
      ),
    [items],
  );
  const discountFingerprint = JSON.stringify({
    items: items.map(({ productId, quantity, unitPrice }) => ({
      productId,
      quantity,
      unitPrice,
    })),
    phone: phone.replace(/[()\s-]/g, ""),
    discountCode: discountCode.trim().toUpperCase(),
  });
  const appliedDiscount =
    discount?.fingerprint === discountFingerprint ? discount.amount : 0;
  const total = subtotal + (moneyInCents(shippingFee) ?? 0) - appliedDiscount;
  const locked = busy || applying;
  const availableProducts = products.filter((p) =>
    `${p.title} ${p.sku}`
      .toLocaleLowerCase("vi")
      .includes(search.toLocaleLowerCase("vi")),
  );
  const close = () => {
    if (inFlight.current) return;
    setAction(null);
    onClose?.();
  };
  const open = (next: OrderAction) => {
    setNotice(null);
    setAction(next);
  };
  const itemInputs = () =>
    items.map((item) => ({
      productId: item.productId,
      sku: products.find((p) => p.id === item.productId)?.sku,
      quantity: Number(item.quantity),
      unitPrice: (moneyInCents(item.unitPrice) ?? 0) / 100,
    }));
  const updateItem = (id: string, patch: Partial<ManualItemForm>) =>
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );

  async function applyDiscount() {
    if (inFlight.current) return;
    const error = validateManualItems(items, products);
    if (
      error ||
      !/^(0\d{9}|\+84\d{9})$/.test(phone.replace(/[()\s-]/g, "")) ||
      !discountCode.trim()
    ) {
      setNotice({
        error: true,
        message: error || "Nhập SĐT hợp lệ và mã giảm giá trước khi áp dụng",
      });
      return;
    }
    inFlight.current = true;
    setApplying(true);
    setNotice(null);
    setDiscount(null);
    try {
      const quote = await orderService.quoteDiscount({
        storeId,
        customerPhone: phone,
        discountCode: discountCode.trim(),
        items: itemInputs(),
      });
      setDiscount({
        code: quote.code,
        amount: Math.round(quote.discountAmount * 100),
        fingerprint: discountFingerprint,
      });
      setNotice({
        error: false,
        message: `${quote.message}: ${currency(Math.round(quote.discountAmount * 100))}`,
      });
    } catch (error) {
      setNotice({ error: true, message: messageOf(error) });
    } finally {
      inFlight.current = false;
      setApplying(false);
    }
  }

  async function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const error = validateManualItems(items, products);
    if (error || !storeId || productError) {
      setNotice({
        error: true,
        message: error || "Chưa tải được cửa hàng / sản phẩm",
      });
      return;
    }
    if (
      !name.trim() ||
      !address.trim() ||
      !province ||
      !district ||
      !/^(0\d{9}|\+84\d{9})$/.test(phone.replace(/[()\s-]/g, ""))
    ) {
      setNotice({
        error: true,
        message: "Điền đầy đủ tên, địa chỉ, tỉnh/huyện và SĐT Việt Nam hợp lệ",
      });
      return;
    }
    const shipping = moneyInCents(shippingFee);
    if (
      shipping === null ||
      shipping > 999999999999 ||
      !Number.isSafeInteger(total) ||
      total < 0 ||
      total > 999999999999999
    ) {
      setNotice({
        error: true,
        message: "Phí ship hoặc tổng tiền không hợp lệ",
      });
      return;
    }
    if (
      discountCode.trim() &&
      (!discount || discount.fingerprint !== discountFingerprint)
    ) {
      setNotice({
        error: true,
        message:
          "Vui lòng áp dụng lại mã giảm giá sau khi thay đổi thông tin đơn",
      });
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const response = await orderService.createManualOrder({
        storeId,
        requestId: requestId.current,
        externalOrderSn: orderCode.trim() || undefined,
        customer: {
          name: name.trim(),
          phone,
          email: email.trim() || undefined,
          address: address.trim(),
          province: province.name,
          district: district.name,
          ward: ward?.name,
        },
        items: itemInputs(),
        paymentMethod: payment,
        shippingFee: shipping / 100,
        discountCode:
          discount?.fingerprint === discountFingerprint
            ? discount.code
            : undefined,
        discountAmount: appliedDiscount / 100,
        note: note.trim() || undefined,
        totalAmount: total / 100,
      });
      const message = `${response.message}: ${response.order.externalOrderSn}`;
      setNotice({ error: false, message });
      onCompleted?.(message);
      setOrdersRefreshCount((c) => c + 1);
      close();
      requestId.current = crypto.randomUUID();
      setOrderCode("");
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setProvinceCode("");
      setDistrictCode("");
      setWardCode("");
      setShippingFee("0");
      setDiscountCode("");
      setDiscount(null);
      setNote("");
      setItems([newItem()]);
      setPayment("COD");
    } catch (error) {
      setNotice({ error: true, message: messageOf(error) });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function selectFile(next?: File) {
    setResult(undefined);
    setNotice(null);
    if (!next) return;
    const error = validateExcelFile(next);
    setFile(error ? undefined : next);
    if (error) setNotice({ error: true, message: error });
  }
  async function importExcel() {
    if (inFlight.current || !file) return;
    inFlight.current = true;
    setBusy(true);
    setResult(undefined);
    setNotice(null);
    try {
      const response = await orderService.importExcel(file, storeId);
      setResult(response);
      const message = `Đã xử lý: ${response.summary.importedOrders} đơn thành công, ${response.summary.skippedOrders} đơn bỏ qua, ${response.summary.errorRows} dòng lỗi`;
      setNotice({ error: response.errors.length > 0, message });
      if (response.summary.importedOrders) {
        onCompleted?.(message);
        setOrdersRefreshCount((c) => c + 1);
      }
    } catch (error) {
      setNotice({ error: true, message: messageOf(error) });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const noticeView = notice && (
    <div
      ref={noticeRef}
      tabIndex={-1}
      role={notice.error ? "alert" : "status"}
      className={`rounded-xl border p-3 text-sm ${notice.error ? "border-red-200 bg-red-50 text-danger" : "border-brand-border bg-brand-soft text-ink"}`}
    >
      {notice.message}
    </div>
  );
  return (
    <div className="space-y-6 text-ink text-left">
      {!initialAction && (
        <>
          {/* Quick Actions (Compact without bulky headers) */}
          <div className="flex items-center justify-end gap-2.5">
            <button
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#EAE4D7] bg-white text-[#1A1612] font-bold text-xs hover:bg-[#F3EFE6] transition shadow-2xs cursor-pointer"
              onClick={() => open("excel")}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#B88E4F]" />
              <span>Import Excel (FR-20)</span>
            </button>
            <button
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C59B58] text-white font-bold text-xs hover:bg-[#B88E4F] transition shadow-xs cursor-pointer"
              onClick={() => open("manual")}
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>Tạo đơn thủ công</span>
            </button>
          </div>

          {/* Success Alert Banner */}
          {actionSuccessMsg && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white border border-[#EAE4D7] rounded-2xl shadow-2xs">
              <span className="text-xs font-bold text-[#7D715E] block">Tổng đơn hàng</span>
              <strong className="text-xl sm:text-2xl font-black text-[#1A1612] mt-1 block">
                {ordersTotal}
              </strong>
            </div>
            <div className="p-4 bg-white border border-[#EAE4D7] rounded-2xl shadow-2xs">
              <span className="text-xs font-bold text-[#B88E4F] block">Chờ xử lý / Đóng gói</span>
              <strong className="text-xl sm:text-2xl font-black text-[#B88E4F] mt-1 block">
                {orders.filter((o) => o.status === "PENDING").length}
              </strong>
            </div>
            <div className="p-4 bg-white border border-[#EAE4D7] rounded-2xl shadow-2xs">
              <span className="text-xs font-bold text-[#2563EB] block">Đang giao bưu cục</span>
              <strong className="text-xl sm:text-2xl font-black text-[#2563EB] mt-1 block">
                {orders.filter((o) => o.status === "SHIPPING").length}
              </strong>
            </div>
            <div className="p-4 bg-white border border-[#EAE4D7] rounded-2xl shadow-2xs">
              <span className="text-xs font-bold text-emerald-600 block">Đã giao thành công</span>
              <strong className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block">
                {orders.filter((o) => o.status === "DELIVERED" || o.status === "COMPLETED").length}
              </strong>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="p-4 bg-white border border-[#EAE4D7] rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "ALL", label: "Tất cả" },
                { id: "PENDING", label: "Chờ lấy hàng" },
                { id: "SHIPPING", label: "Đang giao" },
                { id: "DELIVERED", label: "Đã giao" },
                { id: "CANCELLED", label: "Đã hủy" },
              ].map((tab) => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setStatusFilter(tab.id);
                      setOrdersPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      active
                        ? "bg-[#EBD08C] text-white shadow-2xs"
                        : "bg-[#F3EFE6] text-[#1A1612] hover:bg-[#EAE4D7]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-[#7D715E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm mã đơn, tên, SĐT..."
                  value={orderSearchQuery}
                  onChange={(e) => {
                    setOrderSearchQuery(e.target.value);
                    setOrdersPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-[#1A1612] outline-none focus:border-[#C59B58] focus:bg-white transition"
                />
              </div>
              <button
                onClick={() => setOrdersRefreshCount((c) => c + 1)}
                title="Tải lại danh sách"
                className="p-2 rounded-xl border border-[#EAE4D7] bg-white text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] transition"
              >
                <RefreshCw className={`w-4 h-4 ${ordersLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white border border-[#EAE4D7] rounded-2xl shadow-2xs overflow-hidden">
            {ordersLoading ? (
              <div className="p-12 text-center text-sm font-semibold text-[#7D715E]">
                Đang tải dữ liệu đơn hàng thực tế...
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FBF5EB] border border-[#EAE4D7] text-[#B88E4F] grid place-items-center">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1A1612]">Chưa có đơn hàng nào</h3>
                  <p className="text-xs text-[#7D715E] mt-1">
                    {orderSearchQuery || statusFilter !== "ALL"
                      ? "Không tìm thấy đơn hàng phù hợp với bộ lọc hiện tại."
                      : "Khi khách đặt hàng trên gian hàng hoặc bạn import đơn, danh sách sẽ hiển thị ở đây."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E] font-bold">
                      <th className="p-3.5">Mã đơn & Ngày tạo</th>
                      <th className="p-3.5">Khách hàng</th>
                      <th className="p-3.5">Sản phẩm</th>
                      <th className="p-3.5">Tổng tiền</th>
                      <th className="p-3.5">Trạng thái</th>
                      <th className="p-3.5">Vận đơn</th>
                      <th className="p-3.5">Hoa hồng CTV</th>
                      <th className="p-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE4D7]">
                    {orders.map((order) => {
                      const statusColor = {
                        PENDING: "bg-amber-50 text-amber-700 border-amber-200",
                        SHIPPING: "bg-blue-50 text-blue-700 border-blue-200",
                        DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
                        COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
                        CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
                        RETURN_REQUESTED: "bg-[#FBF5EB] text-[#B88E4F] border-[#EEDFC6]",
                        DISPUTED: "bg-[#FBF5EB] text-[#B88E4F] border-[#EEDFC6]",
                        RETURNED: "bg-purple-50 text-purple-700 border-purple-200",
                      }[order.status] || "bg-gray-50 text-gray-700 border-gray-200";

                      const statusText = {
                        PENDING: "Chờ lấy hàng",
                        SHIPPING: "Đang giao",
                        DELIVERED: "Đã giao",
                        COMPLETED: "Hoàn tất",
                        CANCELLED: "Đã hủy",
                        RETURN_REQUESTED: "Yêu cầu đổi trả",
                        DISPUTED: "Đang khiếu nại",
                        RETURNED: "Trả hàng",
                      }[order.status] || order.status;

                      return (
                        <tr key={order.id} className="hover:bg-[#FBF5EB]/40 transition">
                          {/* Mã đơn */}
                          <td className="p-3.5 align-top">
                            <strong className="text-[#1A1612] font-mono text-xs block">
                              #{order.externalOrderSn}
                            </strong>
                            <span className="text-[11px] text-[#7D715E] block mt-0.5">
                              {new Date(order.createdAt).toLocaleDateString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </td>

                          {/* Khách hàng */}
                          <td className="p-3.5 align-top">
                            <strong className="text-[#1A1612] block">
                              {order.customerName || "Khách lẻ"}
                            </strong>
                            <span className="text-[11px] text-[#7D715E] block mt-0.5">
                              {order.customerPhone}
                            </span>
                            <span className="text-[10.5px] text-[#7D715E] block truncate max-w-[180px]" title={order.shippingAddress}>
                              {order.shippingAddress}
                            </span>
                          </td>

                          {/* Sản phẩm */}
                          <td className="p-3.5 align-top">
                            <div className="flex flex-col gap-1 max-w-[200px]">
                              {order.items.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="flex items-center gap-1.5">
                                  <span className="w-4 h-4 rounded bg-[#F3EFE6] text-[10px] font-bold text-[#B88E4F] flex items-center justify-center shrink-0">
                                    {item.quantity}
                                  </span>
                                  <span className="truncate text-xs text-[#1A1612]" title={item.title}>
                                    {item.title}
                                  </span>
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <span className="text-[10px] text-[#7D715E] font-semibold">
                                  +{order.items.length - 2} sản phẩm khác
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Tổng tiền */}
                          <td className="p-3.5 align-top">
                            <strong className="text-xs font-black text-[#1A1612] block">
                              {order.finalAmount.toLocaleString("vi-VN")} ₫
                            </strong>
                            <span className="text-[10px] text-[#7D715E] block uppercase font-bold mt-0.5">
                              {order.paymentMethod}
                            </span>
                          </td>

                          {/* Trạng thái */}
                          <td className="p-3.5 align-top">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusColor}`}
                            >
                              {statusText}
                            </span>
                          </td>

                          {/* Vận đơn */}
                          <td className="p-3.5 align-top">
                            {order.trackingNumber ? (
                              <div className="flex flex-col">
                                <span className="font-mono text-[11px] font-bold text-[#1A1612]">
                                  {order.trackingNumber}
                                </span>
                                <span className="text-[10px] text-[#7D715E]">
                                  {order.carrierName || "Bưu cục"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#7D715E] italic">Chưa tạo vận đơn</span>
                            )}
                          </td>

                          {/* Hoa hồng CTV */}
                          <td className="p-3.5 align-top">
                            {order.totalCommission > 0 ? (
                              <div>
                                <strong className="text-xs font-bold text-[#B88E4F] block">
                                  +{order.totalCommission.toLocaleString("vi-VN")} ₫
                                </strong>
                                <span className="text-[10px] text-[#7D715E] block truncate max-w-[120px]">
                                  {order.attributedCollaborator?.fullName || order.couponCode || "CTV"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#7D715E]">—</span>
                            )}
                          </td>

                          {/* Thao tác */}
                          <td className="p-3.5 align-top text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {order.status === "PENDING" && (
                                <button
                                  onClick={() => handleOpenShippingModal(order)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#EBD08C] hover:bg-[#DEC07A] text-white text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
                                  title="Nhập mã vận đơn & chuyển sang Đang giao"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>Giao hàng</span>
                                </button>
                              )}

                              {order.status === "PENDING" && (
                                <button
                                  onClick={() => {
                                    setCancelModalOrder(order);
                                    setCancelReason("");
                                    setCancelCustomReason("");
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
                                  title="Shop hủy đơn — hoàn kho & thu hồi hoa hồng KOL"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Hủy đơn</span>
                                </button>
                              )}

                              {order.status === "SHIPPING" && (
                                <button
                                  onClick={() => handleConfirmDelivered(order)}
                                  disabled={updatingFulfillment}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-[11px] font-bold transition flex items-center gap-1 shadow-2xs disabled:opacity-50"
                                  title="Xác nhận khách đã nhận được hàng"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Đã giao</span>
                                </button>
                              )}

                              <button
                                  onClick={() => { setSelectedOrderDetails(order); setReturnResponse(''); setReturnError(''); }}
                                className="p-1.5 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#F3EFE6] text-[#7D715E] hover:text-[#1A1612] transition"
                                title="Xem chi tiết đơn"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {ordersTotalPages > 1 && (
              <div className="p-4 border-t border-[#EAE4D7] flex items-center justify-between text-xs text-[#7D715E]">
                <span>
                  Trang <strong className="text-[#1A1612]">{ordersPage}</strong> / {ordersTotalPages} (Tổng {ordersTotal} đơn)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={ordersPage <= 1}
                    onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#F3EFE6] disabled:opacity-40 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={ordersPage >= ordersTotalPages}
                    onClick={() => setOrdersPage((p) => Math.min(ordersTotalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#F3EFE6] disabled:opacity-40 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {!action && noticeView}
        </>
      )}

      {/* Modal Cập nhật Vận đơn Bưu cục (Shipping) */}
      {shippingModalOrder && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#EAE4D7] shadow-xl p-6 text-left flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-[#EAE4D7] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#1A1612] m-0">
                  Giao bưu cục • Đơn #{shippingModalOrder.externalOrderSn}
                </h3>
                <p className="text-xs text-[#7D715E] mt-0.5 m-0">
                  Nhập mã vận đơn từ bưu tá để khách và KOL có thể tra cứu.
                </p>
              </div>
              <button
                onClick={() => setShippingModalOrder(null)}
                className="p-1 rounded-lg text-[#7D715E] hover:bg-[#F3EFE6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* --- Auto-generate tracking number --- */}
              <div className="p-3 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4A3E2D]">Simulator: Tự sinh mã vận đơn</span>
                  <button
                    type="button"
                    onClick={() => {
                      const code = generateTrackingCode(shippingCarrier);
                      setShippingTrackingNumber(code);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition shadow-xs"
                    title="Tự động tạo mã vận đơn chuẩn TMĐT theo đơn vị vận chuyển"
                  >
                    <Zap className="w-3 h-3" />
                    Tự sinh mã
                  </button>
                </div>
                {shippingTrackingNumber && (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-mono text-xs font-bold text-[#1A1612] bg-white border border-[#EAE4D7] rounded-lg px-3 py-1.5 tracking-widest">{shippingTrackingNumber}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (shippingModalOrder) {
                          setPrintPreviewOrder({ ...shippingModalOrder, trackingNumber: shippingTrackingNumber, carrierName: shippingCarrier });
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#C59B58] bg-white text-[#B88E4F] hover:bg-[#FBF5EB] text-[11px] font-bold transition"
                      title="Xem trước và in phiếu giao hàng A6"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Xem phiếu
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Đơn vị vận chuyển *
                </label>
                <select
                  value={shippingCarrier}
                  onChange={(e) => setShippingCarrier(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs font-semibold outline-none focus:border-[#C59B58]"
                >
                  <option value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</option>
                  <option value="GHN">Giao Hàng Nhanh (GHN)</option>
                  <option value="Viettel Post">Viettel Post</option>
                  <option value="SCANMS Express">SCANMS Express (Tiêu chuẩn)</option>
                  <option value="J&T Express">J&T Express</option>
                  <option value="Hỏa Tốc / Grab">Hỏa Tốc / GrabExpress</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Mã vận đơn bưu cục *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: GHTK-88992211"
                  value={shippingTrackingNumber}
                  onChange={(e) => setShippingTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs font-semibold outline-none focus:border-[#C59B58]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1612] block mb-1">
                  Ghi chú đóng gói / giao hàng
                </label>
                <input
                  type="text"
                  placeholder="Kiểm hàng trước khi nhận, hàng dễ vỡ..."
                  value={shippingNote}
                  onChange={(e) => setShippingNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs outline-none focus:border-[#C59B58]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EAE4D7]">
              <button
                type="button"
                disabled={!shippingTrackingNumber.trim()}
                onClick={() => {
                  if (shippingModalOrder && shippingTrackingNumber.trim()) {
                    printShippingLabel(
                      shippingModalOrder,
                      shippingTrackingNumber.trim(),
                      shippingCarrier,
                      shippingNote.trim() || undefined,
                      shippingModalOrder.store?.name,
                    );
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#C59B58] bg-white text-[#B88E4F] text-xs font-bold hover:bg-[#FBF5EB] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Printer className="w-3.5 h-3.5" />
                In phiếu A6
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShippingModalOrder(null)}
                  className="px-4 py-2 rounded-xl border border-[#EAE4D7] text-xs font-bold text-[#7D715E] hover:bg-[#F3EFE6]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={updatingFulfillment}
                  onClick={handleSubmitShipping}
                  className="px-4 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition disabled:opacity-50 shadow-xs"
                >
                  {updatingFulfillment ? "Đang cập nhật..." : "Xác nhận gửi hàng"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ PRINT PREVIEW MODAL ══ */}
      {printPreviewOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#EAE4D7] flex flex-col gap-4 p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#1A1612] m-0 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-[#B88E4F]" /> Xem trước Phiếu Giao Hàng A6
                </h3>
                <p className="text-xs text-[#7D715E] mt-0.5 m-0">
                  Phiếu chuẩn 105×148mm — gồm Barcode Code-128 và QR tra cứu
                </p>
              </div>
              <button
                onClick={() => setPrintPreviewOrder(null)}
                className="p-1 rounded-lg text-[#7D715E] hover:bg-[#F3EFE6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-center overflow-x-auto">
              <ShippingLabel
                order={printPreviewOrder}
                trackingNumber={printPreviewOrder.trackingNumber || ""}
                carrier={printPreviewOrder.carrierName || "SCANMS Express"}
                note={shippingNote.trim() || undefined}
                storeName={printPreviewOrder.store?.name}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE4D7]">
              <button
                type="button"
                onClick={() => setPrintPreviewOrder(null)}
                className="px-4 py-2 rounded-xl border border-[#EAE4D7] text-xs font-bold text-[#7D715E] hover:bg-[#F3EFE6]"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  printShippingLabel(
                    printPreviewOrder,
                    printPreviewOrder.trackingNumber || "",
                    printPreviewOrder.carrierName || "SCANMS Express",
                    shippingNote.trim() || undefined,
                    printPreviewOrder.store?.name,
                  );
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                In Phiếu Giao Hàng A6
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL HỦY ĐƠN HÀNG (Shop chủ động) ══ */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-rose-200 shadow-xl p-6 text-left flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-rose-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-rose-700 m-0 flex items-center gap-2">
                  <X className="w-4 h-4" /> Hủy Đơn Hàng
                </h3>
                <p className="text-xs text-[#7D715E] mt-0.5 m-0">
                  Đơn <strong className="font-mono text-[#1A1612]">#{cancelModalOrder.externalOrderSn}</strong>
                  {" — "}{cancelModalOrder.customerName}
                </p>
              </div>
              <button
                onClick={() => setCancelModalOrder(null)}
                className="p-1 rounded-lg text-[#7D715E] hover:bg-rose-50 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thông tin tác động */}
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex flex-col gap-1">
              <p className="font-bold m-0">⚠️ Hành động này không thể hoàn tác. Khi hủy:</p>
              <ul className="list-disc pl-4 m-0 space-y-0.5">
                <li>Trạng thái đơn → <strong>ĐÃ HỦY</strong></li>
                <li>Tồn kho sản phẩm được <strong>hoàn lại tự động</strong></li>
                <li>Mã giảm giá (nếu có) được <strong>hoàn lượt sử dụng</strong></li>
                <li>Hoa hồng KOL đang tạm giữ bị <strong>thu hồi (Clawback)</strong></li>
              </ul>
            </div>

            {/* Chọn lý do */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#4A3E2D] block">
                Lý do hủy đơn <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-col gap-1.5">
                {CANCEL_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setCancelReason(r)}
                    className={`text-left px-3 py-2 rounded-xl border text-xs font-medium transition ${
                      cancelReason === r
                        ? "border-rose-400 bg-rose-50 text-rose-800 font-bold ring-2 ring-rose-300/50"
                        : "border-[#EAE4D7] bg-white text-[#4A3E2D] hover:border-rose-300 hover:bg-rose-50"
                    }`}
                  >
                    {cancelReason === r ? "✓ " : ""}{r}
                  </button>
                ))}
              </div>

              {cancelReason === "Lý do khác (nhập bên dưới)" && (
                <textarea
                  placeholder="Mô tả chi tiết lý do hủy đơn..."
                  value={cancelCustomReason}
                  onChange={(e) => setCancelCustomReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs outline-none focus:border-rose-400 resize-none"
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE4D7]">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2 rounded-xl border border-[#EAE4D7] text-xs font-bold text-[#7D715E] hover:bg-[#F3EFE6] disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={cancelling || !cancelReason || (cancelReason === "Lý do khác (nhập bên dưới)" && !cancelCustomReason.trim())}
                onClick={handleShopCancelOrder}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50 shadow-xs flex items-center gap-1.5"
              >
                {cancelling ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> Đang hủy...</>
                ) : (
                  <><X className="w-3.5 h-3.5" /> Xác nhận Hủy Đơn</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chi tiết Đơn hàng */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#EAE4D7] shadow-xl p-6 text-left flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#EAE4D7] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#1A1612] m-0">
                  Chi tiết Đơn hàng #{selectedOrderDetails.externalOrderSn}
                </h3>
                <p className="text-xs text-[#7D715E] mt-0.5 m-0">
                  Ngày đặt: {new Date(selectedOrderDetails.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="p-1 rounded-lg text-[#7D715E] hover:bg-[#F3EFE6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Khách hàng & Địa chỉ */}
            <div className="p-3 bg-[#FAF8F5] border border-[#EAE4D7] rounded-xl flex flex-col gap-1.5 text-xs">
              <strong className="text-xs font-bold text-[#1A1612]">Thông tin người nhận:</strong>
              <div>Họ tên: <strong className="text-[#1A1612]">{selectedOrderDetails.customerName}</strong></div>
              <div>Số điện thoại: <strong className="text-[#1A1612]">{selectedOrderDetails.customerPhone}</strong></div>
              {selectedOrderDetails.customerEmail && (
                <div>Email: <strong className="text-[#1A1612]">{selectedOrderDetails.customerEmail}</strong></div>
              )}
              <div>Địa chỉ: <strong className="text-[#1A1612]">{selectedOrderDetails.shippingAddress}</strong></div>
            </div>

            {/* Sản phẩm trong đơn */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#1A1612]">Sản phẩm ({selectedOrderDetails.items.length}):</span>
              <div className="divide-y divide-[#EAE4D7] border border-[#EAE4D7] rounded-xl overflow-hidden">
                {selectedOrderDetails.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs bg-white">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#F3EFE6] text-[#B88E4F] grid place-items-center font-bold text-xs shrink-0">
                        {item.quantity}x
                      </div>
                      <div>
                        <strong className="text-[#1A1612] block">{item.title}</strong>
                        {item.sku && <span className="text-[10px] text-[#7D715E] block">SKU: {item.sku}</span>}
                      </div>
                    </div>
                    <strong className="text-xs font-black text-[#1A1612] shrink-0">
                      {(item.unitPrice * item.quantity).toLocaleString("vi-VN")} ₫
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {selectedOrderDetails.returnRequest && (
              <section className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 space-y-3 text-xs">
                <h4 className="font-bold text-[#1A1612]">Hồ sơ đổi trả / hoàn tiền</h4>
                <p>Trạng thái: <strong>{selectedOrderDetails.returnRequest.status}</strong> · Gửi lúc {new Date(selectedOrderDetails.returnRequest.submittedAt).toLocaleString('vi-VN')}</p>
                <p>Lý do: <strong>{selectedOrderDetails.returnRequest.reason}</strong></p>
                {selectedOrderDetails.returnRequest.details && <p>{selectedOrderDetails.returnRequest.details}</p>}
                <div className="flex flex-wrap gap-2">
                  {selectedOrderDetails.returnRequest.imageUrls.map((url, index) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-[#B88E4F] underline">Ảnh {index + 1}</a>
                  ))}
                  <a href={selectedOrderDetails.returnRequest.unboxingVideoUrl} target="_blank" rel="noopener noreferrer" className="text-[#B88E4F] underline">Video mở hộp</a>
                </div>
                {selectedOrderDetails.returnRequest.shopResponse && <p>Phản hồi của Shop: {selectedOrderDetails.returnRequest.shopResponse}</p>}
                {selectedOrderDetails.returnRequest.status === 'REQUESTED' && (
                  <div className="space-y-2">
                    <label className="block font-bold">Hướng xử lý gửi khách
                      <textarea value={returnResponse} onChange={(event) => setReturnResponse(event.target.value)} maxLength={1000} rows={3}
                        className="mt-1 w-full rounded-xl border border-[#EAE4D7] bg-white p-3 font-normal outline-none focus:border-[#C59B58]" />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={respondingReturn || returnResponse.trim().length < 10} onClick={() => handleReturnDecision('APPROVE')}
                        className="rounded-xl bg-[#C59B58] px-4 py-2 font-bold text-white disabled:opacity-50">Duyệt yêu cầu</button>
                      <button type="button" disabled={respondingReturn || returnResponse.trim().length < 10} onClick={() => handleReturnDecision('REJECT')}
                        className="rounded-xl border border-[#DC2626] px-4 py-2 font-bold text-[#DC2626] disabled:opacity-50">Từ chối</button>
                    </div>
                    {returnError && <p role="alert" className="text-[#DC2626]">{returnError}</p>}
                    <p className="text-[#7D715E]">Duyệt yêu cầu không đồng nghĩa tiền đã được hoàn; cần đối soát thanh toán riêng.</p>
                  </div>
                )}
              </section>
            )}

            {/* Tài chính & Hoa hồng */}
            <div className="p-3 bg-[#FBF5EB] border border-[#EAE4D7] rounded-xl flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#7D715E]">Tiền hàng:</span>
                <span className="font-bold">{selectedOrderDetails.subtotalAmount.toLocaleString("vi-VN")} ₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7D715E]">Phí vận chuyển:</span>
                <span className="font-bold">{selectedOrderDetails.shippingFee.toLocaleString("vi-VN")} ₫</span>
              </div>
              {selectedOrderDetails.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Giảm giá (Coupon):</span>
                  <span className="font-bold">-{selectedOrderDetails.discountAmount.toLocaleString("vi-VN")} ₫</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#EAE4D7] pt-1.5 text-sm font-black text-[#1A1612]">
                <span>Tổng thanh toán:</span>
                <span className="text-[#B88E4F]">{selectedOrderDetails.finalAmount.toLocaleString("vi-VN")} ₫</span>
              </div>
              <div className="flex justify-between pt-1 text-[11px] text-[#7D715E]">
                <span>Hoa hồng KOL ghi nhận:</span>
                <span className="font-bold text-emerald-700">
                  +{selectedOrderDetails.totalCommission.toLocaleString("vi-VN")} ₫
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#EAE4D7]">
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="px-4 py-2 rounded-xl bg-[#EBD08C] hover:bg-[#DEC07A] text-white text-xs font-bold transition shadow-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {action &&
        createPortal(
          <dialog
            ref={dialogRef}
            aria-labelledby="order-dialog-title"
            className="m-auto max-h-[92dvh] w-[min(1100px,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-canvas p-0 text-ink shadow-2xl backdrop:bg-brand-dark/50"
            onCancel={(event) => {
              event.preventDefault();
              close();
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                const rect = event.currentTarget.getBoundingClientRect();
                if (
                  event.clientX < rect.left ||
                  event.clientX > rect.right ||
                  event.clientY < rect.top ||
                  event.clientY > rect.bottom
                )
                  close();
              }
            }}
          >
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-6 py-4">
              <div>
                <h2 id="order-dialog-title" className="text-xl font-bold">
                  {action === "manual"
                    ? "Tạo đơn thủ công"
                    : "Import đơn hàng từ Excel"}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  SCANMS · Đối soát đơn hàng
                </p>
              </div>
              <button
                type="button"
                disabled={locked}
                aria-label="Đóng"
                onClick={close}
                className="rounded-lg p-2 hover:bg-brand-soft disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </header>
            <div className="space-y-5 p-4 sm:p-6">
              {noticeView}
              {productError && (
                <div role="alert" className="text-sm text-danger">
                  {productError}{" "}
                  <button
                    className={buttonClass}
                    disabled={locked}
                    onClick={() => setReload((n) => n + 1)}
                  >
                    Tải lại cửa hàng
                  </button>
                </div>
              )}
              {action === "manual" ? (
                <form onSubmit={submitManual} className="space-y-5">
                  <fieldset disabled={locked} className="space-y-5">
                    <section className="rounded-2xl border border-line bg-white p-5">
                      <h3 className="mb-4 font-bold">Thông tin khách hàng</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm">
                          Họ tên khách hàng *
                          <input
                            autoFocus
                            required
                            maxLength={150}
                            className={inputClass}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="name"
                          />
                        </label>
                        <label className="text-sm">
                          Số điện thoại *
                          <input
                            required
                            type="tel"
                            maxLength={20}
                            placeholder="0901 234 567"
                            className={inputClass}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            autoComplete="tel"
                          />
                        </label>
                        <label className="text-sm">
                          Email
                          <input
                            type="email"
                            maxLength={255}
                            className={inputClass}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                          />
                        </label>
                        <label className="text-sm">
                          Mã đơn (tùy chọn)
                          <input
                            maxLength={100}
                            className={inputClass}
                            value={orderCode}
                            onChange={(e) => setOrderCode(e.target.value)}
                            placeholder="Để trống để tự sinh mã"
                          />
                        </label>
                        <label className="text-sm sm:col-span-2">
                          Địa chỉ giao hàng *
                          <textarea
                            required
                            maxLength={700}
                            rows={2}
                            className={inputClass}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Số nhà, đường, tòa nhà..."
                          />
                        </label>
                        <label className="text-sm">
                          Tỉnh/Thành phố *
                          <CustomSelect
                            className="mt-1"
                            required
                            disabled={loadingAddresses}
                            value={provinceCode}
                            onChange={(code) => {
                              setProvinceCode(code);
                              setDistrictCode("");
                              setWardCode("");
                            }}
                            placeholder={loadingAddresses ? "Đang tải địa chỉ..." : "Chọn tỉnh/thành phố"}
                            options={addresses.map((p) => ({ value: String(p.code), label: p.name }))}
                          />
                        </label>
                        <label className="text-sm">
                          Quận/Huyện *
                          <CustomSelect
                            className="mt-1"
                            required
                            disabled={!province}
                            value={districtCode}
                            onChange={(code) => {
                              setDistrictCode(code);
                              setWardCode("");
                            }}
                            placeholder="Chọn quận/huyện"
                            options={(province?.districts || []).map((d) => ({ value: String(d.code), label: d.name }))}
                          />
                        </label>
                        <label className="text-sm">
                          Phường/Xã
                          <CustomSelect
                            className="mt-1"
                            disabled={!district}
                            value={wardCode}
                            onChange={setWardCode}
                            placeholder="Chọn phường/xã (tùy chọn)"
                            options={(district?.wards || []).map((w) => ({ value: String(w.code), label: w.name }))}
                          />
                        </label>
                        <p className="self-center text-xs text-muted">
                          Danh mục địa chỉ giao hàng 3 cấp (v1, trước sắp xếp
                          hành chính). Địa chỉ mới có thể ghi bổ sung trong ghi
                          chú.
                        </p>
                        {addressError && (
                          <div
                            role="alert"
                            className="text-sm text-danger sm:col-span-2"
                          >
                            {addressError}{" "}
                            <button
                              type="button"
                              className={buttonClass}
                              onClick={() => setAddressReload((n) => n + 1)}
                            >
                              Tải lại địa chỉ
                            </button>
                          </div>
                        )}
                      </div>
                    </section>
                    <section className="rounded-2xl border border-line bg-white p-5">
                      <h3 className="mb-4 font-bold">Danh sách sản phẩm</h3>
                      <label className="text-sm">
                        Tìm sản phẩm / SKU
                        <input
                          type="search"
                          className={inputClass}
                          placeholder="Nhập tên sản phẩm hoặc SKU"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </label>
                      {loadingProducts && (
                        <p role="status" className="py-3 text-sm text-muted">
                          Đang tải sản phẩm của shop...
                        </p>
                      )}
                      {!loadingProducts && !products.length && (
                        <p className="py-3 text-sm text-danger">
                          Shop chưa có sản phẩm đang bán. Hãy thêm sản phẩm
                          trước khi tạo đơn.
                        </p>
                      )}
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[750px] text-sm">
                          <thead className="bg-brand-soft text-left text-muted">
                            <tr>
                              {[
                                "Sản phẩm *",
                                "SKU",
                                "SL *",
                                "Đơn giá *",
                                "Thành tiền",
                                "",
                              ].map((title, i) => (
                                <th key={i} className="p-2">
                                  {title}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, index) => {
                              const product = products.find(
                                (p) => p.id === item.productId,
                              );
                              const options =
                                product &&
                                !availableProducts.some(
                                  (p) => p.id === product.id,
                                )
                                  ? [product, ...availableProducts]
                                  : availableProducts;
                              return (
                                <tr
                                  key={item.id}
                                  className="border-b border-line"
                                >
                                  <td className="w-[34%] p-2">
                                    <select
                                      required
                                      aria-label={`Sản phẩm dòng ${index + 1}`}
                                      disabled={loadingProducts}
                                      className={inputClass}
                                      value={item.productId}
                                      onChange={(e) => {
                                        const selected = products.find(
                                          (p) => p.id === e.target.value,
                                        );
                                        updateItem(item.id, {
                                          productId: e.target.value,
                                          unitPrice: selected
                                            ? String(selected.price)
                                            : "",
                                          quantity: "1",
                                        });
                                      }}
                                    >
                                      <option value="">Chọn sản phẩm</option>
                                      {options.map((p) => (
                                        <option
                                          key={p.id}
                                          value={p.id}
                                          disabled={p.stockQuantity <= 0}
                                        >
                                          {p.title} (tồn: {p.stockQuantity})
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-2 text-muted">
                                    {product?.sku || "—"}
                                  </td>
                                  <td className="w-24 p-2">
                                    <input
                                      required
                                      aria-label={`Số lượng dòng ${index + 1}`}
                                      type="number"
                                      min={1}
                                      max={product?.stockQuantity || 1}
                                      step={1}
                                      className={inputClass}
                                      value={item.quantity}
                                      onChange={(e) =>
                                        updateItem(item.id, {
                                          quantity: e.target.value,
                                        })
                                      }
                                    />
                                  </td>
                                  <td className="w-40 p-2">
                                    <input
                                      required
                                      aria-label={`Đơn giá dòng ${index + 1}`}
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      className={inputClass}
                                      value={item.unitPrice}
                                      onChange={(e) =>
                                        updateItem(item.id, {
                                          unitPrice: e.target.value,
                                        })
                                      }
                                    />
                                  </td>
                                  <td className="whitespace-nowrap p-2 font-semibold">
                                    {currency(
                                      (moneyInCents(item.unitPrice) ?? 0) *
                                        (Number(item.quantity) || 0),
                                    )}
                                  </td>
                                  <td className="p-2">
                                    <button
                                      type="button"
                                      aria-label={`Xóa dòng sản phẩm ${index + 1}`}
                                      disabled={items.length === 1}
                                      onClick={() =>
                                        setItems((current) =>
                                          current.filter(
                                            (row) => row.id !== item.id,
                                          ),
                                        )
                                      }
                                      className="rounded-lg p-2 text-danger hover:bg-red-50 disabled:opacity-30"
                                    >
                                      <Trash2 size={17} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <button
                        type="button"
                        disabled={items.length >= 500}
                        className={`${buttonClass} mt-4`}
                        onClick={() =>
                          setItems((current) => [...current, newItem()])
                        }
                      >
                        <Plus size={16} className="mr-2 inline" />
                        Thêm sản phẩm
                      </button>
                    </section>
                    <section className="rounded-2xl border border-line bg-white p-5">
                      <h3 className="mb-4 font-bold">Thông tin đơn hàng</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm">
                          Phương thức thanh toán *
                          <select
                            required
                            className={inputClass}
                            value={payment}
                            onChange={(e) =>
                              setPayment(e.target.value as typeof payment)
                            }
                          >
                            <option value="COD">
                              COD — Thanh toán khi nhận hàng
                            </option>
                            <option value="BANK_TRANSFER">Chuyển khoản</option>
                            <option value="E_WALLET">Ví điện tử</option>
                          </select>
                          <span className="mt-1 block text-xs text-muted">
                            Ghi nhận phương thức, không xác nhận đã thanh toán.
                          </span>
                        </label>
                        <label className="text-sm">
                          Phí vận chuyển (₫) *
                          <input
                            required
                            type="number"
                            min={0}
                            max="9999999999.99"
                            step="0.01"
                            className={inputClass}
                            value={shippingFee}
                            onChange={(e) => setShippingFee(e.target.value)}
                          />
                          <span className="mt-1 block text-xs text-muted">
                            Nhập theo báo giá vận chuyển thực tế.
                          </span>
                        </label>
                        <label className="text-sm">
                          Mã giảm giá
                          <div className="flex items-center gap-2">
                            <input
                              maxLength={20}
                              className={inputClass}
                              value={discountCode}
                              onChange={(e) => setDiscountCode(e.target.value)}
                            />
                            <button
                              type="button"
                              className={`${buttonClass} mt-1 shrink-0`}
                              onClick={applyDiscount}
                              disabled={!discountCode.trim()}
                            >
                              {applying ? "Đang kiểm tra..." : "Áp dụng"}
                            </button>
                          </div>
                          {discountCode.trim() &&
                            discount?.fingerprint !== discountFingerprint && (
                              <span className="mt-1 block text-xs text-muted">
                                Mã chưa áp dụng hoặc thông tin đơn đã thay đổi.
                              </span>
                            )}
                        </label>
                        <label className="text-sm">
                          Ghi chú đơn hàng
                          <textarea
                            maxLength={1000}
                            rows={2}
                            className={inputClass}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                          />
                        </label>
                      </div>
                      <dl className="mt-5 space-y-2 rounded-xl bg-brand-soft p-4 text-sm">
                        <div className="flex justify-between">
                          <dt>Tổng tiền hàng</dt>
                          <dd>{currency(subtotal)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Phí vận chuyển</dt>
                          <dd>{currency(moneyInCents(shippingFee) ?? 0)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Giảm giá</dt>
                          <dd>− {currency(appliedDiscount)}</dd>
                        </div>
                        <div className="flex justify-between border-t border-brand-border pt-3 text-lg font-bold">
                          <dt>Tổng đơn hàng</dt>
                          <dd>{currency(total)}</dd>
                        </div>
                      </dl>
                    </section>
                  </fieldset>
                  <footer className="flex justify-end gap-3">
                    <button
                      type="button"
                      disabled={locked}
                      className={buttonClass}
                      onClick={close}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={
                        locked ||
                        loadingProducts ||
                        !products.length ||
                        !storeId ||
                        loadingAddresses ||
                        !addresses.length ||
                        Boolean(productError)
                      }
                      className={`${buttonClass} !border-brand !bg-brand !text-white hover:!bg-brand-strong`}
                    >
                      {busy ? "Đang tạo đơn..." : "Tạo đơn hàng"}
                    </button>
                  </footer>
                </form>
              ) : (
                <div className="space-y-5">
                  <p className="text-sm leading-6 text-muted">
                    Chỉ nhận .xlsx, tối đa 5 MB / 10.000 dòng. Cột bắt buộc:{" "}
                    <code>
                      order_code, customer_name, customer_phone,
                      shipping_address, sku, quantity
                    </code>
                    . Tùy chọn: <code>status, unit_price, discount_amount</code>
                    . SĐT cần định dạng Text để giữ số 0 đầu. Mỗi đơn được xử lý
                    trong transaction riêng; đơn hợp lệ vẫn được import khi đơn
                    khác lỗi.
                  </p>
                  <button
                    type="button"
                    disabled={locked}
                    className={buttonClass}
                    onClick={() => {
                      void orderService
                        .downloadExcelTemplate()
                        .catch((error: unknown) =>
                          setNotice({ error: true, message: messageOf(error) }),
                        );
                    }}
                  >
                    <Download size={16} className="mr-2 inline" />
                    Tải file Excel mẫu
                  </button>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!locked) {
                        if (e.dataTransfer.files.length !== 1)
                          setNotice({
                            error: true,
                            message: "Chỉ chọn một file Excel mỗi lần",
                          });
                        else selectFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-border bg-brand-soft px-6 py-10 text-center disabled:opacity-50"
                  >
                    <Upload className="text-brand-strong" />
                    <span className="font-semibold">
                      {file?.name || "Chọn hoặc kéo thả file Excel vào đây"}
                    </span>
                    <span className="text-xs text-muted">
                      {file
                        ? `${(file.size / 1024).toFixed(1)} KB`
                        : "File .xlsx · Tối đa 5 MB"}
                    </span>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx"
                    hidden
                    disabled={locked}
                    onChange={(e) => {
                      selectFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  {result && (
                    <section className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          ["Số dòng", result.summary.totalRows],
                          ["Số đơn", result.summary.totalOrders],
                          ["Thành công", result.summary.importedOrders],
                          ["Bỏ qua", result.summary.skippedOrders],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-xl border border-line bg-white p-3"
                          >
                            <p className="text-xs text-muted">{label}</p>
                            <p className="mt-1 text-xl font-bold">{value}</p>
                          </div>
                        ))}
                      </div>
                      {result.errors.length > 0 && (
                        <div className="max-h-72 overflow-auto rounded-xl border border-line bg-white">
                          <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-surface-sand">
                              <tr>
                                {["Dòng", "Mã đơn", "Trường", "Lỗi"].map(
                                  (title) => (
                                    <th key={title} className="p-3">
                                      {title}
                                    </th>
                                  ),
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {result.errors.map((error, index) => (
                                <tr
                                  key={`${error.row}-${index}`}
                                  className="border-t border-line"
                                >
                                  <td className="p-3">{error.row}</td>
                                  <td className="p-3">
                                    {error.orderCode || "—"}
                                  </td>
                                  <td className="p-3">{error.field || "—"}</td>
                                  <td className="p-3 text-danger">
                                    {error.message}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {result.importedOrders.length > 0 && (
                        <details className="rounded-xl border border-line bg-white p-3">
                          <summary className="cursor-pointer font-semibold">
                            Các đơn đã import ({result.importedOrders.length})
                          </summary>
                          <ul className="mt-2 space-y-1 text-sm">
                            {result.importedOrders.map((order) => (
                              <li key={order.orderId}>
                                {order.orderCode} · {order.itemCount} sản phẩm
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </section>
                  )}
                  <footer className="flex justify-end gap-3">
                    <button
                      type="button"
                      disabled={locked}
                      className={buttonClass}
                      onClick={close}
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      disabled={
                        locked ||
                        !file ||
                        loadingProducts ||
                        !storeId ||
                        Boolean(productError)
                      }
                      className={`${buttonClass} !border-brand !bg-brand !text-white hover:!bg-brand-strong`}
                      onClick={importExcel}
                    >
                      {busy ? "Đang xử lý file..." : "Import đơn hàng"}
                    </button>
                  </footer>
                </div>
              )}
            </div>
          </dialog>,
          document.body,
        )}
    </div>
  );
}
