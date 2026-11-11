import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'amber' | 'gold' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex min-h-11 min-w-0 max-w-full items-center justify-center rounded-xl font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none focus:outline-none focus:ring-2 focus:ring-offset-1 sm:min-h-0';

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-base gap-2.5',
    };

    const variantStyles = {
      primary:
        'scanms-brand-action bg-[#C59B58] text-white hover:bg-[#B88E4F] border border-[#B88E4F] shadow-xs hover:shadow-sm active:scale-[0.98] focus:ring-[#C59B58]',
      gold:
        'scanms-brand-action bg-gradient-to-r from-[#C59B58] to-[#B88E4F] text-white hover:from-[#B88E4F] hover:to-[#A87D38] border border-[#B88E4F] shadow-xs active:scale-[0.98] focus:ring-[#B88E4F]',
      secondary:
        'bg-[#F3EFE6] text-[#1A1612] hover:bg-[#EAE4D7] border border-[#EAE4D7] active:scale-[0.98] focus:ring-[#B88E4F]',
      outline:
        'bg-white text-[#1A1612] hover:bg-[#FAF8F5] hover:border-[#C59B58] border border-[#EAE4D7] shadow-xs active:scale-[0.98] focus:ring-[#B88E4F]',
      ghost:
        'bg-transparent text-[#7D715E] hover:bg-[#F3EFE6] hover:text-[#1A1612] active:scale-[0.98] focus:ring-[#EAE4D7]',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 shadow-xs active:scale-[0.98] focus:ring-rose-500',
      amber:
        'bg-[#FBF5EB] text-[#8C6226] hover:bg-[#F3EFE6] border border-[#EEDFC6] active:scale-[0.98] focus:ring-[#C59B58]',
      dark:
        'bg-[#231D15] text-[#FAF8F5] hover:bg-[#342B20] border border-[#231D15] shadow-xs active:scale-[0.98] focus:ring-[#C59B58]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {!loading && icon && iconPosition === 'left' && icon}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </button>
    );
  }
);

Button.displayName = 'Button';
