import { useEffect, useState } from "react";
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
    <section className="my-2 w-full rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="w-full text-left text-xs font-bold text-[#B88E4F]"
      >
        {open ? "Ẩn" : "Xem"} tiến độ số đơn & thời hạn
      </button>
      {open && (
        <div className="mt-3 space-y-2 text-xs text-[#7D715E]" aria-busy={busy}>
          {error && (
            <p role="alert" className="text-[#DC2626]">
              {error}
            </p>
          )}
          {!progress && busy && <p role="status">Đang lấy số liệu...</p>}
          {progress && (
            <>
              <p className="font-semibold text-[#1A1612]">
                {labels[progress.state]}
              </p>
              <p>
                <strong>
                  {progress.completedOrders}/{progress.targetOrders ?? "—"}
                </strong>{" "}
                đơn hoàn tất · {progress.pendingOrders} đơn đang xử lý
              </p>
              <progress
                max={100}
                value={progress.percent}
                className="h-2 w-full accent-[#C59B58]"
                aria-label="Tiến độ KPI số đơn"
              />
              <p>Bắt đầu: {date(progress.startsAt)}</p>
              <p>Hết kỳ: {date(progress.endsAt)}</p>
              <p>Kết thúc đối soát: {date(progress.settlementEndsAt)}</p>
              <p>
                Chỉ tính đơn tạo trong kỳ, hoàn tất và chưa hoàn tiền. Mỗi đơn
                chỉ tính một lần cho sản phẩm của Deal.
              </p>
              <p>Cập nhật: {date(progress.serverTime)}</p>
            </>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => setReload((value) => value + 1)}
            className="rounded-lg border border-[#EEDFC6] bg-white px-3 py-1.5 disabled:opacity-50"
          >
            Làm mới
          </button>
        </div>
      )}
    </section>
  );
}
