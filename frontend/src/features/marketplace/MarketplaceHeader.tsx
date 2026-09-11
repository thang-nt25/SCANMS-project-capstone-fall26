import { Link } from 'react-router-dom';
import type { Category } from './marketplace.types';
const categories: { id: Category; label: string; icon: string }[] = [
  { id: 'all', label: 'Tất cả sản phẩm', icon: 'ph-squares-four' },
  { id: 'skincare', label: 'Chăm sóc da & Mỹ phẩm', icon: 'ph-sparkle' },
  { id: 'home', label: 'Gia dụng & Đời sống', icon: 'ph-house-line' },
  { id: 'tech', label: 'Công nghệ & Phụ kiện', icon: 'ph-cpu' },
];
interface HeaderProps { query: string; category: Category; count: number; cartCount: number;
  onQuery: (value: string) => void; onCategory: (value: Category) => void; onCart: () => void }
export default function MarketplaceHeader({ query, category, count, cartCount, onQuery, onCategory, onCart }: HeaderProps) {
  return <header className="mp-header">
    <div className="mp-header-main"><Link className="mp-brand" to="/"><span className="mp-brand-mark">S</span><span className="mp-brand-text"><strong className="mp-brand-title">SCANMS</strong><span className="mp-brand-subtitle">Sàn Mua Sắm & Tiếp Thị Liên Kết</span></span></Link>
      <form className="mp-search-container" role="search" onSubmit={event => { event.preventDefault(); document.getElementById('products')?.scrollIntoView(); }}>
        <div className="mp-search-box"><i className="ph ph-magnifying-glass search-icon" aria-hidden="true" /><input className="mp-search-input" type="search" aria-label="Tìm sản phẩm, thương hiệu, Creator" placeholder="Tìm sản phẩm, thương hiệu, Creator" value={query} onChange={event => onQuery(event.target.value)} /><button className="mp-search-btn" type="submit">Tìm kiếm</button></div>
      </form>
      <nav className="mp-header-actions" aria-label="Mua hàng"><a className="mp-action-btn" href="#tracking"><i className="ph ph-package" aria-hidden="true" /><span>Tra cứu đơn</span></a><button className="mp-action-btn" type="button" onClick={onCart}><i className="ph ph-shopping-cart" aria-hidden="true" /><span>Giỏ hàng ({cartCount})</span></button><Link className="mp-login-btn" to="/login">Tài khoản</Link></nav>
    </div>
    <nav className="mp-cat-strip" aria-label="Danh mục sản phẩm"><div className="mp-cat-inner">{categories.map(item => <button key={item.id} type="button" className={`mp-cat-pill ${category === item.id ? 'active' : ''}`} aria-pressed={category === item.id} onClick={() => onCategory(item.id)}><i className={`ph ${item.icon}`} aria-hidden="true" />{item.label}{item.id === 'all' ? ` (${count})` : ''}</button>)}</div></nav>
  </header>;
}
