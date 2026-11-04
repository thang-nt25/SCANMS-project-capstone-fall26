import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ShoppingCart, ChevronRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatMoney, getSafeProductImageUrl } from '@/utils/marketplace.utils';

export function HeaderCartPreview({ count, onOpenCart }: { count: number; onOpenCart: () => void }) {
  const { cart, isCartOpen, isCheckoutOpen } = useCart();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 12, maxHeight: 360 });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoringFocus = useRef(false);
  const id = useId();
  const location = useLocation();
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      if (!panel.current?.contains(document.activeElement) && document.activeElement !== trigger.current) setOpen(false);
    }, 150);
  };
  const show = () => { cancelClose(); if (!isCartOpen && !isCheckoutOpen) setOpen(true); };
  const hide = () => { cancelClose(); setOpen(false); };
  useEffect(() => { setOpen(false); }, [location.key, isCartOpen, isCheckoutOpen]);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  useLayoutEffect(() => {
    if (!open) return;
    const positionPanel = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const top = rect.bottom + 8;
      setPosition({ top, right: Math.max(12, window.innerWidth - rect.right), maxHeight: Math.max(120, Math.min(420, window.innerHeight - top - 12)) });
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        restoringFocus.current = true;
        setOpen(false);
        trigger.current?.focus();
        restoringFocus.current = false;
      }
    };
    const outside = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false);
    };
    positionPanel();
    window.addEventListener('resize', positionPanel);
    window.addEventListener('scroll', positionPanel, true);
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    return () => {
      window.removeEventListener('resize', positionPanel);
      window.removeEventListener('scroll', positionPanel, true);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);

  return <>
    <button ref={trigger} type="button" className="bg-[#f5e8d5] hover:bg-[#eedfc6] border border-[#e9d5b6] hover:border-[#b8862f] rounded-full py-3 px-5.5 text-[#302317] cursor-pointer inline-flex items-center justify-center gap-2 font-bold text-[13.5px] transition-all duration-200 shadow-[0_2px_6px_rgba(82,53,20,0.04)] hover:-translate-y-px" aria-label="Giỏ hàng"
      aria-expanded={open} aria-controls={open ? id : undefined} aria-haspopup="dialog"
      onPointerEnter={event => { if (event.pointerType === 'mouse') show(); }}
      onPointerLeave={closeSoon}
      onFocus={() => { if (!restoringFocus.current) show(); }}
      onBlur={closeSoon}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); hide(); }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          show();
          requestAnimationFrame(() => panel.current?.querySelector<HTMLAnchorElement>('a')?.focus());
        }
      }}
      onClick={() => { hide(); onOpenCart(); }}>
      <span className="relative inline-flex items-center justify-center">
        <ShoppingCart size={19} aria-hidden="true" className="text-[#1A1612]" />
        {count > 0 && <span className="absolute -top-1.5 -right-2 grid min-w-[18px] h-[18px] place-items-center px-1 border-[1.5px] border-white rounded-full bg-[#C59B58] text-white text-[10px] font-bold shadow-[0_1px_3px_rgba(0,0,0,0.18)]">{count > 99 ? '99+' : count}</span>}
      </span>
      <span className="hidden sm:inline text-xs font-bold text-[#1A1612]">Giỏ hàng</span>
      <ChevronRight size={14} className="text-[#7D715E] hidden sm:inline" />
    </button>
    {open && createPortal(
      <div ref={panel} id={id} role="dialog" aria-label="Xem nhanh giỏ hàng"
        className="fixed z-[100] flex w-[min(430px,calc(100vw-24px))] flex-col border border-[#eae4d7] rounded-[10px] bg-white text-[#1a1612] shadow-[0_10px_32px_rgba(35,29,21,0.14)] text-left before:absolute before:-top-2 before:right-0 before:left-0 before:h-2 before:content-['']"
        style={{ top: position.top, right: position.right, maxHeight: position.maxHeight }}
        onPointerEnter={cancelClose} onPointerLeave={closeSoon} onFocusCapture={cancelClose} onBlurCapture={closeSoon}>
        <h2 className="shrink-0 m-0 px-4 pt-3.5 pb-2.5 text-[#7d715e] text-xs font-medium">Sản phẩm trong giỏ hàng</h2>
        {cart.length ? (
          <div className="min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#d9c5a3_#faf8f5]" tabIndex={0} role="region" aria-label="Danh sách sản phẩm trong giỏ hàng">
            {[...cart].reverse().map(item => (
              <Link key={item.cartItemId} to={`/products/${encodeURIComponent(item.productId)}`} className="flex min-w-0 items-center gap-3 py-2.5 px-4 text-[#1a1612] no-underline hover:bg-[#faf8f5] focus-visible:outline-2 focus-visible:outline-[#b88e4f] focus-visible:-outline-offset-2" onClick={hide}>
                <img src={getSafeProductImageUrl(item.imageUrl, item.title)} alt="" className="shrink-0 w-12 h-12 border border-[#eae4d7] rounded-[5px] object-contain" onError={event => {
                  if (!event.currentTarget.dataset.fallback) {
                    event.currentTarget.dataset.fallback = 'true';
                    event.currentTarget.src = getSafeProductImageUrl(null, item.title);
                  }
                }} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <strong className="overflow-hidden text-xs font-medium text-ellipsis whitespace-nowrap text-[#1a1612]">{item.title}</strong>
                  <small className="text-[#7d715e] text-[10px] [overflow-wrap:anywhere]">{[item.variantName, `SL: ${item.quantity}`].filter(Boolean).join(' · ')}</small>
                  {(!item.isActive || item.stockQuantity <= 0) && <small className="text-[#dc2626] text-[10px]">{!item.isActive ? 'Ngừng bán' : 'Hết hàng'}</small>}
                </span>
                <span className="shrink-0 text-[#9b6f32] text-xs font-semibold whitespace-nowrap">{formatMoney(item.price)}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-6 px-4 text-[#7d715e] text-center">
            <ShoppingBag size={32} aria-hidden="true" className="mx-auto text-[#b88e4f]" />
            <p className="mt-3 text-xs">Giỏ hàng của bạn đang trống</p>
          </div>
        )}
        <footer className="flex shrink-0 items-center justify-end gap-3 py-3 px-4 border-t border-[#eae4d7]">
          <Link to="/cart" onClick={hide} className="inline-flex min-h-[36px] items-center py-2 px-3.5 border border-[#eedfc6] rounded-[6px] bg-[#fbf5eb] text-[#231d15] text-xs font-semibold no-underline hover:bg-[#f3efe6] focus-visible:outline-2 focus-visible:outline-[#b88e4f]">
            Xem giỏ hàng
          </Link>
        </footer>
      </div>, document.body)}
  </>;
}
