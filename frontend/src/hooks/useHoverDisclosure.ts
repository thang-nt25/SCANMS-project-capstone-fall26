import { useEffect, useRef, type Dispatch, type PointerEvent, type SetStateAction } from 'react';

/** Keep a dropdown open while the pointer crosses the gap between trigger and panel. */
export function useHoverDisclosure(open: boolean, setOpen: Dispatch<SetStateAction<boolean>>) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedByHover = useRef(false);
  const cancelClose = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const closeSoon = () => {
    cancelClose();
    timer.current = setTimeout(() => { openedByHover.current = false; setOpen(false); }, 180);
  };
  const enterTrigger = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    cancelClose();
    if (!open) { openedByHover.current = true; setOpen(true); }
  };
  const toggle = () => {
    cancelClose();
    // A mouse click follows pointerenter: keep the just-opened dropdown visible.
    if (openedByHover.current) { openedByHover.current = false; setOpen(true); }
    else setOpen(value => !value);
  };
  useEffect(() => {
    if (!open) { cancelClose(); openedByHover.current = false; }
  }, [open]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { enterTrigger, cancelClose, closeSoon, toggle, openedByHover };
}
