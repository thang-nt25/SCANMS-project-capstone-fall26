import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import api from '../../services/api';

type Item = { id: string };
type BlockerPage = { hasMore: boolean } & (
  | { kind: 'DEAL'; items: (Item & { status: string; scopeType: string; waitingFor: 'SHOP' | 'KOL' | 'ADMIN' | null; proposedCommissionRate: string; approvedCommissionRate: string | null; commitmentEndsAt: string | null; settlementEndsAt: string | null; product: { title: string } })[] }
  | { kind: 'KPI'; items: (Item & { order: { id: string; externalOrderSn: string }; dealBonusAmount: string | null })[] }
  | { kind: 'VOUCHER'; items: (Item & { displayCode: string; status: string; expiresAt: string | null; discountType: string; discountValue: string; maximumDiscountAmount: string | null; usageCount: number })[] }
  | { kind: 'SAMPLE'; items: (Item & { status: string; deadlineAt: string | null; revisionDeadlineAt: string | null; product: { title: string }; productVariant: { name: string } | null })[] }
);

const dateLabel = (value: string | null) => value
  ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh', hourCycle: 'h23' })
  : 'Chưa đặt';
const money = (value: string) => `${Number(value).toLocaleString('vi-VN')} ₫`;
const voucherStatus: Record<string, string> = {
  ACTIVE: 'Đang hoạt động', PAUSED: 'Tạm dừng', PENDING_APPROVAL: 'Chờ shop duyệt',
  PENDING_ADMIN_APPROVAL: 'Chờ Admin duyệt', PENDING_BLOCK_APPROVAL: 'Chờ duyệt ngừng mã',
};
const sampleStatus: Record<string, string> = {
  PENDING: 'Chờ duyệt mẫu', APPROVED: 'Đã duyệt mẫu', SHIPPED: 'Đang giao mẫu',
  RECEIVED: 'Đã nhận mẫu', VIDEO_SUBMITTED: 'Chờ duyệt video', REVISION_REQUIRED: 'Cần sửa video',
  OVERDUE: 'Quá hạn', APPEALED: 'Đang khiếu nại', DELIVERY_ISSUE: 'Sự cố giao hàng',
};

function blockerRows(data: BlockerPage) {
  switch (data.kind) {
    case 'DEAL':
      return data.items.map(item => ({
        id: item.id,
        title: item.scopeType === 'STORE_WIDE' ? 'Deal toàn cửa hàng'
          : item.scopeType === 'SELECTED_PRODUCTS' ? `Nhóm sản phẩm · ${item.product.title}` : item.product.title,
        status: item.waitingFor ? `Chờ ${{ SHOP: 'shop', KOL: 'KOC', ADMIN: 'Admin' }[item.waitingFor]} duyệt`
          : item.commitmentEndsAt && Date.parse(item.commitmentEndsAt) <= Date.now() ? 'Chờ khép Deal' : 'Đã duyệt',
        facts: [
          ['Thù lao Deal', `${Number(item.approvedCommissionRate ?? item.proposedCommissionRate).toLocaleString('vi-VN')}%`],
          ['Hạn cam kết', dateLabel(item.commitmentEndsAt)],
          ...(item.settlementEndsAt ? [['Hạn quyết toán', dateLabel(item.settlementEndsAt)]] : []),
        ],
      }));
    case 'KPI':
      return data.items.map(item => ({
        id: item.id, title: item.order.externalOrderSn, status: 'Chờ quyết toán KPI',
        facts: [['Thưởng KPI tạm giữ', item.dealBonusAmount === null ? 'Chưa ghi nhận' : money(item.dealBonusAmount)]],
        href: `/merchant/orders?orderId=${encodeURIComponent(item.order.id)}`, action: 'Xem đơn hàng',
      }));
    case 'VOUCHER':
      return data.items.map(item => ({
        id: item.id, title: item.displayCode, status: voucherStatus[item.status] ?? item.status,
        facts: [
          ['Mức giảm', item.discountType === 'PERCENTAGE' ? `${Number(item.discountValue).toLocaleString('vi-VN')}%` : money(item.discountValue)],
          ...(item.maximumDiscountAmount === null ? [] : [['Giảm tối đa', money(item.maximumDiscountAmount)]]),
          ['Đã dùng', `${item.usageCount} lượt`],
          ['Hạn dùng', item.expiresAt ? dateLabel(item.expiresAt) : 'Không giới hạn'],
        ],
        href: `/merchant/promotions?tab=creator-incentives&reviewCouponId=${encodeURIComponent(item.id)}`, action: 'Mở chi tiết mã',
      }));
    case 'SAMPLE':
      return data.items.map(item => ({
        id: item.id, title: item.product.title, status: sampleStatus[item.status] ?? item.status,
        facts: [
          ...(item.productVariant ? [['Phân loại', item.productVariant.name]] : []),
          ...(item.revisionDeadlineAt ? [['Hạn sửa video', dateLabel(item.revisionDeadlineAt)]] : []),
          ['Hạn nộp video', dateLabel(item.deadlineAt)],
        ],
      }));
  }
}

export function TerminationBlockerDetails({ endpoint, title, onBack }: {
  endpoint: string;
  title: string;
  onBack: () => void;
}) {
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<BlockerPage | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    setData(null);
    setError(false);
    void api.get(endpoint, {
      params: { page },
      headers: { 'x-skip-cache': '1' },
      signal: abort.signal,
    }).then(result => {
      if (abort.signal.aborted) return;
      const response = result?.data ?? result;
      if (!response || !Array.isArray(response.items) || !['DEAL', 'KPI', 'VOUCHER', 'SAMPLE'].includes(response.kind)) {
        setError(true);
        return;
      }
      setData(response as BlockerPage);
    }).catch(() => { if (!abort.signal.aborted) setError(true); });
    return () => abort.abort();
  }, [endpoint, page, retry]);

  const rows: Array<{ id: string; title: string; status: string; facts: string[][]; href?: string; action?: string }> = data ? blockerRows(data) : [];
  const buttonClass = 'inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#EAE4D7] bg-white px-2.5 text-xs font-semibold text-[#79592C] hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#B88E4F] disabled:cursor-default disabled:opacity-50';

  return (
    <section aria-label={title} className="space-y-3">
      <button type="button" onClick={onBack} className={buttonClass} autoFocus>
        <ArrowLeft size={14} aria-hidden="true" /> Quay lại điều kiện
      </button>
      <h4 className="text-sm font-bold text-[#1A1612]">{title}</h4>
      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-[#991B1B]">
          Chưa tải được chi tiết ràng buộc.
          <button type="button" className={buttonClass} onClick={() => setRetry(value => value + 1)}>Thử lại</button>
        </div>
      ) : !data ? (
        <p role="status" className="text-xs text-[#7D715E]">Đang tải chi tiết…</p>
      ) : rows.length === 0 ? (
        <p role="status" className="text-xs text-[#7D715E]">Không có mục nào trên trang này.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(row => (
            <li key={row.id} className="space-y-2 rounded-xl border border-[#EAE4D7] p-3">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <strong className="min-w-0 text-sm wrap-anywhere text-[#1A1612]">{row.title}</strong>
                <span className="rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-0.5 text-[11px] font-semibold text-[#79592C]">{row.status}</span>
              </div>
              <dl className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                {row.facts.map(([label, value]) => <div key={label}><dt className="text-[#7D715E]">{label}</dt><dd className="mt-0.5 font-semibold text-[#1A1612]">{value}</dd></div>)}
              </dl>
              {row.href && <a className={buttonClass} href={row.href} target="_blank" rel="noopener noreferrer">{row.action}<ArrowUpRight size={13} aria-hidden="true" /></a>}
            </li>
          ))}
        </ul>
      )}
      {(page > 1 || data?.hasMore) && (
        <nav aria-label="Trang chi tiết ràng buộc" className="flex items-center justify-between gap-2 text-xs text-[#7D715E]">
          <button type="button" className={buttonClass} disabled={page === 1} onClick={() => setPage(value => value - 1)}>Trang trước</button>
          <span>Trang {page}</span>
          <button type="button" className={buttonClass} disabled={!data?.hasMore} onClick={() => setPage(value => value + 1)}>Trang sau</button>
        </nav>
      )}
    </section>
  );
}
