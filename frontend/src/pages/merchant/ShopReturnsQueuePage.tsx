import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { returnService, type ReturnStatus } from '../../services/return.service';
import { returnReasonLabel, returnStatusLabel } from '../../utils/return-status.utils';

const filters: Array<{ label: string; status?: ReturnStatus }> = [
  { label: 'Tất cả' },
  { label: 'Chờ Shop', status: 'REQUESTED' },
  { label: 'Đang xử lý', status: 'INSPECTING' },
  { label: 'Khiếu nại', status: 'DISPUTED' },
  { label: 'Chờ hoàn tiền', status: 'REFUND_PENDING' },
];

export default function ShopReturnsQueuePage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<ReturnStatus | undefined>();
  const [page, setPage] = useState(1);
  const queue = useQuery({
    queryKey: ['shop-return-queue', page, status],
    queryFn: () => returnService.getShopQueue(page, status),
    refetchInterval: 30_000,
  });
  const targetId = params.get('returnId');
  const total = queue.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));

  return <main className="min-h-screen min-w-0 bg-[#FAF8F5] p-4 text-[#1A1612] sm:p-6">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B88E4F]">SCANMS · Đổi trả</p>
          <h1 className="mt-1 text-2xl font-black">Hồ sơ đổi trả của Shop</h1>
          <p className="mt-1 text-sm text-[#7D715E]">Theo dõi yêu cầu của khách và mở từng hồ sơ để xử lý, gửi bằng chứng hoặc xem kết luận Manager.</p>
        </div>
        <button type="button" onClick={() => void queue.refetch()} disabled={queue.isFetching}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#EAE4D7] bg-white px-4 text-sm disabled:opacity-50">
          <RefreshCw size={16} /> Làm mới
        </button>
      </header>
      {targetId && <Link to={`/merchant/returns/${encodeURIComponent(targetId)}`}
        className="block rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-sm font-semibold text-[#795A2D]">
        Mở hồ sơ từ thông báo →
      </Link>}
      <nav aria-label="Lọc hồ sơ đổi trả" className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => <button type="button" key={item.label}
          aria-pressed={status === item.status} onClick={() => { setStatus(item.status); setPage(1); }}
          className={`min-h-11 shrink-0 rounded-xl border px-4 text-sm font-semibold ${status === item.status
            ? 'border-[#C59B58] bg-[#FBF5EB] text-[#795A2D]' : 'border-[#EAE4D7] bg-white text-[#7D715E]'}`}>
          {item.label}
        </button>)}
      </nav>
      {queue.isLoading && <p role="status" className="rounded-2xl border border-[#EAE4D7] bg-white p-5 text-sm">Đang tải hồ sơ…</p>}
      {queue.error && <div role="alert" className="rounded-2xl border border-[#F4B7B7] bg-white p-5 text-sm text-[#DC2626]">
        Không tải được hồ sơ đổi trả. Kiểm tra kết nối rồi thử lại.
        <button type="button" onClick={() => void queue.refetch()} className="ml-2 min-h-11 font-bold underline">Thử lại</button>
      </div>}
      {!queue.isLoading && !queue.error && queue.data?.items.length === 0 &&
        <p className="rounded-2xl border border-[#EAE4D7] bg-white p-5 text-sm text-[#7D715E]">Chưa có hồ sơ ở trạng thái này.</p>}
      <div className="grid gap-3">
        {queue.data?.items.map((item) => <Link key={item.id} to={`/merchant/returns/${item.id}`}
          className="min-w-0 rounded-2xl border border-[#EAE4D7] bg-white p-4 text-[#1A1612] no-underline hover:border-[#C59B58] focus-visible:outline-2 focus-visible:outline-[#C59B58] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <strong className="break-all">#{item.order.externalOrderSn}</strong>
            <span className="rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-1 text-xs font-semibold text-[#795A2D]">{returnStatusLabel(item.status)}</span>
          </div>
          <p className="mt-2 text-sm">{item.items.map((line) => line.orderItem.product.title).join(', ') || 'Xem sản phẩm trong hồ sơ'}</p>
          <p className="mt-2 text-xs text-[#7D715E]">{returnReasonLabel(item.reason)} · {new Date(item.submittedAt).toLocaleString('vi-VN')}</p>
        </Link>)}
      </div>
      {!queue.error && total > 20 && <nav aria-label="Phân trang hồ sơ đổi trả" className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="min-h-11 rounded-xl border border-[#EAE4D7] bg-white px-4 disabled:opacity-50">Trang trước</button>
        <span className="text-sm text-[#7D715E]">Trang {page}/{pages} · {total} hồ sơ</span>
        <button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="min-h-11 rounded-xl border border-[#EAE4D7] bg-white px-4 disabled:opacity-50">Trang sau</button>
      </nav>}
    </div>
  </main>;
}
