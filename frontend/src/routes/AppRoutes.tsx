const VipExceptionsPage = lazy(() => import('../pages/admin/VipExceptionsPage'));
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, type ComponentType } from 'react';
import PlatformInfoPage, { NotFoundPage } from '../pages/public/PlatformInfoPage';

/**
 * Tự động retry dynamic import module nếu gặp lỗi kết nối hoặc Vite HMR reload
 */
function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch {
      await new Promise((r) => setTimeout(r, 400));
      return await factory();
    }
  });
}

import MainLayout from '../components/layout/MainLayout';
const DashboardDispatcher = lazyRetry(() => import('@/pages/DashboardDispatcher'));
const KolDashboardPage = lazyRetry(() => import('@/pages/collaborator/KolDashboardPage'));

const LoginPage = lazyRetry(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazyRetry(() => import('@/pages/auth/RegisterPage'));

const ProductDetailPage = lazyRetry(() => import('@/pages/public/ProductDetailPage'));
const RedirectHandlerPage = lazyRetry(() => import('@/pages/public/RedirectHandlerPage'));
const MarketplacePage = lazyRetry(() => import('../pages/public/MarketplacePage'));
const ShoppingDiscoverPage = lazyRetry(() => import('../pages/public/ShoppingDiscoverPage'));
const ShopPage = lazyRetry(() => import('../pages/public/ShopPage'));
const SearchPage = lazyRetry(() => import('../pages/public/SearchPage'));
const PayosReturnPage = lazyRetry(() => import('../pages/public/PayosReturnPage'));
const LiveStreamRoomPage = lazyRetry(() => import('../pages/public/LiveStreamRoomPage'));
const CartPage = lazyRetry(() => import('../pages/public/CartPage'));

const ProductManagementPage = lazyRetry(() => import('../pages/merchant/ProductManagementPage'));
const ShopDashboardPage = lazyRetry(() => import('../pages/merchant/ShopDashboardPage'));
const ShopSettingsPage = lazyRetry(() => import('../pages/merchant/ShopSettingsPage'));
const KycApprovalPage = lazyRetry(() => import('../pages/admin/KycApprovalPage'));
const OrdersManagementPage = lazyRetry(() => import('../pages/merchant/OrdersManagementPage'));
const ShopRevenueWalletPage = lazyRetry(() => import('../pages/merchant/ShopRevenueWalletPage'));

const WalletPage = lazyRetry(() => import('../pages/collaborator/WalletPage'));
const OrderTrackingPage = lazyRetry(() => import('../pages/public/OrderTrackingPage'));
const CustomerPortalPage = lazyRetry(() => import('../pages/customer/CustomerPortalPage'));
const ShoppingAccountPage = lazyRetry(() => import('../pages/customer/ShoppingAccountPage'));
const ReturnDetailPage = lazyRetry(() => import('../pages/returns/ReturnDetailPage'));
const ChatBoxPage = lazyRetry(() => import('../pages/chat/ChatBoxPage'));
const RealtimeAnalyticsPage = lazyRetry(() => import('../pages/dashboard/RealtimeAnalyticsPage'));
const LeaderboardPage = lazyRetry(() => import('../pages/dashboard/LeaderboardPage'));

// Consolidated Hub Pages (Tối ưu trải nghiệm gộp Menu)
const ShopCollaborationPage = lazy(() => import('../pages/collaborator/ShopCollaborationPage'));
const MarketingToolkitPage = lazy(() => import('../pages/collaborator/MarketingToolkitPage'));
const CreatorProfilePage = lazy(() => import('../pages/collaborator/CreatorProfilePage'));
const ShopKolHubPage = lazy(() => import('../pages/merchant/ShopKolHubPage'));
const ShopPromotionsHubPage = lazy(() => import('../pages/merchant/ShopPromotionsHubPage'));
const LiveSessionsPage = lazy(() => import('../pages/merchant/LiveSessionsPage'));
const CollaboratorLiveSessionsPage = lazy(() => import('../pages/collaborator/LiveSessionsPage'));
const AdminOversightHubPage = lazy(() => import('../pages/admin/AdminOversightHubPage'));
const AdminAnalyticsHubPage = lazy(() => import('../pages/admin/AdminAnalyticsHubPage'));
const AdminProfilePage = lazyRetry(() => import('../pages/admin/AdminProfilePage'));
const CustomerReviewModerationPage = lazy(() => import('../pages/admin/CustomerReviewModerationPage'));
const AdminPersonnelPage = lazyRetry(() => import('../pages/admin/AdminPersonnelPage'));
const AdminFinancePayoutsPage = lazy(() => import('../pages/admin/AdminFinancePayoutsPage'));
const AdminProductPricingHubPage = lazy(() => import('../pages/admin/AdminProductPricingHubPage'));
const AdminArbitrationHubPage = lazy(() => import('../pages/admin/AdminArbitrationHubPage'));
const AdminSecurityAuditHubPage = lazy(() => import('../pages/admin/AdminSecurityAuditHubPage'));

// Shop Return Requests (Merchant)
const ShopReturnsQueuePage = lazy(() => import('../pages/merchant/ShopReturnsQueuePage'));

import { RouteContent } from './RouteContent';
import { RoleGuard } from './RoleGuard';
import { CartProvider, useCart } from '../context/CartContext';
import { ScanmsChatProvider } from '../context/ScanmsChatContext';
import { ScanmsFloatingChatWidget } from '../components/chat/ScanmsFloatingChatWidget';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { CartDrawer } from '../components/cart/CartDrawer';
import { GuestCheckoutModal } from '../components/checkout/GuestCheckoutModal';
import { PublicHeader } from '../components/layout/PublicHeader';
import { authService } from '../services/auth.service';
import { StorePresenceHeartbeat } from '../components/store/StorePresenceHeartbeat';
import { ShoppingMobileNavigation } from '../components/layout/ShoppingMobileNavigation';

function GlobalCheckoutModal() {
  const { isCheckoutOpen, closeCheckout, checkoutItems, checkoutCouponCode } = useCart();
  if (!isCheckoutOpen) return null;
  return (
    <GuestCheckoutModal
      isOpen={isCheckoutOpen}
      onClose={closeCheckout}
      checkoutItems={checkoutItems}
      initialCouponCode={checkoutCouponCode}
    />
  );
}

function PublicLeaderboardPage() {
  const user = authService.getCurrentUser();
  const isCustomerWorkspace = Boolean(
    user && (user.role === 'CUSTOMER' || authService.getActiveWorkspace() === 'customer'),
  );

  if (isCustomerWorkspace) {
    return <Navigate to="/customer/orders" replace />;
  }

  return (
    <>
      <PublicHeader />
      <LeaderboardPage />
    </>
  );
}

function AppRoutes() {
  return (
    <Router>
      <CartProvider>
        <StorePresenceHeartbeat />
        <ScanmsChatProvider>
          <ErrorBoundary>
            <Suspense fallback={<div className="min-h-screen bg-[#FAF8F5] grid place-items-center text-[#7D715E]">Đang tải SCANMS...</div>}>
              <Routes>
              <Route path="/" element={<MarketplacePage />} />
              <Route path="/terms" element={<PlatformInfoPage kind="terms" />} />
              <Route path="/privacy" element={<PlatformInfoPage kind="privacy" />} />
              <Route path="*" element={<NotFoundPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/stores" element={<ShoppingDiscoverPage />} />
              <Route path="/discover/live" element={<ShoppingDiscoverPage />} />
              <Route path="/shops/:shopId" element={<ShopPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/marketplace/search" element={<SearchPage />} />
              <Route path="/payment/payos-return" element={<PayosReturnPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/gio-hang" element={<Navigate to="/cart" replace />} />
              <Route path="/store" element={<MarketplacePage />} />
              <Route path="/storefront" element={<MarketplacePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/shop/:shopId" element={<ShopPage />} />
              <Route path="/stores/:shopId" element={<ShopPage />} />
              <Route path="/leaderboard" element={<PublicLeaderboardPage />} />
              <Route path="/live/:slug" element={<LiveStreamRoomPage />} />
              <Route path="/live/:id" element={<LiveStreamRoomPage />} />
              <Route path="/live" element={<LiveStreamRoomPage />} />

        <Route path="/prototype" element={<Navigate to="/" replace />} />
        <Route path="/ui-reference" element={<Navigate to="/" replace />} />
        <Route path="/app" element={<Navigate to="/" replace />} />
        <Route path="/app/:screenId" element={<Navigate to="/" replace />} />

        <Route path="/tracking" element={<OrderTrackingPage />} />
        <Route path="/order-tracking" element={<OrderTrackingPage />} />

        {/* Customer Portal & Buyer Center (SCANMS E-Commerce) */}
        <Route path="/customer" element={<CustomerPortalPage />} />
        <Route path="/customer/account" element={<ShoppingAccountPage />} />
        <Route path="/customer/portal" element={<CustomerPortalPage />} />
        <Route path="/customer/orders" element={<CustomerPortalPage />} />
        <Route path="/customer/orders/:orderId" element={<CustomerPortalPage />} />
        <Route path="/customer/profile" element={<CustomerPortalPage />} />
        <Route path="/customer/identity" element={<CustomerPortalPage />} />
        <Route path="/customer/addresses" element={<CustomerPortalPage />} />
        <Route path="/customer/wishlist" element={<CustomerPortalPage />} />
        <Route path="/customer/upgrade" element={<CustomerPortalPage />} />
        <Route path="/customer/upgrade/kol" element={<CustomerPortalPage />} />
        <Route path="/customer/upgrade/shop" element={<Navigate to="/customer/upgrade" replace />} />
        <Route path="/customer/returns/:id" element={<ReturnDetailPage mode="customer" />} />
        <Route path="/customer/vouchers" element={<CustomerPortalPage />} />
        <Route path="/customer/notifications" element={<CustomerPortalPage />} />
        <Route path="/customer/security" element={<CustomerPortalPage />} />
        <Route path="/customer/wallet" element={<CustomerPortalPage />} />
        <Route path="/customer/wallet/topup" element={<CustomerPortalPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/r/:shortCode" element={<RedirectHandlerPage />} />

        <Route path="/products/:slug" element={<ProductDetailPage />} />

        <Route element={<MainLayout />}>
          <Route path="/portal" element={<DashboardDispatcher />} />
          <Route path="/dashboard" element={<DashboardDispatcher />} />

          {/* Merchant Routes - Được bảo vệ bằng RoleGuard 'shop' */}
          <Route element={<RoleGuard requiredWorkspace="shop" />}>
            <Route element={<RouteContent />}>
              <Route path="merchant/dashboard" element={<ShopDashboardPage />} />
              <Route path="merchant/pricing" element={<Navigate to="/merchant/promotions?tab=price-promotions" replace />} />
              <Route path="merchant/products" element={<ProductManagementPage />} />
              <Route path="merchant/orders" element={<OrdersManagementPage />} />
              <Route path="merchant/returns/:id" element={<ReturnDetailPage mode="shop" />} />
              <Route path="merchant/payouts" element={<Navigate to="/merchant/wallet?tab=commissions" replace />} />
              <Route path="merchant/campaigns-manage" element={<Navigate to="/merchant/promotions" replace />} />
              <Route path="merchant/wallet" element={<ShopRevenueWalletPage />} />
              <Route path="shop/wallet" element={<ShopRevenueWalletPage />} />
              <Route path="stores/:storeId/payouts" element={<Navigate to="/merchant/wallet?tab=commissions" replace />} />
              <Route path="merchant/settings" element={<ShopSettingsPage />} />
              <Route path="merchant/kyc-approval" element={<KycApprovalPage />} />

              {/* Merchant Consolidated Hubs */}
              <Route path="merchant/kol-hub" element={<ShopKolHubPage />} />
              <Route path="merchant/customer-messages" element={<ChatBoxPage />} />
              <Route path="merchant/promotions" element={<ShopPromotionsHubPage />} />
              <Route path="merchant/live-sessions" element={<LiveSessionsPage />} />
              <Route path="merchant/livestream" element={<Navigate to="/merchant/live-sessions" replace />} />
              <Route path="merchant/fraud-sentinel" element={<Navigate to="/admin/fraud-sentinel" replace />} />
              <Route path="merchant/ai-fraud" element={<Navigate to="/admin/fraud-sentinel" replace />} />
              <Route path="merchant/audit-logs" element={<Navigate to="/admin/audit-logs" replace />} />
              <Route path="merchant/returns" element={<ShopReturnsQueuePage />} />
              <Route path="merchant/return-requests" element={<ShopReturnsQueuePage />} />

              {/* Merchant Backward Compatibility Redirects */}
              <Route path="merchant/commission-rules" element={<Navigate to="/merchant/promotions?tab=creator-incentives" replace />} />
              <Route path="stores/:storeId/commission-rules" element={<Navigate to="/merchant/promotions?tab=creator-incentives" replace />} />
              <Route path="merchant/referral-links" element={<Navigate to="/merchant/kol-hub?tab=performance" replace />} />
              <Route path="stores/:storeId/referral-links" element={<Navigate to="/merchant/kol-hub?tab=performance" replace />} />
              <Route path="merchant/coupons" element={<Navigate to="/merchant/promotions?tab=creator-incentives" replace />} />
              <Route path="stores/:storeId/coupons" element={<Navigate to="/merchant/promotions?tab=creator-incentives" replace />} />
              <Route path="merchant/collaborators" element={<Navigate to="/merchant/kol-hub?tab=collaborators" replace />} />
              <Route path="merchant/sample-requests" element={<Navigate to="/merchant/kol-hub?tab=samples" replace />} />
              <Route path="merchant/campaigns" element={<Navigate to="/merchant/promotions" replace />} />
              <Route path="merchant/kol-recommendations" element={<Navigate to="/merchant/kol-hub?tab=radar" replace />} />
              <Route path="merchant/ai-matching" element={<Navigate to="/merchant/kol-hub?tab=radar" replace />} />
              <Route path="merchant/messages" element={<Navigate to="/merchant/kol-hub?tab=messages" replace />} />
              <Route path="merchant/collaboration" element={<Navigate to="/merchant/kol-hub" replace />} />
              <Route path="shop/collaboration" element={<Navigate to="/merchant/kol-hub" replace />} />
              <Route path="shop" element={<Navigate to="/merchant/dashboard" replace />} />
              <Route path="shop/dashboard" element={<Navigate to="/merchant/dashboard" replace />} />
              <Route path="merchant/analytics" element={<RealtimeAnalyticsPage />} />
              <Route path="merchant/stats" element={<RealtimeAnalyticsPage />} />
              <Route path="merchant/leaderboard" element={<LeaderboardPage />} />
            </Route>
          </Route>

          {/* Collaborator (KOL) Routes - Được bảo vệ bằng RoleGuard 'kol' */}
          <Route element={<RoleGuard requiredWorkspace="kol" />}>
            <Route element={<RouteContent />}>
              <Route path="collaborator/dashboard" element={<KolDashboardPage />} />
              <Route path="collaborator/wallet" element={<WalletPage />} />

              {/* Collaborator Consolidated Hubs */}
              <Route path="collaborator/marketing" element={<MarketingToolkitPage />} />
              <Route path="collaborator/marketing-toolkit" element={<Navigate to="/collaborator/marketing" replace />} />
              <Route path="collaborator/live-sessions" element={<CollaboratorLiveSessionsPage />} />
              <Route path="collaborator/collaboration" element={<ShopCollaborationPage />} />
              <Route path="collaborator/profile" element={<CreatorProfilePage />} />

              {/* Collaborator Backward Compatibility Redirects */}
              <Route path="collaborator/links" element={<Navigate to="/collaborator/marketing?tab=links" replace />} />
              <Route path="collaborator/referral-links" element={<Navigate to="/collaborator/marketing?tab=links" replace />} />
              <Route path="kol/referral-links" element={<Navigate to="/collaborator/marketing?tab=links" replace />} />
              <Route path="collaborator/coupons" element={<Navigate to="/collaborator/marketing?tab=coupons" replace />} />
              <Route path="kol/coupons" element={<Navigate to="/collaborator/marketing?tab=coupons" replace />} />
              <Route path="collaborator/media-hub" element={<Navigate to="/collaborator/marketing?tab=links" replace />} />
              <Route path="collaborator/samples" element={<Navigate to="/collaborator/marketing?tab=samples" replace />} />
              <Route path="collaborator/sample-requests" element={<Navigate to="/collaborator/marketing?tab=samples" replace />} />
              <Route path="collaborator/campaigns" element={<Navigate to="/collaborator/collaboration" replace />} />
              <Route path="collaborator/messages" element={<Navigate to="/collaborator/collaboration?tab=messages" replace />} />
              <Route path="collaborator/kyc" element={<Navigate to="/collaborator/profile?tab=kyc" replace />} />
              <Route path="collaborator/social-channels" element={<Navigate to="/collaborator/profile?tab=social" replace />} />
              <Route path="collaborator/tiers" element={<Navigate to="/collaborator/profile?tab=tiers" replace />} />
              <Route path="collaborator/bonus-progress" element={<CreatorProfilePage />} />
              <Route path="kol/bonus-progress" element={<Navigate to="/collaborator/bonus-progress" replace />} />
              <Route path="collaborator/analytics" element={<RealtimeAnalyticsPage />} />
              <Route path="collaborator/leaderboard" element={<CreatorProfilePage />} />
              <Route path="collaborator/stats" element={<RealtimeAnalyticsPage />} />
            </Route>
          </Route>

          {/* Admin Routes - Được bảo vệ bằng RoleGuard 'admin' */}
          <Route element={<RoleGuard requiredWorkspace="admin" />}>
            <Route element={<RouteContent />}>
              <Route path="admin/analytics" element={<AdminAnalyticsHubPage />} />
              <Route path="admin/affiliate-oversight" element={<AdminOversightHubPage />} />
              <Route path="admin/payouts" element={<AdminFinancePayoutsPage />} />
              <Route path="admin/finance" element={<AdminFinancePayoutsPage />} />
              <Route path="admin/finance/payouts" element={<AdminFinancePayoutsPage />} />
              <Route path="admin/personnel" element={<AdminPersonnelPage />} />
              <Route path="admin/internal-staff" element={<AdminPersonnelPage />} />
              <Route path="admin/users" element={<KycApprovalPage />} />
              <Route path="admin/kyc" element={<KycApprovalPage />} />
              <Route path="admin/kyc-approval" element={<KycApprovalPage />} />
              <Route path="admin/profile" element={<AdminProfilePage />} />

              {/* Consolidated Hubs */}
              <Route path="admin/products-pricing" element={<AdminProductPricingHubPage />} />
              <Route path="admin/arbitration" element={<AdminArbitrationHubPage />} />
              <Route path="admin/security-audit" element={<AdminSecurityAuditHubPage />} />

              {/* Backward compatibility redirects */}
              <Route path="admin/pricing" element={<Navigate to="/admin/products-pricing?tab=pricing" replace />} />
              <Route path="admin/product-moderation" element={<Navigate to="/admin/products-pricing?tab=moderation" replace />} />
              <Route path="admin/sample-requests" element={<Navigate to="/admin/arbitration?tab=samples" replace />} />
              <Route path="admin/return-disputes" element={<Navigate to="/admin/arbitration?tab=returns" replace />} />
              <Route path="admin/disputes" element={<Navigate to="/admin/arbitration?tab=returns" replace />} />
              <Route path="admin/fraud-sentinel" element={<Navigate to="/admin/security-audit?tab=fraud" replace />} />
              <Route path="admin/audit-logs" element={<Navigate to="/admin/security-audit?tab=audit" replace />} />
              <Route path="admin/audit" element={<Navigate to="/admin/security-audit?tab=audit" replace />} />
              <Route path="admin/internal-traffic-test" element={<Navigate to="/admin/security-audit?tab=sandbox" replace />} />

              <Route path="admin/returns/:id" element={<ReturnDetailPage mode="admin" />} />
              <Route path="admin/customer-reviews" element={<CustomerReviewModerationPage />} />
              <Route path="admin/vip-exceptions" element={<VipExceptionsPage />} />
              <Route path="admin/leaderboard" element={<Navigate to="/admin/analytics?tab=leaderboard" replace />} />
              <Route path="admin/kol-recommendations" element={<Navigate to="/admin/analytics?tab=ai-matching" replace />} />
              <Route path="admin/referral-links" element={<Navigate to="/admin/affiliate-oversight?tab=links" replace />} />
              <Route path="admin/coupons" element={<Navigate to="/admin/affiliate-oversight?tab=coupons" replace />} />
            </Route>
          </Route>

          <Route path="analytics" element={<RealtimeAnalyticsPage />} />
          <Route path="chat" element={<ChatBoxPage />} />
          <Route path="collaborator/messages" element={<Navigate to="/collaborator/collaboration?tab=messages" replace />} />
          <Route path="merchant/messages" element={<Navigate to="/merchant/kol-hub?tab=messages" replace />} />
        </Route>
            </Routes>
          </Suspense>
          </ErrorBoundary>
          <CartDrawer />
          <GlobalCheckoutModal />
          <ScanmsFloatingChatWidget />
          <ShoppingMobileNavigation />
        </ScanmsChatProvider>
      </CartProvider>
    </Router>
  );
}

export default AppRoutes;
