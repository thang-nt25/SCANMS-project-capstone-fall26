import { useEffect, useState } from "react";
import { TrendingUp, ChevronDown, Calendar, Clock } from "lucide-react";
import {
  referralLinksService,
  type DealKpiProgress as Progress,
} from "@/services/referral-links.service";

const labels: Record<Progress["state"], string> = {
  PENDING: "Chờ Shop duyệt — chưa bắt đầu tính giờ",
  ACTIVE: "Đang thực hiện cam kết",
  SETTLING: "Đang chờ đối soát đơn hàng",
  ACHIEVED: "Đã đạt KPI số đơn",
  REVIEW_REQUIRED: "Chưa đạt KPI — chờ Shop xem xét",
  CLOSED: "Deal đã đóng",
  LEGACY: "Deal cũ chưa có KPI cấu trúc",
  REJECTED: "Đề xuất đã bị từ chối",
};
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
      } catch {
        if (active)
          setError(
            "Không tải được KPI. Hãy thử lại; dữ liệu cũ có thể chưa cập nhật.",
          );
      } finally {
        inFlight = false;
        if (active) setBusy(false);
      }
    };
    void load();
    const timer = window.setInterval(load, 15000);
    document.addEventListener("visibilitychange", load);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [id, open, reload]);
  const date = (value: string | null) =>
    value ? new Date(value).toLocaleString("vi-VN") : "Chưa bắt đầu";
  return (
    <div className="mb-3 w-full rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] overflow-hidden transition-all text-xs">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#1A1612] hover:bg-[#F3EFE6] transition-colors cursor-pointer select-none"
      >
        <span className="flex items-center gap-2 text-[#7D715E]">
          <span className="p-1 rounded-md bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F]">
            <TrendingUp className="w-3.5 h-3.5" />
          </span>
          <span className="font-bold text-[#1A1612]">Cam kết KPI & Hạn chót</span>
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7D715E] bg-white px-2 py-0.5 rounded-md border border-[#EAE4D7]">
          <span>{open ? 'Thu gọn' : 'Xem tiến độ'}</span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && (
        <div className="p-3 pt-2 space-y-2.5 text-xs text-[#7D715E] border-t border-[#EAE4D7] bg-white" aria-busy={busy}>
          {error && (
            <p role="alert" className="text-xs text-[#DC2626] font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
              {error}
            </p>
          )}
          {!progress && busy && (
            <div className="py-2 text-center text-[#7D715E]">Đang đồng bộ số liệu tiến độ...</div>
          )}
          {progress && (
            <>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1A1612]">
                  {labels[progress.state]}
                </span>
                <span className="font-bold text-[#B88E4F] bg-[#FBF5EB] border border-[#EEDFC6] px-2 py-0.5 rounded-full text-[11px]">
                  {progress.percent}% hoàn thành
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#7D715E]">Đơn hàng hợp lệ đã chốt</span>
                  <span className="font-bold text-[#1A1612]">
                    {progress.completedOrders} / {progress.targetOrders ?? '—'} đơn
                  </span>
                </div>
                <div className="w-full bg-[#FAF8F5] rounded-full h-1.5 border border-[#EAE4D7] overflow-hidden">
                  <div
                    className="bg-[#C59B58] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
                  />
                </div>
                {progress.pendingOrders > 0 && (
                  <p className="text-[10.5px] text-[#7D715E]">
                    Có {progress.pendingOrders} đơn đang vận chuyển/chờ đối soát.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-[#7D715E] border-t border-[#EAE4D7]">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#B88E4F]" />
                  <span>Bắt đầu: <strong className="text-[#1A1612]">{date(progress.startsAt)}</strong></span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#B88E4F]" />
                  <span>Hạn deal: <strong className="text-[#1A1612]">{date(progress.endsAt)}</strong></span>
                </div>
              </div>
            </>
          )}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => setReload((value) => value + 1)}
              className="text-[11px] font-semibold text-[#B88E4F] hover:text-[#1A1612] bg-[#FAF8F5] border border-[#EEDFC6] px-2.5 py-1 rounded-lg hover:bg-[#F3EFE6] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Đang cập nhật...' : 'Làm mới số liệu'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
