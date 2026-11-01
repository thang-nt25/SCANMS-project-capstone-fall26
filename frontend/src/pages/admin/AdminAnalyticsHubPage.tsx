import { ExecutiveFinanceReport } from '../../components/wallet/FinanceReports';
import { authService } from '../../services/auth.service';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendingUp, Trophy, Sparkles } from 'lucide-react';
import { HubTabs, type HubTabItem } from '../../components/common/HubTabs';
import { PageHeader } from '../../components/ui/PageHeader';
import RealtimeAnalyticsPage from '../dashboard/RealtimeAnalyticsPage';
import LeaderboardPage from '../dashboard/LeaderboardPage';
import KolRecommendationPage from '../merchant/KolRecommendationPage';

export default function AdminAnalyticsHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = authService.getCurrentUser()?.role === 'SYSTEM_ADMIN';
  const activeTab = searchParams.get('tab') || (isAdmin ? 'finance' : 'realtime');
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>(() => ({ [activeTab]: true }));

  useEffect(() => {
    setVisitedTabs((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
  }, [activeTab]);

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const tabs: HubTabItem[] = [
    ...(isAdmin ? [{ id: 'finance', label: 'Tài chính doanh nghiệp', icon: TrendingUp }] : []),
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
    <div className="w-full min-w-0 flex flex-col gap-4 text-[#1A1612]" id="admin-analytics-hub">
      {/* 1. Page Header Chuẩn Hóa */}
      <PageHeader
        title="Trung tâm Báo cáo & Phân tích Sàn"
        description="Theo dõi doanh thu toàn sàn, bảng xếp hạng Top KOL và khớp nối AI thời gian thực"
        icon={<TrendingUp className="w-5 h-5" />}
      />

      <HubTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        tone="white"
        compact
        stretchTabs
        className="mb-2 shadow-none"
      />

      <div className="w-full min-h-[500px]">
        {isAdmin && activeTab === 'finance' && <ExecutiveFinanceReport />}
        {visitedTabs['realtime'] && (
          <div className={activeTab === 'realtime' ? 'block animate-in fade-in-50 duration-200' : 'hidden'}>
            <RealtimeAnalyticsPage />
          </div>
        )}

        {visitedTabs['leaderboard'] && (
          <div className={activeTab === 'leaderboard' ? 'block animate-in fade-in-50 duration-200' : 'hidden'}>
            <LeaderboardPage alignToContainer />
          </div>
        )}

        {visitedTabs['ai-matching'] && (
          <div className={activeTab === 'ai-matching' ? 'block animate-in fade-in-50 duration-200' : 'hidden'}>
            <KolRecommendationPage />
          </div>
        )}
      </div>
    </div>
  );
}
