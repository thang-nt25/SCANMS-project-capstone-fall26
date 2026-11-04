import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Product } from '@/types/marketplace.types';
import { HOME_CATEGORY_GROUPS } from '@/utils/marketplace-category.utils';
import './CategoryQuickNav.css';

interface CategoryQuickNavProps {
  products: Product[];
  loading?: boolean;
}

export function CategoryQuickNav({ products: _products, loading = false }: CategoryQuickNavProps) {
  const categories = HOME_CATEGORY_GROUPS;

  return (
    <section aria-labelledby="category-quick-nav-title" className="category-quick-nav">
      <div className="category-quick-nav__container">
        <div className="category-quick-nav__panel">
          <div className="category-quick-nav__heading">
            <h2 id="category-quick-nav-title">Danh mục ngành hàng</h2>
            <Link to="/search" className="category-quick-nav__all">
              Tất cả sản phẩm
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <nav aria-label="Ngành hàng mua sắm" className="category-quick-nav__categories" aria-busy={loading}>
            {loading
              ? HOME_CATEGORY_GROUPS.map((group) => (
                <div key={group.id} className="category-quick-nav__category category-quick-nav__skeleton" aria-hidden="true">
                  <span className="category-quick-nav__image" />
                  <span className="category-quick-nav__skeleton-name" />
                </div>
              ))
              : categories.map((category) => (
                <Link key={category.id} to={`/search?categoryGroup=${category.id}`} className="category-quick-nav__category">
                  <span className="category-quick-nav__image">
                    <img src={`/assets/categories/${category.id}-v1.png`} alt="" loading="lazy" decoding="async" width={74} height={74} onError={(e) => { e.currentTarget.src = '/assets/categories/skin-v1.png'; }} />
                  </span>
                  <span className="category-quick-nav__name">{category.label}</span>
                </Link>
              ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
