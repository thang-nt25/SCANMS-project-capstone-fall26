import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handshake, ChevronDown, X } from 'lucide-react';
import { handleProductImageError } from '../../utils/image-fallback.utils';

export interface PinnedChatDeal { messageId: string; card: any; rate: number | string | null; isForMe: boolean; waitingFor: string }
const statusText = (item: PinnedChatDeal) => item.card.closedAt || item.card.status === 'CLOSED' ? 'Đã kết thúc'
  : item.card.status === 'APPROVED' ? 'Đã duyệt' : item.card.status === 'REJECTED' ? 'Đã từ chối'
  : item.card.status === 'PENDING_ADMIN_APPROVAL' ? 'Chờ Admin duyệt' : item.isForMe ? 'Chờ bạn phản hồi' : `Chờ ${item.waitingFor} phản hồi`;

export function PinnedDealsBar({ items, onJump }: { items: PinnedChatDeal[]; onJump: (messageId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 400, maxHeight: 320 });
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(400, window.innerWidth - 24);
      const below = window.innerHeight - rect.bottom - 12;
      const height = Math.min(320, Math.max(below, rect.top - 12));
      setPosition({ width, left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)), top: below >= Math.min(320, rect.top - 12) ? rect.bottom + 4 : Math.max(12, rect.top - height - 4), maxHeight: height });
    };
    place();
    const outside = (event: PointerEvent) => { if (!list.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    list.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);
  if (!items.length) return null;
  return <>
    <button ref={trigger} id="chat-pinned-deal-banner" type="button" aria-label="Deal trong cuộc trò chuyện" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(value => !value)}
      className="chat-deal-pin flex h-10! min-h-10! w-full! shrink-0! items-center justify-between gap-2 rounded-none! border-0! border-b! border-[#EEDFC6]! bg-[#FBF5EB]! px-3! py-0! text-xs! text-[#231D15]! shadow-none!">
      <span className="flex min-w-0 items-center gap-2"><Handshake size={16} className="shrink-0 text-[#B88E4F]"/><span className="truncate">Deal độc quyền · {items.length === 1 ? `${items[0].rate != null ? `${items[0].rate}% · ` : ''}${statusText(items[0])}` : items.length}</span></span>
      <span className="flex shrink-0 items-center gap-1 text-[11px] text-[#79592C]"><span className="hidden sm:inline">Xem danh sách</span><ChevronDown size={14}/></span>
    </button>
    {open && createPortal(<div ref={list} role="dialog" aria-label="Deal trong cuộc trò chuyện" className="chat-pinned-deals-list fixed z-[130] flex flex-col overflow-hidden rounded-xl border border-[#EAE4D7] bg-white shadow-xl" style={position}>
      <header className="flex shrink-0 items-center justify-between border-b border-[#EAE4D7] px-3 py-2 text-xs font-semibold">Deal trong cuộc trò chuyện<button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }} aria-label="Đóng danh sách Deal" className="grid size-7 place-items-center rounded-md text-[#7D715E]"><X size={14}/></button></header>
      <div className="max-h-64 overflow-y-auto divide-y divide-[#EAE4D7]">{items.map(item => <button type="button" key={item.card.proposalId || item.messageId} onClick={() => { setOpen(false); trigger.current?.focus(); requestAnimationFrame(() => onJump(item.messageId)); }} className="flex min-h-16 w-full items-center gap-2.5 rounded-none! bg-white px-3 py-2 text-left text-xs hover:bg-[#FBF5EB]">
        <img src={item.card.product?.imageUrl || item.card.products?.[0]?.imageUrl || item.card.productImage || '/assets/product-placeholder.svg'} onError={handleProductImageError} alt="" className="size-8 shrink-0 rounded-md border border-[#EAE4D7] object-contain"/>
        <span className="min-w-0 flex-1"><strong className="line-clamp-2 font-semibold">{item.card.scopeType === 'STORE_WIDE' ? 'Toàn cửa hàng' : item.card.product?.title || item.card.products?.[0]?.title || item.card.productTitle || 'Sản phẩm trong Deal'}</strong><small className="mt-1 block text-[11px] text-[#7D715E]">{statusText(item)}</small></span><strong className="shrink-0 tabular-nums text-[#90682F]">{item.rate != null ? `${item.rate}%` : '—'}</strong>
      </button>)}</div>
    </div>, document.body)}
  </>;
}
