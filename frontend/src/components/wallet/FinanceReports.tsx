import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import { Modal } from "../ui/Modal";
import { Clock3, History } from "lucide-react";
import { returnStatusLabel } from '../../utils/return-status.utils';
import type { ReturnStatus } from '../../services/return.service';

function unwrap<T>(response: unknown): T {
  const body = response as { data?: { data?: T } | T };
  const data = body?.data ?? body;
  return ((data as { data?: T })?.data ?? data) as T;
}
const money = (value: string | number) =>
  `${Number(value).toLocaleString("vi-VN")} ₫`;
const panel = "rounded-2xl border border-[#EAE4D7] bg-white p-5 text-[#1A1612]";
const button =
  "rounded-lg border border-[#EAE4D7] px-3 py-2 text-sm hover:bg-[#FBF5EB] disabled:opacity-50";

interface StorePnl {
  unrecognizedCommissions?: string;
  netRevenue: string;
  commissions: string;
  monthlyBonuses: string;
  sampleShipping: string;
  knownMarketingExpense: string;
  cogs?: string | null;
  sampleProductCost?: string | null;
  contributionProfit?: string | null;
}
export function StoreFinanceReport({ storeId }: { storeId: string }) {
  const [data, setData] = useState<StorePnl | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api
      .get(`/stores/${storeId}/pnl-report`, {
        headers: { "x-skip-cache": "true" },
      })
      .then((response) => {
        if (active) setData(unwrap<StorePnl>(response));
      })
      .catch(() => {
        if (active) setError("Không tải được báo cáo chi phí tiếp thị.");
      });
    return () => {
      active = false;
    };
  }, [storeId]);
  return (
    <section className={panel}>
      <h2 className="font-semibold text-lg">
        Doanh thu và chi phí tiếp thị lũy kế
      </h2>
      {error && (
        <p role="alert" className="text-[#DC2626]">
          {error}
        </p>
      )}
      {data ? (
        <>
          <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 my-4">
            {Object.entries({
              "Doanh thu hàng hóa sau hoàn trả": data.netRevenue,
              "Thu nhập KOC phát sinh": data.commissions,
              "Hoa hồng đơn chưa hoàn tất (ngoài tỷ lệ)": data.unrecognizedCommissions,
              "Thưởng tháng đã cộng ví": data.monthlyBonuses,
              "Vận chuyển mẫu thử": data.sampleShipping,
              "Chi phí tiếp thị đã ghi nhận": data.knownMarketingExpense,
              "Giá vốn": data.cogs,
              "Giá vốn mẫu thử": data.sampleProductCost,
              "Lợi nhuận đóng góp": data.contributionProfit,
            }).map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-[#7D715E]">{label}</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {value == null ? "Chưa đủ dữ liệu" : money(value)}
                </dd>
              </div>
            ))}
          </dl>
          {data.contributionProfit == null && (
            <p className="text-xs text-[#7D715E]">
              Kế toán cần bổ sung chi phí thực tế của các đơn hàng và mẫu thử
              còn thiếu để hoàn tất báo cáo lợi nhuận.
            </p>
          )}
        </>
      ) : (
        !error && <p role="status">Đang tải báo cáo…</p>
      )}
    </section>
  );
}

interface Executive {
  yearMonth?: string | null;
  sandboxNetPaid?: string;
  sandboxTaxWithheld?: string;
  unrecognizedCommissions?: string;
  asOf: string;
  gmv: string;
  netRevenue: string;
  ordersCount: number;
  affiliateExpense: string;
  affiliateExpenseRatio: string | null;
  escrowPending: string;
  availableEarnings: string;
  grossPaid: string;
  netPaid: string;
  taxWithheld: string;
  holdDays: number;
}
const executiveSummaryCache = new Map<string, Executive>();

export function ExecutiveFinanceReport() {
  const [month, setMonth] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 7));
  const [data, setData] = useState<Executive | null>(() => executiveSummaryCache.get(month) || null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!data && !executiveSummaryCache.has(month)) setLoading(true);
    setError("");
    try {
      const res = unwrap<Executive>(
        await api.get("/analytics/executive-summary", {
          params: { yearMonth: month },
        }),
      );
      executiveSummaryCache.set(month, res);
      setData(res);
    } catch {
      setData(null);
      setError(
        "Không tải được báo cáo tài chính. Chỉ Quản trị tối cao được truy cập.",
      );
    } finally {
      setLoading(false);
    }
  }, [month]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section className={panel} aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4D7] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Tháng báo cáo tài chính" value={month.slice(5)} disabled={loading} onChange={e => setMonth(`${month.slice(0, 4)}-${e.target.value}`)} className={button}>
            {Array.from({ length: 12 }, (_, index) => <option key={index} value={String(index + 1).padStart(2, '0')}>Tháng {index + 1}</option>)}
          </select>
          <select aria-label="Năm báo cáo tài chính" value={month.slice(0, 4)} disabled={loading} onChange={e => setMonth(`${e.target.value}-${month.slice(5)}`)} className={button}>
            {Array.from({ length: 11 }, (_, index) => new Date().getFullYear() - 5 + index).map(year => <option key={year} value={year}>{year}</option>)}
          </select>

        </div>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-[#DC2626]">
          {error}
        </p>
      )}
      {loading && !data && (
        <p role="status" className="mt-4">
          Đang tải báo cáo…
        </p>
      )}
      {data && (
        <>
          <dl className="my-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries({
              "GMV đơn đã hoàn tất": data.gmv,
              "Doanh thu sau hoàn trả": data.netRevenue,
              "Chi phí thu nhập tiếp thị": data.affiliateExpense,
              "Hoa hồng chưa ghi nhận": data.unrecognizedCommissions,
              "Bảo chứng hiện tại": data.escrowPending,
              "Khả dụng hiện tại": data.availableEarnings,
              "Chi trả ngoài Sandbox trong tháng": data.netPaid,
              "Thuế ngoài Sandbox trong tháng": data.taxWithheld,
              "Chi trả Sandbox trong tháng": data.sandboxNetPaid,
              "Thuế mô phỏng Sandbox": data.sandboxTaxWithheld,
            }).map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-xl border border-[#EAE4D7] bg-[#FFFDFA] px-4 py-3.5">
                <dt className="text-sm text-[#7D715E]">{label}</dt>
                <dd className="m-0 mt-2 text-xl font-semibold leading-tight tabular-nums text-[#1A1612]">
                  {value == null ? 'Chưa có dữ liệu' : money(value)}
                </dd>
              </div>
            ))}
            <div className="min-w-0 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-3.5">
              <dt className="text-sm text-[#7D715E]">
                Chi phí tiếp thị / doanh thu
              </dt>
              <dd className="m-0 mt-2 text-xl font-semibold leading-tight text-[#8F682E]">
                {data.affiliateExpenseRatio === null
                  ? "Chưa có doanh thu"
                  : `${data.affiliateExpenseRatio}%`}
              </dd>
            </div>
          </dl>
          <div className="border-t border-[#EAE4D7] pt-3">
            <details className="group rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-sm">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 select-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2 font-medium text-[#1A1612]"><span className="text-[#B88E4F] transition-transform group-open:rotate-90" aria-hidden="true">›</span>Cách tính báo cáo</span>
                <span className="text-xs text-[#7D715E]">{data.ordersCount} đơn · Kỳ {data.yearMonth ? `${data.yearMonth.slice(5)}/${data.yearMonth.slice(0, 4)}` : 'toàn thời gian'}</span>
              </summary>
              <dl className="m-0 grid gap-3 border-t border-[#EAE4D7] bg-white p-4 sm:grid-cols-2">
                {[
                  { title: 'Doanh thu trong kỳ', text: 'Theo ngày hoàn tất đơn, giờ Việt Nam. Doanh thu trừ giảm giá và hoàn trả, không gồm phí giao hàng. Đơn thiếu ngày hoàn tất không tự gán tháng.' },
                  { title: 'Tỷ lệ chi phí', text: '(Hoa hồng đơn hoàn tất trong kỳ + thưởng đã chi thuộc kỳ + điều chỉnh thưởng) ÷ doanh thu sau hoàn trả × 100%. Không có doanh thu thì không tính tỷ lệ.' },
                  { title: 'Chi trả & thuế', text: 'Theo ngày hoàn tất yêu cầu rút. Sandbox tách riêng; trạng thái hoàn tất của dữ liệu cũ chưa đủ xác nhận tiền thật đã chuyển.' },
                  { title: 'Số dư ví hiện tại', text: `Khả dụng và bảo chứng là số dư lúc tải, không phải cuối tháng. Escrow cơ sở ${data.holdDays} ngày từ giao thành công; tiếp tục giữ khi có khiếu nại hoặc thẩm định.` },
                ].map(item => <div key={item.title} className="min-w-0"><dt className="font-medium text-[#1A1612]">{item.title}</dt><dd className="m-0 mt-1 text-xs leading-relaxed text-[#7D715E]">{item.text}</dd></div>)}
              </dl>
            </details>
            <p className="mb-0 mt-2 text-right text-[11px] text-[#7D715E]">Cập nhật {new Date(data.asOf).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · Giờ Việt Nam</p>
          </div>
        </>
      )}
    </section>
  );
}

interface Escrow {
  total: number;
  page: number;
  limit: number;
  holdDays: number;
  pendingAmount: string;
  items: Array<{
    id: string;
    commissionAmount: string;
    availableAt: string;
    order: {
      id: string;
      externalOrderSn: string;
      status: string;
      finalAmount?: string;
      deliveredAt?: string | null;
      createdAt?: string | null;
      completedAt?: string | null;
      clickedAt?: string | null;
      shopConfirmedAt?: string | null;
      handedToShippingAt?: string | null;
      referralLink?: { createdAt: string; shortCode: string } | null;
      attributedCollaborator?: { fullName: string } | null;
      orderItems?: { quantity: number; unitPrice: string; appliedCommissionRate: string | null; product: { title: string; imageUrl?: string | null }; variant?: { name: string } | null }[];
      store: { name: string };
      returnRequest: { status: string } | null;
      referralReviewRequired?: boolean;
      testFixture?: boolean;
      referralRiskSignals?: string[];
    };
  }>;
}
export function EscrowFinanceReport() {
  const [historyItem, setHistoryItem] = useState<Escrow["items"][number] | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const timestamp = (value?: string | null) => value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hourCycle: 'h23' }) : 'Chưa ghi nhận';
  const [data, setData] = useState<Escrow | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .get("/admin/payouts/escrow", {
        params: { page },
        headers: { "x-skip-cache": "true" },
      })
      .then((response) => {
        if (active) setData(unwrap<Escrow>(response));
      })
      .catch(() => {
        if (active) {
          setData(null);
          setError("Không tải được dữ liệu Escrow.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, refresh]);
  return (
    <section className={`${panel} finance-escrow`} aria-label="Các khoản hoa hồng đang bảo chứng" aria-busy={loading}>
      {error && (
        <p role="alert" className="text-[#DC2626]">
          {error}
        </p>
      )}
      {loading && <p role="status">Đang tải…</p>}
      {data && (
        <>
          <div className="overflow-x-auto" hidden={!data.items.length}>
            <table className="w-full table-fixed text-left text-sm [&_td]:align-top [&_th]:whitespace-nowrap">
              <colgroup>
                <col className="w-[17%]" />
                <col className="w-[31%]" />
                <col className="w-[11%]" />
                <col className="w-[13%]" />
                <col className="w-[19%]" />
                <col className="w-[9%]" />
              </colgroup>
              <thead className="bg-[#F3EFE6]">
                <tr>
                  {[
                    "Đơn hàng",
                    "Sản phẩm / Gian hàng",
                    "Đơn giá",
                    "Hoa hồng giữ",
                    "Giải tỏa / Ngày giao",
                    "Đổi trả",
                  ].map((label, index) => (
                    <th className={`px-3 py-4 font-medium text-[#7D715E] ${index === 2 || index === 3 ? 'text-right' : index === 5 ? 'text-center' : ''}`} key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr className="border-b border-[#EAE4D7]" key={item.id}>
                    <td className="p-3">
                      <strong className="block font-semibold leading-6">{item.order.externalOrderSn || item.order.id.slice(0, 8)}</strong>
                      {item.order.testFixture && <small className="text-[#8F682E]">Đơn kiểm thử Escrow</small>}
                      {item.order.attributedCollaborator && <small className="mt-1 block text-[#7D715E]">KOL: {item.order.attributedCollaborator.fullName}</small>}
                      <button type="button" onClick={() => setHistoryItem(item)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#EAE4D7] bg-white px-2.5 py-1.5 text-xs font-medium text-[#8F682E] transition hover:border-[#C59B58] hover:bg-[#FBF5EB]" aria-label={`Xem lịch sử đơn ${item.order.externalOrderSn || item.order.id}`}>
                        <History size={14} /> Lịch sử
                      </button>
                    </td>
                    <td className="p-3">{item.order.orderItems?.map((line,index) => <div key={index} className="escrow-product">
                      {line.product.imageUrl && <img src={line.product.imageUrl} alt="" />}
                      <div className="min-w-0"><strong className="block leading-6">{line.product.title}</strong><small>{line.variant?.name || 'Không có biến thể'} · SL: {line.quantity}</small></div>
                    </div>)}<small className="escrow-store-name">{item.order.store.name}</small></td>
                    <td className="p-3 text-right whitespace-nowrap">{item.order.orderItems?.map((line,index) => <div key={index} className="escrow-unit-price leading-6">{money(line.unitPrice)}</div>)}</td>
                    <td className="p-3 text-right whitespace-nowrap tabular-nums">
                      <strong className="block leading-6">{money(item.commissionAmount)}</strong>
                      {item.order.orderItems?.length === 1 && <small className="block text-[#7D715E]">{Number(item.order.orderItems[0].appliedCommissionRate)}% hoa hồng</small>}
                    </td>
                    <td className="p-3">
                      <strong className="block font-semibold leading-6 tabular-nums" title="Hạn giải tỏa">{timestamp(item.availableAt)}</strong>
                      <span className="mt-1 block text-xs text-[#7D715E]">Giao: {item.order.deliveredAt ? timestamp(item.order.deliveredAt) : 'Chưa có ngày giao'}</span>
                      <small className="mt-2 block font-medium text-[#8F682E]">{(() => {
                        const remaining = Date.parse(item.availableAt) - now;
                        if (!Number.isFinite(remaining)) return 'Chưa xác định thời hạn';
                        if (remaining <= 0) return 'Đến hạn · chờ đối soát';
                        const minutes = Math.ceil(remaining / 60_000);
                        const days = Math.floor(minutes / 1440);
                        const hours = Math.floor(minutes % 1440 / 60);
                        return days > 0 ? `Còn ${days} ngày ${hours} giờ` : hours > 0 ? `Còn ${hours} giờ ${minutes % 60} phút` : `Còn ${minutes} phút`;
                      })()}</small>
                      {(item.order.referralReviewRequired || (item.order.returnRequest && !['CLOSED', 'EXPIRED', 'COMPLETED'].includes(item.order.returnRequest.status))) && <small className="mt-1 block text-[#DC2626]">Tiếp tục giữ khi hồ sơ đổi trả/thẩm định chưa được giải quyết.</small>}
                    </td>
                    <td className="p-3 text-center">
                      {item.order.returnRequest ? returnStatusLabel(item.order.returnRequest.status as ReturnStatus) : <span className="inline-flex whitespace-nowrap rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] px-2 py-1 text-xs text-[#7D715E]">Không đổi trả</span>}
                      {item.order.referralReviewRequired && <ReferralReview orderId={item.order.id} signals={item.order.referralRiskSignals ?? []} onReviewed={() => setRefresh(value => value + 1)} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.items.length && (
            <div className="finance-escrow-empty" role="status">
              <strong>Không có khoản thu nhập đang tạm giữ.</strong>
              <p>{data.total === 0 ? `Chưa có hoa hồng PENDING để theo dõi giải tỏa. Hoa hồng của đơn giao thành công sẽ được giữ ${data.holdDays} ngày lịch trước khi chuyển sang khả dụng, nếu không có khiếu nại hoặc yêu cầu thẩm định.` : 'Trang này không còn bản ghi. Chọn Trước để xem trang trước.'}</p>
            </div>
          )}
          <div className="finance-pagination flex items-center justify-end gap-3 mt-4" hidden={!data.total}>
            <button
              className={button}
              disabled={page === 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Trước
            </button>
            <span>Trang {page}</span>
            <button
              className={button}
              disabled={page * data.limit >= data.total || loading}
              onClick={() => setPage(page + 1)}
            >
              Sau
            </button>
          </div>
        </>
      )}
      <Modal isOpen={!!historyItem} onClose={() => setHistoryItem(null)} title="Lịch sử đơn hàng" subtitle={historyItem?.order.externalOrderSn || historyItem?.order.id} icon={<Clock3 size={18} />} maxWidth="lg">
        {historyItem && <>
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3">
            <div><span className="text-xs text-[#7D715E]">Hoa hồng tạm giữ</span><strong className="mt-1 block text-lg text-[#1A1612]">{money(historyItem.commissionAmount)}</strong></div>
            <div><span className="text-xs text-[#7D715E]">Hạn giải tỏa</span><strong className="mt-1 block text-sm text-[#8F682E]">{timestamp(historyItem.availableAt)}</strong></div>
          </div>
          <dl className="m-0 divide-y divide-[#EAE4D7]">
            {([
              ['Tạo link', historyItem.order.referralLink?.createdAt],
              ['Khách mở link', historyItem.order.clickedAt],
              ['Đặt hàng', historyItem.order.createdAt],
              ['Shop xác nhận', historyItem.order.shopConfirmedAt],
              ['Tạo vận đơn', historyItem.order.handedToShippingAt],
              ['Giao thành công', historyItem.order.deliveredAt],
              ['Khách xác nhận hoàn tất', historyItem.order.completedAt],
            ] as const).filter(([, value]) => value && Number.isFinite(Date.parse(value))).map(([label, value]) => <div key={label} className="flex flex-wrap items-center justify-between gap-2 py-3"><dt className="text-sm text-[#7D715E]">{label}</dt><dd className="m-0 text-sm font-medium tabular-nums text-[#1A1612]">{timestamp(value)}</dd></div>)}
          </dl>
          <p className="m-0 text-xs text-[#7D715E]">Chỉ hiện mốc đã ghi nhận · Giờ Việt Nam. Ngày tạo link không phải ngày chia sẻ.</p>
        </>}
      </Modal>
    </section>
  );
}

function ReferralReview({ orderId, signals, onReviewed }: { orderId: string; signals: string[]; onReviewed: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (outcome: string) => {
    setBusy(true); setError("");
    try { await api.post(`/commissions/orders/${orderId}/referral-review`, { outcome, reason }); onReviewed(); }
    catch { setError("Không thể lưu kết luận thẩm định. Vui lòng tải lại và kiểm tra."); }
    finally { setBusy(false); }
  };
  return <div className="mt-3 min-w-60 space-y-2">
    <p className="font-semibold text-[#8F682E]">Tạm giữ để thẩm định tự mua</p>
    <p>{signals.map(signal => signal === "SHARED_DELIVERY_ADDRESS" ? "Trùng địa chỉ nhận hàng" : signal === "SHARED_VERIFIED_BANK_ACCOUNT" ? "Trùng tài khoản ngân hàng đã xác minh" : "Cần đối soát").join("; ")}</p>
    <textarea aria-label="Lý do kết luận thẩm định tự mua" className="w-full rounded-lg border border-[#EAE4D7] p-2" value={reason} onChange={event => setReason(event.target.value)} minLength={10} maxLength={1000} placeholder="Ghi căn cứ đối soát (ít nhất 10 ký tự)" disabled={busy} />
    <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy || reason.trim().length < 10} onClick={() => submit("CLEARED")}>Xác nhận hợp lệ</button><button type="button" className={button} disabled={busy || reason.trim().length < 10} onClick={() => submit("SELF_REFERRAL")}>Xác nhận tự mua</button></div>
    {error && <p role="alert" className="text-[#DC2626]">{error}</p>}
  </div>;
}

interface Statement {
  transferProvider?: string | null;
  id: string;
  amount: string;
  taxAmount: string;
  netAmount: string;
  bankRefCode: string | null;
  processedAt: string | null;
}
export function PartnerTaxStatements() {
  const [items, setItems] = useState<Statement[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function downloadCertificate(id: string) {
    try {
      const response = await api.get(
        `/wallets/tax-invoices/${id}/certificate`,
        { responseType: "blob" },
      );
      const content = response instanceof Blob ? response : response.data;
      const url = URL.createObjectURL(
        new Blob([content], { type: "application/pdf" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `SCANMS-tax-${id}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError(
        "Chứng từ thuế chưa được cung cấp hoặc không tải được. Vui lòng liên hệ kế toán.",
      );
    }
  }
  useEffect(() => {
    let active = true;
    api
      .get("/wallets/tax-invoices")
      .then((response) => {
        if (active) setItems(unwrap<{ items: Statement[] }>(response).items);
      })
      .catch(() => {
        if (active) setError("Không tải được bảng kê chi trả.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function printReceipt(id: string) {
    const popup = window.open("", "_blank", "width=850,height=700");
    if (!popup) {
      setError("Cho phép cửa sổ mới để in hoặc lưu bảng kê PDF.");
      return;
    }
    try {
      const data = unwrap<
        Statement & {
          collaborator: {
            fullName: string;
            collaboratorProfile: { taxCode: string | null } | null;
          };
          bankAccountNumber: string;
        }
      >(await api.get(`/wallets/tax-invoices/${id}`));
      const doc = popup.document;
      const sandbox = data.transferProvider === 'BIDV_SANDBOX';
      doc.title = sandbox ? 'SCANMS - Bảng kê Sandbox' : 'SCANMS - Bảng kê chi trả';
      const style = doc.createElement("style");
      style.textContent =
        "body{font:16px Arial;color:#1A1612;margin:48px}h1{color:#B88E4F}td{padding:12px;border-bottom:1px solid #EAE4D7}table{width:100%;border-collapse:collapse}button{padding:12px;background:#C59B58;border:0;color:white}@media print{button{display:none}}";
      doc.head.append(style);
      const title = doc.createElement("h1");
      title.textContent = sandbox ? 'SCANMS · Bảng kê chi trả thử nghiệm Sandbox' : 'SCANMS · Bảng kê chi trả thu nhập';
      doc.body.append(title);
      const table = doc.createElement("table");
      for (const [label, value] of [
        ["Mã chi trả", data.id],
        ["Đối tác", data.collaborator.fullName],
        [
          "Mã số thuế",
          data.collaborator.collaboratorProfile?.taxCode ?? "Chưa cung cấp",
        ],
        ["Tài khoản nhận", data.bankAccountNumber],
        [
          "Ngày chi trả",
          data.processedAt
            ? new Date(data.processedAt).toLocaleString("vi-VN")
            : "—",
        ],
        ["Thu nhập trước thuế", money(data.amount)],
        ["Thuế khấu trừ", money(data.taxAmount)],
        ["Thực nhận", money(data.netAmount)],
        [sandbox ? 'Mã Sandbox SCANMS' : 'Mã ngân hàng', data.bankRefCode ?? '—'],
      ]) {
        const row = doc.createElement("tr");
        for (const text of [label, value]) {
          const cell = doc.createElement("td");
          cell.textContent = text;
          row.append(cell);
        }
        table.append(row);
      }
      doc.body.append(table);
      const note = doc.createElement("p");
      note.textContent = sandbox
        ? 'BIDV Sandbox: hoàn tất yêu cầu rút tiền thử nghiệm trong SCANMS. Không chuyển tiền ngoài đời. Đây không phải chứng từ ngân hàng hoặc chứng từ thuế.'
        : 'Bảng kê đối soát nội bộ SCANMS. Chứng từ khấu trừ thuế được tải riêng khi kế toán cung cấp bản đã phát hành.';
      doc.body.append(note);
      const print = doc.createElement("button");
      print.textContent = "In / Lưu PDF";
      print.onclick = () => popup.print();
      doc.body.append(print);
    } catch {
      popup.close();
      setError("Không tải được chi tiết bảng kê.");
    }
  }
  return (
    <section className={panel} aria-busy={loading}>
      <h2 className="font-semibold">Bảng kê chi trả và thuế khấu trừ</h2>
      {error && (
        <p role="alert" className="text-[#DC2626]">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Đang tải…</p>
      ) : (
        <>
          {items.length > 0 && <p className="text-sm text-[#7D715E] my-2">
            Các khoản đã giải ngân được đối soát theo số thuế đã lưu tại thời
            điểm yêu cầu.
          </p>}
          {items.length > 0 && <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr>
                  {[
                    "Ngày chi trả",
                    "Trước thuế",
                    "Thuế",
                    "Thực nhận",
                    "Bảng kê",
                  ].map((label) => (
                    <th key={label} className="p-2">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr className="border-t border-[#EAE4D7]" key={item.id}>
                    <td className="p-2">
                      {item.processedAt
                        ? new Date(item.processedAt).toLocaleDateString("vi-VN")
                        : "—"}
                      {item.transferProvider === 'BIDV_SANDBOX' && <span className="block text-xs text-[#7D715E]">BIDV Sandbox</span>}
                    </td>
                    <td className="p-2">{money(item.amount)}</td>
                    <td className="p-2">{money(item.taxAmount)}</td>
                    <td className="p-2">{money(item.netAmount)}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={button}
                          onClick={() => void printReceipt(item.id)}
                        >
                          In / Lưu PDF
                        </button>
                        {Number(item.taxAmount) > 0 && item.transferProvider !== 'BIDV_SANDBOX' && (
                          <button
                            className={button}
                            onClick={() => void downloadCertificate(item.id)}
                          >
                            Tải chứng từ thuế
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          }
          {!items.length && (
            <p className="py-4 text-[#7D715E]">
              Chưa có khoản chi trả hoàn tất.
            </p>
          )}
        </>
      )}
    </section>
  );
}
