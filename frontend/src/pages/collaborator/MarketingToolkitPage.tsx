import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SubmitKolVideoModal } from '../../components/media/SubmitKolVideoModal';
import { Link2, Images, Tag, Video, Plus } from 'lucide-react';
import { HubTabs, type HubTabItem } from '../../components/common/HubTabs';
import ReferralLinksPage from './ReferralLinksPage';
import MediaHubBrowserPage from './MediaHubBrowserPage';
import KolCouponsPage from './KolCouponsPage';
import './MarketingToolkitPage.css';

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
    <div className="kol-marketing-actions">
      <button
        type="button"
        onClick={() => setIsSubmitVideoOpen(true)}
        className="kol-marketing-action inline-flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0"
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
            setTimeout(() => window.dispatchEvent(new CustomEvent('scanms_open_create_link')), 150);
          } else {
            window.dispatchEvent(new CustomEvent('scanms_open_create_link'));
          }
        }}
        className="kol-marketing-action kol-marketing-primary inline-flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0"
        title="Tạo link tiếp thị mới"
      >
        <Plus className="w-3.5 h-3.5 text-[#B88E4F]" />
        <span>Tạo link mới</span>
      </button>

    </div>
  );

  return (
    <div id="marketing-toolkit-hub" data-active-tab={activeTab} role="region" aria-label="Công cụ tiếp thị">
      <HubTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        actions={actions}
        variant="pills"
        compact
        className="kol-marketing-toolbar mb-3 bg-white border border-[#EAE4D7] rounded-2xl"
      />

      <div className="kol-marketing-content w-full min-h-[500px]">
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
