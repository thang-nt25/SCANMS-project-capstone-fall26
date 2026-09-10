import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CommissionRulesPage from '../pages/merchant/CommissionRulesPage';
import UiReferencePage from '../pages/UiReferencePage';
import { ProtectedRoute } from './ProtectedRoute';

import KolBonusProgressPage from '../pages/collaborator/KolBonusProgressPage';

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

        {/* Chức năng nghiệp vụ FR-09: Cấu hình Mốc Thưởng Doanh Số (Bảo vệ nghiêm ngặt bằng ProtectedRoute) */}
        <Route element={<ProtectedRoute allowedRoles={['SHOP_MANAGER', 'SYSTEM_ADMIN']} />}>
          <Route path="/merchant/commission-rules" element={<CommissionRulesPage />} />
          <Route path="/stores/:storeId/commission-rules" element={<CommissionRulesPage />} />
        </Route>

        {/* Chức năng nghiệp vụ dành cho KOL: Xem Tiến Độ Mốc Thưởng & Lịch Sử Thưởng Doanh Số */}
        <Route element={<ProtectedRoute allowedRoles={['COLLABORATOR']} />}>
          <Route path="/collaborator/bonus-progress" element={<KolBonusProgressPage />} />
          <Route path="/kol/bonus-progress" element={<KolBonusProgressPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default AppRoutes;
