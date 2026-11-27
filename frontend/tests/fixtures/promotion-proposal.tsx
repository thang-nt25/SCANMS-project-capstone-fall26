import React from 'react';
import { createRoot } from 'react-dom/client';
import { ProposePromotionModal } from '../../src/components/promotions/ProposePromotionModal';
import '../../src/index.css';
const catalog = [
  { id: 'product-a', title: 'Sunscreen QA', sku: 'SUN-QA', imageUrl: '/assets/product-placeholder.svg', price: 320000, floorPrice: 200000, variants: [
    { id: 'variant-a', name: '50 ml', price: 320000, floorPrice: 200000 },
    { id: 'variant-b', name: '100 ml', price: 400000, floorPrice: 240000 },
  ] },
  { id: 'product-b', title: 'Serum QA', sku: 'SERUM-QA', price: 500000, floorPrice: 200000 },
];
createRoot(document.getElementById('root')!).render(<ProposePromotionModal isOpen catalog={catalog} onClose={() => {}} />);
