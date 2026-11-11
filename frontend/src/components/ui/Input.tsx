import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, clearable, onClear, value, ...props }, ref) => {
    return (
      <div
        className={cn(
          'relative flex min-h-11 min-w-0 items-center rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] px-3.5 text-sm text-[#1A1612] transition-all focus-within:border-[#C59B58] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#C59B58]/20',
          className
        )}
      >
        {icon && <span className="mr-2.5 flex shrink-0 items-center text-base text-[#7D715E]">{icon}</span>}
        <input
          ref={ref}
          value={value}
          className="min-w-0 flex-1 border-none bg-transparent p-0 text-base font-normal text-[#1A1612] outline-none placeholder:text-[#7D715E] sm:text-sm"
          {...props}
        />
        {clearable && value && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Xóa nội dung"
            className="-mr-2 ml-1 flex size-11 shrink-0 items-center justify-center rounded-lg text-[#7D715E] hover:bg-[#FBF5EB] hover:text-[#1A1612] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
