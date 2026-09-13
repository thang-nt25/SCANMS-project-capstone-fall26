import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Layout & Dispatcher
import MainLayout from '../components/layout/MainLayout';
const DashboardDispatcher = lazy(() => import('../pages/DashboardDispatcher'));
const HomePage = lazy(() => import('../pages/HomePage'));

// Auth Pages (Dev)
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));

// Store / Guest Pages
const ProductDetailPage = lazy(() => import('../pages/ProductDetailPage'));
const RedirectHandlerPage = lazy(() => import('../pages/RedirectHandlerPage'));

// UI Reference / Prototype Master (Tuấn)
const UiReferencePage = lazy(() => import('../pages/UiReferencePage'));
const MarketplacePage = lazy(() => import('../pages/public/MarketplacePage'));

// Commission Rules & Referral Links (Tuấn - FR-10 & Milestone Bonus)
const CommissionRulesPage = lazy(() => import('../pages/merchant/CommissionRulesPage'));
const StoreReferralLinksPage = lazy(() => import('../pages/merchant/StoreReferralLinksPage'));
const StoreCollaboratorsPage = lazy(() => import('../pages/merchant/StoreCollaboratorsPage'));
const AdminReferralLinksPage = lazy(() => import('../pages/admin/AdminReferralLinksPage'));
const KolBonusProgressPage = lazy(() => import('../pages/collaborator/KolBonusProgressPage'));
const ReferralLinksPage = lazy(() => import('../pages/collaborator/ReferralLinksPage'));
const KolCouponsPage = lazy(() => import('../pages/collaborator/KolCouponsPage'));
const ShopCouponsPage = lazy(() => import('../pages/merchant/ShopCouponsPage'));

// Merchant Pages (Thắng - FR-01~08)
const ProductManagementPage = lazy(() => import('../pages/merchant/ProductManagementPage'));
const ShopDashboardPage = lazy(() => import('../pages/merchant/ShopDashboardPage'));
const ShopSettingsPage = lazy(() => import('../pages/merchant/ShopSettingsPage'));
const KycApprovalPage = lazy(() => import('../pages/merchant/KycApprovalPage'));
const OrdersManagementPage = lazy(() => import('../pages/merchant/OrdersManagementPage'));
const PayoutApprovalPage = lazy(() => import('../pages/merchant/PayoutApprovalPage'));

// Collaborator Pages (Thắng - FR-01~08)
const KolTierStatusPage = lazy(() => import('../pages/collaborator/KolTierStatusPage'));
const SocialChannelsPage = lazy(() => import('../pages/collaborator/SocialChannelsPage'));
const KycSubmissionPage = lazy(() => import('../pages/collaborator/KycSubmissionPage'));
const WalletPage = lazy(() => import('../pages/collaborator/WalletPage'));
const MediaHubBrowserPage = lazy(() => import('../pages/collaborator/MediaHubBrowserPage'));
const SamplesPage = lazy(() => import('../pages/collaborator/SamplesPage'));

// Realtime Chat (Quý - FR-25)
const OrderTrackingPage = lazy(() => import('../pages/public/OrderTrackingPage'));
// Quy - FR-25: Chat Realtime
const ChatBoxPage = lazy(() => import('../pages/chat/ChatBoxPage'));

// Sample Product Workflow (Quý - FR-26)
const SampleRequestsPage = lazy(() => import('../pages/collaborator/SampleRequestsPage'));
const ShopSampleRequestsPage = lazy(() => import('../pages/merchant/ShopSampleRequestsPage'));

// Campaign Invitations (Quý - FR-27)
const ShopCampaignsPage = lazy(() => import('../pages/merchant/ShopCampaignsPage'));
const KolCampaignsPage = lazy(() => import('../pages/collaborator/KolCampaignsPage'));

// Dashboard Realtime (Quý - FR-28)
const ShopDashboardStatsPage = lazy(() => import('../pages/dashboard/DashboardPage').then(m => ({ default: m.ShopDashboardStatsPage })));
const KolDashboardPage = lazy(() => import('../pages/dashboard/DashboardPage').then(m => ({ default: m.KolDashboardPage })));

// Admin Pages (FR-12)
const AdminCouponsPage = lazy(() => import('../pages/admin/AdminCouponsPage'));
import { ProtectedRoute } from './ProtectedRoute';

function AppRoutes() {
  return (
    <Router>
      <Suspense fallback={<div className="min-h-screen bg-[#FAF8F5] grid place-items-center text-[#7D715E]">Đang tải SCANMS...</div>}>
      <Routes>
        {/* ================================================================= */}
        {/* 1. Điểm vào chính: Prototype UI/UX & Storefront                    */}
        {/* ================================================================= */}
        <Route path="/" element={<UiReferencePage />} />
        <Route path="/prototype" element={<UiReferencePage />} />
        <Route path="/ui-reference" element={<UiReferencePage />} />
        <Route path="/app" element={<UiReferencePage />} />
        <Route path="/app/:screenId" element={<UiReferencePage />} />

        {/* SCANMS Multi-Merchant Marketplace & Storefront cho khách mua hàng */}
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/store" element={<MarketplacePage />} />
        <Route path="/storefront" element={<MarketplacePage />} />
        <Route path="/shop" element={<MarketplacePage />} />

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
          <Route element={<ProtectedRoute allowedRoles={['SHOP_MANAGER', 'SYSTEM_MANAGER', 'SYSTEM_ADMIN']} />}>
            <Route path="merchant/dashboard" element={<ShopDashboardPage />} />
            <Route path="merchant/products" element={<ProductManagementPage />} />
            <Route path="merchant/orders" element={<OrdersManagementPage />} />
            <Route path="merchant/payouts" element={<PayoutApprovalPage />} />
            <Route path="stores/:storeId/payouts" element={<PayoutApprovalPage />} />
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
      </Suspense>
    </Router>
  );
}

export default AppRoutes;
