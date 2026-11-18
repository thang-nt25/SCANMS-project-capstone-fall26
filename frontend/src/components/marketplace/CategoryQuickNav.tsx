import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Product } from '@/types/marketplace.types';
import { HOME_CATEGORY_GROUPS } from '@/utils/marketplace-category.utils';

interface CategoryQuickNavProps {
  products: Product[];
  loading?: boolean;
}

export function CategoryQuickNav({ products: _products, loading = false }: CategoryQuickNavProps) {
  const categories = HOME_CATEGORY_GROUPS;

  return (
    <section aria-labelledby="category-quick-nav-title" className="p-0 bg-transparent">
      <div className="mx-auto my-4 w-full max-w-[1248px] px-3 sm:px-4 lg:my-6 lg:px-6">
        <div className="bg-[#fffdf9] border border-[#eadbc5] rounded-[18px] p-3 sm:p-4 shadow-[0_8px_24px_rgba(82,53,20,0.08)] overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
            <h2 id="category-quick-nav-title" className="text-base sm:text-lg font-extrabold text-[#302317] m-0 border-l-4 border-[#b8862f] pl-3 uppercase tracking-[0.04em]">
              Danh mục ngành hàng
            </h2>
            <Link to="/search" className="inline-flex shrink-0 items-center gap-1.5 text-[#897761] text-xs sm:text-sm font-semibold no-underline transition-colors hover:text-[#b8862f]">
              Tất cả sản phẩm
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <nav aria-label="Ngành hàng mua sắm" className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-busy={loading}>
            {loading
              ? HOME_CATEGORY_GROUPS.map((group) => (
                <div key={group.id} className="group flex flex-col items-center justify-center gap-2 py-3 px-3 no-underline rounded-[14px] bg-[#fffaf3] border border-[#eadbc5] animate-pulse" aria-hidden="true">
                  <span className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border border-[#eadbc5] p-2" />
                  <span className="h-4 w-20 bg-[#eadbc5]/50 rounded" />
                </div>
              ))
              : categories.map((category) => (
                <Link key={category.id} to={`/search?categoryGroup=${category.id}`} className="group flex flex-col items-center justify-center gap-2 py-3 px-3 no-underline rounded-[14px] bg-[#fffaf3] border border-[#eadbc5] transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:border-[#b8862f] hover:shadow-[0_6px_16px_rgba(82,53,20,0.08)]">
                  <span className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border border-[#eadbc5] p-2">
                    <img src={`/assets/categories/${category.id}-v1.png`} alt="" loading="lazy" decoding="async" width={74} height={74} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.src = '/assets/categories/skin-v1.png'; }} />
                  </span>
                  <span className="text-center text-[14px] font-bold text-[#302317] transition-colors group-hover:text-[#b8862f]">{category.label}</span>
                </Link>
              ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
