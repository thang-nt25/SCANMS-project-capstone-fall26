import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../services/api";
import { VietnamMonthPicker } from '../ui/VietnamMonthPicker';
import { PayoutEvidenceDialog } from './PayoutEvidenceDialog';
import { LedgerReconciliation } from './LedgerReconciliation';
import { ArrowRight, AlertCircle, Wallet, ReceiptText, Landmark } from 'lucide-react';

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
  const [section, setSection] = useState<'tax' | 'cost' | 'certificate' | 'ledger'>('tax');
  const [month, setMonth] = useState(
    new Date()
      .toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" })
      .slice(0, 7),
  );
  const [report, setReport] = useState<TaxReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
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
  const [issuePayoutId, setIssuePayoutId] = useState<string | null>(null);
  const [showTaxIssues, setShowTaxIssues] = useState(false);
  const missingTaxRows = report?.items.filter(row => !row.collaborator.collaboratorProfile?.taxCode?.trim()) ?? [];
  const loadTaxReport = useCallback(async () => {
    const requestId = ++taxRequest.current;
    setReportLoading(true); setMessage(''); setReport(null);
    try {
      const next = data<TaxReport>(await api.get('/admin/payouts/tax-report', {
        params: { yearMonth: month }, headers: { 'x-skip-cache': 'true' },
      }));
      if (requestId !== taxRequest.current) return;
      if (next.yearMonth !== month || !Array.isArray(next.items)) throw new Error('Báo cáo trả về chưa khớp kỳ đã chọn.');
      setReport(next);
    } catch (error) {
      if (requestId === taxRequest.current) setMessage(error instanceof Error ? error.message : 'Không tải được báo cáo thuế.');
    } finally { if (requestId === taxRequest.current) setReportLoading(false); }
  }, [month]);
  useEffect(() => {
    if (section !== 'tax' && section !== 'certificate') return;
    void loadTaxReport();
    return () => { taxRequest.current++; setReportLoading(false); };
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
  useEffect(() => { setReport(null); setLedger(null); setPayoutId(''); setFile(null); setNumber(''); setIssuedAt(''); setMessage(''); setIssuePayoutId(null); setShowTaxIssues(false); }, [month]);
  useEffect(() => {
    if (section !== 'ledger') return;
    let live = true; setLedgerLoading(true); setMessage(''); setLedger(null);
    api.get('/admin/payouts/ledger-reconciliation', { params: { yearMonth: month }, headers: { 'x-skip-cache': 'true' } })
      .then(response => { if (live) setLedger(data(response)); })
      .catch(error => { if (live) setMessage(error instanceof Error ? error.message : 'Không tải được sổ cái.'); })
      .finally(() => { if (live) setLedgerLoading(false); });
    return () => { live = false; };
  }, [section, month]);
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
    if (!report?.items.length) return;
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
      {issuePayoutId && <PayoutEvidenceDialog id={issuePayoutId} focusCode="TAX_ID" onClose={() => setIssuePayoutId(null)}/>}
      <div className="finance-operation-tabs" role="tablist" aria-label="Nghiệp vụ đối soát">
        {([{ id: 'tax', label: 'Báo cáo thuế' }, { id: 'cost', label: 'Bổ sung giá vốn' }, { id: 'certificate', label: 'Chứng từ thuế' }, { id: 'ledger', label: 'Sổ cái' }] as const).map((tab, index) => (
          <button key={tab.id} type="button" role="tab" aria-selected={section === tab.id} disabled={busy} onClick={() => setSection(tab.id)}>
            <span className="finance-tab-number">{index + 1}</span>{tab.label}
          </button>
        ))}
      </div>
      {message && (
        <p role="status" className="text-sm text-[#7D715E]">
          {message}
        </p>
      )}
      {section !== 'cost' && <div className="flex flex-wrap items-center justify-between gap-3">
        <VietnamMonthPicker value={month} max={new Date().toLocaleDateString('sv-SE', {timeZone:'Asia/Ho_Chi_Minh'}).slice(0,7)} label="Kỳ chi trả" disabled={busy} onChange={setMonth}/>
        {section === 'tax' && <button type="button" className={button} disabled={busy || reportLoading || !report?.items.length} onClick={exportCsv} title={!report?.items.length ? 'Kỳ này chưa có khoản chi trả thực tế để xuất' : 'Tải báo cáo theo kỳ đã chọn'}>Xuất CSV</button>}
      </div>}
      {(reportLoading && (section === 'tax' || section === 'certificate') || ledgerLoading && section === 'ledger') && <p role="status" className="text-sm text-[#7D715E]">Đang tải dữ liệu kỳ đã chọn…</p>}
      {section === 'ledger' && ledger && <LedgerReconciliation report={ledger} month={month}/>}
      {section === 'tax' && report && (
        <div className="finance-tax-result text-sm">
          <p className="mb-3 text-xs text-[#7D715E]">Kỳ {report.yearMonth.slice(5)}/{report.yearMonth.slice(0, 4)} · {report.items.length} khoản chi trả thực tế đã hoàn tất.</p>
          <dl className="finance-tax-totals">
            {[
              { label: 'Trước thuế', value: report.gross, icon: Wallet },
              { label: 'Thuế khấu trừ', value: report.tax, icon: ReceiptText },
              { label: 'Thực nhận', value: report.net, icon: Landmark },
            ].map(item => <div key={item.label}>
              <dt><span aria-hidden="true"><item.icon size={18}/></span>{item.label}</dt>
              <dd>{Number(item.value).toLocaleString('vi-VN')} ₫</dd>
            </div>)}
          </dl>
          {missingTaxRows.length > 0 && <div className="finance-tax-issues">
            <button type="button" className="finance-tax-issue-trigger" aria-expanded={missingTaxRows.length > 1 ? showTaxIssues : undefined} onClick={() => missingTaxRows.length === 1 ? setIssuePayoutId(missingTaxRows[0].id) : setShowTaxIssues(value => !value)}>
              <AlertCircle size={17}/><span>{missingTaxRows.length} khoản chi thiếu mã số thuế</span><span className="finance-tax-issue-action">Xem hồ sơ <ArrowRight size={15}/></span>
            </button>
            {showTaxIssues && missingTaxRows.length > 1 && <div className="finance-tax-issue-list">{missingTaxRows.map(row => <button type="button" key={row.id} onClick={() => setIssuePayoutId(row.id)}><span>{row.collaborator.fullName}<small>Lệnh {row.id.slice(0, 8).toUpperCase()} · {Number(row.amount).toLocaleString('vi-VN')} ₫</small></span><ArrowRight size={16}/></button>)}</div>}
          </div>}
          <p className="finance-tax-caption">
            Theo ngày hoàn tất chuyển khoản, giờ Việt Nam.
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
            disabled={busy}
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
      {section === 'certificate' && !reportLoading && report && !report.items.some(row => Number(row.taxAmount) > 0) && <p className="rounded-xl border border-[#EAE4D7] p-4 text-sm text-[#7D715E]">Chưa có khoản chi trả thực tế đã khấu trừ thuế trong kỳ này.</p>}
      <form
        hidden={section !== 'certificate' || reportLoading || !report?.items.some(row => Number(row.taxAmount) > 0)}
        className="grid gap-3 border-t border-[#EAE4D7] pt-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            if (!file || !payoutId || reportLoading) return;
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
          Đính kèm PDF đã phát hành cho khoản chi trong kỳ đã chọn.
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
            key={month}
            accept="application/pdf"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button className={button} disabled={busy || reportLoading || !payoutId || !file}>
          Đính kèm chứng từ
        </button>
      </form>
    </section>
  );
}
