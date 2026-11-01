import { useEffect, useState } from 'react';
import { Sparkles, ChevronDown, ExternalLink, Copy, Check, Clock3 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import { getChatSocket } from '../../services/chat-socket.service';

export function ExclusiveDealCardBubble({ card, isMine, isShop, compact = false }: { card: any; isMine: boolean; isShop: boolean; compact?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(card.shortUrl || null);
  const [voucherCode, setVoucherCode] = useState<string | null>(card.vipVoucherCode || null);
  const [loadingIssued, setLoadingIssued] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'link' | 'voucher' | null>(null);
  const [stateReady, setStateReady] = useState(false);
  const [reload, setReload] = useState(0);
  const status = decision || card.status;
  const isDecision = card.type === 'EXCLUSIVE_DEAL_DECISION';
  const approved = status === 'APPROVED';
  const rejected = status === 'REJECTED';
  const rate = card.approvedCommissionRate ?? card.proposedCommissionRate;
  const shopOffer = card.initiatorRole === 'SHOP_MANAGER' || card.offeredBy === 'SHOP';
  const canReview = !isDecision && status === 'PENDING' && !isMine && (shopOffer ? !isShop : isShop);

  useEffect(() => {
    if (!card.proposalId) { setStateReady(true); return; }
    let active = true;
    let revision = 0;
    setStateReady(false);
    setDecision(null);
    const apply = (state: any) => {
      setDecision(state.closedAt ? 'CLOSED' : state.status); setStateReady(true);
      if (state.shortUrl) setLinkUrl(state.shortUrl);
      if (state.vipVoucherCode) setVoucherCode(state.vipVoucherCode);
    };
    const sync = async () => {
      const version = revision;
      try {
        const response: any = await api.get('/affiliate-deals/' + card.proposalId, { headers: { 'x-skip-cache': '1' } });
        if (active && revision === version) { apply(response?.data?.data || response?.data || response); setError(null); }
      } catch { if (active && revision === version) setError('Chưa đối soát được trạng thái đề nghị. Bấm làm mới để thử lại.'); }
    };
    const socket = getChatSocket();
    const changed = (message: any) => {
      try {
        const state = JSON.parse(message.messageText);
        if (active && state.type === 'EXCLUSIVE_DEAL_DECISION' && state.supersedesProposalId === card.proposalId) { revision++; apply({ status: 'CLOSED' }); return; }
        if (active && state.type === 'EXCLUSIVE_DEAL_DECISION' && state.proposalId === card.proposalId) { revision++; apply(state); }
      } catch { /* Normal text messages do not change deal state. */ }
    };
    void sync(); socket.on('new_message', changed); socket.on('connect', sync); window.addEventListener('focus', sync);
    return () => { active = false; socket.off('new_message', changed); socket.off('connect', sync); window.removeEventListener('focus', sync); };
  }, [card.proposalId, isDecision, reload]);

  useEffect(() => {
    setLinkUrl(card.shortUrl || null);
    setVoucherCode(card.vipVoucherCode || null);
  }, [card.proposalId, card.shortUrl, card.vipVoucherCode]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!approved || !card.proposalId || (linkUrl && voucherCode)) return;
    let active = true;
    setLoadingIssued(true);
    const loadIssued = async () => {
      try {
        const response: any = await api.get(`/affiliate-deals/${isShop ? 'shop' : 'mine'}`);
        const payload = response?.data?.data || response?.data || response;
        const issued = Array.isArray(payload) ? payload.find(item => item.id === card.proposalId) : null;
        if (!active || !issued) return;
        if (issued.shortUrl) setLinkUrl(issued.shortUrl);
        else if (issued.referralLink?.shortCode) setLinkUrl(`${window.location.origin}/r/${encodeURIComponent(issued.referralLink.shortCode)}`);
        const code = issued.vipVoucherCode || issued.referralLink?.customCouponCode;
        if (code) setVoucherCode(code);
      } catch {
        if (active) setError('Chưa tải được link và mã đã cấp. Vui lòng mở lại cuộc trò chuyện.');
      } finally {
        if (active) setLoadingIssued(false);
      }
    };
    void loadIssued();
    return () => { active = false; };
  }, [approved, card.proposalId, isShop, linkUrl, voucherCode]);

  const decide = async (approve: boolean) => {
    if (!card.proposalId || loading) return;
    setLoading(true);
    setError(null);
    try {
      const action = shopOffer ? (approve ? 'accept' : 'decline') : (approve ? 'approve' : 'reject');
      const response: any = await api.patch(`/affiliate-deals/${card.proposalId}/${action}`, approve ? {} : { reason: '' });
      const result = response?.data?.data || response?.data || response;
      setDecision(result?.status || (approve ? 'APPROVED' : 'REJECTED'));
      if (result?.shortUrl) setLinkUrl(result.shortUrl);
      const code = result?.vipVoucherCode || result?.referralLink?.customCouponCode;
      if (code) setVoucherCode(code);
      toast.success(result?.status === 'PENDING_ADMIN_APPROVAL' ? 'Đã chấp thuận, chờ Admin duyệt ngoại lệ.' : approve ? 'Đã chấp thuận thỏa thuận độc quyền thành công!' : 'Đã từ chối đề xuất deal.');
    } catch (actionError: any) {
      setError(actionError?.response?.data?.message || 'Không thể xử lý đề xuất lúc này.');
    } finally {
      setLoading(false);
    }
  };

  const copyIssued = async (kind: 'link' | 'voucher') => {
    const value = kind === 'link' ? linkUrl : voucherCode;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      toast.success(kind === 'link' ? 'Đã sao chép link tiếp thị độc quyền!' : 'Đã sao chép mã ưu đãi độc quyền!');
    } catch {
      toast.error('Không sao chép được link. Vui lòng thử lại.');
    }
  };

  return (
    <article className={`${compact ? 'w-72' : 'w-80'} max-w-[min(100%,calc(100vw-48px))] overflow-hidden border border-[#EAE4D7] rounded-xl bg-white text-[#1A1612] text-left shadow-[0_2px_8px_rgba(35,29,21,0.02)]`}>
      <header className="flex items-center gap-1.5 px-3 py-2.5 border-b border-[#EAE4D7] bg-white">
        <span className="w-6 h-6 grid place-items-center shrink-0 rounded-[7px] bg-[#FBF5EB] text-[#B88E4F]"><Sparkles size={14} /></span>
        <strong className="text-xs font-semibold text-[#1A1612]">Deal độc quyền</strong>
        <span className={`inline-flex items-center gap-1 shrink-0 ml-auto px-1.5 py-1 border rounded-md text-[9px] leading-tight font-medium ${rejected ? 'bg-white border-[#EAE4D7] text-[#7D715E]' : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#8C6226]'}`}>
          {approved ? <Check size={11} className="text-[#059669]" /> : !rejected ? <Clock3 size={11} className="text-[#B88E4F]" /> : null}
          {approved ? 'Đã duyệt' : rejected ? 'Đã từ chối' : status === 'PENDING_ADMIN_APPROVAL' ? 'Ch\u1edd Admin duy\u1ec7t' : status === 'CLOSED' ? 'Đã kết thúc' : !stateReady ? 'Đang đối soát' : 'Chờ phản hồi'}
        </span>
      </header>
      <div className="p-2.5 sm:px-3">
        <h3 className="m-0 text-xs leading-relaxed font-semibold break-words text-[#1A1612]">{card.productTitle || 'Sản phẩm'}</h3>
        {card.storeName && <p className="m-0 mt-1 text-[#7D715E] text-[10px] leading-relaxed break-words">Gian hàng <strong className="ml-1 text-[#1A1612] font-normal">{card.storeName}</strong></p>}
        {(card.publicCommissionRate != null || rate != null) && (
          <div className="grid grid-cols-2 mt-2.5 p-2 px-2.5 rounded-lg bg-[#FBF5EB]">
            <div>
              <span className="text-[#7D715E] text-[10px]">Thù lao cơ sở</span>
              <strong className="block mt-0.5 text-xl leading-tight font-semibold tabular-nums text-[#1A1612]">{(card.publicCommissionRate ?? 10)}<small className="text-[13px] ml-0.5 font-normal">%</small></strong>
            </div>
            <div className="pl-3 border-l border-[#EEDFC6]">
              <span className="text-[#8C6226] text-[10px]">Thù lao độc quyền</span>
              <strong className="block mt-0.5 text-xl leading-tight font-semibold tabular-nums text-[#B88E4F]">{rate ?? '—'}<small className="text-[13px] ml-0.5 font-normal">%</small></strong>
            </div>
          </div>
        )}
        {card.isRevision && card.currentCommissionRate != null && <p className="mt-2 text-[#7D715E] text-[10px] leading-relaxed">Mức đang áp dụng <strong className="ml-1 text-[#1A1612] font-medium">{card.currentCommissionRate}%</strong></p>}
        {card.scopeType && <p className="mt-2 text-xs text-[#7D715E]">{card.scopeType === 'STORE_WIDE' ? 'Toàn gian hàng, gồm sản phẩm mới' : card.scopeType === 'SELECTED_PRODUCTS' ? 'Nhóm sản phẩm' : 'Một sản phẩm'}</p>}
        {card.targetRevenue && <p className="mt-2 text-xs text-[#7D715E]">KPI: {Number(card.targetRevenue).toLocaleString('vi-VN')} đ / {card.commitmentDays} ngày</p>}
        {!isDecision && card.targetOrders && <p className="mt-2 text-[11px] text-[#7D715E]">Mục tiêu {card.targetOrders} đơn trong {card.commitmentDays} ngày · Cam kết video review</p>}
        {!isDecision && card.couponTerms && <p className="mt-2 text-[11px] leading-relaxed text-[#7D715E]">Coupon riêng giảm {card.couponTerms.discountPercent}%, tối đa {Number(card.couponTerms.maximumDiscountAmount).toLocaleString('vi-VN')} đ cho đơn từ {Number(card.couponTerms.minimumOrderAmount).toLocaleString('vi-VN')} đ; {card.couponTerms.usageLimitTotal} lượt trong {card.couponTerms.validDays} ngày sau khi kích hoạt.</p>}
        {!isDecision && status === 'PENDING' && card.isRevision && <p className="mt-2 text-[#7D715E] text-[10px] leading-relaxed">{isMine ? 'Mức hiện tại vẫn áp dụng trong lúc gian hàng xem xét đề xuất.' : 'Mức mới áp dụng cho đơn hàng mới sau khi duyệt. Đơn đã tạo giữ nguyên mức cũ.'}</p>}
        {isDecision && card.message && (
          <details className="mt-2 bg-white text-xs group">
            <summary className="flex items-center justify-between gap-2 py-1 list-none text-[#7D715E] text-[10px] cursor-pointer hover:text-[#1A1612] hover:bg-[#FAF8F5] rounded-md transition-colors select-none">
              Chi tiết phản hồi<ChevronDown size={13} className="group-open:rotate-180 transition-transform text-[#B88E4F]" />
            </summary>
            <p className="m-0 mt-1 pb-1 text-[11px] leading-relaxed whitespace-pre-wrap break-words text-[#7D715E]">{card.message}</p>
          </details>
        )}
        {card.salesCommitment && (
          <details className="mt-2 bg-white text-xs group">
            <summary className="flex items-center justify-between gap-2 py-1 list-none text-[#7D715E] text-[10px] cursor-pointer hover:text-[#1A1612] hover:bg-[#FAF8F5] rounded-md transition-colors select-none">
              Cam kết hợp tác<ChevronDown size={13} className="group-open:rotate-180 transition-transform text-[#B88E4F]" />
            </summary>
            <p className="m-0 mt-1 pb-1 text-[11px] leading-relaxed whitespace-pre-wrap break-words text-[#7D715E]">{card.salesCommitment}</p>
          </details>
        )}
        {card.shopResponse && (
          <details className="mt-2 bg-white text-xs group">
            <summary className="flex items-center justify-between gap-2 py-1 list-none text-[#7D715E] text-[10px] cursor-pointer hover:text-[#1A1612] hover:bg-[#FAF8F5] rounded-md transition-colors select-none">
              Phản hồi thỏa thuận<ChevronDown size={13} className="group-open:rotate-180 transition-transform text-[#B88E4F]" />
            </summary>
            <p className="m-0 mt-1 pb-1 text-[11px] leading-relaxed whitespace-pre-wrap break-words text-[#7D715E]">{card.shopResponse}</p>
          </details>
        )}
        {error && <p className="mt-2 text-[11px] leading-relaxed text-[#DC2626]" role="alert">{error}</p>}
        {!stateReady && error && <button type="button" onClick={() => setReload(value => value + 1)} className="mt-2 rounded-lg border border-[#EAE4D7] px-3 py-1 text-xs">Làm mới trạng thái</button>}
      </div>
      {(canReview || approved || (!isDecision && isMine && status === 'PENDING')) && (
        <footer className="px-3 py-2 border-t border-[#EAE4D7] bg-white">
          {approved && (
            <div className="space-y-3">
              <div>
                <p className="m-0 mb-1 text-[10px] font-medium text-[#7D715E]">Link tiếp thị độc quyền</p>
                <div className="flex items-start gap-2 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] p-2">
                  {linkUrl ? <a href={linkUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 break-all text-[11px] leading-relaxed text-[#1A1612] hover:underline">{linkUrl}</a> : <span className="flex-1 text-[11px] text-[#7D715E]">{loadingIssued ? 'Đang tải link đã cấp…' : 'Chưa có link được cấp'}</span>}
                  <button type="button" disabled={!linkUrl} onClick={() => void copyIssued('link')} title="Sao chép link tiếp thị" aria-label="Sao chép link tiếp thị" className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[#EAE4D7] bg-white text-[#B88E4F] hover:border-[#C59B58] disabled:opacity-40">{copied === 'link' ? <Check size={14} /> : <Copy size={14} />}</button>
                </div>
              </div>
              <div>
                <p className="m-0 mb-1 text-[10px] font-medium text-[#7D715E]">Mã ưu đãi độc quyền đối tác</p>
                <div className="flex items-center gap-2 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] p-2">
                  <span className="min-w-0 flex-1 break-all font-mono text-xs font-semibold text-[#1A1612]">{voucherCode || (loadingIssued ? 'Đang tải mã đã cấp…' : 'Chưa có mã voucher được cấp')}</span>
                  <button type="button" disabled={!voucherCode} onClick={() => void copyIssued('voucher')} title="Sao chép mã voucher VIP" aria-label="Sao chép mã voucher VIP" className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[#EEDFC6] bg-white text-[#B88E4F] hover:border-[#C59B58] disabled:opacity-40">{copied === 'voucher' ? <Check size={14} /> : <Copy size={14} />}</button>
                </div>
              </div>
              {linkUrl && <a href={linkUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-[#B88E4F] hover:underline"><ExternalLink size={12} />Mở link tiếp thị</a>}
            </div>
          )}
          {canReview && (
            <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2">
              <button type="button" disabled={loading} onClick={() => void decide(false)} className="min-h-[32px] px-2 py-1.5 border border-[#EAE4D7] rounded-lg bg-white text-[#7D715E] text-[11px] font-medium hover:bg-[#F3EFE6] cursor-pointer disabled:opacity-50">Từ chối</button>
              <button type="button" disabled={loading} onClick={() => void decide(true)} className="min-h-[32px] px-2 py-1.5 border border-[#EEDFC6] rounded-lg bg-[#C59B58] text-[#1A1612] text-[11px] font-semibold hover:bg-[#B88E4F] cursor-pointer disabled:opacity-50">{loading ? 'Đang xử lý…' : shopOffer ? 'Chấp thuận thỏa thuận' : card.isRevision ? 'Duyệt đổi deal' : 'Duyệt & tạo link'}</button>
            </div>
          )}
          {!isDecision && isMine && status === 'PENDING' && <p className="flex items-center gap-1.5 m-0 text-[10px] text-[#7D715E]"><Clock3 size={13} className="text-[#B88E4F] shrink-0" />Đã gửi · Chờ {shopOffer ? 'đối tác' : 'gian hàng'} phản hồi</p>}
        </footer>
      )}
    </article>
  );
}
