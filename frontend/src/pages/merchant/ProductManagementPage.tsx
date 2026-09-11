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
  ImagePlus,
  X,
  Tag,
  FolderTree,
  Coins,
  Percent,
  Boxes,
  Camera,
  UploadCloud,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
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
  const currentStoreId = localStorage.getItem('current_store_id') || undefined;

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<any | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form State
  const [formSku, setFormSku] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Chăm sóc da');
  const [formPrice, setFormPrice] = useState<number>(459000);
  const [formCommission, setFormCommission] = useState<number>(8);
  const [formStock, setFormStock] = useState<number>(100);
  const [formImage, setFormImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  // Thông báo trạng thái modal ra iframe cha để ẩn topbar & sidebar, mở toàn màn hình
  useEffect(() => {
    if (typeof window === 'undefined' || window.self === window.top) return;

    window.parent.postMessage(
      { type: 'SCANMS_PRODUCT_MODAL_STATE', open: showModal },
      window.location.origin,
    );

    return () => {
      if (showModal) {
        window.parent.postMessage(
          { type: 'SCANMS_PRODUCT_MODAL_STATE', open: false },
          window.location.origin,
        );
      }
    };
  }, [showModal]);

  const loadProducts = async () => {
    try {
      const res: any = await productService.getProducts({
        search: search || undefined,
        storeId: currentStoreId,
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
    setFormImage('');
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
    setFormImage(p.imageUrl || '');
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
          imageUrl: formImage || undefined,
        });
        showToast('Cập nhật sản phẩm & hoa hồng thành công!');
      } else {
        await productService.createProduct({
          storeId: currentStoreId,
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

  const handleImageUpload = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ảnh không được lớn hơn 5 MB');
      return;
    }
    setUploadingImage(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res: any = await api.post('/upload/image?folder=scanms/products', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = res?.data || res;
      const imageUrl = result?.secureUrl || result?.url;
      if (!imageUrl) throw new Error('Máy chủ không trả về đường dẫn ảnh');
      setFormImage(imageUrl);
      showToast('Tải ảnh sản phẩm thành công');
    } catch (err: any) {
      showToast(err.message || 'Không thể tải ảnh sản phẩm');
    } finally {
      setUploadingImage(false);
    }
  };


  // Mock catalog fallback if server returns empty list
  const demoProducts =
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

  void demoProducts;
  // Chỉ dùng dữ liệu thật từ PostgreSQL; không dùng danh sách demo cho CRUD.
  const displayProducts = products;

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
    <div className="flex flex-col gap-6 text-left max-w-7xl mx-auto w-full p-4 sm:p-6 min-h-screen">
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
              const rate = p.customCommissionRate ?? p.commissionRate ?? 10;
              const stock = p.stockQuantity ?? p.stock ?? 0;
              const img = p.imageUrl || p.images?.[0] || p.image || '';
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
                      {img ? (
                        <img
                          src={img}
                          alt={title}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-slate-50 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 shrink-0 flex items-center justify-center text-slate-400">
                          <ImagePlus size={17} />
                        </div>
                      )}
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
                          onClick={() => setDeleteConfirmProduct(p)}
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
              <div className="relative flex items-center">
                <Tag className="w-4 h-4 text-[#B88E4F] absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  placeholder="SR-VTC-15"
                  required
                  className="w-full bg-[#FAF8F5] border border-[#E8DAC4] rounded-xl pl-9 pr-3 py-2 text-sm text-[#1A1612] font-semibold focus:bg-white focus:border-[#B88E4F] focus:ring-2 focus:ring-[#B88E4F]/20 outline-none transition"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Danh mục</label>
              <div className="relative flex items-center">
                <FolderTree className="w-4 h-4 text-[#B88E4F] absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="Chăm sóc da"
                  required
                  className="w-full bg-[#FAF8F5] border border-[#E8DAC4] rounded-xl pl-9 pr-3 py-2 text-sm text-[#1A1612] font-semibold focus:bg-white focus:border-[#B88E4F] focus:ring-2 focus:ring-[#B88E4F]/20 outline-none transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Tên sản phẩm</label>
            <div className="relative flex items-center">
              <Package className="w-4 h-4 text-[#B88E4F] absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Serum Vitamin C 15% Dưỡng Sáng Đều Màu Da"
                required
                className="w-full bg-[#FAF8F5] border border-[#E8DAC4] rounded-xl pl-9 pr-3 py-2 text-sm text-[#1A1612] font-semibold focus:bg-white focus:border-[#B88E4F] focus:ring-2 focus:ring-[#B88E4F]/20 outline-none transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#1A1612] flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#B88E4F]" />
                <span>Ảnh sản phẩm</span>
              </label>
              <span className="text-[11px] font-semibold text-[#A89066]">
                Khuyến nghị tỷ lệ 1:1
              </span>
            </div>

            <div className="relative flex items-center gap-4 rounded-2xl border border-[#E8DAC4] bg-gradient-to-br from-[#FFFDF9] via-[#FAF6F0] to-[#F5EFE6] p-3.5 shadow-2xs">
              {/* Khung Icon / Preview Ảnh Cao Cấp */}
              <div
                onClick={() => document.getElementById('product-image-upload')?.click()}
                title="Bấm để tải ảnh lên"
                className="relative group cursor-pointer shrink-0"
              >
                {formImage ? (
                  <div className="relative w-[84px] h-[84px] rounded-2xl overflow-hidden border-2 border-[#D6BC8C] shadow-xs bg-white">
                    <img
                      src={formImage}
                      alt="Xem trước ảnh sản phẩm"
                      className="w-full h-full object-cover transition duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1 backdrop-blur-xs">
                      <Camera size={14} />
                      <span>Đổi</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-[84px] h-[84px] rounded-2xl border-2 border-dashed border-[#D6BC8C] bg-gradient-to-b from-[#FFFDF9] via-[#FAF5EC] to-[#F3E9D7] flex flex-col items-center justify-center transition-all duration-200 group-hover:border-[#B88E4F] group-hover:bg-[#FFF9EE] group-hover:shadow-xs">
                    {/* Inner glowing icon badge */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] border border-[#DEBE85]/70 flex items-center justify-center text-[#92400E] shadow-2xs group-hover:scale-110 transition-transform">
                      <ImagePlus size={20} className="text-[#92400E]" />
                    </div>
                    <span className="text-[9.5px] font-bold text-[#A89066] mt-1 tracking-wider uppercase">
                      Tải ảnh
                    </span>
                    {/* Corner mini gold plus badge */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-[#C59B58] to-[#B88E4F] text-white flex items-center justify-center shadow-xs border-2 border-white">
                      <Plus size={11} strokeWidth={3} />
                    </div>
                  </div>
                )}
              </div>

              {/* Thông tin & Nút hành động */}
              <div className="min-w-0 flex-1">
                <input
                  id="product-image-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={(event) => {
                    void handleImageUpload(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="product-image-upload"
                    className="inline-flex cursor-pointer items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#C59B58] to-[#B88E4F] hover:from-[#B88E4F] hover:to-[#9E783D] shadow-xs transition cursor-pointer"
                  >
                    <UploadCloud size={14} />
                    <span>{uploadingImage ? 'Đang tải ảnh...' : formImage ? 'Đổi ảnh khác' : 'Chọn ảnh từ máy'}</span>
                  </label>

                  {formImage && !uploadingImage && (
                    <button
                      type="button"
                      onClick={() => setFormImage('')}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                    >
                      <X size={13} />
                      <span>Xóa ảnh</span>
                    </button>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[#7D715E]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAF0DC] text-[#8C6B2D] font-bold text-[10px]">
                    JPG · PNG · WebP
                  </span>
                  <span>Tối đa 5 MB. Hiển thị trên sàn tiếp thị của KOL/CTV.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Giá bán lẻ (₫)</label>
              <div className="relative flex items-center">
                <Coins className="w-3.5 h-3.5 text-[#B88E4F] absolute left-3 pointer-events-none" />
                <input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  required
                  className="w-full bg-[#FAF8F5] border border-[#E8DAC4] rounded-xl pl-8 pr-2 py-2 text-sm text-[#1A1612] font-semibold focus:bg-white focus:border-[#B88E4F] focus:ring-2 focus:ring-[#B88E4F]/20 outline-none transition"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Hoa hồng (%)</label>
              <div className="relative flex items-center">
                <Percent className="w-3.5 h-3.5 text-[#B88E4F] absolute left-3 pointer-events-none" />
                <input
                  type="number"
                  value={formCommission}
                  onChange={(e) => setFormCommission(Number(e.target.value))}
                  required
                  className="w-full bg-[#FAF8F5] border border-[#E8DAC4] rounded-xl pl-8 pr-2 py-2 text-sm text-[#1A1612] font-semibold focus:bg-white focus:border-[#B88E4F] focus:ring-2 focus:ring-[#B88E4F]/20 outline-none transition"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tồn kho</label>
              <div className="relative flex items-center">
                <Boxes className="w-3.5 h-3.5 text-[#B88E4F] absolute left-3 pointer-events-none" />
                <input
                  type="number"
                  value={formStock}
                  onChange={(e) => setFormStock(Number(e.target.value))}
                  required
                  className="w-full bg-[#FAF8F5] border border-[#E8DAC4] rounded-xl pl-8 pr-2 py-2 text-sm text-[#1A1612] font-semibold focus:bg-white focus:border-[#B88E4F] focus:ring-2 focus:ring-[#B88E4F]/20 outline-none transition"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8DAC4]/60">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#7D715E] bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={uploadingImage}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#C59B58] to-[#B88E4F] hover:from-[#B88E4F] hover:to-[#9E783D] shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {uploadingImage ? 'Đang tải ảnh...' : 'Lưu thông tin sản phẩm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. MODAL XÁC NHẬN XÓA / TẠM DỪNG (Giữ nguyên màn hình phía sau) */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-[1.5px] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E8DAC4] w-full max-w-sm p-5 sm:p-6 text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3.5">
              <div className="w-10 h-10 bg-rose-50 border border-rose-200/60 rounded-xl flex items-center justify-center flex-shrink-0 text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#1A1612] m-0">Xác nhận tạm dừng sản phẩm</h3>
                <p className="text-[11px] text-[#7D715E] m-0 mt-0.5">Sản phẩm sẽ chuyển sang trạng thái ngừng bán</p>
              </div>
            </div>

            <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E8DAC4] text-xs text-[#7D6D55] space-y-1.5 mb-5">
              <div className="truncate">• <strong>Tên:</strong> {deleteConfirmProduct.title || deleteConfirmProduct.name}</div>
              <div>• <strong>Mã SKU:</strong> <span className="font-mono font-bold text-[#B88E4F]">{deleteConfirmProduct.sku}</span></div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmProduct(null)}
                className="px-4 py-2 text-xs font-bold text-[#7D715E] bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteConfirmProduct.id;
                  setDeleteConfirmProduct(null);
                  try {
                    await productService.softDeleteProduct(id);
                    showToast('Đã cập nhật trạng thái tạm dừng sản phẩm');
                    loadProducts();
                  } catch (err: any) {
                    showToast(err.message || 'Lỗi khi xóa sản phẩm');
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
