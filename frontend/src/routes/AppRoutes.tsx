import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import DashboardDispatcher from '../pages/DashboardDispatcher';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import GuestStorefrontPage from '../pages/store/GuestStorefrontPage';
import ProductManagementPage from '../pages/merchant/ProductManagementPage';
import ShopDashboardPage from '../pages/merchant/ShopDashboardPage';
import ShopSettingsPage from '../pages/merchant/ShopSettingsPage';
import KycApprovalPage from '../pages/merchant/KycApprovalPage';
import KolTierStatusPage from '../pages/collaborator/KolTierStatusPage';
import SocialChannelsPage from '../pages/collaborator/SocialChannelsPage';
import KycSubmissionPage from '../pages/collaborator/KycSubmissionPage';
import MediaHubBrowserPage from '../pages/collaborator/MediaHubBrowserPage';
import LinksPage from '../pages/collaborator/LinksPage';
import SamplesPage from '../pages/collaborator/SamplesPage';

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* TRANG CHÍNH KHI VÀO WEB: Cửa hàng Sora Skin cho Guest mua hàng */}
        <Route path="/" element={<GuestStorefrontPage />} />
        <Route path="/store" element={<GuestStorefrontPage />} />
        <Route path="/storefront" element={<GuestStorefrontPage />} />
        <Route path="/shop" element={<GuestStorefrontPage />} />

        {/* Cổng đăng nhập & đăng ký riêng biệt */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Cổng Portal / Dashboard cho người dùng nội bộ */}
        <Route path="/portal" element={<MainLayout />}>
          <Route index element={<DashboardDispatcher />} />
        </Route>
        <Route path="/dashboard" element={<MainLayout />}>
          <Route index element={<DashboardDispatcher />} />
        </Route>

        <Route element={<MainLayout />}>
          {/* Dành cho Chủ Shop (Merchant) */}
          <Route path="merchant/dashboard" element={<ShopDashboardPage />} />
          <Route path="merchant/products" element={<ProductManagementPage />} />
          <Route path="merchant/settings" element={<ShopSettingsPage />} />
          <Route path="merchant/kyc-approval" element={<KycApprovalPage />} />

          {/* Dành cho KOL / Cộng tác viên (Collaborator) */}
          <Route path="collaborator/dashboard" element={<HomePage />} />
          <Route path="collaborator/links" element={<LinksPage />} />
          <Route path="collaborator/social-channels" element={<SocialChannelsPage />} />
          <Route path="collaborator/media-hub" element={<MediaHubBrowserPage />} />
          <Route path="collaborator/samples" element={<SamplesPage />} />
          <Route path="collaborator/tiers" element={<KolTierStatusPage />} />
          <Route path="collaborator/kyc" element={<KycSubmissionPage />} />

          {/* Dành cho Quản Trị Sàn (Admin) */}
          <Route path="admin/users" element={<KycApprovalPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default AppRoutes;
