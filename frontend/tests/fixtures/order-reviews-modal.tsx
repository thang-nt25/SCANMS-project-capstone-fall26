import React from 'react';
import { createRoot } from 'react-dom/client';
import { CustomerOrderReviewsModal } from '../../src/pages/customer/CustomerOrderReviewsModal';
import '../../src/index.css';
const order = { externalOrderSn: 'QA-REVIEW', customerName: 'Tuấn Đình', store: { name: 'Sora Skin' }, orderItems: [{ productId: 'qa-product', product: { title: 'Serum kiểm thử' } }], productReviews: [{ id: 'qa-review', productId: 'qa-product', customerName: 'Tuấn Đình', createdAt: '2026-10-20T03:30:00Z', rating: 4, comment: 'Sản phẩm đúng mô tả', status: 'APPROVED', images: [] }] };
function Harness() {
  const [open, setOpen] = React.useState(false);
  return <><button id="qa-open-reviews" onClick={() => setOpen(true)}>Xem đánh giá</button>{open && <CustomerOrderReviewsModal order={order as any} onClose={() => setOpen(false)} />}</>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
