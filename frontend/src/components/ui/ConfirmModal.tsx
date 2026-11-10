import { useDialogFocus } from '../../hooks/useDialogFocus';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'brand';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  const { dialogId, dialog } = useDialogFocus(isOpen, () => { if (!isLoading) onClose(); });

  if (!isOpen) return null;

  return (
    <div
      ref={dialog}
      tabIndex={-1}
      aria-labelledby={`${dialogId}-title`}
      aria-describedby={`${dialogId}-description`}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-[#231D15]/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full min-w-0 max-w-md max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl bg-white border border-[#EEDFC6] shadow-xl p-4 sm:p-6 transition-all transform scale-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs border ${
              variant === 'danger'
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : variant === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-600'
                : 'bg-[#FBF5EB] border-[#EEDFC6] text-[#B88E4F]'
            }`}
          >
            {variant === 'danger' ? (
              <Trash2 className="w-5 h-5 text-rose-600" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 id={`${dialogId}-title`} className="text-base font-extrabold text-[#1A1612] m-0 leading-snug">
              {title}
            </h3>
            <p id={`${dialogId}-description`} className="mt-1.5 text-xs sm:text-[13px] text-[#7D715E] leading-relaxed m-0">
              {message}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex size-11 items-center justify-center rounded-lg text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F] transition cursor-pointer shrink-0"
            aria-label="Đóng"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-2.5 border-t border-[#EAE4D7] pt-3.5 min-[390px]:flex-row min-[390px]:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="min-h-11 px-4 py-2 rounded-xl border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] text-xs font-bold text-[#7D715E] hover:text-[#1A1612] transition shadow-2xs cursor-pointer select-none disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`min-h-11 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : variant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-[#C59B58] hover:bg-[#B88E4F]'
            }`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
export default ConfirmModal;
