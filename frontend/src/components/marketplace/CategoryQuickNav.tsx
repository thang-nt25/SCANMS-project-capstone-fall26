import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronRight, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import type { Product } from '@/types/marketplace.types';
import { getHomeCategoryGroup, type CatalogCategory } from '@/utils/marketplace-category.utils';

interface CategoryLink {
  label: string;
  href: string;
  image?: string;
  count?: number;
}

function getCategoryLinks(categories: CatalogCategory[], showCounts: boolean) {
  const links = new Map<string, CategoryLink>();

  for (const category of categories) {
    if (!category.name.trim() || category.count <= 0) continue;
    const group = getHomeCategoryGroup(category.name);
    const query = new URLSearchParams(group ? { categoryGroup: group.id } : { category: category.name });
    const href = `/search?${query}`;
    const currentCount = links.get(href)?.count ?? 0;
    links.set(href, {
      label: group?.label ?? category.name,
      image: group?.image,
      href,
      count: showCounts ? currentCount + category.count : undefined,
    });
  }

  return [...links.values()].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
}

export function CategoryQuickNav({ products }: { products: Product[] }) {
  const { data, isPending } = useQuery<CatalogCategory[]>({
    queryKey: ['marketplace-category-counts'],
    queryFn: async ({ signal }) => {
      const response = await api.get('/public/products/categories', { signal });
      const payload = response.data?.data ?? response.data;
      if (!Array.isArray(payload)) throw new Error('Invalid marketplace categories');
      return payload;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const categories = data ?? products.map((product) => ({ name: product.category, count: 1 }));
  const links = getCategoryLinks(categories, data !== undefined);

  return (
    <section aria-labelledby="category-quick-nav-title" className="category-quick-nav mx-auto my-4 w-full max-w-[1248px] px-3 sm:px-4 lg:my-6 lg:px-6">
      <div className="category-quick-nav__panel rounded-2xl border border-line bg-white px-3 py-3 sm:px-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 id="category-quick-nav-title" className="m-0 text-base font-bold text-ink sm:text-lg">
            Ngành hàng
          </h2>
          <Link to="/search" className="category-quick-nav__all inline-flex min-h-8 items-center gap-1.5 rounded-md px-1.5 text-xs font-semibold text-[#715126] no-underline hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand-strong sm:text-sm">
            Tất cả sản phẩm
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <nav aria-label="Ngành hàng mua sắm" aria-busy={isPending} className="category-quick-nav__categories grid auto-rows-fr grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
          {isPending && links.length === 0 && [0, 1, 2, 3].map((index) => (
            <div key={index} className="h-[72px] animate-pulse rounded-xl bg-canvas motion-reduce:animate-none" aria-hidden="true" />
          ))}
          {links.map(({ href, label, image, count }) => (
            <Link key={href} to={href} className="category-quick-nav__category group flex min-h-[72px] min-w-0 items-center gap-2 rounded-xl border border-line bg-white px-2 py-2 text-ink no-underline transition-colors hover:border-brand-strong hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong sm:gap-3 sm:px-3">
              <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white text-brand-strong sm:size-12">
                {image ? <img src={image} alt="" width={48} height={48} loading="lazy" decoding="async" className="size-full object-contain p-0.5" /> : <Package size={20} aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs leading-4 font-semibold sm:text-sm sm:leading-5">{label}</span>
                {count !== undefined && <span className="mt-0.5 block text-[11px] leading-4 text-muted tabular-nums">{count} sản phẩm</span>}
              </span>
              <ChevronRight size={15} className="hidden shrink-0 text-brand-strong sm:block" aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
