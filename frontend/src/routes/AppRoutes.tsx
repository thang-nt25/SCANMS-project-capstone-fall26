import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Layout & Dispatcher
import MainLayout from '../components/layout/MainLayout';
import DashboardDispatcher from '../pages/DashboardDispatcher';
import HomePage from '../pages/HomePage';

// Auth Pages (Dev)
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';

// Store / Guest Pages
import GuestStorefrontPage from '../pages/store/GuestStorefrontPage';
import ProductDetailPage from '../pages/ProductDetailPage';
import RedirectHandlerPage from '../pages/RedirectHandlerPage';

// UI Reference / Prototype Master (Tuấn)
import UiReferencePage from '../pages/UiReferencePage';

// Commission Rules & Referral Links (Tuấn - FR-10 & Milestone Bonus)
import CommissionRulesPage from '../pages/merchant/CommissionRulesPage';
import StoreReferralLinksPage from '../pages/merchant/StoreReferralLinksPage';
import AdminReferralLinksPage from '../pages/admin/AdminReferralLinksPage';
import KolBonusProgressPage from '../pages/collaborator/KolBonusProgressPage';
import ReferralLinksPage from '../pages/collaborator/ReferralLinksPage';
import { ProtectedRoute } from './ProtectedRoute';

// Merchant Pages (Thắng - FR-01~08)
import ProductManagementPage from '../pages/merchant/ProductManagementPage';
import ShopDashboardPage from '../pages/merchant/ShopDashboardPage';
import ShopSettingsPage from '../pages/merchant/ShopSettingsPage';
import KycApprovalPage from '../pages/merchant/KycApprovalPage';

// Collaborator Pages (Thắng - FR-01~08)
import KolTierStatusPage from '../pages/collaborator/KolTierStatusPage';
import SocialChannelsPage from '../pages/collaborator/SocialChannelsPage';
import KycSubmissionPage from '../pages/collaborator/KycSubmissionPage';
import MediaHubBrowserPage from '../pages/collaborator/MediaHubBrowserPage';
import LinksPage from '../pages/collaborator/LinksPage';
import SamplesPage from '../pages/collaborator/SamplesPage';

// Realtime Chat (Quý - FR-25)
import ChatBoxPage from '../pages/chat/ChatBoxPage';

// Sample Product Workflow (Quý - FR-26)
import SampleRequestsPage from '../pages/collaborator/SampleRequestsPage';
import ShopSampleRequestsPage from '../pages/merchant/ShopSampleRequestsPage';

// Campaign Invitations (Quý - FR-27)
import ShopCampaignsPage from '../pages/merchant/ShopCampaignsPage';
import KolCampaignsPage from '../pages/collaborator/KolCampaignsPage';

// Dashboard Realtime (Quý - FR-28)
import { ShopDashboardStatsPage, KolDashboardPage } from '../pages/dashboard/DashboardPage';

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* ================================================================= */}
        {/* 1. Điểm vào chính: Prototype UI/UX & Storefront                    */}
        {/* ================================================================= */}
        <Route path="/" element={<UiReferencePage />} />
        <Route path="/prototype" element={<UiReferencePage />} />
        <Route path="/ui-reference" element={<UiReferencePage />} />
        <Route path="/marketplace" element={<UiReferencePage />} />
        <Route path="/app" element={<UiReferencePage />} />
        <Route path="/app/:screenId" element={<UiReferencePage />} />
        <Route path="/tracking" element={<UiReferencePage />} />

        {/* Sora Skin Storefront cho khách mua hàng */}
        <Route path="/store" element={<GuestStorefrontPage />} />
        <Route path="/storefront" element={<GuestStorefrontPage />} />
        <Route path="/shop" element={<GuestStorefrontPage />} />

        {/* Cổng đăng nhập & đăng ký chính thức */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* FR-10: Chuyển tiếp liên kết rút gọn công khai /r/:shortCode */}
        <Route path="/r/:shortCode" element={<RedirectHandlerPage />} />

        {/* Trang chi tiết sản phẩm kèm nhận diện Attribution */}
        <Route path="/products/:slug" element={<ProductDetailPage />} />

        {/* ================================================================= */}
        {/* 2. Cổng Portal / Dashboard cho người dùng nội bộ (MainLayout)     */}
        {/* ================================================================= */}
        <Route path="/portal" element={<MainLayout />}>
          <Route index element={<DashboardDispatcher />} />
        </Route>
        <Route path="/dashboard" element={<MainLayout />}>
          <Route index element={<DashboardDispatcher />} />
        </Route>

        {/* ================================================================= */}
        {/* 3. Protected standalone routes (Tuấn)                             */}
        {/* ================================================================= */}
        <Route element={<ProtectedRoute allowedRoles={['SYSTEM_ADMIN']} />}>
          <Route path="/admin/referral-links" element={<AdminReferralLinksPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['SHOP_MANAGER', 'SYSTEM_ADMIN']} />}>
          <Route path="/merchant/commission-rules" element={<CommissionRulesPage />} />
          <Route path="/stores/:storeId/commission-rules" element={<CommissionRulesPage />} />
          <Route path="/merchant/referral-links" element={<StoreReferralLinksPage />} />
          <Route path="/stores/:storeId/referral-links" element={<StoreReferralLinksPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['COLLABORATOR']} />}>
          <Route path="/collaborator/bonus-progress" element={<KolBonusProgressPage />} />
          <Route path="/kol/bonus-progress" element={<KolBonusProgressPage />} />
          <Route path="/collaborator/referral-links" element={<ReferralLinksPage />} />
          <Route path="/kol/referral-links" element={<ReferralLinksPage />} />
        </Route>

        {/* ================================================================= */}
        {/* 4. Routes tích hợp trong MainLayout (Sidebar + Topbar)            */}
        {/* ================================================================= */}
        <Route element={<MainLayout />}>
          {/* Merchant (Thắng - FR-01~08 & Tuấn FR-10) */}
          <Route path="merchant/dashboard" element={<ShopDashboardPage />} />
          <Route path="merchant/products" element={<ProductManagementPage />} />
          <Route path="merchant/settings" element={<ShopSettingsPage />} />
          <Route path="merchant/kyc-approval" element={<KycApprovalPage />} />
          <Route path="merchant/sample-requests" element={<ShopSampleRequestsPage />} />
          <Route path="merchant/campaigns" element={<ShopCampaignsPage />} />
          <Route path="merchant/stats" element={<ShopDashboardStatsPage />} />

          {/* Collaborator (Thắng - FR-01~08, Quý FR-25~28, Tuấn FR-10) */}
          <Route path="collaborator/dashboard" element={<HomePage />} />
          <Route path="collaborator/links" element={<LinksPage />} />
          <Route path="collaborator/social-channels" element={<SocialChannelsPage />} />
          <Route path="collaborator/media-hub" element={<MediaHubBrowserPage />} />
          <Route path="collaborator/samples" element={<SamplesPage />} />
          <Route path="collaborator/tiers" element={<KolTierStatusPage />} />
          <Route path="collaborator/kyc" element={<KycSubmissionPage />} />
          <Route path="collaborator/sample-requests" element={<SampleRequestsPage />} />
          <Route path="collaborator/campaigns" element={<KolCampaignsPage />} />
          <Route path="collaborator/stats" element={<KolDashboardPage />} />

          {/* Admin */}
          <Route path="admin/users" element={<KycApprovalPage />} />

          {/* Chat */}
          <Route path="chat" element={<ChatBoxPage />} />
          <Route path="collaborator/messages" element={<ChatBoxPage />} />
          <Route path="merchant/messages" element={<ChatBoxPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default AppRoutes;
