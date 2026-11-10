import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { RefreshCw, Scale, Search, X } from 'lucide-react';
import { returnService, type ReturnDetail, type ReturnDisputeRecord } from '../../services/return.service';
import { ReturnTimeline } from '../../components/returns/ReturnTimeline';
import { toast } from '../../utils/toast';
import { returnStatusLabel } from '../../utils/return-status.utils';
import { searchReturnCases } from '../../utils/return-case-search';

type Ruling = 'APPROVE_REFUND' | 'APPROVE_EXCHANGE' | 'UPHOLD_SHOP';
type Liability = 'LOGISTICS_FAULT' | 'SHOP_FAULT' | 'CUSTOMER_REASON';
const ghnClaimLabels: Record<string, string> = {
  DRAFT: 'Chờ gửi GHN', SUBMITTED: 'Đã gửi GHN', NEEDS_MORE_EVIDENCE: 'Cần bổ sung bằng chứng',
  ACCEPTED: 'GHN chấp thuận', REJECTED: 'GHN từ chối', PAID: 'GHN đã thanh toán',
};
const disputeReasonLabels: Record<string, string> = {
  SHOP_REQUESTED_REVIEW: 'Shop đề nghị Manager xem xét',
  CUSTOMER_DISAGREES: 'Khách không đồng ý với Shop',
};

function QueuePager({ page, total, onPage }: { page: number; total?: number; onPage: (page: number) => void }) {
  if (!total || total <= 20) return null;
  const pages = Math.ceil(total / 20);
  return <nav aria-label="Phân trang hồ sơ" className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
    <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}
      className="min-h-11 rounded-xl border border-[#EAE4D7] bg-white px-3 disabled:opacity-40">Trang trước</button>
    <span className="px-2 text-[#7D715E]">Trang {page}/{pages} · {total} hồ sơ</span>
    <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}
      className="min-h-11 rounded-xl border border-[#EAE4D7] bg-white px-3 disabled:opacity-40">Trang sau</button>
  </nav>;
}

export default function AdminReturnDisputesPage() {
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ruling, setRuling] = useState<Ruling>('APPROVE_REFUND');
  const [liability, setLiability] = useState<Liability | ''>('');
  const [notes, setNotes] = useState('');
  const [caseSearch, setCaseSearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyInput, setHistoryInput] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [queuePages, setQueuePages] = useState({ active: 1, rejected: 1, ghn: 1, stalled: 1, disputes: 1 });
  const setQueuePage = (kind: keyof typeof queuePages, page: number) =>
    setQueuePages((current) => ({ ...current, [kind]: page }));
  const disputes = useQuery({
    queryKey: ['return-disputes', queuePages.disputes],
    queryFn: () => returnService.getOversightQueue<ReturnDisputeRecord>('disputes', queuePages.disputes),
    refetchInterval: 30_000,
  });
  const stalled = useQuery({
    queryKey: ['stalled-return-inspections', queuePages.stalled],
    queryFn: () => returnService.getOversightQueue<ReturnDetail>('stalled', queuePages.stalled),
    refetchInterval: 30_000,
  });
  const activeReturns = useQuery({
    queryKey: ['active-return-oversight', queuePages.active],
    queryFn: () => returnService.getOversightQueue<ReturnDetail>('active', queuePages.active),
    refetchInterval: 30_000,
  });
  const rejectedReturns = useQuery({
    queryKey: ['rejected-return-reviews', queuePages.rejected],
    queryFn: () => returnService.getOversightQueue<ReturnDetail>('rejected', queuePages.rejected),
    refetchInterval: 30_000,
  });
  const ghnClaims = useQuery({
    queryKey: ['ghn-claims', queuePages.ghn],
    queryFn: () => returnService.getOversightQueue<ReturnDetail>('ghn', queuePages.ghn),
    refetchInterval: 30_000,
  });
  const history = useQuery({
    queryKey: ['return-history', historyPage, historyQuery],
    queryFn: () => returnService.getAdminHistory(historyPage, historyQuery),
  });
  const resolve = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { ruling: Ruling; liability: Liability; notes: string } }) =>
      returnService.resolveDispute(id, data),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['return-disputes'] }),
        client.invalidateQueries({ queryKey: ['return-history'] }),
      ]);
      toast.success('Đã lưu quyết định phán quyết trọng tài thành công!');
      setSelectedId(null);
      setNotes('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể lưu quyết định. Vui lòng thử lại.');
    },
  });
  const openReview = useMutation({
    mutationFn: returnService.openRejectedReview,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['rejected-return-reviews'] }),
        client.invalidateQueries({ queryKey: ['return-disputes'] }),
      ]);
      toast.success('Đã mở hồ sơ phân xử cho Manager.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Không thể mở phân xử.'),
  });
  const rows = disputes.data?.items ?? [];
  const searchResults = searchReturnCases([
    ...(activeReturns.data?.items ?? []),
    ...(rejectedReturns.data?.items ?? []),
    ...(ghnClaims.data?.items ?? []),
    ...(stalled.data?.items ?? []),
    ...(history.data?.items ?? []),
    ...rows.map((item) => item.returnRequest),
  ], caseSearch);
  const queuesLoading = disputes.isLoading || activeReturns.isLoading || rejectedReturns.isLoading || ghnClaims.isLoading || stalled.isLoading || history.isLoading;
  const selected: ReturnDisputeRecord | undefined = rows.find((item) => item.id === selectedId) ?? rows[0];
  const canUpholdShop = !selected?.returnRequest.customerShipment?.receivedAt;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !liability || notes.trim().length < 20 || (ruling === 'UPHOLD_SHOP' && (!canUpholdShop || liability === 'LOGISTICS_FAULT')) ||
      (liability === 'LOGISTICS_FAULT' && !selected.returnRequest.order.outboundGhnTrackingNumber)) return;
    resolve.mutate({ id: selected.id, data: { ruling, liability, notes: notes.trim() } });
  }

  return <div className="w-full min-w-0 space-y-4 pb-6 text-[#1A1612]">
    <div className="w-full min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-3 pb-0.5">
        <span className="text-xs font-semibold text-[#7D715E]">Hồ sơ khiếu nại đổi trả và bồi hoàn GHN</span>
        <button type="button" onClick={() => { void disputes.refetch(); void stalled.refetch(); void activeReturns.refetch(); void ghnClaims.refetch(); void rejectedReturns.refetch(); void history.refetch(); }}
          disabled={disputes.isFetching || stalled.isFetching}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAE4D7] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1A1612] hover:bg-[#FBF5EB] disabled:opacity-50 cursor-pointer">
          <RefreshCw className="h-3.5 w-3.5 text-[#B88E4F]" /> Làm mới
        </button>
      </div>

      <section className="rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5" aria-label="Tìm hồ sơ đổi trả">
        <label htmlFor="return-case-search" className="text-sm font-bold">Tìm nhanh hồ sơ Flow 4</label>
        <p className="mt-1 text-xs text-[#7D715E]">Tìm trong các hàng đợi đã tải theo mã đơn, khách, gian hàng hoặc vận đơn GHN.</p>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] px-3 focus-within:border-[#B88E4F]">
          <Search className="h-4 w-4 shrink-0 text-[#B88E4F]" />
          <input id="return-case-search" value={caseSearch} onChange={(event) => setCaseSearch(event.target.value)}
            placeholder="Mã đơn, khách, shop, vận đơn…" className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" />
          {caseSearch && <button type="button" onClick={() => setCaseSearch('')} aria-label="Xóa tìm kiếm"
            className="rounded-lg p-1.5 text-[#7D715E] hover:bg-[#F3EFE6]"><X className="h-4 w-4" /></button>}
        </div>
        {caseSearch.trim() && <div className="mt-3" aria-live="polite">
          <p className="text-xs text-[#7D715E]">{queuesLoading ? 'Đang tải thêm hồ sơ…' : `${searchResults.length} hồ sơ phù hợp trong các hàng đợi hiện tại`}</p>
          {searchResults.length > 0 && <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {searchResults.slice(0, 12).map((item) => <li key={item.id}>
              <Link to={`/admin/returns/${item.id}`} className="block rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3 hover:border-[#C59B58] focus-visible:outline-2 focus-visible:outline-[#B88E4F]">
                <strong className="block text-sm">#{item.order.externalOrderSn}</strong>
                <span className="mt-1 block text-xs text-[#7D715E]">{item.order.storeName} · {item.order.customerName || 'Khách hàng'}</span>
                <span className="mt-1 block text-xs font-semibold text-[#795A2D]">{returnStatusLabel(item.status)}</span>
              </Link>
            </li>)}</ul>}
          {!queuesLoading && searchResults.length === 0 && <p className="mt-2 text-sm text-[#7D715E]">Không thấy hồ sơ phù hợp trong dữ liệu đã tải.</p>}
          {searchResults.length > 12 && <p className="mt-2 text-xs text-[#7D715E]">Hiển thị 12 hồ sơ mới nhất; nhập thêm thông tin để thu hẹp kết quả.</p>}
        </div>}
      </section>

      <nav aria-label="Đi nhanh đến nhóm hồ sơ" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { href: '#shop-rejected', label: 'Shop từ chối', count: rejectedReturns.data?.total, loading: rejectedReturns.isLoading },
          { href: '#active-returns', label: 'Đang xử lý', count: activeReturns.data?.total, loading: activeReturns.isLoading },
          { href: '#ghn-claims', label: 'Bồi hoàn GHN', count: ghnClaims.data?.total, loading: ghnClaims.isLoading },
          { href: '#stalled-returns', label: 'Quá 48 giờ', count: stalled.data?.total, loading: stalled.isLoading },
          { href: '#open-disputes', label: 'Cần phân xử', count: disputes.data?.total, loading: disputes.isLoading },
          { href: '#return-history', label: 'Đã kết thúc', count: history.data?.total, loading: history.isLoading },
        ].map((item) => <a key={item.href} href={item.href}
          className="flex min-h-20 items-center justify-between gap-2 rounded-xl border border-[#EAE4D7] bg-white p-3 transition last:col-span-2 sm:last:col-span-1 hover:border-[#C59B58] hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F]">
          <span className="text-xs font-semibold text-[#7D715E] sm:text-sm">{item.label}</span>
          <strong className="text-xl tabular-nums text-[#795A2D]" aria-label={item.loading ? 'Đang tải' : `${item.count ?? 0} hồ sơ`}>{item.loading ? '…' : item.count ?? 0}</strong>
        </a>)}
      </nav>

      <section id="shop-rejected" className="scroll-mt-6 rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-5" aria-label="Shop đã từ chối đổi trả">
        <h2 className="font-bold">Shop đã từ chối · Chờ Manager xem xét</h2>
        <p className="mt-1 text-xs text-[#7D715E]">Bao gồm cả đơn bị từ chối trước khi có nút gửi bằng chứng. Manager xem hồ sơ rồi mở phân xử khi cần; việc mở phân xử chưa phải kết luận Shop hay GHN có lỗi.</p>
        {rejectedReturns.isLoading && <p role="status" className="mt-3 text-sm">Đang tải đơn Shop từ chối…</p>}
        {rejectedReturns.error && <p role="alert" className="mt-3 text-sm text-[#DC2626]">Không tải được đơn Shop từ chối.</p>}
        {!rejectedReturns.isLoading && !rejectedReturns.error && rejectedReturns.data?.items.length === 0 && <p className="mt-3 text-sm text-[#7D715E]">Không có đơn Shop từ chối đang chờ xem xét.</p>}
        {!!rejectedReturns.data?.items.length && <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rejectedReturns.data.items.map((item) => <div key={item.id} className="rounded-xl border border-[#EAE4D7] bg-white p-3">
            <strong className="block text-sm">#{item.order.externalOrderSn}</strong>
            <span className="mt-1 block text-xs text-[#7D715E]">{item.order.storeName}</span>
            {item.shopResponse && <p className="mt-2 line-clamp-2 text-xs">Shop: {item.shopResponse}</p>}
            <p className="mt-2 text-xs text-[#7D715E]">Bằng chứng Shop: {item.events.filter((event) => event.type === 'SHOP_EVIDENCE_SUBMITTED').flatMap((event) => event.data?.evidenceUrls || []).length} tệp</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/admin/returns/${item.id}`} className="rounded-lg border border-[#EEDFC6] px-3 py-2 text-xs font-semibold text-[#8A6736]">Xem hồ sơ</Link>
              <button type="button" disabled={openReview.isPending} onClick={() => openReview.mutate(item.id)}
                className="rounded-lg bg-[#C59B58] px-3 py-2 text-xs font-bold text-[#231D15] disabled:opacity-50">Mở phân xử</button>
            </div>
          </div>)}
        </div>}
        <QueuePager page={queuePages.rejected} total={rejectedReturns.data?.total} onPage={(page) => setQueuePage('rejected', page)} />
      </section>

      <section id="active-returns" className="scroll-mt-6 rounded-2xl border border-[#EAE4D7] bg-white p-5" aria-label="Hồ sơ đổi trả đang xử lý">
        <h2 className="font-bold">Hồ sơ đổi trả đang xử lý</h2>
        <p className="mt-1 text-xs text-[#7D715E]">System Manager xác minh lỗi vận chuyển hoặc lỗi hàng hóa trước khi Shop xử lý đổi, hoàn.</p>
        {activeReturns.isLoading && <p role="status" className="mt-3 text-sm">Đang tải hồ sơ…</p>}
        {activeReturns.error && <p role="alert" className="mt-3 text-sm text-[#DC2626]">Không tải được hồ sơ đổi trả.</p>}
        {!activeReturns.isLoading && !activeReturns.error && activeReturns.data?.items.length === 0 &&
          <p className="mt-3 text-sm text-[#7D715E]">Chưa có hồ sơ đang xử lý.</p>}
        {!!activeReturns.data?.items.length && <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {activeReturns.data.items.map((item) => <Link key={item.id} to={`/admin/returns/${item.id}`}
            className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3 hover:border-[#C59B58]">
            <span className="block text-sm font-bold">#{item.order.externalOrderSn}</span>
            <span className="mt-1 block text-xs text-[#7D715E]">{item.order.storeName} · {returnStatusLabel(item.status)}</span>
            <span className="mt-1 block text-xs font-semibold text-[#8A6736]">Xem bằng chứng và xác định trách nhiệm →</span>
          </Link>)}
        </div>}
        <QueuePager page={queuePages.active} total={activeReturns.data?.total} onPage={(page) => setQueuePage('active', page)} />
      </section>

      <section id="ghn-claims" className="scroll-mt-6 rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-5" aria-label="Yêu cầu GHN bồi hoàn">
        <h2 className="font-bold">Đối soát bồi hoàn GHN</h2>
        <p className="mt-1 text-xs text-[#7D715E]">Theo dõi yêu cầu từ lúc gửi GHN đến khi có phản hồi và chứng từ thanh toán. Việc xử lý cho khách đi theo luồng riêng.</p>
        {ghnClaims.isLoading && <p role="status" className="mt-3 text-sm">Đang tải hồ sơ GHN…</p>}
        {ghnClaims.error && <p role="alert" className="mt-3 text-sm text-[#DC2626]">Không tải được hồ sơ GHN.</p>}
        {!ghnClaims.isLoading && !ghnClaims.error && ghnClaims.data?.items.length === 0 && <p className="mt-3 text-sm text-[#7D715E]">Chưa có hồ sơ bồi hoàn GHN.</p>}
        {!!ghnClaims.data?.items.length && <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {ghnClaims.data.items.map((item) => <Link key={item.id} to={`/admin/returns/${item.id}`}
            className="rounded-xl border border-[#EAE4D7] bg-white p-3 hover:border-[#C59B58]">
            <strong className="block text-sm">#{item.order.externalOrderSn}</strong>
            <span className="mt-1 block text-xs text-[#7D715E]">{item.order.storeName} · Vận đơn {item.ghnClaim?.originalTrackingNumber}</span>
            <span className="mt-1 block text-xs font-semibold text-[#8A6736]">{ghnClaimLabels[item.ghnClaim?.status || ''] || 'Chờ đối soát'} → Mở hồ sơ</span>
          </Link>)}
        </div>}
        <QueuePager page={queuePages.ghn} total={ghnClaims.data?.total} onPage={(page) => setQueuePage('ghn', page)} />
      </section>

      <section id="stalled-returns" className="scroll-mt-6 rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-5" aria-label="Hồ sơ quá hạn kiểm tra">
        <h2 className="font-bold">Shop chậm kiểm tra quá 48 giờ</h2>
        <p className="mt-1 text-xs text-[#7D715E]">Các hồ sơ này vẫn đang chờ Shop xử lý; khách có quyền gửi khiếu nại.</p>
        {stalled.isLoading && <p role="status" className="mt-3 text-sm">Đang tải hồ sơ quá hạn…</p>}
        {stalled.error && <p role="alert" className="mt-3 text-sm text-[#DC2626]">Không thể tải hồ sơ quá hạn.</p>}
        {!stalled.isLoading && !stalled.error && stalled.data?.items.length === 0 &&
          <p className="mt-3 text-sm text-[#7D715E]">Không có hồ sơ quá hạn kiểm tra.</p>}
        {!!stalled.data?.items.length && <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {stalled.data.items.map((item) => <Link key={item.id} to={`/admin/returns/${item.id}`}
            className="rounded-xl border border-[#EAE4D7] bg-white p-3 hover:border-[#C59B58]">
            <span className="block text-sm font-bold">#{item.order.externalOrderSn}</span>
            <span className="mt-1 block text-xs text-[#7D715E]">{item.order.storeName} · Nhận lúc {item.receivedAt ? new Date(item.receivedAt).toLocaleString('vi-VN') : 'Không rõ'}</span>
          </Link>)}
        </div>}
        <QueuePager page={queuePages.stalled} total={stalled.data?.total} onPage={(page) => setQueuePage('stalled', page)} />
      </section>

      <div id="open-disputes" className="scroll-mt-6">
        <h2 className="text-lg font-bold">Hồ sơ cần phân xử</h2>
        <p className="mt-1 text-sm text-[#7D715E]">Chọn một hồ sơ để xem bằng chứng và lưu quyết định.</p>
      </div>
      {disputes.isLoading && <p role="status">Đang tải khiếu nại…</p>}
      {disputes.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-[#DC2626]">
        Không thể tải khiếu nại. Vui lòng thử lại.
      </p>}
      {!disputes.isLoading && !disputes.error && rows.length === 0 &&
        <p className="rounded-2xl border border-[#EAE4D7] bg-white p-6 text-sm text-[#7D715E]">Không có khiếu nại đang mở.</p>}

      {selected && <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-2" aria-label="Danh sách khiếu nại">
          {rows.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setRuling('APPROVE_REFUND'); setLiability(''); setNotes(''); }}
            className={`w-full rounded-xl border p-4 text-left ${selected.id === item.id
              ? 'border-[#C59B58] bg-[#FBF5EB]' : 'border-[#EAE4D7] bg-white'}`}>
            <span className="block text-sm font-bold">#{item.returnRequest.order.externalOrderSn}</span>
            <span className="mt-1 block text-xs text-[#7D715E]">{item.returnRequest.order.storeName}</span>
            <span className="mt-2 block text-xs">{new Date(item.openedAt).toLocaleString('vi-VN')}</span>
          </button>)}
        </aside>
        <div className="space-y-4">
          <section className="rounded-2xl border border-[#EAE4D7] bg-white p-5">
            <div className="flex items-center gap-2"><Scale className="h-5 w-5 text-[#B88E4F]" />
              <h2 className="text-lg font-bold">Hồ sơ #{selected.returnRequest.order.externalOrderSn}</h2></div>
            <p className="mt-3 text-sm"><strong>Lý do khiếu nại:</strong> {disputeReasonLabels[selected.reason] || selected.reason}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{selected.details}</p>
            {selected.reason === 'SHOP_REQUESTED_REVIEW' && <p className="mt-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-sm">Shop đề nghị Manager xác minh sau khi từ chối. Đây là ý kiến của Shop, chưa phải kết luận lỗi GHN.</p>}
            {selected.returnRequest.shopResponse && <p className="mt-2 text-sm"><strong>Phản hồi Shop gửi khách:</strong> {selected.returnRequest.shopResponse}</p>}
            {selected.returnRequest.events.filter((event) => event.type === 'SHOP_EVIDENCE_SUBMITTED').map((event) => <div key={event.id} className="mt-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-sm">
              <strong>Bằng chứng Shop:</strong> <span className="whitespace-pre-wrap">{event.data?.details}</span>
              <div className="mt-2 flex flex-wrap gap-3">{event.data?.evidenceUrls?.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="font-semibold text-[#8A6736] underline">Tệp Shop {index + 1}</a>)}</div>
            </div>)}
            {selected.returnRequest.inspectionNotes && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#F3EFE6] p-3 text-sm">
              <strong>Kết quả kiểm tra của Shop:</strong> {selected.returnRequest.inspectionNotes}</p>}
            {selected.returnRequest.customerShipment && <p className="mt-3 text-sm">
              <strong>Hàng khách gửi:</strong> {selected.returnRequest.customerShipment.carrierName} · {selected.returnRequest.customerShipment.trackingNumber}</p>}
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#B88E4F] underline">
              {selected.returnRequest.imageUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">Ảnh {index + 1}</a>)}
              {selected.returnRequest.unboxingVideoUrl && <a href={selected.returnRequest.unboxingVideoUrl} target="_blank" rel="noreferrer">Video mở hộp</a>}
              {selected.returnRequest.customerShipment?.receiptImageUrl &&
                <a href={selected.returnRequest.customerShipment.receiptImageUrl} target="_blank" rel="noreferrer">Ảnh biên nhận</a>}
            </div>
            <Link to={`/admin/disputes`} className="mt-4 inline-block text-xs text-[#7D715E] underline">Xem khiếu nại đơn hàng cũ</Link>
          </section>
          <ReturnTimeline request={selected.returnRequest} />
          <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[#EEDFC6] bg-[#FBF5EB] p-5">
            <h2 className="font-bold">Phân xử</h2>
            <label className="block text-sm">Quyết định
              <select value={ruling} onChange={(event) => setRuling(event.target.value as Ruling)}
                className="mt-1 w-full rounded-xl border border-[#EAE4D7] bg-white p-3">
                <option value="APPROVE_REFUND">Chấp thuận hoàn tiền</option>
                <option value="APPROVE_EXCHANGE">Chấp thuận đổi hàng</option>
                {canUpholdShop && <option value="UPHOLD_SHOP" disabled={liability === 'LOGISTICS_FAULT'}>Giữ quyết định của Shop</option>}
              </select>
            </label>
            <label className="block text-sm">Bên chịu trách nhiệm
              <select value={liability} onChange={(event) => { const next = event.target.value as Liability; setLiability(next); if (next === 'LOGISTICS_FAULT' && ruling === 'UPHOLD_SHOP') setRuling('APPROVE_REFUND'); }}
                className="mt-1 w-full rounded-xl border border-[#EAE4D7] bg-white p-3">
                <option value="">Chọn bên chịu trách nhiệm</option>
                <option value="LOGISTICS_FAULT" disabled={!selected.returnRequest.order.outboundGhnTrackingNumber}>GHN / vận chuyển</option>
                <option value="SHOP_FAULT">Shop / hàng hóa</option>
                <option value="CUSTOMER_REASON">Khách đổi ý</option>
              </select>
            </label>
            <label className="block text-sm">Căn cứ phân xử
              <textarea required minLength={20} maxLength={3000} rows={4} value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#EAE4D7] bg-white p-3" />
            </label>
            <p className="text-xs text-[#7D715E]">Vận đơn GHN gốc: {selected.returnRequest.order.outboundGhnTrackingNumber || 'Chưa có'}. Nếu chưa đủ chứng cứ, tiếp tục xác minh trước khi phân xử. Việc hoàn cho khách không chờ GHN bồi hoàn cho Shop.</p>
            <p className="text-xs text-[#7D715E]">Nếu ví khách sẵn sàng, hoàn tiền và thu hồi thu nhập được ghi cùng giao dịch; nếu chưa, hồ sơ ở trạng thái chờ đối soát.</p>
            {!canUpholdShop && <p className="text-xs text-[#7D715E]">Shop đang giữ hàng khách trả; không thể đóng hồ sơ nếu chưa có phương án trả hàng hoặc bồi hoàn.</p>}
            <button type="submit" disabled={resolve.isPending || !liability || notes.trim().length < 20 ||
              (ruling === 'UPHOLD_SHOP' && (!canUpholdShop || liability === 'LOGISTICS_FAULT')) ||
              (liability === 'LOGISTICS_FAULT' && !selected.returnRequest.order.outboundGhnTrackingNumber)}
              className="rounded-xl bg-[#C59B58] px-4 py-2.5 text-sm font-bold text-[#231D15] disabled:opacity-50">
              {resolve.isPending ? 'Đang lưu…' : 'Lưu quyết định'}</button>
            {resolve.error && <p role="alert" className="text-sm text-[#DC2626]">Không thể lưu quyết định. Vui lòng thử lại.</p>}
          </form>
        </div>
      </div>}

      <QueuePager page={queuePages.disputes} total={disputes.data?.total} onPage={(page) => { setSelectedId(null); setQueuePage('disputes', page); }} />
      <section id="return-history" className="scroll-mt-6 rounded-2xl border border-[#EAE4D7] bg-white p-4 sm:p-5" aria-label="Lịch sử hồ sơ đổi trả đã kết thúc">
        <h2 className="text-lg font-bold">Lịch sử đổi trả đã kết thúc</h2>
        <p className="mt-1 text-xs text-[#7D715E]">Giữ kết quả hoàn tiền, đổi hàng và phân xử để đối chiếu sau khi hồ sơ rời hàng đợi đang xử lý.</p>
        <form onSubmit={(event) => { event.preventDefault(); setHistoryPage(1); setHistoryQuery(historyInput.trim()); }}
          className="mt-4 flex flex-wrap gap-2">
          <input value={historyInput} onChange={(event) => setHistoryInput(event.target.value)} maxLength={80}
            aria-label="Tìm lịch sử đổi trả" placeholder="Mã đơn, khách, shop hoặc số điện thoại"
            className="min-h-10 min-w-0 flex-1 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] px-3 text-sm outline-none focus:border-[#B88E4F]" />
          <button type="submit" className="rounded-xl bg-[#C59B58] px-4 py-2 text-sm font-semibold text-[#231D15] hover:bg-[#B88E4F]">Tìm lịch sử</button>
          {historyQuery && <button type="button" onClick={() => { setHistoryInput(''); setHistoryQuery(''); setHistoryPage(1); }}
            className="rounded-xl border border-[#EAE4D7] px-3 py-2 text-sm text-[#795A2D]">Xóa lọc</button>}
        </form>
        {history.isLoading && <p role="status" className="mt-4 text-sm text-[#7D715E]">Đang tải lịch sử…</p>}
        {history.error && <p role="alert" className="mt-4 text-sm text-[#DC2626]">Không tải được lịch sử. Bấm Làm mới để thử lại.</p>}
        {!history.isLoading && !history.error && history.data?.items.length === 0 &&
          <p className="mt-4 text-sm text-[#7D715E]">Không có hồ sơ đã kết thúc phù hợp.</p>}
        {!!history.data?.items.length && <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {history.data.items.map((item) => <li key={item.id}>
            <Link to={`/admin/returns/${item.id}`} className="block rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] p-3 hover:border-[#C59B58]">
              <strong className="block text-sm">#{item.order.externalOrderSn}</strong>
              <span className="mt-1 block text-xs text-[#7D715E]">{item.order.storeName} · {item.order.customerName || 'Khách hàng'}</span>
              <span className="mt-2 block text-xs font-semibold text-[#795A2D]">{returnStatusLabel(item.status)}</span>
              <span className="mt-1 block text-xs text-[#7D715E]">{new Date(item.submittedAt).toLocaleDateString('vi-VN')}</span>
            </Link>
          </li>)}</ul>}
        {!!history.data?.total && history.data.total > history.data.pageSize && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#EAE4D7] pt-4 text-sm">
          <span className="text-[#7D715E]">Trang {historyPage} / {Math.ceil(history.data.total / history.data.pageSize)} · {history.data.total} hồ sơ</span>
          <div className="flex gap-2">
            <button type="button" disabled={historyPage <= 1 || history.isFetching} onClick={() => setHistoryPage((page) => page - 1)}
              className="rounded-lg border border-[#EAE4D7] px-3 py-2 disabled:opacity-40">Trang trước</button>
            <button type="button" disabled={historyPage >= Math.ceil(history.data.total / history.data.pageSize) || history.isFetching}
              onClick={() => setHistoryPage((page) => page + 1)} className="rounded-lg border border-[#EAE4D7] px-3 py-2 disabled:opacity-40">Trang sau</button>
          </div>
        </div>}
      </section>
    </div>
  </div>;
}
