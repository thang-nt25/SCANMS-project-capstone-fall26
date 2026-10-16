import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SubmitKolVideoModal } from '../../components/media/SubmitKolVideoModal';
import { Link2, Images, Tag, Video, Plus } from 'lucide-react';
import { HubTabs, type HubTabItem } from '../../components/common/HubTabs';
import { PageHeader } from '../../components/ui/PageHeader';
import ReferralLinksPage from './ReferralLinksPage';
import MediaHubBrowserPage from './MediaHubBrowserPage';
import KolCouponsPage from './KolCouponsPage';
export default function MarketingToolkitPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'links';
  const [isSubmitVideoOpen, setIsSubmitVideoOpen] = useState(false);

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const tabs: HubTabItem[] = [
    {
      id: 'links',
      label: 'Link & QR tiếp thị',
      icon: Link2,
    },
    {
      id: 'media',
      label: 'Kho nội dung',
      icon: Images,
    },
    {
      id: 'coupons',
      label: 'Mã giảm giá độc quyền',
      icon: Tag,
    },
  ];

  const actions = (
    <div className="flex items-center gap-2 shrink-0 flex-wrap">
      <button
        type="button"
        onClick={() => setIsSubmitVideoOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 py-2 border border-[#EAE4D7] rounded-lg bg-white text-[#1A1612] text-xs font-bold hover:bg-[#F3EFE6] hover:border-[#C59B58] transition-colors whitespace-nowrap shrink-0 shadow-none focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-2 cursor-pointer"
        title="Nộp video review sản phẩm"
      >
        <Video className="w-3.5 h-3.5 text-[#B88E4F]" />
        <span>Nộp video review</span>
      </button>

      <button
        type="button"
        onClick={() => {
          if (activeTab !== 'links') {
            handleTabChange('links');
            setTimeout(() => window.dispatchEvent(new CustomEvent('scanms_open_create_link')), 200);
          } else {
            window.dispatchEvent(new CustomEvent('scanms_open_create_link'));
          }
        }}
        className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3.5 py-2 border border-[#C59B58] rounded-lg bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 shadow-xs cursor-pointer active:scale-95"
        title="Tạo link tiếp thị mới"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Tạo link mới</span>
      </button>
    </div>
  );

  return (
    <div id="marketing-toolkit-hub" data-active-tab={activeTab} role="region" aria-label="Công cụ tiếp thị" className="flex flex-col gap-4 w-full min-w-0 text-[#1A1612] pb-16 md:pb-0">
      {/* 1. Page Header Chuẩn Hóa */}
      <PageHeader
        title="Trung tâm Tiếp thị & Sáng tạo"
        description="Tạo link tiếp thị, truy cập kho tài nguyên số của nhãn hàng và kích hoạt mã giảm giá độc quyền"
        icon={<Link2 className="w-5 h-5" />}
      />

      <HubTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        actions={actions}
        variant="pills"
        compact
        className="mb-1 bg-white border border-[#EAE4D7] rounded-2xl p-1.5 shadow-none"
      />

      <div className="w-full min-w-0 min-h-[500px]">
        {activeTab === 'links' && (
          <div className="animate-in fade-in-50 duration-200">
            <ReferralLinksPage />
          </div>
        )}

        {activeTab === 'media' && (
          <div className="animate-in fade-in-50 duration-200">
            <MediaHubBrowserPage />
          </div>
        )}

        {activeTab === 'coupons' && (
          <div className="animate-in fade-in-50 duration-200">
            <KolCouponsPage />
          </div>
        )}
      </div>
      <SubmitKolVideoModal
        isOpen={isSubmitVideoOpen}
        onClose={() => setIsSubmitVideoOpen(false)}
        onSuccess={() => window.dispatchEvent(new CustomEvent('scanms_media_updated'))}
      />
    </div>
  );
}
