import { Navigate } from 'react-router-dom';

/**
 * Legacy GuestStorefrontPage
 * Đã được hợp nhất hoàn toàn vào MarketplacePage đa gian hàng (/marketplace)
 * Tự động chuyển tiếp để bảo đảm không còn dữ liệu mock/hard-code của Sora Skin.
 */
export default function GuestStorefrontPage() {
  return <Navigate to="/marketplace" replace />;
}
