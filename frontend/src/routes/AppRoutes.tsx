import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import DashboardDispatcher from '../pages/DashboardDispatcher';
import HomePage from '../pages/HomePage';
// Auth
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
// Store / Guest
import GuestStorefrontPage from '../pages/store/GuestStorefrontPage';
// Merchant (Thắng - FR-01~08)
import ProductManagementPage from '../pages/merchant/ProductManagementPage';
import ShopDashboardPage from '../pages/merchant/ShopDashboardPage';
import ShopSettingsPage from '../pages/merchant/ShopSettingsPage';
import KycApprovalPage from '../pages/merchant/KycApprovalPage';
// Collaborator (Thắng - FR-01~08)
import KolTierStatusPage from '../pages/collaborator/KolTierStatusPage';
import SocialChannelsPage from '../pages/collaborator/SocialChannelsPage';
import KycSubmissionPage from '../pages/collaborator/KycSubmissionPage';
import MediaHubBrowserPage from '../pages/collaborator/MediaHubBrowserPage';
import LinksPage from '../pages/collaborator/LinksPage';
import SamplesPage from '../pages/collaborator/SamplesPage';
// Quy - FR-25: Chat Realtime
import ChatBoxPage from '../pages/chat/ChatBoxPage';
// Quy - FR-26: Sample Product Requests
import SampleRequestsPage from '../pages/collaborator/SampleRequestsPage';
import ShopSampleRequestsPage from '../pages/merchant/ShopSampleRequestsPage';
// Quy - FR-27: Campaign Invitations
import ShopCampaignsPage from '../pages/merchant/ShopCampaignsPage';
import KolCampaignsPage from '../pages/collaborator/KolCampaignsPage';
// Quy - FR-28: Dashboard Doanh Số Realtime
import { ShopDashboardStatsPage, KolDashboardPage } from '../pages/dashboard/DashboardPage';

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
          {/* ── Merchant (Thắng - FR-01~08) ── */}
          <Route path="merchant/dashboard" element={<ShopDashboardPage />} />
          <Route path="merchant/products" element={<ProductManagementPage />} />
          <Route path="merchant/settings" element={<ShopSettingsPage />} />
          <Route path="merchant/kyc-approval" element={<KycApprovalPage />} />

          {/* ── Collaborator (Thắng - FR-01~08) ── */}
          <Route path="collaborator/dashboard" element={<HomePage />} />
          <Route path="collaborator/links" element={<LinksPage />} />
          <Route path="collaborator/social-channels" element={<SocialChannelsPage />} />
          <Route path="collaborator/media-hub" element={<MediaHubBrowserPage />} />
          <Route path="collaborator/samples" element={<SamplesPage />} />
          <Route path="collaborator/tiers" element={<KolTierStatusPage />} />
          <Route path="collaborator/kyc" element={<KycSubmissionPage />} />

          {/* ── Admin ── */}
          <Route path="admin/users" element={<KycApprovalPage />} />

          {/* ── Quy - FR-25: Chat Realtime ── */}
          <Route path="chat" element={<ChatBoxPage />} />

          {/* ── Quy - FR-26: Sample Product Workflow ── */}
          <Route path="collaborator/sample-requests" element={<SampleRequestsPage />} />
          <Route path="merchant/sample-requests" element={<ShopSampleRequestsPage />} />

          {/* ── Quy - FR-27: Campaign Invitations ── */}
          <Route path="merchant/campaigns" element={<ShopCampaignsPage />} />
          <Route path="collaborator/campaigns" element={<KolCampaignsPage />} />

          {/* ── Quy - FR-28: Dashboard Doanh Số Realtime ── */}
          <Route path="merchant/stats" element={<ShopDashboardStatsPage />} />
          <Route path="collaborator/stats" element={<KolDashboardPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default AppRoutes;
