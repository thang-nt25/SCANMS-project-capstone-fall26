import { useCallback, useEffect, useRef, useState } from "react";
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
  sandbox?: { count: number; gross: string; tax: string; net: string };
};
type CostReport = {
  ordersMissingCost: { id: string; code: string }[];
  samplesMissingCost: string[];
};
export function FinanceOperations() {
  const [section, setSection] = useState<'tax' | 'cost' | 'certificate'>('tax');
  const [month, setMonth] = useState(
    new Date()
      .toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" })
      .slice(0, 7),
  );
  const [report, setReport] = useState<TaxReport | null>(null);
  const [taxScope, setTaxScope] = useState<'all' | 'real' | 'sandbox'>('all');
  const taxRequest = useRef(0);
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
  const loadTaxReport = useCallback(async () => {
    const requestId = ++taxRequest.current;
    setBusy(true); setMessage(''); setReport(null);
    try {
      const next = data<TaxReport>(await api.get('/admin/payouts/tax-report', {
        params: { yearMonth: month }, headers: { 'x-skip-cache': 'true' },
      }));
      if (requestId !== taxRequest.current) return;
      if (next.yearMonth !== month || !Array.isArray(next.items)) throw new Error('Báo cáo trả về chưa khớp kỳ đã chọn.');
      setReport(next);
    } catch (error) {
      if (requestId === taxRequest.current) setMessage(error instanceof Error ? error.message : 'Không tải được báo cáo thuế.');
    } finally { if (requestId === taxRequest.current) setBusy(false); }
  }, [month]);
  useEffect(() => {
    if (section !== 'tax') return;
    void loadTaxReport();
    return () => { taxRequest.current++; setBusy(false); };
  }, [section, loadTaxReport]);
  const [ledger, setLedger] = useState<{
    yearMonth?: string;
    balanced: boolean;
    items: {
      account: string;
      walletAmount: string;
      bookAmount: string;
      difference: string;
    }[];
  } | null>(null);
  useEffect(() => { setReport(null); setLedger(null); setPayoutId(''); setMessage(''); }, [month]);
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
    <section className="finance-operations space-y-5 rounded-2xl border border-[#EAE4D7] bg-white p-5 text-[#1A1612]">
      <div className="finance-operation-tabs" role="tablist" aria-label="Nghiệp vụ đối soát">
        {([{ id: 'tax', label: 'Báo cáo thuế' }, { id: 'cost', label: 'Chi phí thực tế' }, { id: 'certificate', label: 'Chứng từ thuế' }] as const).map((tab, index) => (
          <button key={tab.id} type="button" role="tab" aria-selected={section === tab.id} onClick={() => setSection(tab.id)}>
            <span className="finance-tab-number">{index + 1}</span>{tab.label}
          </button>
        ))}
      </div>
      {message && (
        <p role="status" className="text-sm text-[#7D715E]">
          {message}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3" hidden={section === 'cost'}>
        <label className="grid gap-1 text-sm">
          Kỳ chi trả
          <span className="finance-vietnamese-period">
            <select aria-label="Tháng chi trả" disabled={busy} className={input} value={month.slice(5, 7)} onChange={(e) => setMonth(`${month.slice(0, 4)}-${e.target.value}`)}>
              {Array.from({ length: 12 }, (_, index) => {
                const value = String(index + 1).padStart(2, '0');
                return <option key={value} value={value}>Tháng {index + 1}</option>;
              })}
            </select>
            <select aria-label="Năm chi trả" disabled={busy} className={input} value={month.slice(0, 4)} onChange={(e) => setMonth(`${e.target.value}-${month.slice(5, 7)}`)}>
              {Array.from({ length: 11 }, (_, index) => new Date().getFullYear() - 5 + index).map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </span>
        </label>
        <button
          className={button}
          disabled={busy || !month}
          onClick={() => void loadTaxReport()}
        >
          Xem báo cáo thuế
        </button>
        <button className={button} disabled={busy || !report || taxScope !== 'real'} onClick={exportCsv} title={taxScope !== 'real' ? 'Chọn Ngoài Sandbox để xuất CSV riêng của nhóm này' : undefined}>
          CSV ngoài Sandbox
        </button>
        <button
          className={button}
          disabled={busy}
          onClick={() =>
            void run(async () =>
              setLedger(
                data(
                  await api.get("/admin/payouts/ledger-reconciliation", {
                    params: { yearMonth: month },
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
      {section === 'tax' && ledger && (
        <div className="overflow-x-auto text-sm">
          <p className="mb-2 font-semibold">
            {ledger.balanced
              ? `Biến động tháng ${ledger.yearMonth} khớp sổ cái`
              : `Biến động tháng ${ledger.yearMonth} có chênh lệch cần đối soát`}
          </p>
          <table className="w-full text-left">
            <thead>
              <tr>
                {[
                  "Tài khoản",
                  "Biến động nghiệp vụ",
                  "Biến động sổ cái",
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
                        CORPORATE_BANK: "Thực chi ngân hàng",
                        PIT_TAX_PAYABLE: "Thuế TNCN phải nộp",
                        BIDV_SANDBOX_BANK: "Chi trả Sandbox",
                        SANDBOX_PIT_PAYABLE: "Thuế mô phỏng Sandbox",
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
          <p className="mt-2 text-xs text-[#7D715E]">Đối chiếu phát sinh trong tháng theo giờ Việt Nam, gồm giao dịch thử nghiệm. Không phải số dư hiện tại; chênh lệch lịch sử ngoài kỳ không được xóa hoặc bù tự động.</p>
          {!ledger.balanced && <p className="mt-2 text-xs text-[#8F682E]">Bút toán ghi khác tháng với thời điểm xử lý nghiệp vụ sẽ tạo chênh lệch kỳ. Cần kiểm tra ngày ghi sổ và chứng từ trước khi điều chỉnh.</p>}
        </div>
      )}
      {section === 'tax' && report && (
        <div className="finance-tax-result text-sm">
          <div className="mb-4 grid grid-cols-3 gap-3" role="group" aria-label="Loại chi trả">
            {(['all', 'real', 'sandbox'] as const).map(scope => <button key={scope} type="button" aria-pressed={taxScope === scope} onClick={() => setTaxScope(scope)} className={`min-h-12 rounded-xl border px-3 py-2 font-semibold ${taxScope === scope ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8C6226]' : 'border-[#EAE4D7] bg-white text-[#7D715E]'}`}>
              {scope === 'all' ? `Tất cả · ${report.items.length + (report.sandbox?.count ?? 0)} khoản` : scope === 'real' ? `Ngoài Sandbox · ${report.items.length} khoản` : `Sandbox · ${report.sandbox?.count ?? 0} khoản`}
            </button>)}
          </div>
          <p className="mb-3 text-xs text-[#7D715E]">Kỳ {report.yearMonth.slice(5)}/{report.yearMonth.slice(0, 4)} · Theo ngày hoàn tất chi trả, giờ Việt Nam. Lệnh chờ duyệt, đang xử lý hoặc bị từ chối chưa được tính.</p>
          <dl className="finance-tax-totals">
            {[
              { label: 'Trước thuế', value: taxScope === 'all' ? Number(report.gross) + Number(report.sandbox?.gross ?? 0) : taxScope === 'real' ? report.gross : report.sandbox?.gross ?? '0' },
              { label: 'Thuế khấu trừ', value: taxScope === 'all' ? Number(report.tax) + Number(report.sandbox?.tax ?? 0) : taxScope === 'real' ? report.tax : report.sandbox?.tax ?? '0' },
              { label: 'Thực nhận', value: taxScope === 'all' ? Number(report.net) + Number(report.sandbox?.net ?? 0) : taxScope === 'real' ? report.net : report.sandbox?.net ?? '0' },
            ].map((item, index) => <div key={item.label}>
              <dt><span aria-hidden="true">{index + 1}</span>{item.label}</dt>
              <dd>{Number(item.value).toLocaleString('vi-VN')} ₫</dd>
            </div>)}
          </dl>
          {taxScope === 'real' && report.missingTaxCodes.length > 0 && (
            <p className="text-[#DC2626]">
              Có {report.missingTaxCodes.length} khoản chi thiếu mã số thuế. Kế
              toán cần bổ sung hồ sơ.
            </p>
          )}
          <p className="finance-tax-caption">
            {taxScope === 'all' ? `Tổng khấu trừ của các lệnh hoàn tất trong hệ thống, gồm ${report.sandbox?.count ?? 0} khoản Sandbox.` : taxScope === 'real' ? `${report.items.length} khoản hoàn tất ngoài Sandbox.` : `${report.sandbox?.count ?? 0} khoản hoàn tất qua Sandbox.`}
          </p>
        </div>
      )}
      <form
        hidden={section !== 'cost'}
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
        <button className={`${button} finance-save-cost`} disabled={busy || !subject}>
          Ghi nhận chi phí
        </button>
      </form>
      <form
        hidden={section !== 'certificate'}
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
