import { handleProductImageError } from '@/utils/image-fallback.utils';
import { publicShareUrl } from '@/utils/public-url';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BadgePercent, ChevronDown, ExternalLink, Copy, Check, Clock3, AlertTriangle, Package, Layers } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import { getChatSocket } from '../../services/chat-socket.service';
import { Modal } from '../ui/Modal';
import { getSafeProductImageUrl } from '../../utils/marketplace.utils';
import './exclusive-deal-bubble.css';

export function ExclusiveDealCardBubble({ card, isShop, compact = false, onStateChange }: { card: any; isMine: boolean; isShop: boolean; compact?: boolean; onStateChange?: (id: string, state: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(card.shortUrl ? publicShareUrl(card.shortUrl) : null);
  const [voucherCode, setVoucherCode] = useState<string | null>(card.vipVoucherCode || null);
  const [loadingIssued, setLoadingIssued] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'link' | 'voucher' | null>(null);
  const [stateReady, setStateReady] = useState(false);
  const [resolvedInitiatorRole, setResolvedInitiatorRole] = useState<string | null>(null);
  const [resolvedCouponTerms, setResolvedCouponTerms] = useState<any>(null);
  const [reload, setReload] = useState(0);
  const [isProductsExpanded, setIsProductsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [resolvedDeal, setResolvedDeal] = useState<any>(null);
  const [loadedProducts, setLoadedProducts] = useState<any[]>(
    Array.isArray(card.products) && card.products.length > 0
      ? card.products
      : card.productTitle
      ? [{ id: card.productId, title: card.productTitle, imageUrl: card.productImage, price: card.productPrice }]
      : []
  );
  const status = decision || card.status;
  const isDecision = card.type === 'EXCLUSIVE_DEAL_DECISION';
  const approved = status === 'APPROVED';
  const rejected = status === 'REJECTED';
  const detail = resolvedDeal ? { ...card, ...resolvedDeal } : card;
  const rate = detail.approvedCommissionRate ?? detail.proposedCommissionRate;
  const shopOffer = resolvedInitiatorRole
    ? resolvedInitiatorRole === 'SHOP_MANAGER'
    : card.initiatorRole === 'SHOP_MANAGER' || card.offeredBy === 'SHOP';
  const terms = resolvedCouponTerms ?? card.couponTerms;
  // The recipient's role determines who can decide. Historical chat messages
  // can have a senderId that does not match the currently signed-in user.
  const canReview = stateReady && !isDecision && status === 'PENDING' && (shopOffer ? !isShop : isShop);
  const waitingForPartner = stateReady && !isDecision && status === 'PENDING' && !canReview;
  const isNotFoundRef = useRef(false);

  useEffect(() => {
    if (!card.proposalId) { setStateReady(true); return; }
    let active = true;
    let revision = 0;
    setStateReady(false);
    setDecision(null);
    setResolvedInitiatorRole(null);
    setResolvedCouponTerms(null);
    setResolvedDeal(null);
    const apply = (state: any) => {
      setResolvedDeal(state);
      onStateChange?.(card.proposalId, state);
      setDecision(state.closedAt ? 'CLOSED' : state.status); setStateReady(true);
      if (state.initiatorRole) setResolvedInitiatorRole(state.initiatorRole);
      if (state.couponTerms) setResolvedCouponTerms(state.couponTerms);
      if ('shortUrl' in state) setLinkUrl(state.shortUrl ? publicShareUrl(state.shortUrl) : null);
      if ('vipVoucherCode' in state) setVoucherCode(state.vipVoucherCode || null);
      if (state.products && Array.isArray(state.products) && state.products.length > 0) {
        setLoadedProducts(state.products);
      } else if (state.scopeProducts && Array.isArray(state.scopeProducts) && state.scopeProducts.length > 0) {
        const prods = state.scopeProducts.map((sp: any) => sp.product || sp).filter(Boolean);
        if (prods.length > 0) setLoadedProducts(prods);
      } else if (state.product) {
        setLoadedProducts([state.product]);
      }
    };
    const sync = async () => {
      if (isNotFoundRef.current) return;
      const version = revision;
      try {
        const response: any = await api.get('/affiliate-deals/' + card.proposalId, { headers: { 'x-skip-cache': '1' } });
        if (active && revision === version) { apply(response?.data?.data || response?.data || response); setError(null); }
      } catch (err: any) {
        if (active && revision === version) {
          if (err?.response?.status === 404) {
            isNotFoundRef.current = true;
            apply({ status: 'CLOSED' });
            return;
          }
          setError('Chưa đối soát được trạng thái đề nghị. Bấm làm mới để thử lại.');
        }
      }
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
  }, [card.proposalId, isDecision, reload, onStateChange]);

  useEffect(() => {
    setLinkUrl(card.shortUrl ? publicShareUrl(card.shortUrl) : null);
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
        if (issued.shortUrl) setLinkUrl(publicShareUrl(issued.shortUrl));
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
      if (result?.status) { setResolvedDeal(result); onStateChange?.(card.proposalId, result); }
      setDecision(result?.status || (approve ? 'APPROVED' : 'REJECTED'));
      if (result?.shortUrl) setLinkUrl(publicShareUrl(result.shortUrl));
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
    <article className={`chat-exclusive-deal ${compact ? 'is-compact' : ''} max-w-[min(100%,calc(100vw-48px))] overflow-hidden border border-[#EAE4D7] rounded-xl bg-white text-[#1A1612] text-left`}>
      <header className="flex items-center gap-1.5 px-3 py-2.5 border-b border-[#EAE4D7] bg-white">
        <span className="w-6 h-6 grid place-items-center shrink-0 rounded-[7px] bg-[#FBF5EB] text-[#B88E4F]"><BadgePercent size={14} /></span>
        <strong className="text-xs font-semibold text-[#1A1612]">Deal độc quyền</strong>
        <span className={`inline-flex items-center gap-1 shrink-0 ml-auto px-1.5 py-1 border rounded-md text-[9px] leading-tight font-medium ${rejected ? 'bg-white border-[#EAE4D7] text-[#7D715E]' : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#8C6226]'}`}>
          {approved ? <Check size={11} className="text-[#059669]" /> : !rejected ? <Clock3 size={11} className="text-[#B88E4F]" /> : null}
          {approved ? 'Đã duyệt' : rejected ? 'Đã từ chối' : status === 'PENDING_ADMIN_APPROVAL' ? 'Chờ Admin phê duyệt' : status === 'CLOSED' ? 'Đã kết thúc' : !stateReady ? 'Đang đối soát' : canReview ? 'Cần bạn phản hồi' : `Chờ ${shopOffer ? 'KOL' : 'Shop'} chấp thuận`}
        </span>
      </header>
      <div className="p-2.5 sm:px-3">
        {rate != null && rate > 16 && (status === 'PENDING' || status === 'PENDING_ADMIN_APPROVAL') && (
          <div className="mb-2.5 flex items-start gap-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] p-2 text-left">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B88E4F]" />
            <div className="flex-1 text-[10px] leading-relaxed text-[#8C6226]">
              {status === 'PENDING'
                ? 'Cần Admin phê duyệt sau khi hai bên chấp thuận.'
                : 'Hai bên đã chấp thuận · Chờ Admin phê duyệt.'}
            </div>
          </div>
        )}

        {loadedProducts.length > 0 ? (
          <div>
            <div className="chat-deal-product flex items-center gap-2 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] p-2">
              {(
                <img
                  src={getSafeProductImageUrl(loadedProducts[0].imageUrl || loadedProducts[0].image)} onError={handleProductImageError}
                  alt={loadedProducts[0].title}
                  className="h-9 w-9 shrink-0 rounded-md border border-[#EAE4D7] object-cover bg-white"
                />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="m-0 truncate text-xs font-semibold text-[#1A1612]">
                  {loadedProducts[0].title}
                </h3>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#7D715E]">
                  {loadedProducts[0].price != null && (
                    <span>{Number(loadedProducts[0].price).toLocaleString('vi-VN')} đ</span>
                  )}
                  {loadedProducts.length > 1 && (
                    <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 bg-[#F3EFE6] font-medium text-[#8C6226]">
                      <Layers size={10} /> +{loadedProducts.length - 1} sản phẩm khác
                    </span>
                  )}
                </div>
              </div>
            </div>

            {loadedProducts.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setIsProductsExpanded(!isProductsExpanded)}
                  className="mt-1.5 flex w-full items-center justify-between rounded-md border border-[#EAE4D7] bg-white px-2 py-1 text-[10px] font-semibold text-[#8C6226] hover:bg-[#FAF8F5] transition-colors"
                >
                  <span className="flex items-center gap-1">
                    <Package size={11} className="text-[#B88E4F]" />
                    {isProductsExpanded ? 'Thu gọn danh sách sản phẩm' : `Xem toàn bộ ${loadedProducts.length} sản phẩm áp dụng`}
                  </span>
                  <ChevronDown size={12} className={`transform transition-transform ${isProductsExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isProductsExpanded && (
                  <div className="mt-1.5 max-h-40 overflow-y-auto space-y-1.5 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] p-1.5">
                    {loadedProducts.map((prod: any, idx: number) => (
                      <div key={prod.id || idx} className="flex items-center gap-2 rounded-md bg-white border border-[#EAE4D7]/70 p-1.5">
                        {prod.imageUrl ? (
                          <img src={prod.imageUrl} alt={prod.title} className="h-7 w-7 shrink-0 rounded object-cover border border-[#EAE4D7]" />
                        ) : (
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded border border-[#EAE4D7] bg-[#FAF8F5] text-[#B88E4F]">
                            <Package size={12} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="m-0 truncate text-[11px] font-medium text-[#1A1612]">{prod.title}</p>
                          <p className="m-0 text-[9px] text-[#7D715E]">
                            {prod.price != null ? `${Number(prod.price).toLocaleString('vi-VN')} đ · ` : ''}Thù lao gốc: 10%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <h3 className="m-0 text-xs leading-relaxed font-semibold break-words text-[#1A1612]">{card.productTitle || 'Sản phẩm'}</h3>
        )}
        {card.storeName && <p className="m-0 mt-1 text-[#7D715E] text-[10px] leading-relaxed break-words">Cửa hàng <strong className="ml-1 text-[#1A1612] font-normal">{card.storeName}</strong></p>}
        {(card.publicCommissionRate != null || rate != null) && (
          <div className="chat-deal-rates grid grid-cols-2 mt-2.5 p-2 px-2.5 rounded-lg bg-[#FBF5EB]">
            <div>
              <span className="text-[#7D715E] text-[10px]">Thù lao gốc</span>
              <strong className="block mt-0.5 text-xl leading-tight font-semibold tabular-nums text-[#1A1612]">{detail.publicCommissionRate ?? '—'}<small className="text-[13px] ml-0.5 font-normal">%</small></strong>
            </div>
            <div className="pl-3 border-l border-[#EEDFC6]">
              <span className="text-[#8C6226] text-[10px]">{approved ? 'Deal áp dụng' : 'Deal đề xuất'}</span>
              <strong className="block mt-0.5 text-xl leading-tight font-semibold tabular-nums text-[#B88E4F]">{rate ?? '—'}<small className="text-[13px] ml-0.5 font-normal">%</small></strong>
            </div>
          </div>
        )}
        {card.isRevision && card.currentCommissionRate != null && <p className="mt-2 text-[#7D715E] text-[10px] leading-relaxed">Mức đang áp dụng <strong className="ml-1 text-[#1A1612] font-medium">{card.currentCommissionRate}%</strong></p>}
        {card.scopeType && <p className="mt-2 text-xs text-[#7D715E]">{card.scopeType === 'STORE_WIDE' ? 'Toàn cửa hàng, gồm sản phẩm mới' : card.scopeType === 'SELECTED_PRODUCTS' ? 'Nhóm sản phẩm' : 'Một sản phẩm'}</p>}
        <dl className="chat-deal-targets"><div><dt>{detail.targetRevenue != null ? 'Mục tiêu doanh số' : 'Mục tiêu đơn'}</dt><dd>{detail.targetRevenue != null ? `${Number(detail.targetRevenue).toLocaleString('vi-VN')} đ` : detail.targetOrders != null ? `${detail.targetOrders} đơn` : 'Chưa thiết lập'}</dd></div><div><dt>Thời hạn</dt><dd>{detail.commitmentDays != null ? `${detail.commitmentDays} ngày` : 'Chưa thiết lập'}</dd></div></dl>
        {error && <p className="mt-2 text-[11px] leading-relaxed text-[#DC2626]" role="alert">{error}</p>}
        {!stateReady && error && <button type="button" onClick={() => setReload(value => value + 1)} className="mt-2 rounded-lg border border-[#EAE4D7] px-3 py-1 text-xs">Làm mới trạng thái</button>}
      </div>
      {(
        <footer className="px-3 py-2 border-t border-[#EAE4D7] bg-white">
          <button type="button" className="chat-deal-details-button" onClick={() => setShowDetails(true)}>Xem chi tiết</button>
          {approved && (
            <div className="space-y-3">
              {linkUrl && <div>
                <p className="m-0 mb-1 text-[10px] font-medium text-[#7D715E]">Link tiếp thị độc quyền</p>
                <div className="flex items-start gap-2 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] p-2">
                  {linkUrl ? <a href={linkUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 break-all text-[11px] leading-relaxed text-[#1A1612] hover:underline">{linkUrl}</a> : <span className="flex-1 text-[11px] text-[#7D715E]">{loadingIssued ? 'Đang tải link đã cấp…' : 'Chưa có link được cấp'}</span>}
                  <button type="button" disabled={!linkUrl} onClick={() => void copyIssued('link')} title="Sao chép link tiếp thị" aria-label="Sao chép link tiếp thị" className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[#EAE4D7] bg-white text-[#B88E4F] hover:border-[#C59B58] disabled:opacity-40">{copied === 'link' ? <Check size={14} /> : <Copy size={14} />}</button>
                </div>
              </div>}
              {voucherCode && <div>
                <p className="m-0 mb-1 text-[10px] font-medium text-[#7D715E]">Mã ưu đãi độc quyền đối tác</p>
                <div className="flex items-center gap-2 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] p-2">
                  <span className="min-w-0 flex-1 break-all font-mono text-xs font-semibold text-[#1A1612]">{voucherCode || (loadingIssued ? 'Đang tải mã đã cấp…' : 'Chưa có mã voucher được cấp')}</span>
                  <button type="button" disabled={!voucherCode} onClick={() => void copyIssued('voucher')} title="Sao chép mã voucher VIP" aria-label="Sao chép mã voucher VIP" className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[#EEDFC6] bg-white text-[#B88E4F] hover:border-[#C59B58] disabled:opacity-40">{copied === 'voucher' ? <Check size={14} /> : <Copy size={14} />}</button>
                </div>
              </div>}
              {loadingIssued && <p className="text-xs text-[#7D715E]">Đang tải tài nguyên đã cấp…</p>}
              {linkUrl && <a href={linkUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-[#B88E4F] hover:underline"><ExternalLink size={12} />Mở link tiếp thị</a>}
            </div>
          )}
          {canReview && (
            <div className="chat-deal-review grid grid-cols-2 gap-2">
              <button type="button" disabled={loading} onClick={() => void decide(false)} className="min-h-[32px] px-2 py-1.5 border border-[#EAE4D7] rounded-lg bg-white text-[#7D715E] text-[11px] font-medium hover:bg-[#F3EFE6] cursor-pointer disabled:opacity-50">Từ chối</button>
              <button type="button" disabled={loading} onClick={() => void decide(true)} className="min-h-[32px] px-2 py-1.5 border border-[#EEDFC6] rounded-lg bg-[#C59B58] text-[#1A1612] text-[11px] font-semibold hover:bg-[#B88E4F] cursor-pointer disabled:opacity-50">{loading ? 'Đang xử lý…' : shopOffer ? 'Chấp thuận thỏa thuận' : card.isRevision ? 'Duyệt đổi deal' : 'Duyệt & tạo link'}</button>
            </div>
          )}
          {waitingForPartner && <p className="flex items-center gap-1.5 m-0 text-[10px] text-[#7D715E]"><Clock3 size={13} className="text-[#B88E4F] shrink-0" />Đã gửi · Chờ {shopOffer ? 'KOL' : 'Shop'} phản hồi</p>}
        </footer>
      )}
      {showDetails && createPortal(<Modal isOpen onClose={() => setShowDetails(false)} title="Chi tiết Deal" subtitle={loadedProducts[0]?.title || detail.productTitle} maxWidth="2xl" stickyHeader className="chat-deal-detail-modal">
        <dl className="chat-deal-detail-fields">
          <div><dt>Trạng thái</dt><dd>{approved ? 'Đã duyệt' : rejected ? 'Đã từ chối' : status === 'PENDING_ADMIN_APPROVAL' ? 'Chờ Admin phê duyệt' : status === 'CLOSED' ? 'Đã kết thúc' : status === 'PENDING' ? `Chờ ${shopOffer ? 'KOL' : 'Shop'} chấp thuận` : 'Đang đối soát'}</dd></div>
          <div><dt>Thù lao Deal</dt><dd>{rate != null ? `${rate}%` : 'Chưa có dữ liệu'}</dd></div>
          <div><dt>Phạm vi</dt><dd>{detail.scopeType === 'STORE_WIDE' ? 'Toàn cửa hàng' : loadedProducts.map(product => product.title).join(', ') || 'Chưa có dữ liệu'}</dd></div>
          <div><dt>Mục tiêu doanh số</dt><dd>{detail.targetRevenue != null ? `${Number(detail.targetRevenue).toLocaleString('vi-VN')} đ` : 'Không thiết lập'}</dd></div>
          <div><dt>Mục tiêu đơn</dt><dd>{detail.targetOrders != null ? `${detail.targetOrders} đơn` : 'Không thiết lập'}</dd></div>
          <div><dt>Thời hạn</dt><dd>{detail.commitmentDays != null ? `${detail.commitmentDays} ngày` : 'Chưa thiết lập'}</dd></div>
          {detail.salesCommitment && <div><dt>Kế hoạch nội dung</dt><dd>{detail.salesCommitment}</dd></div>}
          {(detail.shopResponse || detail.message) && <div><dt>Phản hồi</dt><dd>{detail.shopResponse || detail.message}</dd></div>}
          {detail.exceptionNote && <div><dt>Ghi chú phê duyệt</dt><dd>{detail.exceptionNote}</dd></div>}
          {terms && <><div><dt>Mã ưu đãi</dt><dd>{terms.discountPercent != null ? `Giảm ${terms.discountPercent}%` : 'Chưa thiết lập'}</dd></div><div><dt>Đơn tối thiểu</dt><dd>{terms.minimumOrderAmount != null ? `${Number(terms.minimumOrderAmount).toLocaleString('vi-VN')} đ` : 'Chưa thiết lập'}</dd></div><div><dt>Giảm tối đa</dt><dd>{terms.maximumDiscountAmount != null ? `${Number(terms.maximumDiscountAmount).toLocaleString('vi-VN')} đ` : 'Không giới hạn'}</dd></div><div><dt>Giới hạn lượt dùng</dt><dd>{terms.usageLimitTotal ?? 'Không giới hạn'}</dd></div></>}
        </dl>
      </Modal>, document.body)}
    </article>
  );
}
