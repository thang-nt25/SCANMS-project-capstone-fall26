import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, MoreHorizontal, PauseCircle, PlayCircle, QrCode, Trash2, TrendingUp, Video } from 'lucide-react';
import type { ReferralLinkItem } from '../../services/referral-links.service';

interface ReferralLinkActionsProps {
  link: ReferralLinkItem;
  onQr: () => void;
  onAnalytics: () => void;
  onVideo: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

export function ReferralLinkActions({ link, onQr, onAnalytics, onVideo, onToggle, onDelete }: ReferralLinkActionsProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = `link-actions-${link.id}`;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;
    const anchor = triggerRef.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();
    setPosition({
      top: Math.max(8, anchor.bottom + menu.height + 8 > window.innerHeight
        ? anchor.top - menu.height - 6 : anchor.bottom + 6),
      left: Math.max(8, Math.min(anchor.right - menu.width, window.innerWidth - menu.width - 8)),
    });
    menuRef.current.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dismiss = () => setOpen(false);
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) dismiss();
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
        triggerRef.current?.focus({ preventScroll: true });
      } else if (event.key === 'Tab') {
        // Continue the tab order from the trigger when leaving the portaled menu.
        triggerRef.current?.focus({ preventScroll: true });
        dismiss();
      } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
          : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next]?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keyboard);
    window.addEventListener('resize', dismiss);
    document.addEventListener('scroll', dismiss, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', keyboard);
      window.removeEventListener('resize', dismiss);
      document.removeEventListener('scroll', dismiss, true);
    };
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
    action();
  };

  return (
    <div className="kol-link-row-actions">
      <a href={`/r/${link.shortCode}`} target="_blank" rel="noreferrer" title="Mở thử link" aria-label={`Mở link ${link.shortCode}`}>
        <ExternalLink />
      </a>
      <button type="button" onClick={onQr} title="Xem mã QR" aria-label={`Mã QR của ${link.shortCode}`}><QrCode /></button>
      <button type="button" onClick={onAnalytics} title="Thống kê chi tiết" aria-label={`Thống kê ${link.shortCode}`}><TrendingUp /></button>
      <button type="button" ref={triggerRef} onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} aria-label={`Thêm thao tác cho ${link.shortCode}`} title="Thêm thao tác"><MoreHorizontal /></button>
      {open && createPortal(
        <div ref={menuRef} id={menuId} role="menu" aria-label={`Thao tác cho ${link.shortCode}`} className="kol-link-more-menu" style={position}>
          <button role="menuitem" type="button" onClick={() => run(onVideo)}><Video /><span>Nộp video review</span></button>
          <button role="menuitem" type="button" disabled={link.status === 'BLOCKED'} onClick={() => run(onToggle)}>
            {link.status === 'ACTIVE' ? <PauseCircle /> : <PlayCircle />}<span>{link.status === 'ACTIVE' ? 'Tạm ngừng liên kết' : 'Kích hoạt liên kết'}</span>
          </button>
          <button role="menuitem" type="button" className="kol-link-more-delete" onClick={() => run(onDelete)}><Trash2 /><span>Xóa liên kết</span></button>
        </div>, document.body,
      )}
    </div>
  );
}
