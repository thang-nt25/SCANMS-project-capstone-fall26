import { useState } from 'react';
import { BadgePercent, Tag, Trophy } from 'lucide-react';
import type { HubTabItem } from '../../components/common/HubTabs';
import { useControlledTab } from '../../hooks/useControlledTab';
import { ShopPricePromotionsTab } from '../../components/promotions/ShopPricePromotionsTab';
import { ShopCreatorIncentivesTab } from '../../components/promotions/ShopCreatorIncentivesTab';

const PROMOTIONS_TABS = ['price-promotions', 'creator-incentives'] as const;
const INCENTIVE_SECTIONS = ['coupons', 'milestones'] as const;
type PromotionHubTab = (typeof PROMOTIONS_TABS)[number];

export default function ShopPromotionsHubPage() {
  const [couponCount, setCouponCount] = useState<number | null>(null);
  const { activeTab: activeSection, setActiveTab: setActiveSection } = useControlledTab({
    paramKey: 'section', defaultTab: 'coupons', validTabs: INCENTIVE_SECTIONS,
  });
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
      label: 'Mã ưu đãi KOC',
      icon: Tag,
    },
    {
      id: 'monthly-rewards',
      label: 'Thưởng mốc tháng',
      icon: Trophy,
    },
  ];

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-6 text-[#1A1612]" id="shop-promotions-hub">
      <nav className="promotion-primary-nav" aria-label="Nhóm quản lý ưu đãi">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const selected = tab.id === 'price-promotions' ? activeTab === 'price-promotions' : activeTab === 'creator-incentives' && activeSection === (tab.id === 'monthly-rewards' ? 'milestones' : 'coupons');
          return <button key={tab.id} type="button" aria-pressed={selected} onClick={() => {
            setActiveTab(tab.id === 'price-promotions' ? 'price-promotions' : 'creator-incentives');
            if (tab.id !== 'price-promotions') setActiveSection(tab.id === 'monthly-rewards' ? 'milestones' : 'coupons');
          }}><Icon size={17}/><span>{tab.label}</span>{tab.id === 'creator-incentives' && couponCount !== null && <span className="rounded-md bg-[#F3EFE6] px-1.5 py-0.5 text-[11px] tabular-nums text-[#7D715E]">{couponCount}</span>}</button>;
        })}
      </nav>

      <div className="w-full min-w-0">
        {visitedTabs['price-promotions'] && (
          <div className={activeTab === 'price-promotions' ? 'block animate-in fade-in-50 duration-200' : 'hidden'}>
            <ShopPricePromotionsTab />
          </div>
        )}

        {visitedTabs['creator-incentives'] && (
          <div className={activeTab === 'creator-incentives' ? 'block animate-in fade-in-50 duration-200' : 'hidden'}>
            <ShopCreatorIncentivesTab section={activeSection} hideNavigation onCouponCount={setCouponCount}/>
          </div>
        )}
      </div>
    </div>
  );
}
