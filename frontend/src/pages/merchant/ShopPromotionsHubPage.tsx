import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tag, Calendar, Handshake, Trophy, Link2 } from 'lucide-react';
import { HubTabs, type HubTabItem } from '../../components/common/HubTabs';
import ShopCouponsPage from './ShopCouponsPage';
import ShopCampaignsPage from './ShopCampaignsPage';
import { ExclusiveDealInbox } from '../../components/affiliate/ExclusiveDealInbox';
import { CommissionRulesPage } from './CommissionRulesPage';
import StoreReferralLinksPage from './StoreReferralLinksPage';

export default function ShopPromotionsHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'coupons';

  useEffect(() => {
    if (activeTab === 'live-sessions') {
      navigate('/merchant/live-sessions', { replace: true });
    }
  }, [activeTab, navigate]);

  const handleTabChange = (tabId: string) => {
    setSearchParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        updated.set('tab', tabId);
        return updated;
      },
      { replace: true }
    );
  };

  const tabs: HubTabItem[] = [
    {
      id: 'coupons',
      label: 'Mã giảm giá',
      icon: Tag,
    },
    {
      id: 'campaigns',
      label: 'Chiến dịch',
      icon: Calendar,
    },
    {
      id: 'exclusive-deals',
      label: 'Thỏa thuận độc quyền',
      icon: Handshake,
    },
    {
      id: 'commission-rules',
      label: 'Thưởng mốc doanh số',
      icon: Trophy,
    },
    {
      id: 'referral-links',
      label: 'Link tiếp thị',
      icon: Link2,
    },
  ];

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-6 text-[#1A1612]" id="shop-promotions-hub">
      <HubTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        compact
        stretchTabs
        stretchTabColumns={5}
        tone="white"
        className="promotions-tabs mb-0"
      />

      <div className="w-full min-w-0">
        {activeTab === 'coupons' && (
          <div className="animate-in fade-in-50 duration-200">
            <ShopCouponsPage />
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="animate-in fade-in-50 duration-200">
            <ShopCampaignsPage embedded />
          </div>
        )}

        {activeTab === 'exclusive-deals' && (
          <div className="animate-in fade-in-50 duration-200">
            <ExclusiveDealInbox />
          </div>
        )}

        {activeTab === 'commission-rules' && (
          <div className="animate-in fade-in-50 duration-200">
            <CommissionRulesPage />
          </div>
        )}

        {activeTab === 'referral-links' && (
          <div className="animate-in fade-in-50 duration-200">
            <StoreReferralLinksPage />
          </div>
        )}
      </div>
    </div>
  );
}
