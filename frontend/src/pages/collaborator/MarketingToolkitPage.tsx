import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SubmitKolVideoModal } from '../../components/media/SubmitKolVideoModal';
import { Link2, Package, Tag, Video, Plus, Gift } from 'lucide-react';
import { type HubTabItem } from '../../components/common/HubTabs';
import ReferralLinksPage from './ReferralLinksPage';
import SampleRequestsPage from './SampleRequestsPage';
import KolCouponsPage from './KolCouponsPage';

export default function MarketingToolkitPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const rawTab = searchParams.get('tab') || 'links';
  // Chuẩn hóa tab cũ 'media' -> 'samples'
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
      label: 'Link & QR tiếp thị',
      icon: Link2,
    },
    {
      id: 'samples',
      label: 'Mẫu thử & Video review',
      icon: Package,
    },
    {
      id: 'coupons',
      label: 'Mã giảm giá độc quyền',
      icon: Tag,
    },
  ];

  const renderContextualActions = () => {
    if (activeTab === 'links') {
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

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('scanms_open_create_link'))}
            className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-4 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition-all shadow-xs hover:shadow cursor-pointer"
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

          <button
            type="button"
            onClick={() => navigate('/collaborator/collaboration?tab=samples')}
            className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-4 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition-all shadow-xs hover:shadow cursor-pointer"
            title="Khám phá và nhận sản phẩm dùng thử từ Shop"
          >
            <Gift className="w-4 h-4" />
            <span>Khám phá mẫu thử</span>
          </button>
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
      <div className="mb-1 grid w-full min-w-0 grid-cols-1 gap-2 rounded-2xl border border-[#EAE4D7] bg-white p-2.5 xl:grid-cols-5 items-center shadow-2xs">
        <div role="tablist" aria-label="Công cụ tiếp thị" className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3 xl:col-span-3">
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
                className={`inline-flex min-h-[42px] min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
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

