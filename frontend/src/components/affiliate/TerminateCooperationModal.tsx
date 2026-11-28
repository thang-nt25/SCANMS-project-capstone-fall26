import { useEffect, useState } from 'react';
import { CircleDollarSign, CheckCircle2, ChevronRight, Handshake, Info, Loader2, Package, ShieldAlert, Ticket, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { TerminationBlockerDetails } from './TerminationBlockerDetails';

export interface TerminationBlocker {
  key: 'DEAL' | 'KPI' | 'VOUCHER' | 'SAMPLE';
  label: string;
  count: number;
  detail: string;
}

export interface TerminationEligibilityResponse {
  canTerminate: boolean;
  status: string;
  recordId: string;
  storeId: string;
  collaboratorId: string;
  blockers: TerminationBlocker[];
  counts: {
    openDealsCount: number;
    pendingKpiCount: number;
    activeVouchersCount: number;
    openSamplesCount: number;
  };
}

interface TerminateCooperationModalProps {
  isOpen: boolean;
  targetId: string;
  storeId?: string;
  partnerName: string;
  mode: 'shop' | 'kol';
  onClose: () => void;
  onTerminated: () => void;
}

export function TerminateCooperationModal({
  isOpen,
  targetId,
  storeId,
  partnerName,
  mode,
  onClose,
  onTerminated,
}: TerminateCooperationModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eligibility, setEligibility] = useState<TerminationEligibilityResponse | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedBlocker, setSelectedBlocker] = useState<TerminationBlocker['key'] | null>(null);
  const returnToChecklist = () => {
    setSelectedBlocker(null);
    void loadEligibility();
  };

  const loadEligibility = async () => {
    if (!targetId) return;
    setLoading(true);
    setError('');
    try {
      const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
      const res: any = await api.get(
        `/store-collaborators/${encodeURIComponent(targetId)}/termination-eligibility${qs}`,
        { headers: { 'x-skip-cache': '1' } },
      );
      const data: TerminationEligibilityResponse = res?.data ?? res;
      setEligibility(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Không kiểm tra được điều kiện chấm dứt hợp tác.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setReason('');
    setSelectedBlocker(null);
    void loadEligibility();
  }, [isOpen, targetId, storeId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || submitting) return;
      if (selectedBlocker) returnToChecklist();
      else onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, submitting, selectedBlocker, targetId, storeId, onClose]);

  if (!isOpen) return null;

  const trimmedReason = reason.trim();
  const canConfirm = Boolean(
    !loading &&
      !error &&
      eligibility?.canTerminate &&
      trimmedReason.length >= 5 &&
      !submitting,
  );

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
      await api.post(
        `/store-collaborators/${encodeURIComponent(targetId)}/terminate${qs}`,
        { reason: trimmedReason },
      );
      window.dispatchEvent(new Event('scanms_cooperation_changed'));
      toast.success(`Đã chấm dứt quan hệ hợp tác với ${partnerName}.`);
      onTerminated();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể chấm dứt hợp tác.');
      void loadEligibility();
    } finally {
      setSubmitting(false);
    }
  };

  const checklistRows = [
    {
      key: 'DEAL',
      label: 'Deal độc quyền',
      detail: 'Còn hiệu lực hoặc chờ duyệt',
      icon: Handshake,
      count: eligibility?.counts?.openDealsCount ?? 0,
    },
    {
      key: 'KPI',
      label: 'Hoa hồng KPI',
      detail: 'Đơn đang chờ quyết toán',
      icon: CircleDollarSign,
      count: eligibility?.counts?.pendingKpiCount ?? 0,
    },
    {
      key: 'VOUCHER',
      label: 'Mã ưu đãi KOC',
      detail: (mode === 'kol' && eligibility?.blockers?.find(blocker => blocker.key === 'VOUCHER')?.detail) || 'Đang hoạt động hoặc chờ xử lý',
      icon: Ticket,
      count: eligibility?.counts?.activeVouchersCount ?? 0,
    },
    {
      key: 'SAMPLE',
      label: 'Hàng mẫu',
      detail: 'Chưa hoàn tất · SLA 14 ngày',
      icon: Package,
      count: eligibility?.counts?.openSamplesCount ?? 0,
    },
  ] as const;
  const selectedRow = checklistRows.find(row => row.key === selectedBlocker);
  const blockedGroups = checklistRows.filter(row => row.count > 0).length;

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terminate-coop-title"
      onClick={() => { if (!submitting) onClose(); }}
    >
      <div
        className="kol-cooperation-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#EAE4D7] px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#8A6229]">
              <ShieldAlert className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 id="terminate-coop-title" className="m-0 text-lg leading-tight font-bold text-[#1A1612]">
                Chấm dứt hợp tác
              </h3>
              <p className="m-0 mt-1 text-sm break-words text-[#7D715E]">
                {partnerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Đóng"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#1A1612] focus-visible:outline-2 focus-visible:outline-[#B88E4F] disabled:cursor-not-allowed"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="kol-cooperation-dialog-body space-y-4 p-4 sm:p-5">
          {selectedRow ? (
            <TerminationBlockerDetails
              key={selectedRow.key}
              endpoint={`/store-collaborators/${encodeURIComponent(targetId)}/termination-eligibility/${selectedRow.key}${storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''}`}
              title={selectedRow.label}
              onBack={returnToChecklist}
            />
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs font-medium text-[#7D715E]">
              <Loader2 className="h-4 w-4 animate-spin text-[#B88E4F]" />
              <span role="status">Đang kiểm tra điều kiện…</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5 text-xs text-[#DC2626]">
              <p className="m-0 font-semibold">{error}</p>
              <button
                type="button"
                onClick={() => void loadEligibility()}
                className="mt-2 font-bold underline cursor-pointer"
              >
                Kiểm tra lại
              </button>
            </div>
          ) : (
            <>
              <section aria-labelledby="terminate-coop-checklist" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                  <h4 id="terminate-coop-checklist" className="m-0 text-sm font-bold text-[#1A1612]">
                    Điều kiện chấm dứt
                  </h4>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${blockedGroups > 0
                    ? 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
                    : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#79592C]'}`}>
                    {eligibility?.canTerminate ? 'Đủ điều kiện' : blockedGroups > 0 ? `${blockedGroups} mục còn vướng` : 'Chưa đủ điều kiện'}
                  </span>
                </div>
                <ul className="m-0 list-none divide-y divide-[#EAE4D7] rounded-xl border border-[#EAE4D7] p-0">
                  {checklistRows.map((row) => {
                    const blocked = row.count > 0;
                    const canView = blocked && mode === 'shop';
                    const Icon = row.icon;
                    const rowClass = 'grid min-h-14 w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2 text-left text-sm';
                    const content = (
                      <>
                        <span className={`grid size-8 place-items-center rounded-lg border ${blocked ? 'border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]' : 'border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E]'}`}>
                          <Icon size={15} aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className={`block font-semibold ${blocked ? 'text-[#991B1B]' : 'text-[#1A1612]'}`}>{row.label}</span>
                          <span className="mt-0.5 block text-xs leading-snug text-[#7D715E]">{row.detail}</span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <span
                            className={`min-w-7 rounded-full border px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums ${
                              blocked
                                ? 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
                                : 'border-transparent bg-[#FAF8F5] text-[#7D715E]'
                            }`}
                          >
                            {row.count}
                          </span>
                          <span className="grid size-4 place-items-center">
                            {canView ? <ChevronRight size={15} className="text-[#8A6229]" aria-hidden="true" />
                              : !blocked ? <CheckCircle2 size={13} className="text-[#059669]" aria-label="Đã hoàn tất" /> : null}
                          </span>
                        </span>
                      </>
                    );
                    return (
                      <li key={row.key} className="first:[&>button]:rounded-t-xl last:[&>button]:rounded-b-xl">
                        {canView ? (
                          <button type="button" onClick={() => setSelectedBlocker(row.key)}
                            className={`${rowClass} cursor-pointer hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#B88E4F]`}>
                            {content}
                          </button>
                        ) : <div className={rowClass}>{content}</div>}
                      </li>
                    );
                  })}
                </ul>
              </section>

              {eligibility?.canTerminate && (
                <>
                  <div className="flex gap-2.5 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2.5">
                    <Info className="mt-0.5 size-4 shrink-0 text-[#8A6229]" aria-hidden="true" />
                    <div className="space-y-0.5 text-xs leading-5 text-[#7D715E]">
                      <p className="m-0 font-semibold text-[#1A1612]">Sau khi chấm dứt</p>
                      <p className="m-0">{mode === 'shop' ? 'KOL' : 'Cửa hàng'} vẫn xem được lịch sử chat và đối soát hoa hồng tiêu chuẩn của đơn cũ.</p>
                      <p className="m-0">Cần kết nối lại để tạo Deal, mã KOC hoặc yêu cầu mẫu mới.</p>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 text-sm font-semibold text-[#1A1612]">
                      <label htmlFor="terminate-reason-input">
                        Lý do chấm dứt <span aria-hidden="true" className="text-[#DC2626]">*</span>
                      </label>
                      <span id="terminate-reason-limit" className="text-xs font-normal tabular-nums text-[#7D715E]">{reason.length}/500 ký tự · Tối thiểu 5</span>
                    </div>
                    <textarea
                      id="terminate-reason-input"
                      rows={2}
                      required
                      aria-describedby="terminate-reason-limit"
                      maxLength={500}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="block w-full resize-y rounded-xl border border-[#EAE4D7] bg-white px-3 py-2.5 text-sm text-[#1A1612] outline-none focus:border-[#B88E4F] focus:ring-2 focus:ring-[#EEDFC6]"
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {!selectedRow && <div className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-[#EAE4D7] bg-[#FAF8F5] px-4 py-3 sm:flex sm:justify-end sm:px-6">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="min-h-10 cursor-pointer rounded-xl border border-[#EAE4D7] bg-white px-4 py-2 text-sm font-semibold text-[#7D715E] hover:bg-[#F3EFE6] focus-visible:outline-2 focus-visible:outline-[#B88E4F] disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            type="button"
            id="btn-confirm-terminate-coop"
            disabled={!canConfirm}
            onClick={() => void handleConfirm()}
            className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#DC2626] px-3 py-2 text-sm font-bold text-white enabled:hover:bg-[#B91C1C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626] disabled:cursor-not-allowed disabled:bg-[#FBE8E6] disabled:text-[#991B1B] sm:px-4"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{submitting ? 'Đang xử lý...' : 'Xác nhận chấm dứt'}</span>
          </button>
        </div>}
      </div>
    </div>,
    document.body,
  );
}
