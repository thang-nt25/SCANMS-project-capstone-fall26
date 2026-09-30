import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, children, ...props }, ref) => {
    return (
      <div className="relative inline-flex items-center">
        <select
          ref={ref}
          style={{ colorScheme: 'light' }}
          className={cn(
            'custom-select-trigger appearance-none px-3.5 py-2 pr-9 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-xs sm:text-sm text-[#1A1612] font-medium hover:bg-white focus:bg-white focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 outline-none transition cursor-pointer',
            className
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ colorScheme: 'light', backgroundColor: '#FFFFFF', color: '#1A1612' }}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown className="w-4 h-4 absolute right-3 text-[#7D715E] pointer-events-none" />
      </div>
    );
  }
);
Select.displayName = 'Select';
