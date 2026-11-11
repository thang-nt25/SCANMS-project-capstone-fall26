import { Navigate } from 'react-router-dom';
import { Package, Tag } from 'lucide-react';
import { HubTabs, type HubTabItem } from '../../components/common/HubTabs';
import { authService } from '../../services/auth.service';
import { useControlledTab } from '../../hooks/useControlledTab';
import ProductModerationPage from './ProductModerationPage';
import ProductPricingPage from '../shared/ProductPricingPage';

const PRODUCT_PRICING_TABS = ['moderation', 'pricing'] as const;
type ProductPricingTab = (typeof PRODUCT_PRICING_TABS)[number];

export default function AdminProductPricingHubPage() {
  const { activeTab, setActiveTab, visitedTabs } = useControlledTab<ProductPricingTab>({
    defaultTab: 'moderation',
    validTabs: PRODUCT_PRICING_TABS,
  });

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
      label: 'Giá sàn & Giảm giá',
      icon: Tag,
    },
  ];

  return (
    <div className="w-full min-w-0 flex flex-col gap-3 text-[#1A1612]" id="admin-product-pricing-hub">
      <HubTabs
        stretchTabs
        stretchTabColumns={2}
        tone="white"
        tabs={tabs}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as ProductPricingTab)}
      />

      <div className="w-full min-w-0">
        <div style={{ display: activeTab === 'moderation' ? 'block' : 'none' }}>
          {visitedTabs['moderation'] && <ProductModerationPage />}
        </div>
        <div style={{ display: activeTab === 'pricing' ? 'block' : 'none' }}>
          {visitedTabs['pricing'] && <ProductPricingPage reviewer />}
        </div>
      </div>
    </div>
  );
}
