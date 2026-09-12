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
import StoreCollaboratorsPage from '../pages/merchant/StoreCollaboratorsPage';
import AdminReferralLinksPage from '../pages/admin/AdminReferralLinksPage';
import KolBonusProgressPage from '../pages/collaborator/KolBonusProgressPage';
import ReferralLinksPage from '../pages/collaborator/ReferralLinksPage';
import KolCouponsPage from '../pages/collaborator/KolCouponsPage';
import ShopCouponsPage from '../pages/merchant/ShopCouponsPage';

// Merchant Pages (Thắng - FR-01~08)
import ProductManagementPage from '../pages/merchant/ProductManagementPage';
import ShopDashboardPage from '../pages/merchant/ShopDashboardPage';
import ShopSettingsPage from '../pages/merchant/ShopSettingsPage';
import KycApprovalPage from '../pages/merchant/KycApprovalPage';
import OrdersManagementPage from '../pages/merchant/OrdersManagementPage';

// Collaborator Pages (Thắng - FR-01~08)
import KolTierStatusPage from '../pages/collaborator/KolTierStatusPage';
import SocialChannelsPage from '../pages/collaborator/SocialChannelsPage';
import KycSubmissionPage from '../pages/collaborator/KycSubmissionPage';
import WalletPage from '../pages/collaborator/WalletPage';
import MediaHubBrowserPage from '../pages/collaborator/MediaHubBrowserPage';
import SamplesPage from '../pages/collaborator/SamplesPage';

// Realtime Chat (Quý - FR-25)
import OrderTrackingPage from '../pages/public/OrderTrackingPage';
// Quy - FR-25: Chat Realtime
import ChatBoxPage from '../pages/chat/ChatBoxPage';

// Sample Product Workflow (Quý - FR-26)
import SampleRequestsPage from '../pages/collaborator/SampleRequestsPage';
import ShopSampleRequestsPage from '../pages/merchant/ShopSampleRequestsPage';

// Campaign Invitations (Quý - FR-27)
import ShopCampaignsPage from '../pages/merchant/ShopCampaignsPage';
import KolCampaignsPage from '../pages/collaborator/KolCampaignsPage';

// Dashboard Realtime (Quý - FR-28)
import { ShopDashboardStatsPage, KolDashboardPage } from '../pages/dashboard/DashboardPage';

// Admin Pages (FR-12)
import AdminCouponsPage from '../pages/admin/AdminCouponsPage';
import { ProtectedRoute } from './ProtectedRoute';

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

        {/* SCANMS Multi-Merchant Storefront cho khách mua hàng */}
        <Route path="/store" element={<GuestStorefrontPage />} />
        <Route path="/storefront" element={<GuestStorefrontPage />} />
        <Route path="/shop" element={<GuestStorefrontPage />} />

        {/* Cổng tra cứu tiến trình đơn hàng công khai (FR-17) */}
        <Route path="/tracking" element={<OrderTrackingPage />} />
        <Route path="/order-tracking" element={<OrderTrackingPage />} />

        {/* Cổng đăng nhập & đăng ký riêng biệt */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* FR-10: Chuyển tiếp liên kết rút gọn công khai /r/:shortCode */}
        <Route path="/r/:shortCode" element={<RedirectHandlerPage />} />

        {/* Trang chi tiết sản phẩm kèm nhận diện Attribution */}
        <Route path="/products/:slug" element={<ProductDetailPage />} />

        {/* ================================================================= */}
        {/* 2. Routes tích hợp trong MainLayout (Có Sidebar & Topbar đầy đủ) */}
        {/* ================================================================= */}
        <Route element={<MainLayout />}>
          <Route path="/portal" element={<DashboardDispatcher />} />
          <Route path="/dashboard" element={<DashboardDispatcher />} />

          {/* ── Merchant Protected Routes ── */}
          <Route element={<ProtectedRoute allowedRoles={['SHOP_MANAGER', 'SYSTEM_ADMIN']} />}>
            <Route path="merchant/dashboard" element={<ShopDashboardPage />} />
            <Route path="merchant/products" element={<ProductManagementPage />} />
            <Route path="merchant/orders" element={<OrdersManagementPage />} />
            <Route path="merchant/settings" element={<ShopSettingsPage />} />
            <Route path="merchant/kyc-approval" element={<KycApprovalPage />} />
            <Route path="merchant/commission-rules" element={<CommissionRulesPage />} />
            <Route path="stores/:storeId/commission-rules" element={<CommissionRulesPage />} />
            <Route path="merchant/referral-links" element={<StoreReferralLinksPage />} />
            <Route path="merchant/coupons" element={<ShopCouponsPage />} />
            <Route path="stores/:storeId/coupons" element={<ShopCouponsPage />} />
            <Route path="merchant/collaborators" element={<StoreCollaboratorsPage />} />
            <Route path="stores/:storeId/referral-links" element={<StoreReferralLinksPage />} />
            <Route path="merchant/sample-requests" element={<ShopSampleRequestsPage />} />
            <Route path="merchant/campaigns" element={<ShopCampaignsPage />} />
            <Route path="merchant/stats" element={<ShopDashboardStatsPage />} />
          </Route>

          {/* ── Collaborator Protected Routes ── */}
          <Route element={<ProtectedRoute allowedRoles={['COLLABORATOR', 'SYSTEM_ADMIN']} />}>
            <Route path="collaborator/dashboard" element={<HomePage />} />
            <Route path="collaborator/links" element={<ReferralLinksPage />} />
            <Route path="collaborator/referral-links" element={<ReferralLinksPage />} />
            <Route path="kol/referral-links" element={<ReferralLinksPage />} />
            <Route path="collaborator/coupons" element={<KolCouponsPage />} />
            <Route path="kol/coupons" element={<KolCouponsPage />} />
            <Route path="collaborator/bonus-progress" element={<KolBonusProgressPage />} />
            <Route path="kol/bonus-progress" element={<KolBonusProgressPage />} />
            <Route path="collaborator/social-channels" element={<SocialChannelsPage />} />
            <Route path="collaborator/media-hub" element={<MediaHubBrowserPage />} />
            <Route path="collaborator/samples" element={<SamplesPage />} />
            <Route path="collaborator/tiers" element={<KolTierStatusPage />} />
            <Route path="collaborator/kyc" element={<KycSubmissionPage />} />
            <Route path="collaborator/wallet" element={<WalletPage />} />
            <Route path="collaborator/sample-requests" element={<SampleRequestsPage />} />
            <Route path="collaborator/campaigns" element={<KolCampaignsPage />} />
            <Route path="collaborator/stats" element={<KolDashboardPage />} />
          </Route>

          {/* ── Admin Protected Routes ── */}
          <Route element={<ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'SYSTEM_MANAGER']} />}>
            <Route path="admin/users" element={<KycApprovalPage />} />
            <Route path="admin/referral-links" element={<AdminReferralLinksPage />} />
            <Route path="admin/coupons" element={<AdminCouponsPage />} />
          </Route>

          {/* ── Chat ── */}
          <Route path="chat" element={<ChatBoxPage />} />
          <Route path="collaborator/messages" element={<ChatBoxPage />} />
          <Route path="merchant/messages" element={<ChatBoxPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default AppRoutes;
