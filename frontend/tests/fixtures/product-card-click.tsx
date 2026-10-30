import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { MarketplaceProductCard } from '../../src/components/marketplace/MarketplaceProductCard';
import '../../src/index.css';

function Harness() {
  const location = useLocation();
  const [wished, setWished] = useState(false);
  const [action, setAction] = useState('');
  return <><output id="qa-route">{location.pathname}</output><output id="qa-action">{action}</output><div style={{ width: 240, margin: 24 }}>
    <MarketplaceProductCard product={{ id: 'qa-product', sku: 'QA-SERUM', name: 'Serum kiểm thử', brand: 'Shop kiểm thử', storeId: 'qa-shop', category: 'Chăm sóc da', categoryLabel: 'Chăm sóc da', price: 250000, origPrice: 280000, image: '/assets/categories/skin-v1.png', stockQuantity: 5, rating: 5, reviews: 0, sold: 'Chính hãng' }} wished={wished} onWishlist={() => setWished(value => !value)} onPurchase={intent => setAction(intent)} deal={undefined} now={Date.now()} />
  </div></>;
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><Harness /></BrowserRouter>);
