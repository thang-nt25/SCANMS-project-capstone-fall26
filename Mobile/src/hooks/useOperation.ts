import { useRef, useState } from "react";
/** Synchronous lock closes the gap before React renders a disabled button. */
export function useOperation() {
  const lock = useRef(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const run = async (
    action: () => Promise<unknown>,
    after?: () => void | Promise<unknown>,
  ) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      await after?.();
    } catch (caught) {
      setError(caught);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return { busy, error, run, clearError: () => setError(null) };
}
