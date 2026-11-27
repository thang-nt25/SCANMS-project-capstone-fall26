import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
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

const defaultExpiryInput = (days = 14) => {
  const d = new Date(Date.now() + days * 86_400_000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const toLocalDatetimeInput = (iso?: string | null) => {
  const d = iso ? new Date(iso) : new Date(Date.now() + 14 * 86_400_000);
  const effective = Number.isNaN(d.getTime()) || d.getTime() <= Date.now()
    ? new Date(Date.now() + 14 * 86_400_000)
    : d;
  return new Date(effective.getTime() - effective.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

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
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState(10);
  const [newMaxDiscount, setNewMaxDiscount] = useState(50000);
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
        setExtendExpiresAt(toLocalDatetimeInput(currentActive.expiresAt));
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
    setShowIssueForm(false);
    void loadState();
  }, [isOpen, storeId, kol.id]);

  if (!isOpen) return null;

  const activeCoupon = coupons.find((c) =>
    ['ACTIVE', 'PAUSED', 'PENDING_BLOCK_APPROVAL', 'PENDING_ADMIN_APPROVAL'].includes(c.status),
  );
  const pendingProposal = coupons.find((c) => c.status === 'PENDING_APPROVAL');
  const isApprovedCoop = kol.cooperationStatus === 'APPROVED';

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
    setExtendExpiresAt(new Date(target.getTime() - target.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  };

  const handleSaveExtend = async () => {
    if (!activeCoupon || !extendExpiresAt) return;
    if (new Date(extendExpiresAt).getTime() <= Date.now()) {
      toast.error('Ngày hết hạn mới phải ở tương lai.');
      return;
    }
    setExtending(true);
    try {
      await couponService.updatePolicy(storeId, activeCoupon.id, {
        expiresAt: new Date(extendExpiresAt).toISOString(),
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
    if (!approveExpiresAt || new Date(approveExpiresAt).getTime() <= Date.now()) {
      toast.error('Chọn ngày hết hạn hợp lệ ở tương lai.');
      return;
    }
    setApprovingId(proposal.id);
    try {
      await couponService.approveCoupon(storeId, proposal.id, {
        discountType: 'PERCENTAGE',
        discountValue: approveDiscount,
        maximumDiscountAmount: approveMaxDiscount,
        expiresAt: new Date(approveExpiresAt).toISOString(),
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
    setIssuing(true);
    try {
      await couponService.createStoreCoupon(storeId, {
        collaboratorId: kol.id,
        code: clean,
        discountType: 'PERCENTAGE',
        discountValue: newDiscount,
        maximumDiscountAmount: newMaxDiscount,
        expiresAt: newExpiresAt ? new Date(newExpiresAt).toISOString() : undefined,
        scopeType: 'STORE_WIDE',
        benefitType: 'GOODS',
      } as any);
      toast.success(
        newDiscount > 10
          ? `Đã tạo mã "${clean}" (${newDiscount}%) và chuyển Admin duyệt (>10%).`
          : `Đã phát hành mã "${clean}" (${newDiscount}%) cho ${kol.fullName}.`,
      );
      setShowIssueForm(false);
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
        className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white text-left shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#EAE4D7] bg-[#FAF8F5] px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
              <Ticket className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 id="quick-kol-coupon-title" className="m-0 text-sm font-bold text-[#1A1612]">
                Mã ưu đãi KOC · {kol.fullName}
              </h3>
              <p className="m-0 mt-0.5 text-xs text-[#7D715E]">
                Phát hành nhanh, gia hạn, duyệt đề xuất hoặc đổi mã thay thế gắn trực tiếp với KOC (tối đa 1 mã hoạt động / Cửa hàng).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#1A1612] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs font-medium text-[#7D715E]">
              <Loader2 className="h-4 w-4 animate-spin text-[#B88E4F]" />
              <span>Đang tải mã ưu đãi của đối tác...</span>
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
                <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5 text-xs text-[#92400E]">
                  Hai bên chưa hoàn tất xác nhận hợp tác (`APPROVED`). Hãy xác nhận hợp tác trước khi cấp hoặc duyệt mã ưu đãi KOC.
                </div>
              ) : !storeWideDeal ? (
                <div className="flex flex-col gap-2.5 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-xs text-[#7D715E]">
                  <div className="font-bold text-[#1A1612]">Chưa có Thỏa thuận Độc quyền Toàn cửa hàng</div>
                  <p className="m-0 leading-relaxed">
                    Theo quy định SCANMS, mã ưu đãi độc quyền KOC chỉ phát hành khi KOC đã có Deal Toàn cửa hàng (`STORE_WIDE`) ở trạng thái <strong>Đã duyệt</strong>.
                  </p>
                  {onRequestOpenDealModal && (
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onRequestOpenDealModal();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#231D15] px-3.5 py-2 text-xs font-bold text-[#FAF8F5] hover:bg-[#322A1E] cursor-pointer"
                      >
                        <Handshake className="h-3.5 w-3.5 text-[#C59B58]" />
                        <span>Tạo Deal Toàn cửa hàng ngay</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB]/70 px-3.5 py-2.5 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#1A1612]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#059669]" />
                    Đã đủ điều kiện · Deal toàn Shop ({storeWideDeal.approvedCommissionRate ?? storeWideDeal.proposedCommissionRate}%)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowIssueForm((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#C59B58] bg-white px-2.5 py-1 text-[11px] font-bold text-[#8C6226] hover:bg-[#FAF8F5] cursor-pointer"
                  >
                    {activeCoupon ? <RefreshCw className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    <span>{showIssueForm ? 'Đóng form' : activeCoupon ? 'Đổi mã thay thế' : 'Phát hành mã mới'}</span>
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
                    <label className="text-[11px] font-semibold text-[#1A1612]">
                      Hết hạn
                      <input
                        type="datetime-local"
                        value={approveExpiresAt}
                        onChange={(e) => setApproveExpiresAt(e.target.value)}
                        className="mt-1 h-9 w-full rounded-lg border border-[#EAE4D7] bg-white px-2 text-[11px] font-semibold"
                      />
                    </label>
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
                <div className="space-y-3 rounded-2xl border border-[#EEDFC6] bg-white p-4 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black tracking-wider text-[#B88E4F]">
                          {activeCoupon.displayCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeCoupon.displayCode)}
                          className="rounded-md border border-[#EAE4D7] bg-[#FAF8F5] p-1 text-[#7D715E] hover:text-[#1A1612] cursor-pointer"
                          title="Sao chép mã"
                        >
                          {copiedCode === activeCoupon.displayCode ? <Check className="h-3 w-3 text-[#059669]" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                      <p className="m-0 mt-1 text-xs text-[#7D715E]">
                        Giảm <strong className="text-[#1A1612]">{Number(activeCoupon.discountValue)}%</strong>
                        {activeCoupon.maximumDiscountAmount ? ` · Tối đa ${Number(activeCoupon.maximumDiscountAmount).toLocaleString('vi-VN')} ₫` : ''}
                        {' · '}Đã dùng <strong className="text-[#1A1612]">{activeCoupon.usageCount || 0}</strong> lượt
                      </p>
                      <p className="m-0 mt-0.5 text-[11px] text-[#7D715E]">
                        Hạn hiệu lực: {activeCoupon.expiresAt ? new Date(activeCoupon.expiresAt).toLocaleString('vi-VN') : 'Chưa đặt hạn kết thúc'}
                      </p>
                    </div>
                    <span className="rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-0.5 text-[11px] font-bold text-[#8C6226]">
                      {activeCoupon.status === 'ACTIVE'
                        ? 'Đang chạy'
                        : activeCoupon.status === 'PENDING_ADMIN_APPROVAL'
                          ? 'Chờ Admin duyệt'
                          : activeCoupon.status === 'PENDING_BLOCK_APPROVAL'
                            ? 'Chờ duyệt ngừng'
                            : 'Tạm dừng'}
                    </span>
                  </div>

                  {['ACTIVE', 'PAUSED'].includes(activeCoupon.status) && (
                    <div className="space-y-2 border-t border-[#EAE4D7] pt-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1A1612]">
                          <CalendarClock className="h-3.5 w-3.5 text-[#B88E4F]" />
                          Gia hạn nhanh thời hạn mã
                        </span>
                        <div className="flex items-center gap-1.5">
                          {[7, 14, 30].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleExtendDays(d)}
                              className="rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] px-2 py-1 text-[11px] font-semibold text-[#8C6226] hover:bg-[#FBF5EB] cursor-pointer"
                            >
                              +{d} ngày
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          value={extendExpiresAt}
                          onChange={(e) => setExtendExpiresAt(e.target.value)}
                          className="h-9 flex-1 rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-semibold text-[#1A1612]"
                        />
                        <button
                          type="button"
                          disabled={extending || !extendExpiresAt}
                          onClick={() => void handleSaveExtend()}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#C59B58] px-3.5 text-xs font-bold text-[#1A1612] hover:bg-[#B88E4F] cursor-pointer disabled:opacity-45"
                        >
                          {extending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          <span>Lưu gia hạn</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick issue or replace form */}
              {(showIssueForm || (!activeCoupon && !pendingProposal && Boolean(storeWideDeal) && isApprovedCoop)) && (
                <form onSubmit={(e) => void handleIssueOrReplace(e)} className="space-y-3 rounded-2xl border border-[#EEDFC6] bg-[#FAF8F5] p-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A1612]">
                      <Tag className="h-3.5 w-3.5 text-[#B88E4F]" />
                      {activeCoupon ? `Cấp mã mới thay thế "${activeCoupon.displayCode}"` : 'Cấp mã độc quyền mới cho KOC'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-[#1A1612]">
                      Tên mã mới (4–20 ký tự)
                      <input
                        required
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                        placeholder="VD: THAONHI10"
                        className="mt-1 h-10 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-bold uppercase"
                      />
                    </label>
                    <label className="text-xs font-semibold text-[#1A1612]">
                      Mức giảm (3%–20%)
                      <input
                        type="number"
                        min={3}
                        max={20}
                        required
                        value={newDiscount}
                        onChange={(e) => setNewDiscount(Math.min(20, Math.max(3, Number(e.target.value) || 3)))}
                        className="mt-1 h-10 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-bold"
                      />
                    </label>
                    <label className="text-xs font-semibold text-[#1A1612]">
                      Giảm tối đa / đơn (₫)
                      <input
                        type="number"
                        min={10000}
                        step={10000}
                        required
                        value={newMaxDiscount}
                        onChange={(e) => setNewMaxDiscount(Math.max(10000, Number(e.target.value) || 10000))}
                        className="mt-1 h-10 w-full rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-bold"
                      />
                    </label>
                    <label className="text-xs font-semibold text-[#1A1612]">
                      Ngày hết hạn
                      <input
                        type="datetime-local"
                        required
                        value={newExpiresAt}
                        onChange={(e) => setNewExpiresAt(e.target.value)}
                        className="mt-1 h-10 w-full rounded-xl border border-[#EAE4D7] bg-white px-2.5 text-xs font-semibold"
                      />
                    </label>
                  </div>
                  {newDiscount > 10 && (
                    <p className="m-0 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-1.5 text-[11px] font-semibold text-[#B45309]">
                      Mức giảm {newDiscount}% (&gt; 10%) sẽ chuyển System Admin duyệt ngoại lệ trước khi kích hoạt.
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      disabled={issuing || !storeWideDeal || !isApprovedCoop}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#231D15] px-4 py-2 text-xs font-bold text-[#FAF8F5] hover:bg-[#322A1E] cursor-pointer disabled:opacity-45"
                    >
                      {issuing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>{activeCoupon ? 'Cấp & Thay thế mã cũ' : 'Cấp mã ngay'}</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EAE4D7] bg-[#FAF8F5] px-5 py-3.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(promotionsUrl);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#EEDFC6] bg-white px-3.5 py-2 text-xs font-bold text-[#8C6226] hover:bg-[#FBF5EB] cursor-pointer"
          >
            <span>Mở ở trang Ưu đãi &amp; Đãi ngộ</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#EAE4D7] bg-white px-4 py-2 text-xs font-semibold text-[#7D715E] hover:bg-[#F3EFE6] cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
