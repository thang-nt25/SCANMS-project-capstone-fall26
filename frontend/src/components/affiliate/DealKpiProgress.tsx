import { useEffect, useState } from "react";
import { createPortal } from 'react-dom';
import { Modal } from '@/components/ui/Modal';
import { CheckCircle, Lock } from "lucide-react";
import { getSafeProductImageUrl, handleProductImageError } from '@/utils/marketplace.utils';
import {
  referralLinksService,
  type DealKpiProgress as Progress,
} from "@/services/referral-links.service";

const labels: Record<Progress["state"], string> = {
  PENDING_ADMIN_APPROVAL: "Chờ Admin phê duyệt",
  PENDING: "Chờ Shop chấp thuận",
  ACTIVE: "Đang thực hiện",
  SETTLING: "Chờ đối soát",
  ACHIEVED: "Đã đạt KPI",
  REVIEW_REQUIRED: "Chờ cửa hàng xem xét",
  CLOSED: "Deal đã đóng",
  LEGACY: "Cam kết cũ",
  REJECTED: "Đề xuất đã bị từ chối",
};

const formatVnd = (val: number) => (val || 0).toLocaleString('vi-VN') + ' ₫';

export function DealKpiProgress({ id, product, storeName, triggerLabel = 'Xem chi tiết', readOnly = false, heldAmount, standardRate, bonusRate }: { id: string; product?: { title?: string; imageUrl?: string | null }; storeName?: string; triggerLabel?: string; readOnly?: boolean; heldAmount?: number; standardRate?: number; bonusRate?: number }) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!open) return;
    let active = true;
    let inFlight = false;
    const load = async () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      setBusy(true);
      try {
        const result = await referralLinksService.getDealProgress(id);
        if (active) {
          setProgress(result);
          setError("");
        }
      } catch (err: any) {
        if (active) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Không thể tải tiến độ KPI"
          );
        }
      } finally {
        if (active) setBusy(false);
        inFlight = false;
      }
    };
    load();
    const interval = setInterval(load, 30_000);
    const onVisibility = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [id, open, reload]);

  return (
    <div className="deal-kpi-entry">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="deal-kpi-details-button"
        title="Xem tiến độ và thời hạn Deal"
      >
        {triggerLabel}
      </button>

      {open && createPortal(
        <Modal isOpen={open} onClose={() => setOpen(false)} title="Tiến độ Deal" maxWidth="3xl" stickyHeader className="deal-kpi-dialog" bodyClassName="deal-kpi-body">
          {product && <div className="deal-kpi-product">
            <img src={getSafeProductImageUrl(product.imageUrl)} onError={handleProductImageError} alt={product.title || 'Sản phẩm'} />
            <div><h4>{product.title || 'Sản phẩm tiếp thị'}</h4><p>{storeName}</p></div>
          </div>}
          {busy && !progress && <p role="status" className="deal-kpi-loading">Đang tải tiến độ…</p>}
          {error && <p role="alert" className="deal-kpi-error">{error}</p>}
          {progress && <div className="deal-kpi-content">
            {readOnly && <section className="deal-kpi-money" aria-label="Khoản giữ trên đơn đang xem">
              <div><span>Chênh lệch đang giữ · đơn này</span><strong>{heldAmount == null ? 'Chưa có dữ liệu' : formatVnd(heldAmount)}</strong></div>
              <div><span>Mức đã ghi nhận trên đơn</span><strong>{standardRate != null && bonusRate != null ? `Deal ${standardRate + bonusRate}%` : 'Chưa ghi nhận'}</strong><small>{standardRate != null && bonusRate != null ? `Tiêu chuẩn ${standardRate}% · Chênh lệch ${bonusRate}%` : ''}</small></div>
            </section>}
            <section className="deal-kpi-overview" aria-label="Tiến độ KPI">
              <div className="deal-kpi-progress-heading"><div><span>Hoàn thành KPI</span><strong>{Number(progress.percent).toLocaleString('vi-VN')}<small>%</small></strong></div>
                <div className="deal-kpi-state"><span>{labels[progress.state]}</span></div>
              </div>
              <div role="progressbar" aria-label="Tỷ lệ hoàn thành KPI" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, progress.percent))} className="deal-kpi-track"><div style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }} /></div>
              <div className="deal-kpi-target"><span>Đã đạt <strong>{progress.targetRevenue ? formatVnd(Number(progress.validRevenue || 0)) : `${progress.completedOrders} đơn`}</strong></span><span>Mục tiêu <strong>{progress.targetRevenue ? formatVnd(Number(progress.targetRevenue)) : progress.targetOrders != null ? `${progress.targetOrders} đơn` : 'Chưa thiết lập'}</strong></span></div>
            </section>
            <section className="deal-kpi-money" aria-label="Chi tiết thù lao">
              <div><span>{readOnly ? 'Thù lao tiêu chuẩn theo tiến độ Deal' : 'Thù lao cơ sở'}</span><strong>{formatVnd(progress.baseCommissionEarned || 0)}</strong></div>
              <div><span>{readOnly ? 'Chênh lệch tính theo tiến độ toàn Deal' : progress.rebateStatus === 'UNLOCKED' ? 'Chênh lệch Deal đã mở khóa' : progress.rebateStatus === 'FORFEITED' ? 'Chênh lệch Deal không được mở khóa' : 'Chênh lệch Deal đang giữ'}</span><strong>{formatVnd(progress.vipRebateEscrow || 0)}</strong></div>
            </section>
            <p className="deal-kpi-note"><Lock size={15} /><span>{progress.rebateStatus === 'UNLOCKED' ? 'Chênh lệch Deal đã được mở khóa.' : progress.rebateStatus === 'FORFEITED' ? 'Chênh lệch không được mở khóa do chưa đạt KPI.' : progress.state === 'PENDING' || progress.state === 'PENDING_ADMIN_APPROVAL' ? 'Thời hạn bắt đầu khi Deal được duyệt.' : 'Mở khóa chênh lệch khi đủ KPI và hoàn tất đối soát 14 ngày.'}</span></p>
            <dl className="deal-kpi-dates">
              <div><dt>Ngày bắt đầu</dt><dd>{progress.startsAt ? new Date(progress.startsAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa bắt đầu'}</dd></div>
              <div><dt>Hạn hoàn thành</dt><dd>{progress.endsAt ? new Date(progress.endsAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa thiết lập'}</dd></div>
            </dl>
            {!readOnly && progress.state === 'ACHIEVED' && progress.rebateStatus !== 'UNLOCKED' && <button type="button" disabled={busy} className="deal-kpi-settle" onClick={async () => {
              try { setBusy(true); await referralLinksService.settleDeal(id); setReload(n => n + 1); }
              catch (e: any) { setError(e?.response?.data?.message || 'Không thể quyết toán Deal'); }
              finally { setBusy(false); }
            }}><CheckCircle size={16} />Quyết toán &amp; mở khóa chênh lệch</button>}
          </div>}
        </Modal>, document.body
      )}
    </div>
  );
}
