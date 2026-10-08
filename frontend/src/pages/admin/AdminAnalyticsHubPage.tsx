import { useSearchParams } from 'react-router-dom';
import { TrendingUp, Trophy, Sparkles } from 'lucide-react';
import { HubTabs, type HubTabItem } from '../../components/common/HubTabs';
import RealtimeAnalyticsPage from '../dashboard/RealtimeAnalyticsPage';
import LeaderboardPage from '../dashboard/LeaderboardPage';
import KolRecommendationPage from '../merchant/KolRecommendationPage';
import './AdminAnalyticsHubPage.css';

export default function AdminAnalyticsHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'realtime';

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const tabs: HubTabItem[] = [
    {
      id: 'realtime',
      label: 'Analytics thời gian thực',
      icon: TrendingUp,
    },
    {
      id: 'leaderboard',
      label: 'Bảng vinh danh Top KOL',
      icon: Trophy,
    },
    {
      id: 'ai-matching',
      label: 'AI khớp nối toàn sàn',
      icon: Sparkles,
    },
  ];

  return (
    <div className="w-full min-w-0 flex flex-col pt-4 text-[#1A1612] sm:pt-5" id="admin-analytics-hub">
      <HubTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        tone="white"
        compact
        stretchTabs
        className="admin-analytics-tabs"
      />

      <div className="w-full min-h-[500px]">
        {activeTab === 'realtime' && (
          <div className="animate-in fade-in-50 duration-200">
            <RealtimeAnalyticsPage />
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="animate-in fade-in-50 duration-200">
            <LeaderboardPage alignToContainer />
          </div>
        )}

        {activeTab === 'ai-matching' && (
          <div className="animate-in fade-in-50 duration-200">
            <KolRecommendationPage />
          </div>
        )}
      </div>
    </div>
  );
}
