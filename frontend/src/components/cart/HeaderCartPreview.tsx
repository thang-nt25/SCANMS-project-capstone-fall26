import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatMoney, getSafeProductImageUrl } from '@/utils/marketplace.utils';
import './HeaderCartPreview.css';

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
    <button ref={trigger} type="button" className="public-commerce-header__cart" aria-label="Giỏ hàng"
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
      <ShoppingCart size={24} aria-hidden="true" />
      {count > 0 && <span className="header-cart-count">{count > 99 ? '99+' : count}</span>}
    </button>
    {open && createPortal(
      <div ref={panel} id={id} role="dialog" aria-label="Xem nhanh giỏ hàng" className="header-cart-preview"
        style={{ top: position.top, right: position.right, maxHeight: position.maxHeight }}
        onPointerEnter={cancelClose} onPointerLeave={closeSoon} onFocusCapture={cancelClose} onBlurCapture={closeSoon}>
        <h2>Sản phẩm trong giỏ hàng</h2>
        {cart.length ? <div className="header-cart-preview__list" tabIndex={0} role="region" aria-label="Danh sách sản phẩm trong giỏ hàng">
          {[...cart].reverse().map(item => (
            <Link key={item.cartItemId} to={`/products/${encodeURIComponent(item.productId)}`} className="header-cart-preview__product" onClick={hide}>
              <img src={getSafeProductImageUrl(item.imageUrl, item.title)} alt="" onError={event => {
                if (!event.currentTarget.dataset.fallback) {
                  event.currentTarget.dataset.fallback = 'true';
                  event.currentTarget.src = getSafeProductImageUrl(null, item.title);
                }
              }} />
              <span className="header-cart-preview__details">
                <strong>{item.title}</strong>
                <small>{[item.variantName, `SL: ${item.quantity}`].filter(Boolean).join(' · ')}</small>
                {(!item.isActive || item.stockQuantity <= 0) && <small className="header-cart-preview__unavailable">{!item.isActive ? 'Ngừng bán' : 'Hết hàng'}</small>}
              </span>
              <span className="header-cart-preview__price">{formatMoney(item.price)}</span>
            </Link>
          ))}
        </div> : <div className="header-cart-preview__empty"><ShoppingBag size={32} aria-hidden="true" /><p>Giỏ hàng của bạn đang trống</p></div>}
        <footer><Link to="/cart" onClick={hide}>Xem giỏ hàng</Link></footer>
      </div>, document.body)}
  </>;
}
