import { useState, useEffect } from 'react';
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
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>(() => ({ [activeTab]: true }));

  useEffect(() => {
    setVisitedTabs((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
  }, [activeTab]);

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
        {visitedTabs['coupons'] && (
          <div className={activeTab === 'coupons' ? 'block animate-in fade-in-50 duration-200' : 'hidden'}>
            <ShopCouponsPage />
          </div>
        )}

        {visitedTabs['campaigns'] && (
          <div className={activeTab === 'campaigns' ? 'block animate-in fade-in-50 duration-200' : 'hidden'}>
            <ShopCampaignsPage embedded />
          </div>
        )}

        {visitedTabs['exclusive-deals'] && (
          <div className={activeTab === 'exclusive-deals' ? 'block animate-in fade-in-50 duration-200' : 'hidden'}>
            <ExclusiveDealInbox />
          </div>
        )}

        {visitedTabs['commission-rules'] && (
          <div className={activeTab === 'commission-rules' ? 'block animate-in fade-in-50 duration-200' : 'hidden'}>
            <CommissionRulesPage />
          </div>
        )}

        {visitedTabs['referral-links'] && (
          <div className={activeTab === 'referral-links' ? 'block animate-in fade-in-50 duration-200' : 'hidden'}>
            <StoreReferralLinksPage />
          </div>
        )}
      </div>
    </div>
  );
}
