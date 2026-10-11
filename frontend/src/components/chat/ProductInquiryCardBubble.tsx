import { useState } from 'react';
import { ShoppingBag, ExternalLink } from 'lucide-react';
import './ProductInquiryCardBubble.css';

export interface ProductInquiryCardData {
  type: 'PRODUCT_INQUIRY';
  productId: string;
  productTitle: string;
  productImage?: string;
  productPrice?: number;
  productSku?: string;
  commissionRate?: number;
  message?: string;
}

export function ProductInquiryCardBubble({ card }: { card: ProductInquiryCardData; isMine: boolean }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return (
    <article className="product-chat-card">
      <header className="product-chat-header"><span className="product-chat-icon"><ShoppingBag size={14} /></span><strong>Trao đổi sản phẩm</strong>{card.commissionRate != null && <span className="product-chat-commission">Hoa hồng <strong>{card.commissionRate}%</strong></span>}</header>
      <div className="product-chat-body">
        <div className="product-chat-preview">
          {card.productImage && failedImage !== card.productImage ? <img src={card.productImage} alt={card.productTitle} onError={() => setFailedImage(card.productImage || null)} /> : <div className="product-chat-placeholder"><ShoppingBag size={20} /></div>}
          <div><h4>{card.productTitle}</h4>{card.productSku && <p className="product-chat-sku">SKU: {card.productSku}</p>}{typeof card.productPrice === 'number' && <strong className="product-chat-price">{card.productPrice.toLocaleString('vi-VN')} ₫</strong>}</div>
        </div>
        {card.message && <blockquote className="product-chat-message">{card.message}</blockquote>}
      </div>
      <footer className="product-chat-footer"><a href={`/products/${card.productSku || card.productId}`} target="_blank" rel="noopener noreferrer"><span>Xem chi tiết sản phẩm</span><ExternalLink size={13} /></a></footer>
    </article>
  );
}
