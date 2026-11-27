import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { toast } from '../../utils/toast';

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
    void loadEligibility();
  }, [isOpen, targetId, storeId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, submitting, onClose]);

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

  const checklistRows: Array<{ key: 'DEAL' | 'KPI' | 'VOUCHER' | 'SAMPLE'; label: string; count: number; detail?: string }> = [
    {
      key: 'DEAL',
      label: 'Deal độc quyền đang hiệu lực / chờ duyệt',
      count: eligibility?.counts?.openDealsCount ?? 0,
      detail: eligibility?.blockers?.find((b) => b.key === 'DEAL')?.detail,
    },
    {
      key: 'KPI',
      label: 'Hoa hồng KPI đang tạm giữ chờ quyết toán',
      count: eligibility?.counts?.pendingKpiCount ?? 0,
      detail: eligibility?.blockers?.find((b) => b.key === 'KPI')?.detail,
    },
    {
      key: 'VOUCHER',
      label: 'Mã ưu đãi KOC đang tồn tại (ACTIVE / Chờ duyệt)',
      count: eligibility?.counts?.activeVouchersCount ?? 0,
      detail: eligibility?.blockers?.find((b) => b.key === 'VOUCHER')?.detail,
    },
    {
      key: 'SAMPLE',
      label: 'Yêu cầu / Đơn hàng mẫu SLA 14 ngày chưa khép lại',
      count: eligibility?.counts?.openSamplesCount ?? 0,
      detail: eligibility?.blockers?.find((b) => b.key === 'SAMPLE')?.detail,
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terminate-coop-title"
      onClick={() => { if (!submitting) onClose(); }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white text-left shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#EAE4D7] bg-[#FAF8F5] px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]">
              <ShieldAlert className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 id="terminate-coop-title" className="m-0 text-sm font-bold text-[#1A1612]">
                Chấm dứt hợp tác với {partnerName}
              </h3>
              <p className="m-0 mt-0.5 text-xs text-[#7D715E]">
                Hệ thống kiểm tra tự động các Deal, KPI, Voucher và Hàng mẫu đang hiệu lực để bảo vệ quyền lợi hai bên.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#1A1612] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs font-medium text-[#7D715E]">
              <Loader2 className="h-4 w-4 animate-spin text-[#B88E4F]" />
              <span>Đang kiểm tra ràng buộc hợp đồng...</span>
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
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#7D715E]">
                  Bảng kiểm điều kiện chấm dứt hợp tác
                </div>
                <div className="divide-y divide-[#EAE4D7] rounded-xl border border-[#EAE4D7] bg-[#FAF8F5]/60">
                  {checklistRows.map((row) => {
                    const blocked = row.count > 0;
                    return (
                      <div key={row.key} className="flex items-start justify-between gap-3 px-3.5 py-2.5 text-xs">
                        <div className="flex items-start gap-2 min-w-0">
                          {blocked ? (
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
                          ) : (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
                          )}
                          <div className="min-w-0">
                            <div className={`font-semibold ${blocked ? 'text-[#DC2626]' : 'text-[#1A1612]'}`}>
                              {row.label}
                            </div>
                            <div className="mt-0.5 text-[11px] text-[#7D715E]">
                              {blocked ? row.detail : 'Không còn vướng ràng buộc'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                              blocked
                                ? 'border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]'
                                : 'border border-[#EEDFC6] bg-white text-[#7D715E]'
                            }`}
                          >
                            {row.count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!eligibility?.canTerminate ? (
                <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5 text-xs leading-relaxed text-[#991B1B]">
                  <strong>Chưa thể chấm dứt hợp tác lúc này:</strong> Bạn cần đóng/hoàn tất các Deal độc quyền, quyết toán xong các khoản thưởng KPI, ngừng/hết hạn Mã ưu đãi KOC và khép lại các đơn hàng mẫu đang mở ở danh sách trên trước khi chấm dứt.
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs leading-relaxed text-[#7D715E]">
                    Sau khi chấm dứt, {mode === 'shop' ? 'KOL' : 'Cửa hàng'} vẫn giữ toàn bộ lịch sử tin nhắn &amp; đối soát hoa hồng tiêu chuẩn của các đơn hàng cũ đã phát sinh, nhưng mọi nút tạo Deal / Mã ưu đãi / Hàng mẫu mới sẽ bị khóa cho tới khi hai bên kết nối lại.
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#1A1612]">
                      <label htmlFor="terminate-reason-input">
                        Lý do chấm dứt hợp tác <span className="text-[#DC2626]">*</span>
                      </label>
                      <span className="text-[11px] font-normal text-[#7D715E]">{trimmedReason.length}/500 ký tự (tối thiểu 5)</span>
                    </div>
                    <textarea
                      id="terminate-reason-input"
                      rows={3}
                      maxLength={500}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Nhập lý do rõ ràng (ví dụ: Hoàn tất chiến dịch quý và hai bên đồng thuận kết thúc hợp tác)..."
                      className="w-full rounded-xl border border-[#EAE4D7] bg-white px-3.5 py-2.5 text-xs text-[#1A1612] outline-none focus:border-[#C59B58] focus:ring-2 focus:ring-[#FBF5EB]"
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#EAE4D7] bg-[#FAF8F5] px-5 py-3.5">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-xl border border-[#EAE4D7] bg-white px-4 py-2 text-xs font-semibold text-[#7D715E] hover:bg-[#F3EFE6] cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            id="btn-confirm-terminate-coop"
            disabled={!canConfirm}
            onClick={() => void handleConfirm()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#DC2626] px-4 py-2 text-xs font-bold text-white hover:bg-[#B91C1C] cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{submitting ? 'Đang xử lý...' : 'Xác nhận chấm dứt'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
