import { useEffect, useRef, type RefObject } from 'react';

export function useChatDialog(ref: RefObject<HTMLElement | null>, onClose: () => void, locked = false) {
  const state = useRef({ onClose, locked });
  state.current = { onClose, locked };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = () => [...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, a[href], [tabindex="0"]') || [])]
      .filter(element => element.getClientRects().length > 0);
    (ref.current?.querySelector<HTMLElement>('[autofocus], input, textarea') || controls()[0])?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); if (!state.current.locked) state.current.onClose(); }
      if (event.key !== 'Tab') return;
      const elements = controls();
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [ref]);
}
