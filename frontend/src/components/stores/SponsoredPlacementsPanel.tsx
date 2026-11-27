import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  sponsorshipService,
  type Sponsorship,
} from "../../services/sponsorship.service";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { authService } from "../../services/auth.service";
import { ArrowLeft, Check, ChevronDown, ClipboardList, Clock3, Megaphone, ShieldCheck, X } from 'lucide-react';
import { SponsoredBookingForm, sponsorshipMoney } from './SponsoredBookingForm';
import { SponsoredReviewDetails } from './SponsoredReviewDetails';
import { handleStoreImageError } from '@/utils/image-fallback.utils';
import { Select } from '../ui/Select';

const labels = {
  REQUESTED: "Chờ duyệt nội dung",
  AWAITING_PAYMENT: "Chờ thanh toán",
  PAYMENT_REVIEW: "Cần đối soát",
  APPROVED: "Đã duyệt để hiển thị",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
  EXPIRED: 'Đã hết hạn',
};
const reviewDecisions = [
  { value: 'APPROVE', label: 'Duyệt', icon: Check },
  { value: 'REJECT', label: 'Từ chối', icon: X },
] as const;
const when = (date: string) => new Date(date).toLocaleString("vi-VN");

function SponsorshipDecisionForm({ headline, cancel = false, embedded = true, pending, error, panelRef, onClose, onSubmit }: {
  headline: string;
  cancel?: boolean;
  embedded?: boolean;
  pending: boolean;
  error?: string;
  panelRef?: React.Ref<HTMLElement>;
  onClose?: () => void;
  onSubmit: (decision: 'APPROVE' | 'REJECT', note: string) => void;
}) {
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState('');
  function handleSubmit(event: FormEvent<HTMLFormElement>, choice: 'APPROVE' | 'REJECT') {
    event.preventDefault();
    const trimmed = note.trim();
    if (trimmed.length < 5) {
      setValidationError('Nhập ghi chú hoặc lý do tối thiểu 5 ký tự.');
      return;
    }
    setValidationError('');
    onSubmit(choice, trimmed);
  }
  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      className={`overflow-hidden rounded-xl border border-[#EEDFC6] bg-white shadow-2xs focus:outline-none ${embedded ? 'mt-4' : 'm-4'}`}
      aria-label={
        cancel ? "Form hủy tài trợ" : "Form xét duyệt tài trợ"
      }
    >
      <header className="flex items-center gap-3 border-b border-[#EAE4D7] bg-[#FBF5EB] px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#EEDFC6] bg-white text-[#795A2D]" aria-hidden="true">
          {cancel ? <X size={17} /> : <ShieldCheck size={17} />}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{cancel ? 'Hủy gói' : 'Xét duyệt nội dung'}</h3>
          <p className="mt-0.5 truncate text-xs text-[#655A49]" title={headline}>{headline}</p>
        </div>
      </header>
      <form
        onSubmit={(event) =>
          handleSubmit(event, decision)
        }
      >
        <div className={`grid ${cancel ? '' : '@min-[550px]:grid-cols-[210px_minmax(0,1fr)]'}`}>
          {!cancel && (
            <div className="min-w-0 border-b border-[#EAE4D7] px-4 py-3.5 @min-[550px]:border-r @min-[550px]:border-b-0">
              <fieldset disabled={pending}>
                <legend className="mb-2 text-xs font-semibold text-[#655A49]">Quyết định</legend>
                <div className="grid grid-cols-2 gap-2 @min-[550px]:grid-cols-1">
                  {reviewDecisions.map(({ value, label, icon: Icon }) => (
                    <label key={value} className="relative flex min-h-10 min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-[#EAE4D7] px-2.5 py-1.5 text-xs font-medium text-[#231D15] has-checked:border-[#B88E4F] has-checked:bg-[#FBF5EB] has-checked:font-semibold has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[#795A2D]">
                      <input type="radio" name="reviewDecision" value={value} checked={decision === value} onChange={() => setDecision(value)}
                        className="absolute inset-0 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                      <Icon size={15} className="shrink-0 text-[#795A2D]" aria-hidden="true" />
                      <span className="flex-1">{label}</span>
                      <span aria-hidden="true" className={`size-3 shrink-0 rounded-full border ${decision === value ? 'border-[#795A2D] bg-[#795A2D] ring-2 ring-inset ring-[#FBF5EB]' : 'border-[#B5A58D]'}`} />
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
          <label className="flex min-w-0 flex-col gap-2 px-4 py-3.5 text-xs font-semibold text-[#655A49]">
            {cancel ? 'Lý do hủy' : 'Ghi chú cho shop'}
            <textarea
              className="min-h-20 w-full flex-1 resize-y rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] px-3 py-2 text-sm font-normal text-[#1A1612] focus-visible:outline-2 focus-visible:outline-[#795A2D]"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              minLength={5}
              maxLength={2000}
              disabled={pending}
              required
            />
          </label>
        </div>
        {(validationError || error) && <p role="alert" className="px-4 pb-3 text-xs text-[#B91C1C]">{validationError || error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EAE4D7] bg-[#FAF8F5] px-4 py-3">
          {cancel ? (
            <p className="text-xs text-[#655A49]">Hủy gói không tự hoàn phí.</p>
          ) : decision === 'APPROVE' && (
            <p className="flex items-center gap-1.5 text-xs text-[#655A49]">
              <Clock3 size={14} className="shrink-0 text-[#795A2D]" aria-hidden="true" /> Giữ chỗ tối đa 30 phút, trước giờ chạy.
            </p>
          )}
          <div className="ml-auto flex gap-2">
            {onClose && <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onClose}>
              Đóng
            </Button>}
            <Button type="submit" variant="gold" size="sm" loading={pending}>
              {cancel ? 'Xác nhận hủy' : decision === 'APPROVE' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}

/** The same workflow serves owners and platform reviewers; ownership is enforced again by BE. */
export function SponsoredPlacementsPanel({
  admin = false,
  embedded = false,
  storefront,
  storeId = '',
  paymentReturnId,
}: {
  admin?: boolean;
  embedded?: boolean;
  storefront?: { name: string; logoUrl: string };
  storeId?: string;
  paymentReturnId?: string | null;
}) {
  const cache = useQueryClient();
  const user = authService.getCurrentUser();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(admin ? 'REQUESTED' : '');
  const [selected, setSelected] = useState<Sponsorship | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [renewal, setRenewal] = useState<(Sponsorship & { formStartsAt: string; formEndsAt: string }) | null>(null);
  const separateHistory = embedded && !admin;
  const [historyOpen, setHistoryOpen] = useState(Boolean(paymentReturnId));
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
  const products = useQuery({
    queryKey: ['sponsorship-products', user?.id, storeId],
    queryFn: ({ signal }) => sponsorshipService.products(storeId, signal),
    enabled: !admin && user?.role === 'SHOP_MANAGER' && Boolean(storeId),
  });
  const paymentStatus = useQuery({
    queryKey: ['sponsorship-payment', user?.id, paymentReturnId],
    queryFn: () => sponsorshipService.checkPayment(paymentReturnId ?? ''),
    enabled: historyOpen && Boolean(paymentReturnId) && user?.role === 'SHOP_MANAGER',
    refetchInterval: query => !query.state.data || query.state.data.status === 'AWAITING_PAYMENT' ? 10_000 : false,
    retry: false,
  });
  useEffect(() => {
    if (paymentStatus.data && paymentStatus.data.status !== 'AWAITING_PAYMENT') {
      void cache.invalidateQueries({ queryKey: ['sponsorships'] });
      void cache.invalidateQueries({ queryKey: ['marketplace-sponsored-placements'] });
    }
  }, [cache, paymentStatus.data]);
  const paymentLink = useMutation({
    mutationFn: sponsorshipService.startPayment,
    onSuccess: ({ checkoutUrl }) => {
      window.location.assign(checkoutUrl);
    },
  });
  useEffect(() => {
    const nextExpiry = Math.min(...(query.data?.items ?? [])
      .map(row => row.status === 'AWAITING_PAYMENT' && row.paymentDeadline ? Date.parse(row.paymentDeadline)
        : ['REQUESTED', 'APPROVED'].includes(row.status) ? Date.parse(row.endsAt) : NaN)
      .filter(time => time > Date.now()));
    if (!Number.isFinite(nextExpiry)) return;
    const timer = window.setTimeout(() => void query.refetch(), Math.min(2147483647, Math.max(100, nextExpiry - Date.now() + 100)));
    return () => window.clearTimeout(timer);
  }, [query.data, query.refetch]);
  function startRenewal(row: Sponsorship) {
    const start = new Date(Date.now() + 3600000);
    const duration = Math.min(31, Math.max(1, Math.ceil((Date.parse(row.endsAt) - Date.parse(row.startsAt)) / 86400000))) * 86400000;
    const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setRenewal({ ...row, formStartsAt: local(start), formEndsAt: local(new Date(start.getTime() + duration)) });
    setSuccessMessage(''); mutation.reset();
    setHistoryOpen(false);
    window.requestAnimationFrame(() => bookingSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  const mutation = useMutation({
    mutationFn: async (input:
      | { action: 'request'; form: HTMLFormElement; data: FormData }
      | { action: 'cancel'; id: string; note: string }
      | { action: 'review'; id: string; decision: 'APPROVE' | 'REJECT'; note: string }
    ) => {
      if (input.action === "request") {
        const { form, data } = input;
        const startsAt = new Date(String(data.get("startsAt"))).toISOString();
        const endsAt = new Date(String(data.get("endsAt"))).toISOString();
        const productId = String(data.get('productId') ?? '');
        const bannerImageUrl = String(data.get('bannerImageUrl') ?? '');
        const payload = {
          headline: String(data.get("headline")).trim(),
          startsAt,
          endsAt,
          quotedAmount: Number(data.get('quotedAmount')),
          ...(productId ? { productId } : {}),
          ...(bannerImageUrl ? { bannerImageUrl } : {}),
          ...(renewal ? { renewsPlacementId: renewal.id } : {}),
        };
        const duration = Date.parse(endsAt) - Date.parse(startsAt);
        if (
          duration < 3600000 ||
          duration > 31 * 86400000 ||
          Date.parse(startsAt) <= Date.now()
        )
          throw new Error(
            "Lịch phải bắt đầu trong tương lai và kéo dài từ 1 giờ đến 31 ngày.",
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
      } else if (input.action === "cancel") {
        await sponsorshipService.cancel(input.id, input.note);
      } else {
        await sponsorshipService.review(input.id, {
          decision: input.decision,
          note: input.note,
        });
      }
    },
    onSuccess: async (_, input) => {
      const { action } = input;
      const approved = input.action === 'review' && input.decision === 'APPROVE';
      setRenewal(null);
      setPage(1);
      setStatus(action === 'request' ? 'REQUESTED' : action === 'cancel' ? 'CANCELLED' : approved ? 'AWAITING_PAYMENT' : 'REJECTED');
      setSuccessMessage(action === 'request'
        ? 'Đã gửi đăng ký. Nút thanh toán sẽ xuất hiện trong Lịch sử khi nội dung được duyệt.'
        : approved
          ? 'Đã duyệt nội dung và giữ chỗ. Chủ shop có thể thanh toán qua payOS.'
          : 'Đã cập nhật đăng ký quảng cáo.');
      setSelected(null);
      await cache.invalidateQueries({ queryKey: ["sponsorships"] });
      await cache.invalidateQueries({ queryKey: ["marketplace-sponsored-placements"] });
    },
  });
  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    setSuccessMessage('');
    mutation.mutate({ form: event.currentTarget, data: new FormData(event.currentTarget), action: 'request' });
  }
  const bookingError = (mutation.variables?.action === 'request' ? mutation.error?.message : undefined) || pricing.error?.message;
  const feedback = successMessage && (
    <p role="status" className="my-3 rounded-lg bg-[#FBF5EB] px-3 py-2 text-sm text-[#795A2D]">{successMessage}</p>
  );
  const historyTotal = historyCount.data?.total;
  const cancelForm = selected && (
    <SponsorshipDecisionForm key={selected.id} headline={selected.headline} cancel embedded={admin}
      pending={mutation.isPending} panelRef={reviewPanel}
      error={mutation.variables?.action === 'cancel' ? mutation.error?.message : undefined}
      onClose={() => { setSelected(null); mutation.reset(); }}
      onSubmit={(_, note) => {
        if (mutation.isPending) return;
        setSuccessMessage('');
        mutation.mutate({ action: 'cancel', id: selected.id, note });
      }} />
  );
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
      <div className={admin ? 'grid gap-3 bg-[#FAF8F5] p-3 sm:p-4' : 'divide-y divide-[#EAE4D7] rounded-b-xl border-x border-[#EAE4D7] bg-white'}>
        {query.data?.items.map((row) => (
          <article
            key={row.id}
            className={admin ? 'min-w-0 rounded-xl border border-[#EAE4D7] bg-white text-xs shadow-2xs' : 'border-b border-[#EAE4D7] p-4 text-xs last:rounded-b-xl'}
          >
            <details open={!separateHistory || row.id === paymentReturnId || row.status === 'AWAITING_PAYMENT' || undefined} className="group">
              <summary className={`flex cursor-pointer list-none items-start justify-between gap-2 [&::-webkit-details-marker]:hidden ${admin ? 'flex-wrap rounded-t-xl bg-[#FBF5EB]/65 px-4 py-3 sm:items-center' : ''}`}>
                <span className={admin ? 'flex min-w-0 items-center gap-3' : 'block min-w-0'}>
                  {admin && row.store.logoUrl && <img src={row.store.logoUrl} onError={handleStoreImageError} alt="" className="size-9 shrink-0 rounded-lg border border-[#EEDFC6] bg-white object-contain" />}
                  <span className="min-w-0">
                    {admin && <span className="mb-1 block text-xs text-[#7D715E]">{row.store.name}</span>}
                    <span className={`block wrap-anywhere font-semibold ${admin ? 'text-base' : 'text-sm'}`}>{row.headline}</span>
                    {!admin && <span className="mt-1 block text-xs leading-relaxed text-[#7D715E]">{when(row.startsAt)} → {when(row.endsAt)}</span>}
                    {!admin && row.fundingType === 'PAID' && <span className="mt-1 block text-xs font-medium tabular-nums">{row.amount == null ? 'Chưa ghi nhận phí' : sponsorshipMoney(Number(row.amount))}</span>}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded-md border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-1 text-[11px] text-[#795A2D]">{labels[row.status]}</span>
                  <ChevronDown className="text-[#7D715E] transition-transform group-open:rotate-180" size={14} aria-hidden="true" />
                </span>
              </summary>
              <div className={admin ? 'space-y-3 border-t border-[#EAE4D7] p-4' : 'mt-3 space-y-2 border-t border-[#EAE4D7] pt-3'}>
            {admin && <SponsoredReviewDetails booking={row} />}
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
            <div className={`mt-3 flex flex-wrap gap-2 ${admin ? 'border-t border-[#EAE4D7] pt-3' : ''}`}>
              {row.status === 'AWAITING_PAYMENT' && row.paymentDeadline && (
                <p className="w-full text-xs text-[#795A2D]">Giữ chỗ đến {when(row.paymentDeadline)}</p>
              )}
              {row.status === 'PAYMENT_REVIEW' && (
                <p className="w-full text-xs text-[#795A2D]">
                  {row.receivedAmount != null && <>Đã nhận {sponsorshipMoney(Number(row.receivedAmount))}. </>}
                  {row.paymentIssue || 'Khoản chuyển cần kiểm tra trước khi xử lý.'}
                </p>
              )}
              {admin && row.payosOrderCode && row.paymentStartedAt && (
                <p className="w-full text-xs text-[#7D715E]">Mã payOS <span className="font-mono">{row.payosOrderCode}</span></p>
              )}
              {!admin && row.status === 'AWAITING_PAYMENT' && row.amount != null && (
                <Button variant="gold" loading={paymentLink.isPending && paymentLink.variables === row.id}
                  disabled={paymentLink.isPending} onClick={() => paymentLink.mutate(row.id)}>
                  Thanh toán {sponsorshipMoney(Number(row.amount))}
                </Button>
              )}
              {paymentLink.isError && paymentLink.variables === row.id && <p role="alert" className="w-full text-xs text-[#DC2626]">{paymentLink.error.message}</p>}
              {!admin && row.status === 'EXPIRED' && <Button variant="gold" disabled={mutation.isPending} onClick={() => startRenewal(row)}>Gia hạn gói</Button>}
              {(["REQUESTED", "APPROVED"].includes(row.status) || (row.status === 'AWAITING_PAYMENT' && !row.paymentStartedAt)) && (
                <Button
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => {
                    mutation.reset();
                    setSelected(row);
                  }}
                >
                  Hủy gói
                </Button>
              )}
            </div>
              {admin && (selected?.id === row.id ? cancelForm : row.status === 'REQUESTED' && (
                <SponsorshipDecisionForm headline={row.headline} pending={mutation.isPending}
                  error={mutation.variables?.action === 'review' && mutation.variables.id === row.id ? mutation.error?.message : undefined}
                  onSubmit={(decision, note) => {
                    if (mutation.isPending) return;
                    setSuccessMessage('');
                    mutation.mutate({ action: 'review', id: row.id, decision, note });
                  }} />
              ))}
              </div>
            </details>
          </article>
        ))}
      </div>
      {!admin && cancelForm}
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
    }
    window.requestAnimationFrame(() => historyButton.current?.focus());
  }
  return (
    <Card className={`sp-workspace @container min-w-0 bg-white text-[#1A1612] shadow-none ${embedded ? 'rounded-none border-0' : 'p-4 sm:p-5'}`}>
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
          products={products.data} productsLoading={products.isLoading} productsFailed={products.isError} onRetryProducts={() => void products.refetch()}
          renewal={renewal ? { headline: renewal.headline, startsAt: renewal.formStartsAt, endsAt: renewal.formEndsAt, product: renewal.product, bannerImageUrl: renewal.bannerImageUrl } : null}
          onCancelRenewal={() => setRenewal(null)} onSubmit={submitRequest} /></div>}
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
          {paymentReturnId && (
            <div className="border-b border-[#EAE4D7] bg-[#FBF5EB] px-4 py-3 text-sm text-[#795A2D]" role="status">
              {paymentStatus.isError
                ? 'Chưa kiểm tra được trạng thái thanh toán. Hãy thử lại.'
                : paymentStatus.data ? labels[paymentStatus.data.status] : 'Đang kiểm tra trạng thái thanh toán…'}
              {(paymentStatus.isError || paymentStatus.data?.status === 'AWAITING_PAYMENT') && (
                <button type="button" onClick={() => void paymentStatus.refetch()} className="ml-2 font-semibold underline">Kiểm tra lại</button>
              )}
              {paymentStatus.data?.status === 'AWAITING_PAYMENT' && !query.data?.items.some(row => row.id === paymentReturnId) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {paymentStatus.data.deadline && <span>Giữ chỗ đến {when(paymentStatus.data.deadline)}</span>}
                  <Button variant="gold" loading={paymentLink.isPending} onClick={() => paymentLink.mutate(paymentReturnId)}>
                    Thanh toán {sponsorshipMoney(paymentStatus.data.amount)}
                  </Button>
                  {paymentLink.isError && <p role="alert" className="w-full text-xs text-[#DC2626]">{paymentLink.error.message}</p>}
                </div>
              )}
            </div>
          )}
          {successMessage && <div className="px-4">{feedback}</div>}
          {history}
        </section>
      ) : <div className="mt-4 overflow-hidden rounded-xl border border-[#EAE4D7]">{history}</div>}
    </Card>
  );
}
