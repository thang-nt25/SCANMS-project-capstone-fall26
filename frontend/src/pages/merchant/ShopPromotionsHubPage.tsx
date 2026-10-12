import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tag, Trophy, Link2, Radio } from 'lucide-react';
import { HubTabs, type HubTabItem } from '../../components/common/HubTabs';
import ShopCouponsPage from './ShopCouponsPage';
import { CommissionRulesPage } from './CommissionRulesPage';
import StoreReferralLinksPage from './StoreReferralLinksPage';
import LiveSessionsPage from './LiveSessionsPage';

export default function ShopPromotionsHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'coupons';
  const [hasOpenedLiveTab, setHasOpenedLiveTab] = useState(activeTab === 'live-sessions');

  useEffect(() => {
    if (activeTab === 'live-sessions') setHasOpenedLiveTab(true);
  }, [activeTab]);

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
      id: 'commission-rules',
      label: 'Hoa hồng & thưởng',
      icon: Trophy,
    },
    {
      id: 'referral-links',
      label: 'Link tiếp thị',
      icon: Link2,
    },
    {
      id: 'live-sessions',
      label: 'Voucher livestream',
      icon: Radio,
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
        tone="white"
        className="promotions-tabs mb-0"
      />

      <div className="w-full min-w-0">
        {activeTab === 'coupons' && (
          <div className="animate-in fade-in-50 duration-200">
            <ShopCouponsPage />
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

        {hasOpenedLiveTab && (
          <div className={activeTab === 'live-sessions' ? 'animate-in fade-in-50 duration-200' : 'hidden'}>
            <LiveSessionsPage isActive={activeTab === 'live-sessions'} />
          </div>
        )}
      </div>
    </div>
  );
}
