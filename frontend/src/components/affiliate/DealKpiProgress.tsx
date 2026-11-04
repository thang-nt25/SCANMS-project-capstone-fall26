import { useEffect, useState } from "react";
import { TrendingUp, ChevronDown, Calendar, Clock, ShieldAlert, Lock } from "lucide-react";
import {
  referralLinksService,
  type DealKpiProgress as Progress,
} from "@/services/referral-links.service";

const labels: Record<Progress["state"], string> = {
  PENDING_ADMIN_APPROVAL: "Chờ Admin duyệt ngoại lệ — chưa bắt đầu tính giờ",
  PENDING: "Chờ Shop duyệt — chưa bắt đầu tính giờ",
  ACTIVE: "Đang chạy cam kết KPI sản lượng",
  SETTLING: "Đang chờ đối soát đơn hàng",
  ACHIEVED: "Đã đạt KPI cam kết",
  REVIEW_REQUIRED: "Chưa đạt KPI — chờ Shop xem xét",
  CLOSED: "Deal đã đóng",
  LEGACY: "Cam kết chỉ tiêu sản lượng",
  REJECTED: "Đề xuất đã bị từ chối",
};

const formatVnd = (val: number) => (val || 0).toLocaleString('vi-VN') + ' ₫';

export function DealKpiProgress({ id }: { id: string }) {
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
    <div className="border border-[#EAE4D7] rounded-xl bg-white overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full flex min-h-11 items-center justify-between gap-2 px-3 py-2 hover:bg-[#FAF8F5] transition-colors text-left font-medium text-[#1A1612]"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#B88E4F]" />
          <span>Tiến độ &amp; thời hạn</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#7D715E]">
          <span>{open ? "Thu gọn" : "Xem tiến độ"}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div className="p-3 border-t border-[#EAE4D7] bg-white space-y-3">
          {busy && !progress && (
            <p className="text-[#7D715E] text-[11px]">Đang tải số liệu...</p>
          )}
          {error && (
            <p className="text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200 text-[11px]">
              {error}
            </p>
          )}
          {progress && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#1A1612]">
                  {labels[progress.state]}
                </span>
                <span className="text-[11px] font-bold text-[#B88E4F] bg-[#FBF5EB] px-2 py-0.5 rounded-full border border-[#EEDFC6]">
                  {progress.percent}% hoàn thành
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap justify-between gap-1.5 text-[11px] text-[#7D715E]">
                  <span>{progress.targetRevenue ? 'Doanh thu hợp lệ đã chốt' : 'Đơn hàng hợp lệ đã chốt'}</span>
                  <strong className="text-[#1A1612] tabular-nums">
                    {progress.targetRevenue ? `${Number(progress.validRevenue || 0).toLocaleString('vi-VN')} / ${Number(progress.targetRevenue).toLocaleString('vi-VN')} đ` : `${progress.completedOrders} / ${progress.targetOrders ?? '—'} đơn`}
                  </strong>
                </div>
                <div className="w-full h-2 bg-[#F3EFE6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C59B58] transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
                  />
                </div>
              </div>

              <details className="group rounded-xl border border-[#EAE4D7] bg-white">
                <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium text-[#1A1612] [&::-webkit-details-marker]:hidden">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-[#B88E4F]" />
                  Chi tiết thù lao
                  <span className="ml-auto text-[11px] font-normal text-[#7D715E]">
                    {progress.rebateStatus === 'UNLOCKED' ? 'Đã mở khóa' : progress.rebateStatus === 'FORFEITED' ? 'Không đạt KPI' : 'Đang bảo lưu'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#7D715E] transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-[#EAE4D7] p-3">
                  <div className="grid grid-cols-2 divide-x divide-[#EAE4D7]">
                    <div className="min-w-0 pr-3">
                      <p className="m-0 text-[11px] text-[#7D715E]">Hoa hồng cơ sở</p>
                      <p className="mb-0 mt-1 text-sm font-semibold tabular-nums text-[#1A1612]">{formatVnd(progress.baseCommissionEarned || 0)}</p>
                    </div>
                    <div className="min-w-0 pl-3">
                      <p className="m-0 text-[11px] text-[#7D715E]">Thưởng cam kết +{progress.rebateBonusRate || 0}%</p>
                      <p className="mb-0 mt-1 text-sm font-semibold tabular-nums text-[#B88E4F]">{formatVnd(progress.vipRebateEscrow || 0)}</p>
                    </div>
                  </div>
                  <p className="mb-0 mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#7D715E]">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B88E4F]" />
                    <span>{progress.rebateStatus === 'UNLOCKED'
                      ? 'Khoản thưởng cam kết đã được mở khóa.'
                      : progress.rebateStatus === 'FORFEITED'
                        ? 'Khoản thưởng không được mở khóa do chưa đạt KPI.'
                        : progress.targetRevenue
                          ? `Thưởng được mở khóa khi đạt doanh số hợp lệ ${formatVnd(Number(progress.targetRevenue))} theo cam kết.`
                          : progress.targetOrders
                            ? `Thưởng được mở khóa khi đạt ${progress.targetOrders} đơn hợp lệ theo cam kết.`
                            : 'Chưa có chỉ tiêu mở khóa được ghi nhận.'}</span>
                  </p>
                </div>
              </details>

              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-[#7D715E] border-t border-[#EAE4D7]">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#B88E4F]" />
                  <span>
                    Bắt đầu:{" "}
                    <strong className="text-[#1A1612]">
                      {progress.startsAt
                        ? new Date(progress.startsAt).toLocaleDateString("vi-VN")
                        : "—"}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#B88E4F]" />
                  <span>
                    Hạn chốt:{" "}
                    <strong className="text-[#1A1612]">
                      {progress.endsAt
                        ? new Date(progress.endsAt).toLocaleDateString("vi-VN")
                        : "—"}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setReload((n) => n + 1)}
                  disabled={busy}
                  className="px-2 py-1 rounded bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E] hover:text-[#1A1612] text-[10.5px] disabled:opacity-50"
                >
                  Làm mới số liệu
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
