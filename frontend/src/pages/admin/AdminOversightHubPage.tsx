import { Navigate } from 'react-router-dom';
import { Link2, Megaphone, Tag } from 'lucide-react';
import { HubTabs, type HubTabItem } from '../../components/common/HubTabs';
import { authService } from '../../services/auth.service';
import { useControlledTab } from '../../hooks/useControlledTab';
import AdminReferralLinksPage from './AdminReferralLinksPage';
import { KolCouponManagement } from '../../components/coupons/KolCouponManagement';
import { SponsoredPlacementsPanel } from '../../components/stores/SponsoredPlacementsPanel';

const ADMIN_OVERSIGHT_TABS = ['links', 'coupons', 'sponsorship'] as const;
type AdminOversightTab = (typeof ADMIN_OVERSIGHT_TABS)[number];

export default function AdminOversightHubPage() {
  const { activeTab, setActiveTab, visitedTabs } = useControlledTab<AdminOversightTab>({
    defaultTab: 'links',
    validTabs: ADMIN_OVERSIGHT_TABS,
  });

  const user = authService.getCurrentUser();
  if (user && user.role === 'SHOP_MANAGER') {
    return <Navigate to="/merchant/kol-hub?tab=performance" replace />;
  }
  if (user && user.role === 'COLLABORATOR') {
    return <Navigate to="/collaborator/marketing?tab=links" replace />;
  }
  if (user && user.role === 'CUSTOMER') {
    return <Navigate to="/customer/orders" replace />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const tabs: HubTabItem[] = [
    {
      id: 'links',
      label: 'Liên kết tiếp thị',
      icon: Link2,
    },
    {
      id: 'coupons',
      label: 'Mã ưu đãi KOL',
      icon: Tag,
    },
    { id: 'sponsorship', label: 'Quảng bá gian hàng', icon: Megaphone },
  ];

  return (
    <div className="w-full min-w-0 flex flex-col gap-3 text-[#1A1612]" id="admin-oversight-hub">
      <HubTabs
        className="mb-0"
        variant="framed"
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as AdminOversightTab)}
        stretchTabs
        stretchTabColumns={3}
        tone="white"
      />

      <div className="w-full min-h-[500px]">
        {visitedTabs['links'] && (
          <div className={activeTab === 'links' ? 'block animate-in fade-in-50 duration-200' : 'hidden'}>
            <AdminReferralLinksPage />
          </div>
        )}

        {visitedTabs['coupons'] && (
          <div className={activeTab === 'coupons' ? 'block animate-in fade-in-50 duration-200' : 'hidden'}>
            <KolCouponManagement shop={false} />
          </div>
        )}
        {visitedTabs['sponsorship'] && (
          <div hidden={activeTab !== 'sponsorship'}>
            <SponsoredPlacementsPanel admin />
          </div>
        )}
      </div>
    </div>
  );
}
