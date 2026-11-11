import { Navigate } from 'react-router-dom';
import { Scale, Package } from 'lucide-react';
import { HubTabs, type HubTabItem } from '../../components/common/HubTabs';
import { PageHeader } from '../../components/ui/PageHeader';
import { authService } from '../../services/auth.service';
import { useControlledTab } from '../../hooks/useControlledTab';
import AdminReturnDisputesPage from './AdminReturnDisputesPage';
import AdminSampleRequestsPage from './AdminSampleRequestsPage';

const ARBITRATION_TABS = ['returns', 'samples'] as const;
type ArbitrationTab = (typeof ARBITRATION_TABS)[number];

export default function AdminArbitrationHubPage() {
  const { activeTab, setActiveTab, visitedTabs } = useControlledTab<ArbitrationTab>({
    defaultTab: 'returns',
    validTabs: ARBITRATION_TABS,
  });

  const user = authService.getCurrentUser();
  if (user && user.role === 'SHOP_MANAGER') {
    return <Navigate to="/merchant/samples" replace />;
  }
  if (user && user.role === 'COLLABORATOR') {
    return <Navigate to="/collaborator/samples" replace />;
  }
  if (user && user.role === 'CUSTOMER') {
    return <Navigate to="/customer/orders" replace />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const tabs: HubTabItem[] = [
    {
      id: 'returns',
      label: 'Khiếu nại đổi trả',
      icon: Scale,
    },
    {
      id: 'samples',
      label: 'Vi phạm hàng mẫu',
      icon: Package,
    },
  ];

  return (
    <div className="w-full min-w-0 flex flex-col gap-3 text-[#1A1612]" id="admin-arbitration-hub">
      <PageHeader
        title="Trọng tài & Pháp chế"
        icon={<Scale className="w-5 h-5 text-[#B88E4F]" />}
      />

      <HubTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as ArbitrationTab)}
      />

      <div className="w-full min-w-0">
        <div style={{ display: activeTab === 'returns' ? 'block' : 'none' }}>
          {visitedTabs['returns'] && <AdminReturnDisputesPage />}
        </div>
        <div style={{ display: activeTab === 'samples' ? 'block' : 'none' }}>
          {visitedTabs['samples'] && <AdminSampleRequestsPage />}
        </div>
      </div>
    </div>
  );
}
