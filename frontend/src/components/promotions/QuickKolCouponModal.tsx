import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  ChevronUp,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Handshake,
  Loader2,
  Plus,
  RefreshCw,
  Tag,
  Ticket,
  X,
} from 'lucide-react';
import { couponService, type CouponItem } from '../../services/coupon.service';
import { referralLinksService, type ExclusiveDealProposal } from '../../services/referral-links.service';
import { DateTimePicker } from '../common/DateTimePicker';
import VndAmountInput from '../wallet/TopUpAmountInput';
import { parseVietnamDateTime, toVietnamDateTime, vietnamPickerNow } from '../../utils/date-time.utils';
import { toast } from '../../utils/toast';

interface QuickKolCouponModalProps {
  isOpen: boolean;
  storeId: string;
  kol: {
    id: string;
    fullName: string;
    email?: string;
    cooperationStatus?: string;
  };
  onClose: () => void;
  onUpdated?: () => void;
  onRequestOpenDealModal?: () => void;
}

const defaultExpiryInput = (days = 14) => toVietnamDateTime(new Date(Date.now() + days * 86_400_000));
const issueFieldClass = 'mt-1.5 flex h-[42px] items-center gap-2 rounded-[10px] border border-[#EAE4D7] bg-white px-3 focus-within:border-[#B88E4F] focus-within:ring-2 focus-within:ring-[#C59B58]/20 [&>input]:min-w-0 [&>input]:flex-1 [&>input]:bg-transparent [&>input]:text-xs [&>input]:font-semibold [&>input]:outline-none';

const suggestCodeForKol = (fullName: string, pct: number) => {
  const clean = (fullName || 'KOC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 10);
  return `${clean || 'KOC'}${pct}`;
};

export function QuickKolCouponModal({
  isOpen,
  storeId,
  kol,
  onClose,
  onUpdated,
  onRequestOpenDealModal,
}: QuickKolCouponModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [storeWideDeal, setStoreWideDeal] = useState<ExclusiveDealProposal | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Renew / Extend
  const [extendExpiresAt, setExtendExpiresAt] = useState(() => defaultExpiryInput(14));
  const [extending, setExtending] = useState(false);

  // Quick Approve proposal
  const [approveDiscount, setApproveDiscount] = useState(10);
  const [approveMaxDiscount, setApproveMaxDiscount] = useState(50000);
  const [approveExpiresAt, setApproveExpiresAt] = useState(() => defaultExpiryInput(14));
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Issue / Replace code
  const [issueFormOverride, setIssueFormOverride] = useState<boolean | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState(10);
  const [newMaxDiscount, setNewMaxDiscount] = useState('50000');
  const [newExpiresAt, setNewExpiresAt] = useState(() => defaultExpiryInput(14));
  const [issuing, setIssuing] = useState(false);

  const loadState = async () => {
    if (!storeId || !kol?.id) return;
    setLoading(true);
    setError('');
    try {
      const [couponsRes, deals] = await Promise.all([
        couponService.getStoreCoupons(storeId, { collaboratorId: kol.id, limit: 50 }),
        referralLinksService.getShopExclusiveDeals(),
      ]);
      const raw = (couponsRes as any)?.data?.data || (couponsRes as any)?.data?.items || (couponsRes as any)?.items || (couponsRes as any)?.data || couponsRes || [];
      const list: CouponItem[] = Array.isArray(raw) ? raw : [];
      setCoupons(list);

      const eligibleDeal = deals.find(
        (d) =>
          d.storeId === storeId &&
          (d.collaboratorId || d.collaborator?.id) === kol.id &&
          d.status === 'APPROVED' &&
          d.scopeType === 'STORE_WIDE' &&
          !d.closedAt,
      ) || null;
      setStoreWideDeal(eligibleDeal);

      const currentActive = list.find((c) => ['ACTIVE', 'PAUSED', 'PENDING_BLOCK_APPROVAL', 'PENDING_ADMIN_APPROVAL'].includes(c.status));
      if (currentActive) {
        const expiry = Date.parse(currentActive.expiresAt || '');
        setExtendExpiresAt(expiry > Date.now() ? toVietnamDateTime(new Date(expiry)) : defaultExpiryInput());
      }
      const pending = list.find((c) => c.status === 'PENDING_APPROVAL');
      if (pending) {
        const val = Number(pending.discountValue || 10);
        setApproveDiscount(val >= 3 && val <= 20 ? val : 10);
      }
      setNewCode(suggestCodeForKol(kol.fullName, 10));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Không tải được dữ liệu mã ưu đãi của KOC.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setIssueFormOverride(null);
    void loadState();
  }, [isOpen, storeId, kol.id]);

  if (!isOpen) return null;

  const activeCoupon = coupons.find((c) =>
    ['ACTIVE', 'PAUSED', 'PENDING_BLOCK_APPROVAL', 'PENDING_ADMIN_APPROVAL'].includes(c.status),
  );
  const pendingProposal = coupons.find((c) => c.status === 'PENDING_APPROVAL');
  const isApprovedCoop = kol.cooperationStatus === 'APPROVED';
  const showIssueForm = issueFormOverride ?? (!activeCoupon && !pendingProposal && Boolean(storeWideDeal) && isApprovedCoop);
  const expiryPickerProps = {
    compact: true,
    smallCalendar: true,
    required: true,
    popoverTitle: 'Giờ Việt Nam (UTC+7)',
    getCurrentDate: vietnamPickerNow,
    inline: true,
  } as const;

  const handleCopy = (code: string) => {
    void navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const handleExtendDays = (daysToAdd: number) => {
    const baseMs = activeCoupon?.expiresAt && new Date(activeCoupon.expiresAt).getTime() > Date.now()
      ? new Date(activeCoupon.expiresAt).getTime()
      : Date.now();
    const target = new Date(baseMs + daysToAdd * 86_400_000);
    setExtendExpiresAt(toVietnamDateTime(target));
  };

  const handleSaveExtend = async () => {
    if (!activeCoupon || !extendExpiresAt) return;
    const expiresAt = parseVietnamDateTime(extendExpiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      toast.error('Ngày hết hạn mới phải ở tương lai.');
      return;
    }
    setExtending(true);
    try {
      await couponService.updatePolicy(storeId, activeCoupon.id, {
        expiresAt: new Date(expiresAt).toISOString(),
      });
      toast.success(`Đã gia hạn mã "${activeCoupon.displayCode}" thành công!`);
      await loadState();
      onUpdated?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể gia hạn mã.');
    } finally {
      setExtending(false);
    }
  };

  const handleQuickApprove = async (proposal: CouponItem) => {
    const expiresAt = parseVietnamDateTime(approveExpiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      toast.error('Chọn ngày hết hạn hợp lệ ở tương lai.');
      return;
    }
    setApprovingId(proposal.id);
    try {
      await couponService.approveCoupon(storeId, proposal.id, {
        discountType: 'PERCENTAGE',
        discountValue: approveDiscount,
        maximumDiscountAmount: approveMaxDiscount,
        expiresAt: new Date(expiresAt).toISOString(),
        scopeType: 'STORE_WIDE',
      });
      toast.success(
        approveDiscount > 10
          ? `Đã duyệt mã "${proposal.displayCode}" (${approveDiscount}%) và chuyển System Admin duyệt ngoại lệ.`
          : `Đã kích hoạt mã "${proposal.displayCode}" (${approveDiscount}%) cho ${kol.fullName}.`,
      );
      await loadState();
      onUpdated?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể duyệt mã.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleQuickReject = async (proposal: CouponItem) => {
    setApprovingId(proposal.id);
    try {
      await couponService.rejectCoupon(storeId, proposal.id, 'Shop chưa phù hợp điều kiện mã này trong giai đoạn hiện tại.');
      toast.success(`Đã từ chối đề xuất "${proposal.displayCode}".`);
      await loadState();
      onUpdated?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể từ chối mã.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleIssueOrReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCode.trim().toUpperCase();
    if (!clean || clean.length < 4) {
      toast.error('Mã ưu đãi phải từ 4–20 ký tự chữ/số và có ít nhất 1 chữ cái.');
      return;
    }
    const maximumDiscountAmount = Number(newMaxDiscount);
    if (!Number.isSafeInteger(maximumDiscountAmount) || maximumDiscountAmount < 10000 || maximumDiscountAmount % 10000 !== 0) {
      toast.error('Giảm tối đa phải từ 10.000 ₫ và là bội số của 10.000 ₫.');
      return;
    }
    const expiresAt = parseVietnamDateTime(newExpiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      toast.error('Chọn ngày hết hạn hợp lệ ở tương lai.');
      return;
    }
    setIssuing(true);
    try {
      await couponService.createStoreCoupon(storeId, {
        collaboratorId: kol.id,
        code: clean,
        discountType: 'PERCENTAGE',
        discountValue: newDiscount,
        maximumDiscountAmount,
        expiresAt: new Date(expiresAt).toISOString(),
        scopeType: 'STORE_WIDE',
        benefitType: 'GOODS',
      } as any);
      toast.success(
        newDiscount > 10
          ? `Đã tạo mã "${clean}" (${newDiscount}%) và chuyển Admin duyệt (>10%).`
          : `Đã phát hành mã "${clean}" (${newDiscount}%) cho ${kol.fullName}.`,
      );
      setIssueFormOverride(null);
      await loadState();
      onUpdated?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể phát hành mã ưu đãi.');
    } finally {
      setIssuing(false);
    }
  };

  const promotionsUrl = `/merchant/promotions?tab=creator-incentives&search=${encodeURIComponent(kol.email || kol.fullName)}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[125] flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-kol-coupon-title"
      onClick={onClose}
    >
      <div
        className="kol-cooperation-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#EAE4D7] px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
              <Ticket size={19} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 id="quick-kol-coupon-title" className="m-0 text-base font-bold leading-tight text-[#1A1612]">
                Mã ưu đãi KOC
              </h3>
              <p className="m-0 mt-0.5 text-xs text-[#7D715E] wrap-anywhere">{kol.fullName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#1A1612] focus-visible:outline-2 focus-visible:outline-[#B88E4F]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="kol-cooperation-dialog-body space-y-3 p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs font-medium text-[#7D715E]">
              <Loader2 className="h-4 w-4 animate-spin text-[#B88E4F]" />
              <span>Đang tải mã ưu đãi…</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5 text-xs text-[#DC2626]">
              <p className="m-0 font-semibold">{error}</p>
              <button type="button" onClick={() => void loadState()} className="mt-2 font-bold underline cursor-pointer">
                Thử lại
              </button>
            </div>
          ) : (
            <>
              {!isApprovedCoop ? (
                <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-4">
                  <h4 className="m-0 text-sm font-semibold text-[#1A1612]">Chưa xác nhận hợp tác</h4>
                  <p className="m-0 mt-1 text-sm text-[#7D715E]">Xác nhận hợp tác để cấp hoặc duyệt mã KOC.</p>
                </div>
              ) : !storeWideDeal ? (
                <div className="flex flex-col gap-2.5 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h4 className="m-0 text-sm font-semibold text-[#1A1612]">Chưa có Deal toàn cửa hàng</h4>
                    <p className="m-0 mt-0.5 text-xs text-[#7D715E]">Cần Deal đã duyệt để cấp mã.</p>
                  </div>
                  {onRequestOpenDealModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onRequestOpenDealModal();
                        }}
                        className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#C59B58] px-3.5 text-xs font-bold text-[#231D15] hover:bg-[#B88E4F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F]"
                      >
                        <Handshake size={15} aria-hidden="true" />
                        <span>Tạo Deal</span>
                      </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB]/65 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#EEDFC6] bg-white text-[#8C6226]">
                      <Handshake size={16} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h4 className="m-0 text-xs font-bold text-[#1A1612]">Deal toàn cửa hàng</h4>
                      <p className="m-0 mt-0.5 flex items-center gap-1 text-[11px] text-[#7D715E]">
                        <CheckCircle2 size={12} className="shrink-0 text-[#059669]" aria-hidden="true" />
                        Đủ điều kiện cấp mã
                      </p>
                    </div>
                  </div>
                  <div className="border-l border-[#EEDFC6] pl-3 text-right sm:pl-4">
                    <span className="block text-[10px] leading-tight text-[#7D715E]">Thù lao Deal</span>
                    <strong className="block text-base leading-tight font-bold text-[#79592C] tabular-nums">
                      {storeWideDeal.approvedCommissionRate ?? storeWideDeal.proposedCommissionRate}%
                    </strong>
                  </div>
                  <button
                    type="button"
                    aria-expanded={showIssueForm}
                    aria-controls="kol-coupon-issue-form"
                    aria-label={showIssueForm ? (activeCoupon ? 'Thu gọn phần thay mã' : 'Thu gọn phần cấp mã') : undefined}
                    onClick={() => setIssueFormOverride(!showIssueForm)}
                    className={`col-span-2 inline-flex h-8 min-w-[100px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold text-[#79592C] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F] sm:col-span-1 ${showIssueForm ? 'border-[#EAE4D7] bg-[#FAF8F5] hover:bg-[#F3EFE6]' : 'border-[#EEDFC6] bg-white hover:bg-[#FBF5EB]'}`}
                  >
                    {showIssueForm ? <ChevronUp size={14} aria-hidden="true" /> : activeCoupon ? <RefreshCw size={13} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                    <span>{showIssueForm ? 'Thu gọn' : activeCoupon ? 'Thay mã' : 'Cấp mã'}</span>
                  </button>
                </div>
              )}

              {/* Pending proposal section */}
              {pendingProposal && (
                <div className="space-y-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB]/80 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#B45309]">Đề xuất mã chờ Shop duyệt</span>
                      <div className="mt-0.5 font-mono text-base font-black text-[#1A1612]">{pendingProposal.displayCode}</div>
                    </div>
                    <span className="rounded-full border border-[#FCD34D] bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#B45309]">
                      Chờ duyệt
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <label className="text-[11px] font-semibold text-[#1A1612]">
                      Mức giảm (%)
                      <input
                        type="number"
                        min={3}
                        max={20}
                        value={approveDiscount}
                        onChange={(e) => setApproveDiscount(Math.min(20, Math.max(3, Number(e.target.value) || 3)))}
                        className="mt-1 h-9 w-full rounded-lg border border-[#EAE4D7] bg-white px-2.5 text-xs font-bold"
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-[#1A1612]">
                      Giảm tối đa (₫)
                      <input
                        type="number"
                        min={10000}
                        step={10000}
                        value={approveMaxDiscount}
                        onChange={(e) => setApproveMaxDiscount(Math.max(10000, Number(e.target.value) || 10000))}
                        className="mt-1 h-9 w-full rounded-lg border border-[#EAE4D7] bg-white px-2.5 text-xs font-bold"
                      />
                    </label>
                    <DateTimePicker {...expiryPickerProps} label="Hết hạn" value={approveExpiresAt} onChange={setApproveExpiresAt} disabled={Boolean(approvingId)} />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={approvingId === pendingProposal.id}
                      onClick={() => void handleQuickReject(pendingProposal)}
                      className="rounded-xl border border-[#EAE4D7] bg-white px-3 py-1.5 text-xs font-semibold text-[#7D715E] hover:text-[#DC2626] cursor-pointer"
                    >
                      Từ chối
                    </button>
                    <button
                      type="button"
                      disabled={approvingId === pendingProposal.id}
                      onClick={() => void handleQuickApprove(pendingProposal)}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#C59B58] px-3.5 py-1.5 text-xs font-bold text-[#1A1612] hover:bg-[#B88E4F] cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{approvingId === pendingProposal.id ? 'Đang duyệt...' : 'Duyệt & Kích hoạt'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Active coupon section */}
              {activeCoupon && (
                <div className="space-y-3 rounded-2xl border border-[#EAE4D7] bg-white p-3.5 shadow-2xs sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="wrap-anywhere font-mono text-base font-bold tracking-wide text-[#79592C]">
                          {activeCoupon.displayCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeCoupon.displayCode)}
                          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md border border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E] hover:bg-[#FBF5EB] hover:text-[#1A1612]"
                          aria-label={copiedCode === activeCoupon.displayCode ? 'Đã sao chép mã' : 'Sao chép mã'}
                          title="Sao chép mã"
                        >
                          {copiedCode === activeCoupon.displayCode ? <Check className="h-3 w-3 text-[#059669]" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    <span className="shrink-0 rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-0.5 text-[11px] font-bold text-[#8C6226]">
                      {activeCoupon.status === 'ACTIVE'
                        ? 'Đang hoạt động'
                        : activeCoupon.status === 'PENDING_ADMIN_APPROVAL'
                          ? 'Chờ Admin duyệt'
                          : activeCoupon.status === 'PENDING_BLOCK_APPROVAL'
                            ? 'Chờ duyệt ngừng'
                            : 'Tạm dừng'}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-y-2 rounded-xl bg-[#FAF8F5] px-2 py-2.5 text-center text-xs sm:grid-cols-4 [&>div]:min-w-0 [&>div]:px-1.5 [&_dd]:m-0 [&_dd]:mt-0.5 [&_dd]:font-semibold [&_dd]:text-[#1A1612] [&_dd]:tabular-nums [&_dt]:text-[11px] [&_dt]:text-[#7D715E]">
                    <div><dt>Mức giảm</dt><dd>{Number(activeCoupon.discountValue)}%</dd></div>
                    <div><dt>Giảm tối đa</dt><dd>{activeCoupon.maximumDiscountAmount ? `${Number(activeCoupon.maximumDiscountAmount).toLocaleString('vi-VN')} ₫` : 'Không giới hạn'}</dd></div>
                    <div><dt>Đã dùng</dt><dd>{activeCoupon.usageCount || 0} lượt</dd></div>
                    <div>
                      <dt>Hạn dùng</dt>
                      <dd>{activeCoupon.expiresAt ? (
                        <time dateTime={activeCoupon.expiresAt}>{new Date(activeCoupon.expiresAt).toLocaleString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
                        })}</time>
                      ) : 'Không giới hạn'}</dd>
                    </div>
                  </dl>

                  {['ACTIVE', 'PAUSED'].includes(activeCoupon.status) && (
                    <div className="space-y-2 border-t border-[#EAE4D7] pt-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A1612]">
                          <CalendarClock className="h-3.5 w-3.5 text-[#B88E4F]" />
                          Gia hạn
                        </span>
                        <div className="flex items-center gap-1.5">
                          {[7, 14, 30].map((d) => (
                            <button
                              key={d}
                              type="button"
                              disabled={extending}
                              onClick={() => handleExtendDays(d)}
                              className="rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] px-2 py-1 text-[11px] font-semibold text-[#8C6226] hover:bg-[#FBF5EB] cursor-pointer"
                            >
                              +{d} ngày
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid items-start gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <DateTimePicker
                          {...expiryPickerProps}
                          placeholder="Chọn hạn mới"
                          disabled={extending}
                          value={extendExpiresAt}
                          onChange={setExtendExpiresAt}
                        />
                        <button
                          type="button"
                          disabled={extending || !extendExpiresAt}
                          onClick={() => void handleSaveExtend()}
                          className="inline-flex h-[42px] cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-[#C59B58] px-3.5 text-xs font-bold text-[#1A1612] hover:bg-[#B88E4F] disabled:opacity-45"
                        >
                          {extending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          <span>Cập nhật hạn dùng</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick issue or replace form */}
              {showIssueForm && (
                <form id="kol-coupon-issue-form" onSubmit={(e) => void handleIssueOrReplace(e)} className="space-y-3 rounded-2xl border border-[#EAE4D7] bg-white p-3.5 sm:p-4" aria-labelledby="kol-coupon-issue-title">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[#EAE4D7] pb-3">
                    <h4 id="kol-coupon-issue-title" className="m-0 inline-flex items-center gap-2 text-sm font-bold text-[#1A1612]">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] text-[#8C6226]">
                        <Tag size={15} aria-hidden="true" />
                      </span>
                      {activeCoupon ? 'Thay mã ưu đãi' : 'Cấp mã ưu đãi'}
                    </h4>
                    {activeCoupon && (
                      <span className="max-w-full rounded-md bg-[#FAF8F5] px-2 py-1 text-[11px] text-[#7D715E]">
                        Mã hiện tại <strong className="ml-1 font-mono wrap-anywhere text-[#79592C]">{activeCoupon.displayCode}</strong>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="min-w-0 text-xs font-bold text-[#1A1612]">
                      <span className="flex items-baseline justify-between gap-2">Mã mới <small className="text-[11px] font-normal text-[#7D715E]">4–20 ký tự</small></span>
                      <span className={issueFieldClass}>
                        <input
                          required
                          value={newCode}
                          onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                          placeholder="VD: THAONHI10"
                          className="uppercase"
                        />
                      </span>
                    </label>
                    <label className="min-w-0 text-xs font-bold text-[#1A1612]">
                      <span className="flex items-baseline justify-between gap-2">Mức giảm <small className="text-[11px] font-normal text-[#7D715E]">3%–20%</small></span>
                      <span className={issueFieldClass}>
                        <input
                          type="number"
                          min={3}
                          max={20}
                          required
                          value={newDiscount}
                          onChange={(e) => setNewDiscount(Math.min(20, Math.max(3, Number(e.target.value) || 3)))}
                          className="tabular-nums"
                        />
                        <span aria-hidden="true" className="text-[#7D715E]">%</span>
                      </span>
                    </label>
                    <label className="min-w-0 text-xs font-bold text-[#1A1612]">
                      Giảm tối đa / đơn <span className="sr-only">(đồng)</span>
                      <span className={issueFieldClass}>
                        <VndAmountInput
                          required
                          value={newMaxDiscount}
                          onAmountChange={setNewMaxDiscount}
                          className="tabular-nums"
                        />
                        <span aria-hidden="true" className="text-[#7D715E]">₫</span>
                      </span>
                    </label>
                    <DateTimePicker {...expiryPickerProps} label="Hết hạn" value={newExpiresAt} onChange={setNewExpiresAt} disabled={issuing} />
                  </div>
                  {newDiscount > 10 && (
                    <p className="m-0 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-1.5 text-[11px] font-semibold text-[#B45309]">
                      Giảm trên 10% cần Admin duyệt.
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[#EAE4D7] pt-3">
                    <p className="m-0 text-[11px] text-[#7D715E]">1 mã hoạt động / KOC / cửa hàng</p>
                    <button
                      type="submit"
                      disabled={issuing || !storeWideDeal || !isApprovedCoop}
                      className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-[#C59B58] px-3.5 text-xs font-bold text-[#231D15] hover:bg-[#B88E4F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F] disabled:opacity-45"
                    >
                      {issuing ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                        : <Check size={14} aria-hidden="true" />}
                      <span>{issuing ? 'Đang xử lý…' : activeCoupon ? 'Xác nhận thay mã' : 'Cấp mã'}</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center border-t border-[#EAE4D7] bg-[#FAF8F5] px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(promotionsUrl);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#EEDFC6] bg-white px-3.5 py-2 text-xs font-bold text-[#8C6226] hover:bg-[#FBF5EB] cursor-pointer"
          >
            <span>Ưu đãi &amp; Đãi ngộ</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
