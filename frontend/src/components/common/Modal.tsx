import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps { title: string; children: ReactNode; onClose: () => void }
export default function Modal({ title, children, onClose }: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);
  return createPortal(
    <dialog ref={dialog} className="react-modal" aria-labelledby="dialog-heading"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) {
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
      } }}>
      <header><h2 id="dialog-heading">{title}</h2><button type="button" onClick={onClose} aria-label="Đóng">×</button></header>
      {children}
    </dialog>, document.body,
  );
}
