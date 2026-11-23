import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  sponsorshipService,
  type Sponsorship,
} from "../../services/sponsorship.service";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { authService } from "../../services/auth.service";
import { ArrowLeft, ClipboardList, Megaphone, ChevronDown } from 'lucide-react';
import { SponsoredBookingForm, sponsorshipMoney } from './SponsoredBookingForm';
import { Select } from '../ui/Select';

const labels = {
  REQUESTED: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
  EXPIRED: 'Đã hết hạn',
};
const inputClass =
  "w-full rounded-xl border border-[#EAE4D7] bg-white p-3 text-sm text-[#1A1612] focus:outline-[#C59B58]";
const when = (date: string) => new Date(date).toLocaleString("vi-VN");

/** The same workflow serves owners and platform reviewers; ownership is enforced again by BE. */
export function SponsoredPlacementsPanel({
  admin = false,
  embedded = false,
  storefront,
}: {
  admin?: boolean;
  embedded?: boolean;
  storefront?: { name: string; logoUrl: string };
}) {
  const cache = useQueryClient();
  const user = authService.getCurrentUser();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(admin ? 'REQUESTED' : '');
  const [selected, setSelected] = useState<{
    row: Sponsorship;
    cancel: boolean;
  } | null>(null);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [note, setNote] = useState("");
  const [clientError, setClientError] = useState("");
  const [successMessage, setSuccessMessage] = useState('');
  const [renewal, setRenewal] = useState<(Sponsorship & { formStartsAt: string; formEndsAt: string }) | null>(null);
  const separateHistory = embedded && !admin;
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyHeading = useRef<HTMLHeadingElement>(null);
  const historyButton = useRef<HTMLButtonElement>(null);
  const bookingSection = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    if (historyOpen) historyHeading.current?.focus();
  }, [historyOpen]);
  const query = useQuery({
    queryKey: ["sponsorships", user?.id, admin, page, status],
    queryFn: () => sponsorshipService.list(page, status),
    enabled: !!user && ['SHOP_MANAGER', 'SYSTEM_ADMIN', 'SYSTEM_MANAGER'].includes(user.role),
    refetchInterval: 15000,
  });
  const historyCount = useQuery({
    queryKey: ['sponsorships', user?.id, admin, 1, ''],
    queryFn: () => sponsorshipService.list(1, ''),
    enabled: separateHistory && user?.role === 'SHOP_MANAGER',
    refetchInterval: 15000,
  });
  const pricing = useQuery({
    queryKey: ['sponsorship-pricing'], queryFn: sponsorshipService.pricing,
    enabled: !!user && ['SHOP_MANAGER', 'SYSTEM_ADMIN', 'SYSTEM_MANAGER'].includes(user.role),
    staleTime: 60000,
  });
  useEffect(() => {
    const nextExpiry = Math.min(...(query.data?.items ?? [])
      .filter(row => ['REQUESTED', 'APPROVED'].includes(row.status))
      .map(row => Date.parse(row.endsAt)).filter(time => time > Date.now()));
    if (!Number.isFinite(nextExpiry)) return;
    const timer = window.setTimeout(() => void query.refetch(), Math.min(2147483647, Math.max(100, nextExpiry - Date.now() + 100)));
    return () => window.clearTimeout(timer);
  }, [query.data, query.refetch]);
  function startRenewal(row: Sponsorship) {
    const start = new Date(Date.now() + 3600000);
    const duration = Math.min(31, Math.max(1, Math.ceil((Date.parse(row.endsAt) - Date.parse(row.startsAt)) / 86400000))) * 86400000;
    const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setRenewal({ ...row, formStartsAt: local(start), formEndsAt: local(new Date(start.getTime() + duration)) });
    setSuccessMessage(''); setClientError(''); mutation.reset();
    setHistoryOpen(false);
    window.requestAnimationFrame(() => bookingSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
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
          quotedAmount: Number(data.get('quotedAmount')),
          ...(renewal ? { renewsPlacementId: renewal.id } : {}),
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
                fundingType: "PAID",
                amount: Number(data.get("amount")),
                paymentReference: String(data.get("reference")).trim(),
                paymentProofUrl: String(data.get("proof")).trim(),
              }
            : {}),
        });
      }
    },
    onSuccess: async (_, { action }) => {
      setRenewal(null);
      setPage(1);
      setStatus(action === 'request' ? 'REQUESTED' : action === 'cancel' ? 'CANCELLED' : decision === 'APPROVE' ? 'APPROVED' : 'REJECTED');
      setSuccessMessage(action === 'request' ? (renewal ? 'Đã gửi đăng ký gia hạn. Phí mới đã được lưu, chờ thanh toán và Admin duyệt lại.' : 'Đã gửi đăng ký. Phí đã được lưu, chờ Admin hướng dẫn thanh toán và xét duyệt.') : 'Đã cập nhật đăng ký quảng cáo.');
      setSelected(null);
      setNote("");
      await cache.invalidateQueries({ queryKey: ["sponsorships"] });
      await cache.invalidateQueries({ queryKey: ["marketplace-sponsored-placements"] });
    },
  });
  function submit(
    event: FormEvent<HTMLFormElement>,
    action: "request" | "review" | "cancel",
  ) {
    event.preventDefault();
    if (mutation.isPending) return;
    setClientError("");
    setSuccessMessage('');
    if (action !== "request" && note.trim().length < 5) {
      setClientError("Vui lòng nhập căn cứ/lý do tối thiểu 5 ký tự.");
      return;
    }
    mutation.mutate({ form: event.currentTarget, action });
  }
  const error = clientError || mutation.error?.message;
  const bookingError = error || pricing.error?.message;
  const feedback = successMessage && (
    <p role="status" className="my-3 rounded-lg bg-[#FBF5EB] px-3 py-2 text-sm text-[#795A2D]">{successMessage}</p>
  );
  const historyTotal = historyCount.data?.total;
  const history = (
    <>
      {(!separateHistory || !!status || (historyTotal ?? query.data?.total ?? 0) > 0) && (
      <div className="sp-history-toolbar relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#EAE4D7] bg-white px-4 py-2.5">
        <div className="sp-history-heading flex min-w-0 items-center gap-2 [&>svg]:shrink-0 [&>svg]:text-[#B88E4F] [&_h3]:m-0 [&_h3]:text-sm [&_h3]:font-semibold">
          {!separateHistory && <><ClipboardList size={18} aria-hidden="true" /><h3>{admin ? 'Đăng ký quảng bá' : 'Lịch sử đăng ký'}</h3></>}
          {query.data && <span className="sp-history-count text-xs tabular-nums text-[#7D715E]">{query.data.total} đăng ký</span>}
        </div>
        <div className="sp-history-controls flex flex-wrap items-center gap-2 [&_label]:flex [&_label]:items-center [&_label]:gap-2 [&_label]:text-xs [&_label]:text-[#7D715E]">
        <label>
          <span>Trạng thái</span>
          <Select
            portal
            aria-label="Lọc trạng thái tài trợ"
            value={status}
            disabled={mutation.isPending}
            className="sp-history-filter h-9 min-w-[120px] rounded-lg bg-white text-xs shadow-none"
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
              setSelected(null);
            }}
          >
            <option value="">Tất cả</option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        </div>
      </div>
      )}
      <div>
      {query.isError && <div role="alert" className="flex items-center justify-between gap-3 px-4 py-4 text-sm text-[#DC2626]">
        Không tải được lịch sử đăng ký.
        <Button variant="outline" onClick={() => void query.refetch()}>Thử lại</Button>
      </div>}
      {query.isLoading && <p className="sp-history-loading m-0 p-[18px] text-[#7D715E] text-[12px]" role="status">Đang tải đăng ký…</p>}
      {!query.isError && !query.isLoading && query.data?.items.length === 0 && (
        <div className="sp-history-empty flex items-center justify-center gap-3 bg-white px-4 py-7 text-sm text-[#7D715E]" role="status">
          <span className="sp-history-empty-icon grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#FBF5EB]/50 text-[#B88E4F]"><ClipboardList size={21} aria-hidden="true" /></span>
          <span>{status ? 'Không có đăng ký ở trạng thái này' : 'Gian hàng chưa có đăng ký quảng bá'}</span>
        </div>
      )}
      <div className="divide-y divide-[#EAE4D7] rounded-b-xl border-x border-[#EAE4D7] bg-white">
        {query.data?.items.map((row) => (
          <article
            key={row.id}
            className="border-b border-[#EAE4D7] p-4 text-xs last:rounded-b-xl"
          >
            <details open={!separateHistory || undefined} className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <span className="block min-w-0">
                  {admin && <span className="mb-1 block text-[#7D715E]">{row.store.name}</span>}
                  <span className="block wrap-anywhere text-sm font-semibold">{row.headline}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#7D715E]">{when(row.startsAt)} → {when(row.endsAt)}</span>
                  {row.fundingType === 'PAID' && <span className="mt-1 block text-xs font-medium tabular-nums">{row.amount == null ? 'Chưa ghi nhận phí' : sponsorshipMoney(Number(row.amount))}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded-md border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-1 text-[11px] text-[#795A2D]">{labels[row.status]}</span>
                  <ChevronDown className="text-[#7D715E] transition-transform group-open:rotate-180" size={14} aria-hidden="true" />
                </span>
              </summary>
              <div className="mt-3 space-y-2 border-t border-[#EAE4D7] pt-3">
            {(row.fundingType === "PLATFORM_GRANT" || row.paymentReference) && (
              <p className="mt-2 text-xs">
                {row.fundingType === "PLATFORM_GRANT"
                  ? "Gói miễn phí cũ — không đủ điều kiện hiển thị quảng cáo"
                  : `Mã đối soát: ${row.paymentReference}`}
              </p>
            )}
            {row.paymentProofUrl?.startsWith('https://') && <a href={row.paymentProofUrl} target="_blank" rel="noreferrer" className="inline-flex text-[#795A2D] underline">Xem chứng từ thanh toán</a>}
            {row.reviewNote && (
              <p className="mt-2 break-words text-xs leading-relaxed text-[#7D715E]">
                Phản hồi: {row.reviewNote}
              </p>
            )}
            {row.status === 'EXPIRED' && <div className="sp-expired-notice mt-[12px] py-[12px] px-[14px] border border-[#EEDFC6] rounded-[10px] bg-[#FBF5EB] text-[12px] leading-[1.6] [&_strong]:text-[#795A2D] [&_strong]:text-[12px] [&_p]:mt-[3px] [&_p]:mb-0 [&_p]:mx-0 [&_p]:text-[#7D715E]"><strong>Gói đã hết hạn lúc {when(row.endsAt)}</strong><p>Gói này không còn hiển thị trên trang chủ.{!admin && ' Bạn có muốn gia hạn để tiếp tục quảng bá gian hàng?'}</p></div>}
            <div className="mt-3 flex flex-wrap gap-2">
              {!admin && row.status === 'EXPIRED' && <Button variant="gold" disabled={mutation.isPending} onClick={() => startRenewal(row)}>Gia hạn gói</Button>}
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
              </div>
            </details>
          </article>
        ))}
      </div>
      {selected && (
        <section
          ref={reviewPanel}
          tabIndex={-1}
          className="m-4 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-4"
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
                    <p className="text-sm text-[#7D715E]">
                      Chỉ duyệt sau khi kiểm tra tiền đã nhận và chứng từ thanh toán quảng cáo.
                    </p>
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
                            defaultValue={selected.row.amount ?? (pricing.data ? Math.ceil((Date.parse(selected.row.endsAt) - Date.parse(selected.row.startsAt)) / 86400000) * pricing.data.dailyRate : '')}
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
      </div>
      {(query.data?.totalPages ?? 0) > 1 && query.data && (
        <div className="flex shrink-0 items-center justify-end border-t border-[#EAE4D7] px-4 py-2 gap-2 text-xs [&_button]:min-h-8 [&_button]:rounded-lg [&_button]:text-xs">
          <Button
            variant="outline"
            disabled={page <= 1 || query.isFetching || mutation.isPending}
            onClick={() => setPage(page - 1)}
          >
            Trước
          </Button>
          <span>
            {page}/{query.data.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= query.data.totalPages || query.isFetching || mutation.isPending}
            onClick={() => setPage(page + 1)}
          >
            Sau
          </Button>
        </div>
      )}
    </>
  );
  function closeHistory() {
    if (mutation.isPending) return;
    setHistoryOpen(false);
    if (selected) {
      setSelected(null);
      mutation.reset();
      setClientError('');
    }
    window.requestAnimationFrame(() => historyButton.current?.focus());
  }
  return (
    <Card className={`sp-workspace @container min-w-0 bg-white text-[#1A1612] shadow-none ${embedded ? 'rounded-none border-0' : 'mt-5 p-4 sm:p-5'}`}>
      <div hidden={historyOpen}>
        <div className="sp-heading mb-3 flex min-w-0 items-center justify-between gap-2">
          <h2 className="m-0 flex items-center gap-2 text-sm font-semibold"><Megaphone size={18} className="shrink-0 text-[#B88E4F]" aria-hidden="true" /> Quảng bá gian hàng</h2>
          {separateHistory && <button ref={historyButton} type="button" onClick={() => {
            setPage(1);
            setStatus('');
            setHistoryOpen(true);
          }} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#EAE4D7] px-2.5 text-xs font-semibold text-[#795A2D] hover:bg-[#FBF5EB]">
            <ClipboardList size={15} aria-hidden="true" /> Lịch sử{historyTotal ? ` · ${historyTotal}` : ''}
          </button>}
        </div>
        {feedback}
        {bookingError && !selected && <p role="alert" className="my-3 rounded-lg border border-red-200 px-3 py-2 text-sm text-[#DC2626]">{bookingError}</p>}
        {!admin && <div ref={bookingSection}><SponsoredBookingForm key={renewal?.id ?? 'new'} pricing={pricing.data} pending={mutation.isPending} storefront={storefront}
          renewal={renewal ? { headline: renewal.headline, startsAt: renewal.formStartsAt, endsAt: renewal.formEndsAt } : null}
          onCancelRenewal={() => setRenewal(null)} onSubmit={(event) => submit(event, 'request')} /></div>}
      </div>
      {separateHistory ? historyOpen && (
        <section aria-labelledby="sponsorship-history-title" className="rounded-xl border border-[#EAE4D7] bg-white">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE4D7] px-4 py-3">
            <h2 id="sponsorship-history-title" ref={historyHeading} tabIndex={-1} className="m-0 flex items-center gap-2 text-sm font-semibold outline-none">
              <ClipboardList size={17} className="shrink-0 text-[#B88E4F]" aria-hidden="true" /> Lịch sử quảng bá
            </h2>
            <button type="button" onClick={closeHistory} disabled={mutation.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#EAE4D7] px-2.5 text-xs font-semibold text-[#795A2D] hover:bg-[#FBF5EB]">
              <ArrowLeft size={14} aria-hidden="true" /> Quay lại đăng ký
            </button>
          </header>
          {successMessage && <div className="px-4">{feedback}</div>}
          {history}
        </section>
      ) : <div className="mt-4 overflow-hidden rounded-xl border border-[#EAE4D7]">{history}</div>}
    </Card>
  );
}
