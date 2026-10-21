import { useEffect, useState } from "react";
import { dealDemoState } from "@/utils/deal-demo";

/** Isolated UI rehearsal: no API, order, payment or sanction is created. */
export function DealDemoPanel() {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(300);
  const [target, setTarget] = useState(2);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [completed, setCompleted] = useState(0);
  const [pending, setPending] = useState(0);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!open || !startedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [open, startedAt]);
  if (!import.meta.env.DEV) return null;
  const { remaining, expired } = dealDemoState({
    startedAt,
    durationSeconds: duration,
    now,
    completed,
    target,
    settled,
  });
  const reset = () => {
    setStartedAt(null);
    setCompleted(0);
    setPending(0);
    setSettled(false);
  };
  const button =
    "rounded-lg border border-[#EEDFC6] bg-white px-3 py-2 disabled:opacity-40";
  return (
    <section className="my-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="font-bold text-[#B88E4F]"
      >
        Thử quy trình Deal — mô phỏng riêng
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-[#7D715E]">
            Không tạo đơn, link VIP, hoa hồng hoặc chế tài thật. Đối soát thực
            tế là 14 ngày; ở đây có thể chuyển bước để trình diễn.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label>
              Thời lượng
              <select
                disabled={!!startedAt}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[#EAE4D7] bg-white p-2"
              >
                <option value={30}>30 giây — test nhanh</option>
                <option value={300}>5 phút — demo đề xuất</option>
                <option value={600}>10 phút — thao tác chậm</option>
              </select>
            </label>
            <label>
              Mục tiêu đơn
              <input
                type="number"
                min={1}
                max={100}
                disabled={!!startedAt}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[#EAE4D7] p-2"
              />
            </label>
          </div>
          <p className="font-semibold">
            {!startedAt
              ? "Chờ duyệt — đồng hồ chưa chạy"
              : settled
                ? completed >= target
                  ? "Đạt KPI (mô phỏng)"
                  : "Chưa đạt — chờ xem xét (mô phỏng)"
                : expired
                  ? "Hết kỳ — đang đối soát"
                  : `Còn ${remaining} giây`}{" "}
            · {completed}/{target} hoàn tất · {pending} đang giao
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                !!startedAt ||
                !Number.isInteger(target) ||
                target < 1 ||
                target > 100
              }
              onClick={() => {
                const time = Date.now();
                setNow(time);
                setStartedAt(time);
              }}
              className={button}
            >
              Shop duyệt mô phỏng
            </button>
            <button
              type="button"
              disabled={!startedAt || expired}
              onClick={() => setPending((value) => value + 1)}
              className={button}
            >
              + Đơn đang giao
            </button>
            <button
              type="button"
              disabled={!pending || settled}
              onClick={() => {
                setPending((value) => value - 1);
                setCompleted((value) => value + 1);
              }}
              className={button}
            >
              Hoàn tất 1 đơn
            </button>
            <button
              type="button"
              disabled={!pending || settled}
              onClick={() => setPending((value) => value - 1)}
              className={button}
            >
              Huỷ 1 đơn
            </button>
            <button
              type="button"
              disabled={!startedAt || settled}
              onClick={() => {
                setStartedAt(Date.now() - duration * 1000);
                setNow(Date.now());
              }}
              className={button}
            >
              Chuyển đến hết kỳ
            </button>
            <button
              type="button"
              disabled={!expired || settled}
              onClick={() => setSettled(true)}
              className={button}
            >
              Kết thúc đối soát
            </button>
            <button type="button" onClick={reset} className={button}>
              Làm lại
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
