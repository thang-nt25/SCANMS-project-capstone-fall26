import { type ReactNode } from 'react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';


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
  const { dialogId, dialog } = useDialogFocus(isOpen, onClose);

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
      className="fixed inset-0 bg-[#231D15]/40 backdrop-blur-xs flex items-center justify-center overflow-y-auto p-3 sm:p-4 z-50 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `${dialogId}-title` : undefined}
        tabIndex={-1}
        className={cn(
          'min-w-0 bg-white rounded-2xl w-full shadow-2xl border border-[#EAE4D7] flex flex-col text-left transition-all outline-none',
          stickyHeader ? 'max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-32px)] overflow-hidden' : 'max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-32px)] overflow-y-auto p-4 sm:p-7 gap-4',
          maxWidthStyles[maxWidth],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || icon) && (
          <div className={cn(
            'modal-header',
            'flex min-w-0 shrink-0 justify-between items-center gap-3 border-b border-[#EAE4D7]',
            stickyHeader ? 'bg-white px-4 py-4 sm:px-7 sm:py-5' : 'pb-2'
          )}>
            <div className="flex min-w-0 items-center gap-2.5">
              {icon && (
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-lg shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && <h3 id={`${dialogId}-title`} className="m-0 break-words text-lg font-bold text-[#1A1612]">{title}</h3>}
                {subtitle && <p className="m-0 mt-0.5 break-words text-xs text-[#7D715E]">{subtitle}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cửa sổ"
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-[#7D715E] hover:bg-[#FBF5EB] hover:text-[#1A1612] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {belowHeader}
        {stickyHeader ? (
          <div className="modal-scroll-body min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-7">
            {children}
          </div>
        ) : children}
        {footer && <div className="modal-footer min-w-0 shrink-0 border-t border-[#EAE4D7] px-4 py-3 sm:px-7">{footer}</div>}
      </div>
    </div>
  );
}
