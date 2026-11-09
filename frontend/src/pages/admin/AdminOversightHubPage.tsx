import { Navigate } from 'react-router-dom';
import { Link2, Tag, Radio } from 'lucide-react';
import { HubTabs, type HubTabItem } from '../../components/common/HubTabs';
import { PageHeader } from '../../components/ui/PageHeader';
import { authService } from '../../services/auth.service';
import { useControlledTab } from '../../hooks/useControlledTab';
import AdminReferralLinksPage from './AdminReferralLinksPage';
import { KolCouponManagement } from '../../components/coupons/KolCouponManagement';
import AdminLiveSessionsPage from './AdminLiveSessionsPage';

const ADMIN_OVERSIGHT_TABS = ['links', 'coupons', 'live-sessions'] as const;
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
    {
      id: 'live-sessions',
      label: 'Phiên Live',
      icon: Radio,
    },
  ];

  return (
    <div className="w-full min-w-0 flex flex-col gap-3 text-[#1A1612]" id="admin-oversight-hub">
      <PageHeader
        title="Giám sát tiếp thị"
        icon={<Link2 className="w-5 h-5 text-[#B88E4F]" />}
      />

      <HubTabs
        className="mb-2 shadow-none"
        compact
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

        {visitedTabs['live-sessions'] && (
          <div className={activeTab === 'live-sessions' ? 'block animate-in fade-in-50 duration-200' : 'hidden'}>
            <AdminLiveSessionsPage />
          </div>
        )}
      </div>
    </div>
  );
}
