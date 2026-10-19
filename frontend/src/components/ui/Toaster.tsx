import { useLocation } from 'react-router-dom';
import { Toaster as SonnerToaster } from 'sonner';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

export interface ToasterProps {
  position?: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';
}

function useIsLiveRoom() {
  try {
    const location = useLocation();
    return location.pathname.startsWith('/live');
  } catch {
    return typeof window !== 'undefined' && window.location.pathname.startsWith('/live');
  }
}

export function Toaster({ position }: ToasterProps) {
  const isLive = useIsLiveRoom();

  const effectivePosition = position || 'top-center';
  const effectiveOffset = isLive ? 66 : 'calc(var(--workspace-header-height, 64px) + 12px)';

  return (
    <SonnerToaster
      position={effectivePosition}
      duration={4000}
      visibleToasts={2}
      closeButton
      offset={effectiveOffset}
      mobileOffset={{ top: effectiveOffset, left: 12, right: 12 }}
      gap={8}
      containerAriaLabel="Thông báo"
      icons={{
        success: (
          <div className="scanms-toast-icon scanms-toast-icon--success">
            <CheckCircle2 size={19} strokeWidth={1.8} />
          </div>
        ),
        error: (
          <div className="scanms-toast-icon scanms-toast-icon--error">
            <AlertCircle size={19} strokeWidth={1.8} />
          </div>
        ),
        warning: (
          <div className="scanms-toast-icon">
            <AlertTriangle size={19} strokeWidth={1.8} />
          </div>
        ),
        info: (
          <div className="scanms-toast-icon">
            <Info size={19} strokeWidth={1.8} />
          </div>
        ),
        loading: (
          <div className="scanms-toast-icon">
            <Loader2 size={19} strokeWidth={1.8} className="animate-spin" />
          </div>
        ),
      }}
      toastOptions={{
        unstyled: false,
      }}
    />
  );
}

export default Toaster;
