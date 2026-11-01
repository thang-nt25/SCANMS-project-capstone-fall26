import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
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
export function ExecutiveFinanceReport() {
  const [data, setData] = useState<Executive | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(
        unwrap<Executive>(
          await api.get("/analytics/executive-summary", {
            headers: { "x-skip-cache": "true" },
          }),
        ),
      );
    } catch {
      setData(null);
      setError(
        "Không tải được báo cáo tài chính. Chỉ Quản trị tối cao được truy cập.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section className={panel} aria-busy={loading}>
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="font-semibold text-lg">Tài chính doanh nghiệp</h2>
          <p className="text-sm text-[#7D715E]">
            Lũy kế toàn hệ thống · Báo cáo thu nhập tiếp thị và nghĩa vụ chi trả
          </p>
        </div>
        <button
          className={button}
          onClick={() => void load()}
          disabled={loading}
        >
          Làm mới
        </button>
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
          <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 my-6">
            {Object.entries({
              "GMV đơn đã hoàn tất": data.gmv,
              "Doanh thu sau hoàn trả": data.netRevenue,
              "Chi phí thu nhập tiếp thị": data.affiliateExpense,
              "Hoa hồng đơn chưa hoàn tất (ngoài tỷ lệ)": data.unrecognizedCommissions,
              "Thu nhập đang bảo chứng": data.escrowPending,
              "Thu nhập khả dụng": data.availableEarnings,
              "Thực chuyển ngân hàng": data.netPaid,
              "Thuế đã khấu trừ": data.taxWithheld,
            }).map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-[#7D715E]">{label}</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {value == null ? 'Chưa có dữ liệu' : money(value)}
                </dd>
              </div>
            ))}
            <div>
              <dt className="text-sm text-[#7D715E]">
                Chi phí tiếp thị / doanh thu
              </dt>
              <dd className="mt-1 text-xl font-semibold">
                {data.affiliateExpenseRatio === null
                  ? "Chưa có doanh thu"
                  : `${data.affiliateExpenseRatio}%`}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-[#7D715E]">
            {data.ordersCount} đơn hoàn tất · Tỷ lệ chỉ đối chiếu doanh thu và hoa hồng của đơn hoàn tất, cộng thưởng tháng đã chi. Hoa hồng đơn chưa hoàn tất được theo dõi riêng. Escrow cơ sở {data.holdDays} ngày ·
            Cập nhật {new Date(data.asOf).toLocaleString("vi-VN")}. Số dư ngân
            hàng thực tế cần đối soát với ngân hàng.
          </p>
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
    <section className={`${panel} finance-escrow`} aria-busy={loading}>
      <h2 className="text-lg font-semibold">Thu nhập đang bảo chứng</h2>
      {error && (
        <p role="alert" className="text-[#DC2626]">
          {error}
        </p>
      )}
      {loading && <p role="status">Đang tải…</p>}
      {data && (
        <>
          <p className="my-3 text-[#7D715E]">
            <strong className="font-semibold text-[#1A1612]">{money(data.pendingAmount)}</strong> · {data.total} khoản đang tạm giữ
            {data.total > 0 && <> · Bảo chứng {data.holdDays} ngày lịch từ giao thành công; khoản có khiếu nại hoặc cần thẩm định tiếp tục được giữ.</>}
          </p>
          <div className="overflow-x-auto" hidden={!data.items.length}>
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F3EFE6]">
                <tr>
                  {[
                    "Đơn hàng",
                    "Sản phẩm / Gian hàng",
                    "Đơn giá",
                    "Thu nhập tạm giữ",
                    "Dự kiến giải tỏa",
                    "Đổi trả",
                  ].map((label) => (
                    <th className="p-3" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr className="border-b border-[#EAE4D7]" key={item.id}>
                    <td className="p-3">
                      <strong className="block font-semibold">{item.order.externalOrderSn || item.order.id.slice(0, 8)}</strong>
                      {item.order.testFixture && <small className="text-[#8F682E]">Đơn kiểm thử Escrow</small>}
                    </td>
                    <td className="p-3">{item.order.orderItems?.map((line,index) => <div key={index} className="escrow-product">
                      {line.product.imageUrl && <img src={line.product.imageUrl} alt="" />}
                      <div><strong>{line.product.title}</strong><small>{line.variant?.name || 'Không có biến thể'} · SL: {line.quantity}</small></div>
                    </div>)}<small className="escrow-store-name">{item.order.store.name}</small></td>
                    <td className="p-3">{item.order.orderItems?.map((line,index) => <div key={index} className="escrow-unit-price">{money(line.unitPrice)}</div>)}</td>
                    <td className="p-3 tabular-nums">
                      <strong>{money(item.commissionAmount)}</strong>
                      {item.order.orderItems?.length === 1 && <small className="block text-[#7D715E]">{Number(item.order.orderItems[0].appliedCommissionRate)}% hoa hồng</small>}
                    </td>
                    <td className="p-3">
                      {new Date(item.availableAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="p-3">
                      {item.order.returnRequest ? returnStatusLabel(item.order.returnRequest.status as ReturnStatus) : 'Không có yêu cầu đổi trả'}
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
      doc.title = "SCANMS - Bảng kê chi trả";
      const style = doc.createElement("style");
      style.textContent =
        "body{font:16px Arial;color:#1A1612;margin:48px}h1{color:#B88E4F}td{padding:12px;border-bottom:1px solid #EAE4D7}table{width:100%;border-collapse:collapse}button{padding:12px;background:#C59B58;border:0;color:white}@media print{button{display:none}}";
      doc.head.append(style);
      const title = doc.createElement("h1");
      title.textContent = "SCANMS · Bảng kê chi trả thu nhập";
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
        ["Mã ngân hàng", data.bankRefCode ?? "—"],
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
      note.textContent =
        "Bảng kê đối soát nội bộ SCANMS. Chứng từ khấu trừ thuế được tải riêng khi kế toán cung cấp bản đã phát hành.";
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
                        {Number(item.taxAmount) > 0 && (
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
