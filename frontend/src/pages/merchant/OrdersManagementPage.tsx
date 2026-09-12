import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  PackagePlus,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table';
import { productService, type Product } from '../../services/product.service';
import {
  orderService,
  type ExcelImportResult,
  type ManagedOrderStatus,
} from '../../services/order.service';
import { storeService } from '../../services/store.service';

interface ManualItemForm {
  productId: string;
  quantity: number;
  unitPrice: string;
}

const STATUS_OPTIONS: Array<{ value: ManagedOrderStatus; label: string }> = [
  { value: 'PENDING', label: 'Đang chuẩn bị' },
  { value: 'SHIPPING', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'RETURNED', label: 'Hoàn trả' },
];

const EMPTY_ITEM: ManualItemForm = {
  productId: '',
  quantity: 1,
  unitPrice: '',
};

export default function OrdersManagementPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'excel'>('manual');
  const [storeId, setStoreId] = useState<string>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  }>();
  const [orderCode, setOrderCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [status, setStatus] = useState<ManagedOrderStatus>('PENDING');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [items, setItems] = useState<ManualItemForm[]>([{ ...EMPTY_ITEM }]);
  const [excelFile, setExcelFile] = useState<File>();
  const [importResult, setImportResult] = useState<ExcelImportResult>();

  useEffect(() => {
    const loadData = async () => {
      try {
        const store = await storeService.getMyStore();
        setStoreId(store.id);
        const result = await productService.getProducts({
          storeId: store.id,
          limit: 100,
        });
        setProducts(result.items ?? []);
      } catch (error) {
        setNotice({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Không thể tải danh sách sản phẩm',
        });
      } finally {
        setLoadingProducts(false);
      }
    };
    void loadData();
  }, []);

  const estimatedSubtotal = useMemo(
    () =>
      items.reduce((total, item) => {
        const product = products.find(({ id }) => id === item.productId);
        const unitPrice = item.unitPrice
          ? Number(item.unitPrice)
          : Number(product?.price ?? 0);
        return total + unitPrice * Number(item.quantity || 0);
      }, 0),
    [items, products],
  );

  const updateItem = (
    index: number,
    field: keyof ManualItemForm,
    value: string | number,
  ) => {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const removeItem = (index: number) => {
    setItems((currentItems) =>
      currentItems.length === 1
        ? currentItems
        : currentItems.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const resetManualForm = () => {
    setOrderCode('');
    setCustomerName('');
    setCustomerPhone('');
    setShippingAddress('');
    setStatus('PENDING');
    setDiscountAmount('0');
    setItems([{ ...EMPTY_ITEM }]);
  };

  const handleManualSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(undefined);
    if (items.some((item) => !item.productId)) {
      setNotice({
        type: 'error',
        message: 'Vui lòng chọn sản phẩm cho tất cả các dòng',
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await orderService.createManualOrder({
        storeId,
        externalOrderSn: orderCode.trim() || undefined,
        customerName,
        customerPhone,
        shippingAddress,
        status,
        discountAmount: Number(discountAmount || 0),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
        })),
      });
      setNotice({
        type: 'success',
        message: `${result.message}: ${result.order.externalOrderSn}`,
      });
      resetManualForm();
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'Không thể tạo đơn',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExcelImport = async () => {
    setNotice(undefined);
    setImportResult(undefined);
    if (!excelFile) {
      setNotice({ type: 'error', message: 'Vui lòng chọn file .xlsx' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await orderService.importExcel(excelFile, storeId);
      setImportResult(result);
      setNotice({
        type: result.summary.errorRows > 0 ? 'error' : 'success',
        message: `Import xong: ${result.summary.importedOrders}/${result.summary.totalOrders} đơn thành công`,
      });
    } catch (error) {
      setNotice({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Không thể import file Excel',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="amber" size="sm">
            FR-20
          </Badge>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
            Quản lý đơn hàng
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tạo đơn thủ công hoặc đối soát hàng loạt từ file Excel.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'manual'
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Tạo đơn thủ công
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('excel')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'excel'
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Import Excel
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {notice.message}
        </div>
      )}

      {activeTab === 'manual' ? (
        <form onSubmit={handleManualSubmit} className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                <PackagePlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Thông tin người nhận</h2>
                <p className="text-xs text-slate-500">
                  Mã đơn có thể để trống để hệ thống tự sinh.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 text-xs font-semibold text-slate-600">
                Mã đơn
                <Input
                  value={orderCode}
                  onChange={(event) => setOrderCode(event.target.value)}
                  placeholder="MANUAL-20260912-001"
                />
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-600">
                Trạng thái
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as ManagedOrderStatus)
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-amber-500"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-600">
                Tên khách hàng *
                <Input
                  required
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-600">
                Số điện thoại *
                <Input
                  required
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-600 md:col-span-2">
                Địa chỉ giao hàng *
                <textarea
                  required
                  value={shippingAddress}
                  onChange={(event) => setShippingAddress(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                />
              </label>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Sản phẩm</h2>
                <p className="text-xs text-slate-500">
                  Bỏ trống đơn giá để sử dụng giá hiện tại trong hệ thống.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={() =>
                  setItems((currentItems) => [
                    ...currentItems,
                    { ...EMPTY_ITEM },
                  ])
                }
              >
                Thêm dòng
              </Button>
            </div>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 md:grid-cols-[1fr_120px_160px_40px]"
                >
                  <select
                    required
                    disabled={loadingProducts}
                    value={item.productId}
                    onChange={(event) =>
                      updateItem(index, 'productId', event.target.value)
                    }
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-amber-500"
                  >
                    <option value="">Chọn sản phẩm / SKU</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.sku} — {product.title}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={1}
                    required
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(index, 'quantity', Number(event.target.value))
                    }
                    placeholder="Số lượng"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(event) =>
                      updateItem(index, 'unitPrice', event.target.value)
                    }
                    placeholder="Đơn giá mặc định"
                  />
                  <button
                    type="button"
                    disabled={items.length === 1}
                    onClick={() => removeItem(index)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30"
                    aria-label={`Xóa dòng sản phẩm ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-semibold text-slate-600">
                Tiền giảm giá
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={discountAmount}
                  onChange={(event) => setDiscountAmount(event.target.value)}
                />
              </label>
              <div className="rounded-xl bg-slate-900 p-4 text-white">
                <p className="text-xs text-slate-300">Tạm tính</p>
                <p className="mt-1 text-xl font-extrabold">
                  {Math.max(
                    0,
                    estimatedSubtotal - Number(discountAmount || 0),
                  ).toLocaleString('vi-VN')}{' '}
                  ₫
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button type="submit" loading={submitting} variant="gold">
                Tạo đơn hàng
              </Button>
            </div>
          </Card>
        </form>
      ) : (
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Import file Excel</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Chỉ nhận file `.xlsx`, tối đa 5 MB. Các cột bắt buộc:{' '}
                  <code>
                    order_code, customer_name, customer_phone,
                    shipping_address, sku, quantity
                  </code>
                  . Cột tùy chọn: <code>status, unit_price, discount_amount</code>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-5 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center transition hover:border-amber-400 hover:bg-amber-50/30"
            >
              <Upload className="mb-3 h-8 w-8 text-amber-600" />
              <span className="text-sm font-bold text-slate-800">
                {excelFile ? excelFile.name : 'Chọn file Excel để import'}
              </span>
              <span className="mt-1 text-xs text-slate-500">
                Một đơn nhiều sản phẩm được biểu diễn bằng nhiều dòng cùng mã đơn.
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(event) => setExcelFile(event.target.files?.[0])}
            />
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="gold"
                loading={submitting}
                disabled={!excelFile}
                onClick={handleExcelImport}
              >
                Import đơn hàng
              </Button>
            </div>
          </Card>

          {importResult && (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ['Tổng số dòng', importResult.summary.totalRows],
                  ['Tổng số đơn', importResult.summary.totalOrders],
                  ['Import thành công', importResult.summary.importedOrders],
                  ['Đơn bị bỏ qua', importResult.summary.skippedOrders],
                ].map(([label, value]) => (
                  <Card key={label} className="p-4">
                    <p className="text-xs font-semibold text-slate-500">{label}</p>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900">
                      {value}
                    </p>
                  </Card>
                ))}
              </div>

              {importResult.errors.length > 0 && (
                <Card className="overflow-hidden">
                  <div className="border-b border-slate-100 p-5">
                    <h3 className="font-bold text-slate-900">
                      Chi tiết dòng lỗi
                    </h3>
                  </div>
                  <Table className="border-0 shadow-none">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dòng</TableHead>
                        <TableHead>Mã đơn</TableHead>
                        <TableHead>Trường</TableHead>
                        <TableHead>Lỗi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResult.errors.map((error, index) => (
                        <TableRow key={`${error.row}-${error.field}-${index}`}>
                          <TableCell className="font-bold">{error.row}</TableCell>
                          <TableCell>{error.orderCode ?? '—'}</TableCell>
                          <TableCell>{error.field ?? '—'}</TableCell>
                          <TableCell className="text-rose-600">
                            {error.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
