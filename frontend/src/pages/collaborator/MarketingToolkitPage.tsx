import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SubmitKolVideoModal } from '../../components/media/SubmitKolVideoModal';
import { Link2, Package, Tag, Video, Plus, Gift, Sparkles } from 'lucide-react';
import { type HubTabItem } from '../../components/common/HubTabs';
import { useControlledTab } from '../../hooks/useControlledTab';
import ReferralLinksPage from './ReferralLinksPage';
import SampleRequestsPage from './SampleRequestsPage';
import KolCouponsPage from './KolCouponsPage';

const MARKETING_TOOLKIT_TABS = ['links', 'deals', 'samples', 'coupons'] as const;
type MarketingToolkitTab = (typeof MARKETING_TOOLKIT_TABS)[number];

export default function MarketingToolkitPage() {
  const { activeTab, setActiveTab, visitedTabs } = useControlledTab<MarketingToolkitTab>({
    defaultTab: 'links',
    validTabs: MARKETING_TOOLKIT_TABS,
  });
  const [isSubmitVideoOpen, setIsSubmitVideoOpen] = useState(false);

  const tabs: HubTabItem[] = [
    {
      id: 'links',
      label: 'Link & QR tiếp thị',
      icon: Link2,
    },
    {
      id: 'deals',
      label: 'Deal độc quyền',
      icon: Sparkles,
    },
    {
      id: 'samples',
      label: 'Mẫu thử & Video review',
      icon: Package,
    },
    {
      id: 'coupons',
      label: 'Mã ưu đãi (Coupon)',
      icon: Tag,
    },
  ];

  const renderContextualActions = () => {
    if (activeTab === 'links' || activeTab === 'deals') return null;

    if (activeTab === 'samples') {
      return (
        <div className="flex items-center gap-2 xl:col-span-2 justify-start sm:justify-end flex-wrap">
          <button
            type="button"
            onClick={() => setIsSubmitVideoOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3.5 py-2 border border-[#EAE4D7] rounded-xl bg-white text-[#1A1612] text-xs font-semibold hover:bg-[#FAF8F5] hover:border-[#C59B58] transition-colors cursor-pointer"
            title="Nộp video review sản phẩm"
          >
            <Video className="w-4 h-4 text-[#B88E4F]" />
            <span>Nộp video review</span>
          </button>

          <Link
            to="/marketplace"
            className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-4 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition-all shadow-xs hover:shadow cursor-pointer"
            title="Khám phá và nhận sản phẩm dùng thử từ các nhãn hàng"
          >
            <Gift className="w-4 h-4" />
            <span>Khám phá sản phẩm</span>
          </Link>
        </div>
      );
    }

    // activeTab === 'coupons'
    return (
      <div className="flex items-center gap-2 xl:col-span-2 justify-start sm:justify-end flex-wrap">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('scanms_open_propose_coupon'))}
          className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-4 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition-all shadow-xs hover:shadow cursor-pointer"
          title="Đề xuất mã giảm giá mang dấu ấn cá nhân"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Đề xuất mã riêng</span>
        </button>
      </div>
    );
  };

  return (
    <div id="marketing-toolkit-hub" data-active-tab={activeTab} role="region" aria-label="Công cụ tiếp thị" className="flex flex-col gap-4 w-full min-w-0 text-[#1A1612] pb-16 md:pb-0">
      <div className="mb-1 w-full min-w-0 rounded-2xl border border-[#EAE4D7] bg-white p-2.5 shadow-2xs">
        <div role="tablist" aria-label="Công cụ tiếp thị" className="grid min-w-0 grid-cols-2 gap-2.5 lg:grid-cols-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`hub-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id as MarketingToolkitTab)}
                className={`inline-flex min-h-14 w-full min-w-0 items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center text-xs font-bold transition-all cursor-pointer sm:px-4 sm:text-sm ${
                  selected
                    ? 'border-[#C59B58] bg-[#FBF5EB] text-[#1A1612] shadow-xs'
                    : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:border-[#EEDFC6] hover:bg-[#FAF8F5]'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-[#C59B58]' : 'text-[#7D715E]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {renderContextualActions()}

      {/* Container giữ DOM: Chuyển tab 0ms mượt mà, không giật lag, không reload ngầm */}
      <div className="w-full min-w-0 min-h-[500px]">
        <div className={activeTab === 'links' || activeTab === 'deals' ? 'block' : 'hidden'} role="tabpanel" aria-labelledby={`hub-tab-${activeTab === 'deals' ? 'deals' : 'links'}`}>
          {(visitedTabs['links'] || visitedTabs['deals']) && <ReferralLinksPage view={activeTab === 'deals' ? 'deals' : 'links'} />}
        </div>

        <div className={activeTab === 'samples' ? 'block' : 'hidden'} role="tabpanel" aria-labelledby="hub-tab-samples">
          {visitedTabs['samples'] && <SampleRequestsPage embedded />}
        </div>

        <div className={activeTab === 'coupons' ? 'block' : 'hidden'} role="tabpanel" aria-labelledby="hub-tab-coupons">
          {visitedTabs['coupons'] && <KolCouponsPage />}
        </div>
      </div>

      <SubmitKolVideoModal
        isOpen={isSubmitVideoOpen}
        onClose={() => setIsSubmitVideoOpen(false)}
        onSuccess={() => window.dispatchEvent(new CustomEvent('scanms_media_updated'))}
      />
    </div>
  );
}
