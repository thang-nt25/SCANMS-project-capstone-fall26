import type { Product } from './marketplace.types';
import { formatMoney } from './marketplaceUtils';
interface ProductCardProps { product: Product; onOpen: () => void; onAdd: () => void }
export default function ProductCard({ product, onOpen, onAdd }: ProductCardProps) {
  return <article className="react-product-card">
    <button type="button" className="react-product-image" onClick={onOpen} aria-label={`Xem ${product.name}`}><img src={product.image} alt={product.name} loading="lazy" width="320" height="280" /></button>
    <div className="react-product-body"><small>{product.brand}</small><h3><button type="button" onClick={onOpen}>{product.name}</button></h3>
      <p className="react-rating">★ {product.rating} <span>({product.reviews} đánh giá)</span></p>
      <p><strong>{formatMoney(product.price)}</strong> <del>{formatMoney(product.origPrice)}</del></p>
      <small>Ưu đãi từ {product.kol.name}</small>
      <button type="button" className="react-primary" onClick={onAdd}><i className="ph ph-shopping-cart" aria-hidden="true" /> Thêm vào giỏ</button>
    </div>
  </article>;
}
