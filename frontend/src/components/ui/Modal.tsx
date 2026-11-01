import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

const openModalIds: string[] = [];

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  belowHeader?: ReactNode;
  footer?: ReactNode;
  className?: string;
  stickyHeader?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  belowHeader,
  footer,
  className,
  stickyHeader = false,
  maxWidth = 'md',
}: ModalProps) {
  const dialogId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    openModalIds.push(dialogId);
    dialog.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (openModalIds.at(-1) !== dialogId) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
      }
      if (e.key === 'Tab') {
        const focusable = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]') || [])].filter(element => element.getClientRects().length);
        const first = focusable[0], last = focusable.at(-1);
        if (!first) { e.preventDefault(); return; }
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      const index = openModalIds.indexOf(dialogId);
      if (index >= 0) openModalIds.splice(index, 1);
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen, dialogId]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-[96vw] w-[96vw]',
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `${dialogId}-title` : undefined}
        tabIndex={-1}
        className={cn(
          'bg-white rounded-2xl w-full shadow-2xl border border-[#EAE4D7] flex flex-col text-left transition-all outline-none',
          stickyHeader ? 'max-h-[90dvh] overflow-hidden' : 'max-h-[90dvh] overflow-y-auto p-6 sm:p-7 gap-4',
          maxWidthStyles[maxWidth],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || icon) && (
          <div className={cn(
            'modal-header',
            'flex shrink-0 justify-between items-center gap-3 border-b border-slate-100',
            stickyHeader ? 'bg-white px-6 py-4 sm:px-7 sm:py-5' : 'pb-2'
          )}>
            <div className="flex min-w-0 items-center gap-2.5">
              {icon && (
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-lg shrink-0">
                  {icon}
                </div>
              )}
              <div>
                {title && <h3 id={`${dialogId}-title`} className="text-lg font-bold text-[#1A1612] m-0">{title}</h3>}
                {subtitle && <p className="text-xs text-slate-500 mt-0.5 m-0">{subtitle}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cửa sổ"
              className="shrink-0 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {belowHeader}
        {stickyHeader ? (
          <div className="modal-scroll-body min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 sm:p-7">
            {children}
          </div>
        ) : children}
        {footer && <div className="modal-footer shrink-0 border-t border-[#EAE4D7] px-6 py-3 sm:px-7">{footer}</div>}
      </div>
    </div>
  );
}
