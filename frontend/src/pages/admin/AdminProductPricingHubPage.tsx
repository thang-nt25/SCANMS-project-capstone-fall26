import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Flag, Package, ShieldCheck, Tag } from 'lucide-react';
import { HubTabs, type HubTabItem } from '../../components/common/HubTabs';
import { authService } from '../../services/auth.service';
import { useControlledTab } from '../../hooks/useControlledTab';
import ProductModerationPage from './ProductModerationPage';
import ProductPricingPage from '../shared/ProductPricingPage';
import ProductReportsPanel from './ProductReportsPanel';

const PRODUCT_PRICING_TABS = ['moderation', 'pricing', 'promotions', 'reports'] as const;
type ProductPricingTab = (typeof PRODUCT_PRICING_TABS)[number];

export default function AdminProductPricingHubPage() {
  const { activeTab, setActiveTab, visitedTabs } = useControlledTab<ProductPricingTab>({
    defaultTab: 'moderation',
    validTabs: PRODUCT_PRICING_TABS,
  });
  const [pendingCount, setPendingCount] = useState(0);

  const user = authService.getCurrentUser();
  if (user && user.role === 'SHOP_MANAGER') {
    return <Navigate to="/merchant/pricing" replace />;
  }
  if (user && user.role === 'COLLABORATOR') {
    return <Navigate to="/collaborator/dashboard" replace />;
  }
  if (user && user.role === 'CUSTOMER') {
    return <Navigate to="/customer/orders" replace />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const tabs: HubTabItem[] = [
    {
      id: 'moderation',
      label: 'Kiểm duyệt sản phẩm',
      icon: Package,
    },
    {
      id: 'pricing',
      label: 'Giá sàn MAP',
      icon: ShieldCheck,
    },
    {
      id: 'promotions',
      label: 'Đề xuất giảm giá',
      icon: Tag,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { id: 'reports', label: 'Báo cáo sản phẩm', icon: Flag },
  ];

  return (
    <div className="w-full min-w-0 flex flex-col gap-3 text-[#1A1612]" id="admin-product-pricing-hub">
      <HubTabs
        className="mb-0"
        variant="framed"
        stretchTabs
        stretchTabColumns={4}
        tone="white"
        tabs={tabs}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as ProductPricingTab)}
      />

      <div className="w-full min-w-0">
        <div role="tabpanel" aria-labelledby="hub-tab-moderation" hidden={activeTab !== 'moderation'}>
          {visitedTabs['moderation'] && <ProductModerationPage />}
        </div>
        <div hidden={activeTab !== 'pricing' && activeTab !== 'promotions'}>
          {(visitedTabs.pricing || visitedTabs.promotions) && (
            <ProductPricingPage
              reviewer
              pricingSection={activeTab === 'promotions' ? 'promotions' : 'floor'}
              onPendingCountChange={setPendingCount}
            />
          )}
        </div>
        {activeTab === 'reports' && (
          <div role="tabpanel" aria-labelledby="hub-tab-reports">
            <ProductReportsPanel admin={user.role === 'SYSTEM_ADMIN'} />
          </div>
        )}
      </div>
    </div>
  );
}
