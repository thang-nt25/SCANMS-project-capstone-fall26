import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';

type Scenario = 'success' | 'processing' | 'failed';
type Phase = 'ready' | 'sending' | 'processing' | 'reconciling' | 'succeeded' | 'failed';

// Independent demonstration only: no payout ID, API client, bank credentials or ledger access.
export function PayoutSimulationDialog({ onClose }: { onClose: () => void }) {
  const [scenario, setScenario] = useState<Scenario>('success');
  const [phase, setPhase] = useState<Phase>('ready');
  const [runId, setRunId] = useState(() => `SIM-${crypto.randomUUID()}`);
  const busy = phase === 'sending' || phase === 'reconciling';
  const complete = phase === 'succeeded' || phase === 'failed';

  useEffect(() => {
    if (!busy) return;
    const timer = window.setTimeout(() => {
      setPhase(phase === 'reconciling' || scenario === 'success' ? 'succeeded' : scenario === 'failed' ? 'failed' : 'processing');
    }, 650);
    return () => window.clearTimeout(timer);
  }, [busy, phase, scenario]);

  const result = {
    simulated: true,
    source: 'SCANMS_LOCAL_SIMULATION',
    notice: 'Kết quả mô phỏng, không phải chứng từ ngân hàng. Không có tiền được chuyển.',
    simulationId: runId,
    scenario,
    status: phase,
    amount: '1800000.00',
    currency: 'VND',
    simulationReference: phase === 'succeeded' ? runId : null,
  };

  function downloadResult() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${runId}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Modal isOpen onClose={onClose} title="Thử quy trình chi trả" className="payout-review-dialog" maxWidth="2xl">
      <p className="payout-document-notice text-sm"><strong>Mô phỏng trên máy.</strong> Dùng dữ liệu mẫu, không gọi BIDV và không thay đổi yêu cầu chi trả hoặc số dư. Không cần mã giao dịch hay bill có sẵn.</p>
      <div className="payout-recipient rounded-xl border border-[#EEDFC6] bg-[#FAF8F5] text-sm">
        <div><span>Đối tác mẫu</span><span>KOC DEMO</span></div>
        <div><span>Tiền yêu cầu</span><span>2.000.000 ₫</span></div>
        <div><span>Thuế mẫu</span><span>200.000 ₫</span></div>
        <div><span>Thực chuyển mẫu</span><span className="font-bold text-[#B88E4F]">1.800.000 ₫</span></div>
      </div>
      <label className="grid gap-2 text-sm font-semibold">Tình huống thử
        <select className="payout-review-input" value={scenario} disabled={phase !== 'ready'} onChange={event => setScenario(event.target.value as Scenario)}>
          <option value="success">Thành công</option>
          <option value="processing">Chờ xử lý → đối soát thành công</option>
          <option value="failed">Thất bại</option>
        </select>
      </label>
      <div role="status" aria-live="polite" className="rounded-xl border border-[#EAE4D7] p-4 text-sm">
        {phase === 'ready' && 'Sẵn sàng duyệt giao dịch mẫu.'}
        {phase === 'sending' && 'Đang mô phỏng gửi lệnh…'}
        {phase === 'processing' && 'Mô phỏng: đang chờ kết quả. Giữ tiền và đối soát lệnh cũ, không gửi lệnh lần hai.'}
        {phase === 'reconciling' && 'Đang mô phỏng vấn tin lệnh cũ…'}
        {phase === 'failed' && 'Mô phỏng: giao dịch thất bại. Yêu cầu vẫn chờ duyệt, chưa ghi nhận giải ngân.'}
        {phase === 'succeeded' && <><strong>Mô phỏng thành công</strong><p className="mt-2 break-all">Mã mô phỏng: {runId}</p><p className="mt-2 text-[#7D715E]">Kết quả này không phải bill chuyển khoản hay xác nhận từ BIDV.</p></>}
      </div>
      <div className="payout-review-actions">
        {phase === 'ready' && <button type="button" className="payout-primary" onClick={() => setPhase('sending')}>Duyệt thử</button>}
        {busy && <button type="button" className="payout-primary" disabled>Đang xử lý…</button>}
        {phase === 'processing' && <button type="button" className="payout-primary" onClick={() => setPhase('reconciling')}>Đối soát thử</button>}
        {complete && <>
          <button type="button" className="payout-secondary" onClick={() => { setRunId(`SIM-${crypto.randomUUID()}`); setPhase('ready'); }}>Thử lại</button>
          <button type="button" className="payout-primary" onClick={downloadResult}>Tải kết quả mô phỏng</button>
        </>}
        <button type="button" className="payout-secondary" onClick={onClose}>Đóng mô phỏng</button>
      </div>
    </Modal>
  );
}
