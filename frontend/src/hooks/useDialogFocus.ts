import { useEffect, useId, useRef } from 'react';
const dialogs: string[] = [];
let previousOverflow = '';

export function useDialogFocus(open: boolean, onClose: () => void) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!dialogs.length) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    dialogs.push(id);
    ref.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (dialogs.at(-1) !== id) return;
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const elements = [...(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]):not([type="hidden"]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]') ?? [])]
        .filter(element => element.getClientRects().length && element.getAttribute('aria-hidden') !== 'true');
      const first = elements[0], last = elements.at(-1);
      if (!first) { event.preventDefault(); return; }
      const outside = !ref.current?.contains(document.activeElement) || document.activeElement === ref.current;
      if (event.shiftKey && (outside || document.activeElement === first)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (outside || document.activeElement === last)) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('keydown', keydown);
      const index = dialogs.indexOf(id);
      if (index >= 0) dialogs.splice(index, 1);
      if (!dialogs.length) document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open, id]);
  return { dialogId: id, dialog: ref };
}
