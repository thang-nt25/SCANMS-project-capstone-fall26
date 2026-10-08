import { useSearchParams } from 'react-router-dom';
import { User, ShieldCheck, Share2, Award } from 'lucide-react';
import { HubTabs, type HubTabItem } from '../../components/common/HubTabs';
import CreatorAccountDetails from './CreatorAccountDetails';
import KycSubmissionPage from './KycSubmissionPage';
import SocialChannelsPage from './SocialChannelsPage';
import KolTierStatusPage from './KolTierStatusPage';
import './KolProfile.css';

export default function CreatorProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const tabs: HubTabItem[] = [
    {
      id: 'profile',
      label: 'Hồ sơ của tôi',
      icon: User,
    },
    {
      id: 'kyc',
      label: 'Định danh KYC',
      icon: ShieldCheck,
    },
    {
      id: 'social',
      label: 'Kênh mạng xã hội',
      icon: Share2,
    },
    {
      id: 'tiers',
      label: 'Cấp bậc & Vinh danh',
      icon: Award,
    },
  ];

  return (
    <div className="w-full flex flex-col" id="creator-profile-hub">
      <HubTabs
        className="kol-profile-tabs"
        tone="white"
        compact
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      <div className="w-full min-h-[500px]">
        {activeTab === 'profile' && (
          <div className="animate-in fade-in-50 duration-200">
            <CreatorAccountDetails />
          </div>
        )}

        {activeTab === 'kyc' && (
          <div className="animate-in fade-in-50 duration-200">
            <KycSubmissionPage />
          </div>
        )}

        {activeTab === 'social' && (
          <div className="animate-in fade-in-50 duration-200">
            <SocialChannelsPage />
          </div>
        )}

        {activeTab === 'tiers' && (
          <div className="animate-in fade-in-50 duration-200">
            <KolTierStatusPage />
          </div>
        )}
      </div>
    </div>
  );
}
