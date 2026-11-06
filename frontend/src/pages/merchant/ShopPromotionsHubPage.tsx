import { BadgePercent, Users } from 'lucide-react';
import { HubTabs, type HubTabItem } from '../../components/common/HubTabs';
import { useControlledTab } from '../../hooks/useControlledTab';
import { ShopPricePromotionsTab } from '../../components/promotions/ShopPricePromotionsTab';
import { ShopCreatorIncentivesTab } from '../../components/promotions/ShopCreatorIncentivesTab';

const PROMOTIONS_TABS = ['price-promotions', 'creator-incentives'] as const;
type PromotionHubTab = (typeof PROMOTIONS_TABS)[number];

export default function ShopPromotionsHubPage() {
  const { activeTab, setActiveTab, visitedTabs } = useControlledTab<PromotionHubTab>({
    defaultTab: 'price-promotions',
    validTabs: PROMOTIONS_TABS,
  });

  const tabs: HubTabItem[] = [
    {
      id: 'price-promotions',
      label: 'Giảm giá sản phẩm',
      icon: BadgePercent,
    },
    {
      id: 'creator-incentives',
      label: 'Đãi ngộ & Mã ưu đãi KOC',
      icon: Users,
    },
  ];

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-6 text-[#1A1612]" id="shop-promotions-hub">
      <HubTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as PromotionHubTab)}
        compact
        stretchTabs
        stretchTabColumns={2}
        tone="white"
        className="promotions-tabs mb-0"
      />

      <div className="w-full min-w-0">
        {visitedTabs['price-promotions'] && (
          <div className={activeTab === 'price-promotions' ? 'block animate-in fade-in-50 duration-200' : 'hidden'}>
            <ShopPricePromotionsTab />
          </div>
        )}

        {visitedTabs['creator-incentives'] && (
          <div className={activeTab === 'creator-incentives' ? 'block animate-in fade-in-50 duration-200' : 'hidden'}>
            <ShopCreatorIncentivesTab />
          </div>
        )}
      </div>
    </div>
  );
}
