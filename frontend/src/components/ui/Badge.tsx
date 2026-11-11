import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'amber';
  size?: 'sm' | 'md';
  dot?: boolean;
  dotPulse?: boolean;
}

export function Badge({
  className,
  variant = 'neutral',
  size = 'md',
  dot = false,
  dotPulse = false,
  children,
  ...props
}: BadgeProps) {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs font-semibold gap-1',
    md: 'px-2.5 py-1 text-xs font-semibold gap-1.5',
  };

  const variantStyles = {
    neutral: 'bg-[#F3EFE6] text-[#5F5547] border border-[#EAE4D7]',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/60',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    info: 'bg-[#F0EBE1] text-[#6B5A43] border border-[#E0D5C3]',
    amber: 'bg-[#FBF5EB] text-[#8C6226] border border-[#EEDFC6]',
  };

  const dotColors = {
    neutral: 'bg-[#9B8B72]',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-[#8C6226]',
    amber: 'bg-[#C59B58]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full transition-colors whitespace-nowrap',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            dotColors[variant],
            dotPulse && 'animate-pulse'
          )}
        />
      )}
      {children}
    </span>
  );
}
