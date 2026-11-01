import { useEffect, useState } from "react";
import { TrendingUp, ChevronDown, Calendar, Clock, ShieldAlert, Lock } from "lucide-react";
import {
  referralLinksService,
  type DealKpiProgress as Progress,
} from "@/services/referral-links.service";

const labels: Record<Progress["state"], string> = {
  PENDING: "Chờ Shop duyệt — chưa bắt đầu tính giờ",
  ACTIVE: "Đang chạy cam kết KPI sản lượng",
  SETTLING: "Đang chờ đối soát đơn hàng",
  ACHIEVED: "Đã đạt KPI số đơn",
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
    <div className="border border-[#EAE4D7] rounded-xl bg-[#FAF8F5] overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full flex items-center justify-between p-3 hover:bg-[#F3EFE6] transition-colors text-left font-medium text-[#1A1612]"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#B88E4F]" />
          <span>Cam kết KPI &amp; Hạn chót</span>
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
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#1A1612]">
                  {labels[progress.state]}
                </span>
                <span className="text-[11px] font-bold text-[#B88E4F] bg-[#FBF5EB] px-2 py-0.5 rounded-full border border-[#EEDFC6]">
                  {progress.percent}% hoàn thành
                </span>
              </div>

              {progress.targetOrders != null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#7D715E]">
                    <span>Đơn hàng hợp lệ đã chốt</span>
                    <strong className="text-[#1A1612] tabular-nums">
                      {progress.completedOrders} / {progress.targetOrders} đơn
                    </strong>
                  </div>
                  <div className="w-full h-2 bg-[#F3EFE6] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C59B58] transition-all"
                      style={{ width: `${Math.min(100, progress.percent)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Two-Tier Retrospective KPI Rebate Escrow Breakdown */}
              <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3.5 text-xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#1A1612]">
                    <ShieldAlert className="w-4 h-4 text-[#B88E4F]" />
                    <span>Cơ Chế Thù Lao Thưởng Cam Kết 2 Tầng</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                    progress.rebateStatus === 'UNLOCKED'
                      ? 'bg-[#FBF5EB] text-[#059669] border-[#A7F3D0]'
                      : progress.rebateStatus === 'FORFEITED'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-[#F3EFE6] text-[#8C6226] border-[#EEDFC6]'
                  }`}>
                    {progress.rebateStatus === 'UNLOCKED'
                      ? 'Đã mở khóa 100%'
                      : progress.rebateStatus === 'FORFEITED'
                      ? 'Không đạt KPI'
                      : 'Bảo lưu an toàn'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-white border border-[#EAE4D7] shadow-2xs">
                    <div className="text-[#7D715E] font-medium">Tầng 1 (Cơ sở 10%):</div>
                    <div className="font-black text-[#1A1612] text-xs mt-0.5 tabular-nums">
                      {formatVnd(progress.baseCommissionEarned || 0)}
                    </div>
                    <div className="text-[10px] text-[#059669] mt-0.5 font-semibold">
                      Tự động vào Ví khả dụng
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-[#EEDFC6] shadow-2xs">
                    <div className="text-[#8C6226] font-medium">
                      Tầng 2 (Thưởng cam kết +{progress.rebateBonusRate || 0}%):
                    </div>
                    <div className="font-black text-[#B88E4F] text-xs mt-0.5 tabular-nums">
                      {formatVnd(progress.vipRebateEscrow || 0)}
                    </div>
                    <div className="text-[10px] text-[#7D715E] mt-0.5">
                      {progress.rebateStatus === 'UNLOCKED'
                        ? 'Đã giải ngân vào Ví'
                        : `Mở khóa khi đủ ${progress.targetOrders || 0} đơn`}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-[#7D715E] leading-relaxed flex items-start gap-1.5 pt-1">
                  <Lock className="w-3.5 h-3.5 text-[#B88E4F] shrink-0 mt-0.5" />
                  <span>
                    {progress.rebateStatus === 'UNLOCKED'
                      ? 'Chúc mừng! Bạn đã hoàn thành chỉ tiêu KPI. Toàn bộ khoản thưởng độc quyền đã được kết chuyển trọn vẹn vào Ví của bạn.'
                      : `Thù lao cơ sở 10% được cộng ngay vào Ví sau mỗi đơn hoàn tất. Khoản thưởng độc quyền +${progress.rebateBonusRate || 0}% được bảo lưu an toàn và tự động giải ngân trọn gói khi đạt đủ ${progress.targetOrders || 0} đơn.`}
                  </span>
                </p>
              </div>

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
