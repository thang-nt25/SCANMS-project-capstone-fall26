import { Toaster as SonnerToaster } from 'sonner';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

export interface ToasterProps {
  position?: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';
}

export function Toaster({ position = 'top-right' }: ToasterProps) {
  return (
    <SonnerToaster
      position={position}
      duration={2600}
      visibleToasts={3}
      closeButton={false}
      offset={20}
      gap={8}
      icons={{
        success: (
          <div className="w-6 h-6 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
          </div>
        ),
        error: (
          <div className="w-6 h-6 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" />
          </div>
        ),
        warning: (
          <div className="w-6 h-6 rounded-full bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
          </div>
        ),
        info: (
          <div className="w-6 h-6 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center shrink-0">
            <Info className="w-3.5 h-3.5 text-[#B88E4F]" />
          </div>
        ),
        loading: (
          <div className="w-6 h-6 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] flex items-center justify-center shrink-0">
            <Loader2 className="w-3.5 h-3.5 text-[#C59B58] animate-spin" />
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
