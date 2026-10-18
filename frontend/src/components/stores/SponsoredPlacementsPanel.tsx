import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  sponsorshipService,
  type Sponsorship,
} from "../../services/sponsorship.service";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { authService } from "../../services/auth.service";

const labels = {
  REQUESTED: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
};
const inputClass =
  "w-full rounded-xl border border-[#EAE4D7] bg-white p-3 text-sm text-[#1A1612] focus:outline-[#C59B58]";
const when = (date: string) => new Date(date).toLocaleString("vi-VN");

/** The same workflow serves owners and platform reviewers; ownership is enforced again by BE. */
export function SponsoredPlacementsPanel({
  admin = false,
}: {
  admin?: boolean;
}) {
  const cache = useQueryClient();
  const user = authService.getCurrentUser();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("REQUESTED");
  const [selected, setSelected] = useState<{
    row: Sponsorship;
    cancel: boolean;
  } | null>(null);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [funding, setFunding] = useState<"PLATFORM_GRANT" | "PAID">(
    "PLATFORM_GRANT",
  );
  const [note, setNote] = useState("");
  const [clientError, setClientError] = useState("");
  // Reuse a key for a retry of the identical payload, but never for an edited submission.
  const pendingRequest = useRef<{ payload: string; key: string } | null>(null);
  const reviewPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (selected) {
      reviewPanel.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      reviewPanel.current?.focus({ preventScroll: true });
    }
  }, [selected]);
  const query = useQuery({
    queryKey: ["sponsorships", user?.id, admin, page, status],
    queryFn: () => sponsorshipService.list(page, status),
    enabled: !!user && ['SHOP_MANAGER', 'SYSTEM_ADMIN', 'SYSTEM_MANAGER'].includes(user.role),
  });
  const mutation = useMutation({
    mutationFn: async ({
      form,
      action,
    }: {
      form: HTMLFormElement;
      action: "request" | "review" | "cancel";
    }) => {
      const data = new FormData(form);
      if (action === "request") {
        const startsAt = new Date(String(data.get("startsAt"))).toISOString();
        const endsAt = new Date(String(data.get("endsAt"))).toISOString();
        const payload = {
          headline: String(data.get("headline")).trim(),
          startsAt,
          endsAt,
        };
        const duration = Date.parse(endsAt) - Date.parse(startsAt);
        if (
          duration < 3600000 ||
          duration > 31 * 86400000 ||
          Date.parse(endsAt) <= Date.now()
        )
          throw new Error(
            "Lịch phải còn hiệu lực và kéo dài từ 1 giờ đến 31 ngày.",
          );
        const serialized = JSON.stringify(payload);
        if (pendingRequest.current?.payload !== serialized)
          pendingRequest.current = {
            payload: serialized,
            key: crypto.randomUUID(),
          };
        await sponsorshipService.request({
          ...payload,
          requestKey: pendingRequest.current.key,
        });
        pendingRequest.current = null;
        form.reset();
      } else if (selected && action === "cancel") {
        await sponsorshipService.cancel(selected.row.id, note.trim());
      } else if (selected) {
        await sponsorshipService.review(selected.row.id, {
          decision,
          note: note.trim(),
          ...(decision === "APPROVE"
            ? {
                fundingType: funding,
                amount: funding === "PAID" ? Number(data.get("amount")) : 0,
                ...(funding === "PAID"
                  ? {
                      paymentReference: String(data.get("reference")).trim(),
                      paymentProofUrl: String(data.get("proof")).trim(),
                    }
                  : {}),
              }
            : {}),
        });
      }
    },
    onSuccess: async () => {
      setSelected(null);
      setNote("");
      await cache.invalidateQueries({ queryKey: ["sponsorships"] });
    },
  });
  function submit(
    event: FormEvent<HTMLFormElement>,
    action: "request" | "review" | "cancel",
  ) {
    event.preventDefault();
    if (mutation.isPending) return;
    setClientError("");
    if (action !== "request" && note.trim().length < 5) {
      setClientError("Vui lòng nhập căn cứ/lý do tối thiểu 5 ký tự.");
      return;
    }
    mutation.mutate({ form: event.currentTarget, action });
  }
  const error = clientError || mutation.error?.message || query.error?.message;
  return (
    <Card className="mt-5 p-4 sm:p-6 text-[#1A1612]">
      <h2 className="text-lg font-bold">Gian hàng tài trợ trên SCANMS</h2>
      <p className="mt-2 text-sm text-[#7D715E]">
        Chỉ gói đã duyệt và còn hạn mới hiển thị. Tối đa 6 vị trí đồng thời.
        Không tự thu phí hoặc tự hoàn phí.
      </p>
      {error && (
        <p
          role="alert"
          className="my-3 rounded-xl border border-red-200 p-3 text-sm text-[#DC2626]"
        >
          {error}
        </p>
      )}
      {!admin && (
        <form
          onSubmit={(event) => submit(event, "request")}
          className="mt-4 grid gap-3 rounded-xl bg-[#FBF5EB] p-4 sm:grid-cols-2"
        >
          <label className="sm:col-span-2 text-sm">
            Tiêu đề hiển thị
            <input
              name="headline"
              required
              minLength={5}
              maxLength={160}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            Bắt đầu (giờ địa phương)
            <input
              name="startsAt"
              type="datetime-local"
              required
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            Kết thúc
            <input
              name="endsAt"
              type="datetime-local"
              required
              className={inputClass}
            />
          </label>
          <Button type="submit" variant="gold" loading={mutation.isPending}>
            Gửi đăng ký
          </Button>
        </form>
      )}
      <div className="my-4 flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm">
          Trạng thái{" "}
          <select
            aria-label="Lọc trạng thái tài trợ"
            value={status}
            className="rounded-xl border border-[#EAE4D7] p-2"
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          Tải lại
        </Button>
      </div>
      {query.isLoading && <p role="status">Đang tải đăng ký…</p>}
      {!query.isLoading && query.data?.items.length === 0 && (
        <p className="text-sm text-[#7D715E]">Chưa có đăng ký phù hợp.</p>
      )}
      <div className="space-y-3">
        {query.data?.items.map((row) => (
          <article
            key={row.id}
            className="rounded-xl border border-[#EAE4D7] p-4"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <strong>{row.store.name}</strong>
              <span className="rounded-full bg-[#FBF5EB] px-3 text-sm text-[#7D715E]">
                {labels[row.status]}
              </span>
            </div>
            <p className="mt-2 break-words">{row.headline}</p>
            <p className="mt-1 text-xs text-[#7D715E]">
              {when(row.startsAt)} → {when(row.endsAt)}
            </p>
            {row.fundingType && (
              <p className="mt-2 text-sm">
                {row.fundingType === "PLATFORM_GRANT"
                  ? "Sàn cấp miễn phí"
                  : `Có thu phí: ${Number(row.amount).toLocaleString("vi-VN")} ₫ · ${row.paymentReference}`}
              </p>
            )}
            {row.reviewNote && (
              <p className="mt-2 break-words text-sm">
                Phản hồi: {row.reviewNote}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {admin && row.status === "REQUESTED" && (
                <Button
                  variant="gold"
                  disabled={mutation.isPending}
                  onClick={() => {
                    mutation.reset();
                    setClientError("");
                    setSelected({ row, cancel: false });
                    setNote("");
                    setDecision("APPROVE");
                    setFunding("PLATFORM_GRANT");
                  }}
                >
                  Xét duyệt
                </Button>
              )}
              {["REQUESTED", "APPROVED"].includes(row.status) && (
                <Button
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => {
                    mutation.reset();
                    setClientError("");
                    setSelected({ row, cancel: true });
                    setNote("");
                  }}
                >
                  Hủy gói
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!!query.data?.total && (
        <div className="mt-4 flex items-center justify-end gap-3 text-sm">
          <Button
            variant="outline"
            disabled={page <= 1 || query.isFetching}
            onClick={() => setPage(page - 1)}
          >
            Trước
          </Button>
          <span>
            {page}/{query.data.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= query.data.totalPages || query.isFetching}
            onClick={() => setPage(page + 1)}
          >
            Sau
          </Button>
        </div>
      )}
      {selected && (
        <section
          ref={reviewPanel}
          tabIndex={-1}
          className="mt-5 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-4"
          aria-label={
            selected.cancel ? "Form hủy tài trợ" : "Form xét duyệt tài trợ"
          }
        >
          <h3 className="font-bold">
            {selected.cancel ? "Hủy gói" : "Xét duyệt"} —{" "}
            {selected.row.store.name}
          </h3>
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) =>
              submit(event, selected.cancel ? "cancel" : "review")
            }
          >
            {!selected.cancel && (
              <>
                <label className="block text-sm">
                  Kết quả
                  <select
                    className={inputClass}
                    value={decision}
                    onChange={(event) =>
                      setDecision(event.target.value as typeof decision)
                    }
                  >
                    <option value="APPROVE">Đồng ý</option>
                    <option value="REJECT">Từ chối</option>
                  </select>
                </label>
                {decision === "APPROVE" && (
                  <>
                    <label className="block text-sm">
                      Hình thức
                      <select
                        className={inputClass}
                        value={funding}
                        onChange={(event) =>
                          setFunding(event.target.value as typeof funding)
                        }
                      >
                        <option value="PLATFORM_GRANT">
                          Sàn cấp miễn phí (0 ₫)
                        </option>
                        <option value="PAID">Có thu phí — đã đối soát</option>
                      </select>
                    </label>
                    {funding === "PAID" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm">
                          Số tiền đã xác minh (₫)
                          <input
                            className={inputClass}
                            type="number"
                            name="amount"
                            required
                            min={1}
                            max={1000000000}
                            step={1}
                          />
                        </label>
                        <label className="text-sm">
                          Mã đối soát duy nhất
                          <input
                            className={inputClass}
                            name="reference"
                            required
                            minLength={6}
                            maxLength={100}
                          />
                        </label>
                        <label className="text-sm sm:col-span-2">
                          Liên kết chứng từ HTTPS
                          <input
                            className={inputClass}
                            type="url"
                            name="proof"
                            pattern="https://.*"
                            required
                            maxLength={2000}
                          />
                        </label>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            <label className="block text-sm">
              {selected.cancel
                ? "Lý do hủy"
                : "Căn cứ xét duyệt / hướng dẫn cho Shop"}
              <textarea
                className={inputClass}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                minLength={5}
                maxLength={2000}
                required
              />
            </label>
            {selected.cancel && (
              <p className="text-sm text-[#7D715E]">
                Dừng hiển thị không đồng nghĩa đã hoàn phí. Khoản có thu phí cần
                xử lý đối soát riêng.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-[#DC2626]">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" variant="gold" loading={mutation.isPending}>
                Xác nhận
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => {
                  setSelected(null);
                  mutation.reset();
                  setClientError("");
                }}
              >
                Đóng
              </Button>
            </div>
          </form>
        </section>
      )}
    </Card>
  );
}
