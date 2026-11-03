import { useLocation, useNavigate } from 'react-router-dom';
import { User, ShieldCheck, Share2, Award } from 'lucide-react';
import { HubTabs, type HubTabItem } from '../../components/common/HubTabs';
import { useControlledTab } from '../../hooks/useControlledTab';
import CreatorAccountDetails from './CreatorAccountDetails';
import KycSubmissionPage from './KycSubmissionPage';
import SocialChannelsPage from './SocialChannelsPage';
import KolTierStatusPage from './KolTierStatusPage';

const CREATOR_PROFILE_TABS = ['profile', 'kyc', 'social', 'tiers'] as const;
type CreatorProfileTab = (typeof CREATOR_PROFILE_TABS)[number];

export default function CreatorProfilePage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isLeaderboard = pathname === '/collaborator/leaderboard';
  const isBonusProgress = pathname === '/collaborator/bonus-progress';
  const isTierPage = isLeaderboard || isBonusProgress;

  const { activeTab, setActiveTab } = useControlledTab<CreatorProfileTab>({
    defaultTab: isTierPage ? 'tiers' : 'profile',
    validTabs: CREATOR_PROFILE_TABS,
  });

  const handleTabChange = (tabId: string) => {
    if (isTierPage) {
      navigate(`/collaborator/profile?tab=${tabId}`);
      return;
    }
    setActiveTab(tabId as CreatorProfileTab);
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
    <div className="w-full flex flex-col" id="creator-profile-hub" data-profile-tab={activeTab}>
      <HubTabs
        className="kol-profile-tabs"
        tone="white"
        compact
        stretchTabs
        stretchTabColumns={4}
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      <div className="w-full min-w-0">
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
            <KolTierStatusPage view={isLeaderboard ? 'leaderboard' : isBonusProgress ? 'bonus' : 'tiers'} />
          </div>
        )}
      </div>
    </div>
  );
}
