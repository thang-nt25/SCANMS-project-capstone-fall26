import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  PlusCircle,
  Search,
  Filter,
  Link2,
  Package,
  Pencil,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { productService, type Product } from '../../services/product.service';
import { authService } from '../../services/auth.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';

export default function ProductManagementPage() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const isKol = !currentUser?.role || currentUser?.role === 'COLLABORATOR';

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form State
  const [formSku, setFormSku] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Chăm sóc da');
  const [formPrice, setFormPrice] = useState<number>(459000);
  const [formCommission, setFormCommission] = useState<number>(8);
  const [formStock, setFormStock] = useState<number>(100);
  const [formImage, setFormImage] = useState('/assets/serum-hero-optimized.jpg');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res: any = await productService.getProducts({
        search: search || undefined,
      });
      setProducts(res.items || []);
    } catch (err) {
      console.error('Lỗi tải sản phẩm:', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(displayProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormSku('');
    setFormTitle('');
    setFormCategory('Chăm sóc da');
    setFormPrice(350000);
    setFormCommission(10);
    setFormStock(50);
    setFormImage('/assets/serum-hero-optimized.jpg');
    setShowModal(true);
  };

  const openEditModal = (p: any) => {
    setEditingProduct(p);
    setFormSku(p.sku || '');
    setFormTitle(p.title || p.name);
    setFormCategory(p.category || 'Chăm sóc da');
    setFormPrice(p.price);
    setFormCommission(p.customCommissionRate || p.commissionRate || 10);
    setFormStock(p.stockQuantity || p.stock || 0);
    setFormImage(p.imageUrl || p.images?.[0] || '/assets/serum-hero-optimized.jpg');
    setShowModal(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, {
          title: formTitle,
          price: Number(formPrice),
          customCommissionRate: Number(formCommission),
          stockQuantity: Number(formStock),
        });
        showToast('Cập nhật sản phẩm & hoa hồng thành công!');
      } else {
        await productService.createProduct({
          sku: formSku,
          title: formTitle,
          categoryName: formCategory,
          price: Number(formPrice),
          customCommissionRate: Number(formCommission),
          stockQuantity: Number(formStock),
          imageUrl: formImage,
        });
        showToast('Đã thêm sản phẩm mới vào danh mục!');
      }
      setShowModal(false);
      loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu sản phẩm');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xác nhận tạm dừng / ngừng kinh doanh sản phẩm này (Soft Delete)?')) return;
    try {
      await productService.softDeleteProduct(id);
      showToast('Đã cập nhật trạng thái tạm dừng sản phẩm');
      loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa sản phẩm');
    }
  };

  // Mock catalog fallback if server returns empty list
  const displayProducts =
    products.length > 0
      ? products
      : [
          {
            id: 'p-1',
            sku: 'SR-VTC-15',
            title: 'Serum Vitamin C 15% Dưỡng Sáng Đều Màu Da',
            category: 'Chăm sóc da',
            price: 459000,
            commissionRate: 8,
            stockQuantity: 120,
            status: 'active',
            images: ['/assets/serum-hero-optimized.jpg'],
          },
          {
            id: 'p-2',
            sku: 'SUN-SPF50-PA',
            title: 'Kem Chống Nắng Phổ Rộng SPF50+ PA++++ Kiểm Dầu',
            category: 'Chống nắng',
            price: 389000,
            commissionRate: 10,
            stockQuantity: 84,
            status: 'active',
            images: ['/assets/sunscreen-product.jpg'],
          },
          {
            id: 'p-3',
            sku: 'CL-GEL-TEA',
            title: 'Gel Rửa Mặt Tràm Trà Trị Mụn Dịu Nhẹ',
            category: 'Làm sạch',
            price: 219000,
            commissionRate: 12,
            stockQuantity: 0,
            status: 'out_of_stock',
            images: ['/assets/serum-hero-optimized.jpg'],
          },
          {
            id: 'p-4',
            sku: 'TN-BHA-2',
            title: 'Toner BHA 2% Thu Nhỏ Lỗ Chân Lông & Tẩy Tế Bào Chết',
            category: 'Toner & Nước hoa hồng',
            price: 349000,
            commissionRate: 7,
            stockQuantity: 45,
            status: 'active',
            images: ['/assets/serum-hero-optimized.jpg'],
          },
          {
            id: 'p-5',
            sku: 'MSK-HYA-5X',
            title: 'Mặt Nạ Cấp Ẩm Chuyên Sâu Hyaluronic Acid 5X',
            category: 'Mặt nạ',
            price: 199000,
            commissionRate: 15,
            stockQuantity: 15,
            status: 'paused',
            images: ['/assets/serum-hero-optimized.jpg'],
          },
        ];

  const filtered = displayProducts.filter((p: any) => {
    const title = p.title || p.name || '';
    const sku = p.sku || '';
    const matchSearch =
      title.toLowerCase().includes(search.toLowerCase()) ||
      sku.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'active' && (p.status === 'active' || p.isActive)) ||
      (filterStatus === 'out_of_stock' && (p.status === 'out_of_stock' || p.stockQuantity === 0)) ||
      (filterStatus === 'paused' && (p.status === 'paused' || p.isActive === false));
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col gap-6 text-left">
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 p-3.5 bg-slate-900 text-white rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight m-0">
            {isKol ? 'Kho Sản Phẩm & Mức Hoa Hồng' : 'Danh mục sản phẩm'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 m-0">
            {isKol
              ? 'Duyệt các sản phẩm có hoa hồng cao để lấy link tiếp thị hoặc đăng ký nhận hàng mẫu.'
              : 'Cập nhật tồn kho, giá bán và mức hoa hồng riêng cho từng sản phẩm.'}
          </p>
        </div>

        {!isKol ? (
          <Button
            variant="amber"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={openCreateModal}
          >
            Thêm sản phẩm
          </Button>
        ) : (
          <Button
            variant="amber"
            size="md"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => navigate('/collaborator/links')}
          >
            Tạo link tiếp thị
          </Button>
        )}
      </header>

      {/* 2. SEARCH & FILTER ROW */}
      <Card className="p-3.5 sm:p-4 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Tìm tên hoặc SKU sản phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="active">Đang bán</option>
              <option value="out_of_stock">Hết hàng</option>
              <option value="paused">Tạm dừng</option>
            </select>

            <Button variant="outline" size="sm" icon={<Filter className="w-3.5 h-3.5" />}>
              Bộ lọc
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. PRODUCT TABLE */}
      <Card className="p-0 overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filtered.length && filtered.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>Giá bán lẻ</TableHead>
              <TableHead>Hoa hồng CTV</TableHead>
              <TableHead>Tồn kho</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p: any) => {
              const title = p.title || p.name;
              const sku = p.sku || 'SKU';
              const price = p.price || 0;
              const rate = p.commissionRate || 10;
              const stock = p.stockQuantity ?? p.stock ?? 0;
              const img = p.images?.[0] || p.image || '/assets/serum-hero-optimized.jpg';
              const status =
                p.status || (p.isActive === false ? 'paused' : stock === 0 ? 'out_of_stock' : 'active');

              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={(e) => handleSelectOne(p.id, e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={img}
                        alt={title}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-slate-50 shrink-0"
                      />
                      <div className="min-w-0">
                        <strong className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                          {title}
                        </strong>
                        <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                          {sku}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-slate-900">
                    {price.toLocaleString('vi-VN')} ₫
                  </TableCell>
                  <TableCell>
                    <Badge variant="amber" className="font-extrabold text-xs">
                      {rate}%
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`font-semibold ${stock === 0 ? 'text-rose-600 font-bold' : 'text-slate-700'}`}
                  >
                    {stock}
                  </TableCell>
                  <TableCell>
                    {status === 'active' && <Badge variant="success">Đang bán</Badge>}
                    {status === 'out_of_stock' && <Badge variant="danger">Hết hàng</Badge>}
                    {status === 'paused' && <Badge variant="neutral">Tạm dừng</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    {isKol ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="amber"
                          size="sm"
                          icon={<Link2 className="w-3.5 h-3.5" />}
                          onClick={() => navigate('/collaborator/links')}
                        >
                          Lấy Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Package className="w-3.5 h-3.5" />}
                          onClick={() => navigate('/collaborator/samples')}
                        >
                          Xin mẫu
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
                          title="Chỉnh sửa sản phẩm"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="w-8 h-8 rounded-lg border border-slate-200 text-rose-500 hover:text-rose-700 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                          title="Tạm dừng / Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* 4. MODAL THÊM / SỬA SẢN PHẨM */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? 'Cập Nhật Sản Phẩm & Hoa Hồng' : 'Thêm Sản Phẩm Mới'}
        subtitle="Điền thông tin sản phẩm và thiết lập tỷ lệ chiết khấu cho KOL/CTV"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mã SKU</label>
              <input
                type="text"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                placeholder="SR-VTC-15"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Danh mục</label>
              <input
                type="text"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="Chăm sóc da"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Tên sản phẩm</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Serum Vitamin C 15% Dưỡng Sáng Đều Màu Da"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Giá bán lẻ (₫)</label>
              <input
                type="number"
                value={formPrice}
                onChange={(e) => setFormPrice(Number(e.target.value))}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Hoa hồng (%)</label>
              <input
                type="number"
                value={formCommission}
                onChange={(e) => setFormCommission(Number(e.target.value))}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tồn kho</label>
              <input
                type="number"
                value={formStock}
                onChange={(e) => setFormStock(Number(e.target.value))}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
              Hủy bỏ
            </Button>
            <Button variant="amber" type="submit">
              Lưu thông tin sản phẩm
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
