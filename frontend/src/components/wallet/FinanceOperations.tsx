import { useEffect, useState } from "react";
import api from "../../services/api";

const input =
  "rounded-lg border border-[#EAE4D7] bg-white p-2 text-sm text-[#1A1612]";
const button = `${input} bg-[#FBF5EB] hover:bg-[#F3EFE6] disabled:opacity-50`;
function data<T>(response: unknown): T {
  const outer = (response as { data?: unknown }).data ?? response;
  return ((outer as { data?: unknown }).data ?? outer) as T;
}
type TaxRow = {
  id: string;
  amount: string;
  taxAmount: string;
  netAmount: string;
  bankRefCode: string;
  collaborator: {
    fullName: string;
    collaboratorProfile: { taxCode: string | null } | null;
  };
};
type TaxReport = {
  yearMonth: string;
  gross: string;
  tax: string;
  net: string;
  items: TaxRow[];
  missingTaxCodes: string[];
};
type CostReport = {
  ordersMissingCost: { id: string; code: string }[];
  samplesMissingCost: string[];
};
export function FinanceOperations() {
  const [month, setMonth] = useState(
    new Date()
      .toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" })
      .slice(0, 7),
  );
  const [report, setReport] = useState<TaxReport | null>(null);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [storeId, setStoreId] = useState("");
  const [costs, setCosts] = useState<CostReport | null>(null);
  const [subject, setSubject] = useState("");
  const [amount, setAmount] = useState("");
  const [evidence, setEvidence] = useState("");
  const [payoutId, setPayoutId] = useState("");
  const [issuer, setIssuer] = useState("");
  const [number, setNumber] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ledger, setLedger] = useState<{
    balanced: boolean;
    items: {
      account: string;
      walletAmount: string;
      bookAmount: string;
      difference: string;
    }[];
  } | null>(null);
  useEffect(() => {
    api
      .get("/stores/all-admin")
      .then((r) => setStores(data(r)))
      .catch(() => setMessage("Không tải được nhãn hàng."));
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể hoàn tất thao tác.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function loadCosts(id: string) {
    if (!id) {
      setCosts(null);
      return;
    }
    setSubject("");
    setCosts(
      data<CostReport>(
        await api.get(`/stores/${id}/pnl-report`, {
          headers: { "x-skip-cache": "true" },
        }),
      ),
    );
  }
  function exportCsv() {
    if (!report) return;
    // Neutralize formula prefixes when opening the exported file in a spreadsheet.
    const cell = (value: unknown) =>
      `"${String(value ?? "")
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""')}"`;
    const rows = [
      [
        "Mã chi trả",
        "Đối tác",
        "Mã số thuế",
        "Thu nhập gộp",
        "Thuế khấu trừ",
        "Thực nhận",
        "Mã ngân hàng",
      ],
      ...report.items.map((r) => [
        r.id,
        r.collaborator.fullName,
        r.collaborator.collaboratorProfile?.taxCode,
        r.amount,
        r.taxAmount,
        r.netAmount,
        r.bankRefCode,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF", rows.map((row) => row.map(cell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `SCANMS-thue-${report.yearMonth}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="space-y-5 rounded-2xl border border-[#EAE4D7] bg-white p-5 text-[#1A1612]">
      <h2 className="text-lg font-semibold">
        Đối soát thuế và chi phí thực tế
      </h2>
      {message && (
        <p role="status" className="text-sm text-[#7D715E]">
          {message}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Kỳ chi trả
          <input
            aria-label="Kỳ chi trả"
            className={input}
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <button
          className={button}
          disabled={busy || !month}
          onClick={() =>
            void run(async () => {
              setReport(
                data<TaxReport>(
                  await api.get("/admin/payouts/tax-report", {
                    params: { yearMonth: month },
                    headers: { "x-skip-cache": "true" },
                  }),
                ),
              );
            })
          }
        >
          Xem báo cáo thuế
        </button>
        <button className={button} disabled={!report} onClick={exportCsv}>
          Tải CSV
        </button>
        <button
          className={button}
          disabled={busy}
          onClick={() =>
            void run(async () =>
              setLedger(
                data(
                  await api.get("/admin/payouts/ledger-reconciliation", {
                    headers: { "x-skip-cache": "true" },
                  }),
                ),
              ),
            )
          }
        >
          Đối chiếu sổ cái
        </button>
      </div>
      {ledger && (
        <div className="overflow-x-auto text-sm">
          <p className="mb-2 font-semibold">
            {ledger.balanced
              ? "Sổ cái khớp số dư ví và khoản giữ chi trả"
              : "Có chênh lệch cần kế toán đối soát"}
          </p>
          <table className="w-full text-left">
            <thead>
              <tr>
                {[
                  "Tài khoản",
                  "Số dư nghiệp vụ",
                  "Số dư sổ cái",
                  "Chênh lệch",
                ].map((label) => (
                  <th className="p-2" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledger.items.map((row) => (
                <tr className="border-t border-[#EAE4D7]" key={row.account}>
                  <td className="p-2">
                    {(
                      {
                        PARTNER_EARNINGS_PAYABLE: "Thu nhập khả dụng",
                        AFFILIATE_ESCROW: "Thu nhập bảo chứng",
                        CUSTOMER_FUNDS: "Tiền mua hàng",
                        PAYOUT_RESERVED: "Tiền giữ chi trả",
                      } as Record<string, string>
                    )[row.account] ?? row.account}
                  </td>
                  <td className="p-2">
                    {Number(row.walletAmount).toLocaleString("vi-VN")} ₫
                  </td>
                  <td className="p-2">
                    {Number(row.bookAmount).toLocaleString("vi-VN")} ₫
                  </td>
                  <td className="p-2">
                    {Number(row.difference).toLocaleString("vi-VN")} ₫
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {report && (
        <div className="space-y-2 text-sm">
          <p>
            Trước thuế: {Number(report.gross).toLocaleString("vi-VN")} ₫ · Khấu
            trừ: {Number(report.tax).toLocaleString("vi-VN")} ₫ · Thực nhận:{" "}
            {Number(report.net).toLocaleString("vi-VN")} ₫
          </p>
          {report.missingTaxCodes.length > 0 && (
            <p className="text-[#DC2626]">
              Có {report.missingTaxCodes.length} khoản chi thiếu mã số thuế. Kế
              toán cần bổ sung hồ sơ.
            </p>
          )}
          <p>
            {report.items.length} khoản chi đã xác nhận trong kỳ. Báo cáo này hỗ
            trợ đối soát nội bộ.
          </p>
        </div>
      )}
      <form
        className="grid gap-3 border-t border-[#EAE4D7] pt-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const [subjectType, subjectId] = subject.split(":");
            await api.post(`/stores/${storeId}/finance-costs`, {
              subjectType,
              subjectId,
              amount,
              evidence,
            });
            await loadCosts(storeId);
            setAmount("");
            setEvidence("");
            setMessage("Đã ghi nhận chi phí thực tế và nhật ký đối soát.");
          });
        }}
      >
        <h3 className="font-semibold sm:col-span-2">
          Bổ sung giá vốn còn thiếu
        </h3>
        <label className="grid gap-1 text-sm">
          Nhãn hàng
          <select
            required
            className={input}
            value={storeId}
            onChange={(e) => {
              setStoreId(e.target.value);
              void run(() => loadCosts(e.target.value));
            }}
          >
            <option value="">Chọn nhãn hàng</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Đơn hàng / mẫu thử
          <select
            required
            className={input}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">Chọn khoản cần bổ sung</option>
            {costs?.ordersMissingCost.map((order) => (
              <option key={order.id} value={`ORDER:${order.id}`}>
                Đơn {order.code}
              </option>
            ))}
            {costs?.samplesMissingCost.map((id) => (
              <option key={id} value={`SAMPLE:${id}`}>
                Mẫu {id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Giá vốn thực tế (₫)
          <input
            required
            className={input}
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Căn cứ kế toán
          <input
            required
            maxLength={500}
            className={input}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="Số chứng từ hoặc tham chiếu hồ sơ"
          />
        </label>
        <button className={button} disabled={busy || !subject}>
          Ghi nhận chi phí
        </button>
      </form>
      <form
        className="grid gap-3 border-t border-[#EAE4D7] pt-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            if (!file) return;
            const body = new FormData();
            body.append("file", file);
            body.append("issuer", issuer);
            body.append("certificateNumber", number);
            body.append("issuedAt", issuedAt);
            await api.post(`/admin/payouts/${payoutId}/tax-certificate`, body, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            setMessage(
              "Đã đính kèm chứng từ. KOC có thể tải PDF tại ví của mình.",
            );
            setPayoutId("");
          });
        }}
      >
        <h3 className="font-semibold sm:col-span-2">
          Đính kèm chứng từ thuế đã phát hành
        </h3>
        <p className="text-sm text-[#7D715E] sm:col-span-2">
          Chọn khoản chi trong báo cáo kỳ ở trên và tải bản PDF được đơn vị phát
          hành cung cấp.
        </p>
        <label className="grid gap-1 text-sm">
          Khoản chi đã khấu trừ thuế
          <select
            className={input}
            required
            value={payoutId}
            onChange={(e) => setPayoutId(e.target.value)}
          >
            <option value="">Chọn khoản chi</option>
            {report?.items
              .filter((row) => Number(row.taxAmount) > 0)
              .map((row) => (
                <option key={row.id} value={row.id}>
                  {row.collaborator.fullName} ·{" "}
                  {Number(row.amount).toLocaleString("vi-VN")} ₫ ·{" "}
                  {row.id.slice(0, 8)}
                </option>
              ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Đơn vị phát hành
          <input
            className={input}
            required
            maxLength={150}
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Số chứng từ
          <input
            className={input}
            required
            maxLength={100}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Ngày phát hành
          <input
            className={input}
            type="date"
            required
            value={issuedAt}
            onChange={(e) => setIssuedAt(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          PDF chứng từ
          <input
            className={input}
            type="file"
            accept="application/pdf"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button className={button} disabled={busy || !payoutId || !file}>
          Đính kèm chứng từ
        </button>
      </form>
    </section>
  );
}
