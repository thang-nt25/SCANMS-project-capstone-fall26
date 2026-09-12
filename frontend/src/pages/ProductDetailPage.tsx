import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShoppingBag,
  ShieldCheck,
  Truck,
  RotateCcw,
  Store,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import api from '../services/api';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBought, setIsBought] = useState(false);

  useEffect(() => {
    // Cookie attribution được quản lý 100% phía Backend với HttpOnly: true để bảo mật.
    // Frontend không đọc hoặc chỉnh sửa cookie attribution.

    // 2. Lấy thông tin sản phẩm từ backend bằng API công khai (Public API - cho phép khách vãng lai)
    async function loadProduct() {
      setLoading(true);
      try {
        if (slug) {
          // 1. Thử lấy trực tiếp chi tiết sản phẩm qua API public /products/:id
          try {
            const detailRes: any = await api.get(`/products/${slug}`);
            const detailData = detailRes?.data || detailRes;
            if (detailData && (detailData.id || detailData.title)) {
              setProduct(detailData);
              return;
            }
          } catch {}
        }
        // 2. Fallback: Lấy danh sách sản phẩm public /products
        const res: any = await api.get('/products');
        const listData = res?.data?.items || res?.data || res || [];
        const prods = Array.isArray(listData) ? listData : [];
        const found = prods.find((p: any) => p.id === slug || p.sku === slug) || prods[0];
        if (found) {
          setProduct(found);
        }
      } catch (err) {
        console.warn('Lỗi khi tải thông tin sản phẩm từ server:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm">Đang tải thông tin sản phẩm...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">

      {/* Top Navbar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to="/marketplace"
            className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Chợ Tiếp Thị</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              SCANMS Marketplace
            </span>
          </div>
        </div>
      </div>

      {/* Main product showcase */}
      <div className="max-w-5xl mx-auto px-4 mt-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-8 p-6 sm:p-10">
          {/* Cột ảnh sản phẩm */}
          <div className="space-y-4">
            <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative group">
              <img
                src={product?.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600'}
                alt={product?.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <span className="absolute top-3 left-3 bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow">
                Hàng Chính Hãng
              </span>
            </div>
          </div>

          {/* Cột thông tin sản phẩm & Mua hàng */}
          <div className="flex flex-col justify-between">
            <div>
              {/* Cửa hàng */}
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <Store className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-slate-700">{product?.store?.name || 'Gian hàng chính hãng'}</span>
                <span>•</span>
                <span className="text-emerald-600">Đã xác minh</span>
              </div>

              {/* Tên sản phẩm */}
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-3">
                {product?.title || 'Tai nghe ANC Pro X'}
              </h1>

              {/* SKU & Danh mục */}
              <div className="flex items-center gap-3 text-xs text-slate-400 mb-6">
                <span>SKU: <strong className="text-slate-600">{product?.sku || 'TECH-001'}</strong></span>
                <span>•</span>
                <span>Danh mục: <strong className="text-slate-600">{product?.categoryName || 'Công nghệ'}</strong></span>
              </div>

              {/* Giá bán */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
                <div className="text-xs text-slate-500 mb-1">Giá bán niêm yết:</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-indigo-700">
                    {Number(product?.price || 1290000).toLocaleString('vi-VN')} đ
                  </span>
                  {product?.originalPrice && (
                    <span className="text-sm text-slate-400 line-through">
                      {Number(product.originalPrice).toLocaleString('vi-VN')} đ
                    </span>
                  )}
                </div>
              </div>

              {/* Cam kết dịch vụ */}
              <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-100 text-center text-xs text-slate-600 mb-6">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Bảo hành 12T</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Truck className="w-5 h-5 text-indigo-600" />
                  <span>Freeship toàn quốc</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <RotateCcw className="w-5 h-5 text-amber-600" />
                  <span>Đổi trả 7 ngày</span>
                </div>
              </div>
            </div>

            {/* Nút mua hàng */}
            <div>
              {isBought ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
                  <div className="font-bold text-sm">Đặt hàng thử nghiệm thành công!</div>
                  <div className="text-xs text-emerald-700 mt-0.5">
                    Đơn hàng đã được liên kết với mã tiếp thị của KOL theo quy tắc Last Click.
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsBought(true)}
                  className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-base rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Mua Ngay — Giao Hàng Tận Nơi</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
