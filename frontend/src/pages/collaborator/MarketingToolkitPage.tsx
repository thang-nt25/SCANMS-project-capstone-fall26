import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SubmitKolVideoModal } from '../../components/media/SubmitKolVideoModal';
import { Link2, Package, Tag, Video, Plus } from 'lucide-react';
import { type HubTabItem } from '../../components/common/HubTabs';
import ReferralLinksPage from './ReferralLinksPage';
import SampleRequestsPage from './SampleRequestsPage';
import KolCouponsPage from './KolCouponsPage';

export default function MarketingToolkitPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'links';
  const activeTab = useMemo(() => (rawTab === 'media' ? 'samples' : rawTab), [rawTab]);
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({
    [activeTab]: true,
  });
  const [isSubmitVideoOpen, setIsSubmitVideoOpen] = useState(false);

  const handleTabChange = (tabId: string) => {
    setVisitedTabs((prev) => ({ ...prev, [tabId]: true }));
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const tabs: HubTabItem[] = [
    {
      id: 'links',
      label: 'Link & QR',
      icon: Link2,
    },
    {
      id: 'samples',
      label: 'Mẫu thử & Review',
      icon: Package,
    },
    {
      id: 'coupons',
      label: 'Mã giảm giá',
      icon: Tag,
    },
  ];

  const renderContextualActions = () => {
    if (activeTab === 'links') {
      return (
        <div className="grid w-full min-w-0 grid-cols-1 items-stretch gap-2 [&>button]:w-full [&>button]:min-w-0 [&>button]:h-[42px] [&>button]:font-semibold [&>button]:shadow-none">
          <button
            type="button"
            onClick={() => {
              setSearchParams({ tab: 'links', action: 'create' }, { replace: true });
              window.dispatchEvent(new CustomEvent('scanms_open_create_link'));
            }}
            className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-4 py-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-[#1A1612] text-xs font-semibold transition-colors cursor-pointer"
            title="Tạo link tiếp thị mới"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tạo link tiếp thị</span>
          </button>
        </div>
      );
    }

    if (activeTab === 'samples') {
      return (
        <div className="grid w-full min-w-0 grid-cols-1 items-stretch gap-2 [&>button]:w-full [&>button]:min-w-0 [&>button]:h-[42px] [&>button]:font-semibold [&>button]:shadow-none">
          <button
            type="button"
            onClick={() => setIsSubmitVideoOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3.5 py-2 border border-[#EAE4D7] rounded-xl bg-white text-[#1A1612] text-xs font-semibold hover:bg-[#FAF8F5] hover:border-[#C59B58] transition-colors cursor-pointer"
            title="Nộp video review sản phẩm"
          >
            <Video className="w-4 h-4 text-[#B88E4F]" />
            <span>Nộp video review</span>
          </button>


        </div>
      );
    }

    // activeTab === 'coupons'
    return (
      <div className="grid w-full min-w-0 grid-cols-1 items-stretch gap-2 [&>button]:w-full [&>button]:min-w-0 [&>button]:h-[42px] [&>button]:font-semibold [&>button]:shadow-none">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('scanms_open_propose_coupon'))}
          className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-4 py-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-[#1A1612] text-xs font-semibold transition-colors cursor-pointer"
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
      <div className="mb-1 grid w-full min-w-0 grid-cols-1 gap-2 rounded-2xl border border-[#EAE4D7] bg-white p-2 lg:grid-cols-[minmax(0,1fr)_210px] items-stretch shadow-2xs">
        <div role="tablist" aria-label="Công cụ tiếp thị" className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
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
                onClick={() => handleTabChange(tab.id)}
                className={`inline-flex h-[42px] min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  selected
                    ? 'border-[#EEDFC6] bg-[#FBF5EB] text-[#1A1612]'
                    : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:border-[#EEDFC6] hover:bg-[#FAF8F5]'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-[#C59B58]' : 'text-[#7D715E]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        {renderContextualActions()}
      </div>

      {/* Container giữ DOM: Chuyển tab 0ms mượt mà, không giật lag, không reload ngầm */}
      <div className="w-full min-w-0 min-h-[500px]">
        <div className={activeTab === 'links' ? 'block' : 'hidden'} role="tabpanel" aria-labelledby="hub-tab-links">
          {visitedTabs['links'] && <ReferralLinksPage />}
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

