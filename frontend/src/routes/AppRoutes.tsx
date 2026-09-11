import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CommissionRulesPage from '../pages/merchant/CommissionRulesPage';
import StoreReferralLinksPage from '../pages/merchant/StoreReferralLinksPage';
import AdminReferralLinksPage from '../pages/admin/AdminReferralLinksPage';
import UiReferencePage from '../pages/UiReferencePage';
import { ProtectedRoute } from './ProtectedRoute';

import KolBonusProgressPage from '../pages/collaborator/KolBonusProgressPage';
import ReferralLinksPage from '../pages/collaborator/ReferralLinksPage';
import RedirectHandlerPage from '../pages/RedirectHandlerPage';
import ProductDetailPage from '../pages/ProductDetailPage';

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Điểm vào chính: Toàn bộ Prototype UI/UX đỉnh cao của Nguyễn Đình Tuấn */}
        <Route path="/" element={<UiReferencePage />} />
        <Route path="/prototype" element={<UiReferencePage />} />
        <Route path="/ui-reference" element={<UiReferencePage />} />
        <Route path="/login" element={<UiReferencePage />} />
        <Route path="/register" element={<UiReferencePage />} />
        <Route path="/marketplace" element={<UiReferencePage />} />
        <Route path="/storefront" element={<UiReferencePage />} />
        <Route path="/app" element={<UiReferencePage />} />
        <Route path="/app/:screenId" element={<UiReferencePage />} />
        <Route path="/tracking" element={<UiReferencePage />} />
        <Route path="/chat" element={<UiReferencePage />} />

        {/* FR-10: Chuyển tiếp liên kết rút gọn công khai /r/:shortCode */}
        <Route path="/r/:shortCode" element={<RedirectHandlerPage />} />

        {/* Trang chi tiết sản phẩm đích kèm nhận diện Attribution */}
        <Route path="/products/:slug" element={<ProductDetailPage />} />

        {/* Chức năng nghiệp vụ dành riêng cho Quản trị viên (SYSTEM_ADMIN) */}
        <Route element={<ProtectedRoute allowedRoles={['SYSTEM_ADMIN']} />}>
          <Route path="/admin/referral-links" element={<AdminReferralLinksPage />} />
        </Route>

        {/* Chức năng nghiệp vụ dành cho Chủ Cửa Hàng & Admin */}
        <Route element={<ProtectedRoute allowedRoles={['SHOP_MANAGER', 'SYSTEM_ADMIN']} />}>
          <Route path="/merchant/commission-rules" element={<CommissionRulesPage />} />
          <Route path="/stores/:storeId/commission-rules" element={<CommissionRulesPage />} />
          <Route path="/merchant/referral-links" element={<StoreReferralLinksPage />} />
          <Route path="/stores/:storeId/referral-links" element={<StoreReferralLinksPage />} />
        </Route>

        {/* Chức năng nghiệp vụ dành cho KOL/Cộng tác viên */}
        <Route element={<ProtectedRoute allowedRoles={['COLLABORATOR']} />}>
          <Route path="/collaborator/bonus-progress" element={<KolBonusProgressPage />} />
          <Route path="/kol/bonus-progress" element={<KolBonusProgressPage />} />
          <Route path="/collaborator/referral-links" element={<ReferralLinksPage />} />
          <Route path="/kol/referral-links" element={<ReferralLinksPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default AppRoutes;
