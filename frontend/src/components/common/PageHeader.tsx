import React from 'react';
import { cn } from '../../utils/cn';

interface PageHeaderProps {
  /** Main page title */
  title: string;
  /** Smaller sub-description below the title */
  description?: string;
  /** Optional badge text (e.g. "Beta", "New", "Live") */
  badge?: string;
  /** Badge colour variant */
  badgeVariant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  /** Right-side action slot (buttons, selects, etc.) */
  actions?: React.ReactNode;
  /** Extra className on the wrapper */
  className?: string;
  /** Icon rendered to the left of the title */
  icon?: React.ReactNode;
}

const BADGE_CLASSES: Record<string, string> = {
  brand:   'bg-[#FBF5EB] text-[#B88E4F] border-[#EEDFC6]',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger:  'bg-rose-50 text-rose-700 border-rose-200',
  neutral: 'bg-[#FAF8F5] text-[#7D715E] border-[#EAE4D7]',
};

/**
 * PageHeader — renders a consistent page-level title block with optional
 * icon, badge, description, and action slot.
 *
 * Usage:
 * ```tsx
 * <PageHeader
 *   title="Quản lý Đơn hàng"
 *   description="Xem và xử lý đơn hàng từ khách hàng"
 *   badge="Thời gian thực"
 *   actions={<Button>Tạo mới</Button>}
 * />
 * ```
 */
export function PageHeader({
  title,
  description,
  badge,
  badgeVariant = 'brand',
  actions,
  className,
  icon,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#EAE4D7] mb-1',
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="mt-0.5 w-9 h-9 rounded-xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] flex items-center justify-center shrink-0 shadow-2xs">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-extrabold text-[#1A1612] tracking-tight leading-snug m-0">
              {title}
            </h1>
            {badge && (
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wide',
                  BADGE_CLASSES[badgeVariant]
                )}
              >
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-[#7D715E] mt-0.5 m-0 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
