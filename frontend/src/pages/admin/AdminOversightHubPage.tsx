import { useState, useEffect } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { Link2, Tag, Radio, Store } from 'lucide-react';
import { SponsoredPlacementsPanel } from '../../components/stores/SponsoredPlacementsPanel';
import { HubTabs, type HubTabItem } from '../../components/common/HubTabs';
import { PageHeader } from '../../components/ui/PageHeader';
import { authService } from '../../services/auth.service';
import AdminReferralLinksPage from './AdminReferralLinksPage';
import AdminCouponsPage from './AdminCouponsPage';
import AdminLiveSessionsPage from './AdminLiveSessionsPage';

export default function AdminOversightHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'links';
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>(() => ({ [activeTab]: true }));

  useEffect(() => {
    setVisitedTabs((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
  }, [activeTab]);

  const user = authService.getCurrentUser();
  if (user && user.role === 'SHOP_MANAGER') {
    return <Navigate to="/merchant/promotions?tab=referral-links" replace />;
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

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const tabs: HubTabItem[] = [
    { id: 'sponsorship', label: 'Gian hàng tài trợ', icon: Store },
    {
      id: 'links',
      label: 'Quản trị Link Tiếp thị Sàn',
      icon: Link2,
    },
    {
      id: 'coupons',
      label: 'Quản trị Mã Giảm Giá Sàn',
      icon: Tag,
    },
    {
      id: 'live-sessions',
      label: 'Giám sát Livestream',
      icon: Radio,
    },
  ];

  return (
    <div className="w-full min-w-0 flex flex-col gap-4 text-[#1A1612]" id="admin-oversight-hub">
      {/* 1. Page Header Chuẩn Hóa */}
      <PageHeader
        title="Tiếp thị & Dòng tiền Sàn"
        description="Giám sát mạng lưới link liên kết, mã giảm giá và các phiên livestream bán hàng toàn hệ thống"
        icon={<Link2 className="w-5 h-5" />}
      />

      <HubTabs
        className="mb-2 shadow-none"
        compact
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        stretchTabs
        stretchTabColumns={4}
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
            <AdminCouponsPage />
          </div>
        )}

        {visitedTabs['live-sessions'] && (
          <div className={activeTab === 'live-sessions' ? 'block animate-in fade-in-50 duration-200' : 'hidden'}>
            <AdminLiveSessionsPage />
          </div>
        )}

        {visitedTabs['sponsorship'] && (
          <div className={activeTab === 'sponsorship' ? 'block animate-in fade-in-50 duration-200' : 'hidden'}>
            <SponsoredPlacementsPanel admin />
          </div>
        )}
      </div>
    </div>
  );
}
