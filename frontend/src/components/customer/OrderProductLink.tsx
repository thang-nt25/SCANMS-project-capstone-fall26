import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function OrderProductLink({ productId, title, children, className = '', onNavigate }: {
  productId?: string; title?: string; children: ReactNode; className?: string; onNavigate?: () => void;
}) {
  if (!productId) return <span className={className}>{children}</span>;
  return <Link to={`/products/${encodeURIComponent(productId)}`}
    data-order-product-link aria-label={`Xem sản phẩm ${title || 'trong đơn hàng'}`}
    className={`${className} no-underline hover:text-[#B88E4F] focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-2`}
    onClick={event => {
      event.stopPropagation();
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
        onNavigate?.();
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }}>{children}</Link>;
}
