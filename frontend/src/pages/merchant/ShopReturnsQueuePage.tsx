import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Image as ImageIcon } from 'lucide-react';
import { returnService, type ReturnStatus } from '../../services/return.service';
import { returnReasonLabel, returnStatusLabel } from '../../utils/return-status.utils';
import { caseProducts } from '../../components/returns/ReturnCaseProducts';
import { handleProductImageError } from '../../utils/image-fallback.utils';

const filters: Array<{ label: string; status?: ReturnStatus }> = [
  { label: 'Tất cả' },
  { label: 'Chờ Shop', status: 'REQUESTED' },
  { label: 'Đang kiểm tra', status: 'INSPECTING' },
  { label: 'Khiếu nại', status: 'DISPUTED' },
  { label: 'Chờ hoàn tiền', status: 'REFUND_PENDING' },
];

export default function ShopReturnsQueuePage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<ReturnStatus | undefined>();
  const [page, setPage] = useState(1);
  const queue = useQuery({
    queryKey: ['shop-returns', 'queue', page, status],
    queryFn: () => returnService.getShopQueue(page, status),
    refetchInterval: 30_000,
  });
  const targetId = params.get('returnId');
  const total = queue.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));

  return <main className="shop-returns-queue" aria-label="Hồ sơ đổi trả của Shop">
    <h1 className="sr-only">Hồ sơ đổi trả của Shop</h1>
    <div className="shop-returns-content">
      {targetId && <Link to={`/merchant/returns/${encodeURIComponent(targetId)}`}
        className="block rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-sm font-semibold text-[#795A2D]">
        Mở hồ sơ từ thông báo →
      </Link>}
      <div className="shop-returns-toolbar"><nav aria-label="Lọc hồ sơ đổi trả" className="shop-returns-filters">
        {filters.map((item) => <button type="button" key={item.label}
          aria-pressed={status === item.status} onClick={() => { setStatus(item.status); setPage(1); }}
          >
          {item.label}
        </button>)}
      </nav></div>
      {queue.isLoading && <p role="status" className="rounded-2xl border border-[#EAE4D7] bg-white p-5 text-sm">Đang tải hồ sơ…</p>}
      {queue.error && <div role="alert" className="rounded-2xl border border-[#F4B7B7] bg-white p-5 text-sm text-[#DC2626]">
        Không tải được hồ sơ đổi trả. Kiểm tra kết nối rồi thử lại.
        <button type="button" onClick={() => void queue.refetch()} className="ml-2 min-h-11 font-bold underline">Thử lại</button>
      </div>}
      {!queue.isLoading && !queue.error && queue.data?.items.length === 0 &&
        <p className="rounded-2xl border border-[#EAE4D7] bg-white p-5 text-sm text-[#7D715E]">Chưa có hồ sơ ở trạng thái này.</p>}
      {!queue.isLoading && !queue.error && Boolean(queue.data?.items.length) && <section className="shop-returns-list" aria-label="Danh sách hồ sơ đổi trả">
        <div className="shop-returns-columns" aria-hidden="true"><span>Đơn hàng / Sản phẩm</span><span>Yêu cầu</span><span>Trạng thái</span><span>Thao tác</span></div>
        {queue.data?.items.map(item => {
          const products = caseProducts(item);
          const first = products[0];
          const quantity = products.reduce((sum, product) => sum + product.quantity, 0);
          const awaiting = item.status === 'REQUESTED';
          return <article key={item.id} className="shop-returns-row" aria-label={`Hồ sơ ${item.order.externalOrderSn}`}>
            <div className="shop-returns-order"><span className="shop-returns-image">{first?.imageUrl ? <img src={first.imageUrl} alt={first.title} onError={handleProductImageError} /> : <ImageIcon size={20} aria-label="Chưa có ảnh sản phẩm" />}</span><div>
              <Link to={`/merchant/returns/${item.id}`} className="shop-returns-order-code">{item.order.externalOrderSn}</Link>
              <p className="shop-returns-product" title={products.map(product => `${product.title} × ${product.quantity}`).join('; ')}>{first?.title || 'Sản phẩm trong hồ sơ'}{products.length > 1 ? ` +${products.length - 1}` : ''}<span>{quantity > 0 ? ` · SL: ${quantity}` : ''}</span></p>
              {first?.variantName && <p className="shop-returns-variant">{first.variantName}</p>}
              <time dateTime={item.submittedAt}>{new Date(item.submittedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</time>
            </div></div>
            <div className="shop-returns-request"><p>{returnReasonLabel(item.reason)}</p><span>{item.preferredResolution === 'EXCHANGE' ? 'Đổi sản phẩm' : item.preferredResolution === 'REFUND' ? 'Trả hàng / Hoàn tiền' : 'Chưa ghi nhận phương án'}</span></div>
            <div className="shop-returns-status-cell"><span className="shop-returns-status" data-pending={awaiting}>{returnStatusLabel(item.status)}</span></div>
            <div className="shop-returns-action-cell"><Link to={`/merchant/returns/${item.id}`} className={`shop-returns-open${awaiting ? ' shop-returns-open-primary' : ''}`}>{awaiting ? 'Xử lý yêu cầu' : 'Xem hồ sơ'}<ChevronRight size={14} aria-hidden="true" /></Link></div>
          </article>;
        })}
      </section>}
      {!queue.error && total > 20 && <nav aria-label="Phân trang hồ sơ đổi trả" className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="min-h-11 rounded-xl border border-[#EAE4D7] bg-white px-4 disabled:opacity-50">Trang trước</button>
        <span className="text-sm text-[#7D715E]">Trang {page}/{pages} · {total} hồ sơ</span>
        <button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="min-h-11 rounded-xl border border-[#EAE4D7] bg-white px-4 disabled:opacity-50">Trang sau</button>
      </nav>}
    </div>
  </main>;
}
