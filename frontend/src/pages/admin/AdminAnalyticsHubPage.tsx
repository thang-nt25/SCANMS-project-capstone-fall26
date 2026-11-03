import { ExecutiveFinanceReport } from '../../components/wallet/FinanceReports';
import { authService } from '../../services/auth.service';
import { useSearchParams } from 'react-router-dom';
import { TrendingUp, Trophy } from 'lucide-react';
import type { HubTabItem } from '../../components/common/HubTabs';
import RealtimeAnalyticsPage from '../dashboard/RealtimeAnalyticsPage';
import LeaderboardPage from '../dashboard/LeaderboardPage';

export default function AdminAnalyticsHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = authService.getCurrentUser()?.role === 'SYSTEM_ADMIN';
  const activeTab = searchParams.get('tab') || (isAdmin ? 'finance' : 'realtime');

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const tabs: HubTabItem[] = [
    ...(isAdmin ? [{ id: 'finance', label: 'Tài chính doanh nghiệp', icon: TrendingUp }] : []),
    {
      id: 'realtime',
      label: 'Tổng quan hệ thống',
      icon: TrendingUp,
    },
    {
      id: 'leaderboard',
      label: 'Bảng vinh danh Đối tác',
      icon: Trophy,
    },
  ];

  const headerTabs = (
    <div className="grid w-full grid-cols-1 gap-2.5 rounded-2xl border border-[#EAE4D7] bg-white p-3 text-sm sm:grid-cols-3">
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 transition-colors cursor-pointer ${
              isActive
                ? 'border-[#EEDFC6] bg-[#FBF5EB] text-[#8F682E] font-semibold'
                : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5]'
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${isActive ? 'border-[#C59B58] text-[#8F682E]' : 'border-[#EAE4D7]'}`}>{index + 1}</span>
            <Icon className="hidden h-4 w-4 shrink-0 lg:block" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="w-full min-w-0 text-[#1A1612]" id="admin-analytics-hub">
      {isAdmin && activeTab === 'finance' ? (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end pt-1 pb-2">
            <div className="w-full">{headerTabs}</div>
          </div>
          <div className="w-full animate-in fade-in-50 duration-200">
            <ExecutiveFinanceReport />
          </div>
        </div>
      ) : activeTab === 'realtime' ? (
        <RealtimeAnalyticsPage headerTabs={headerTabs} />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="w-full">{headerTabs}</div>

          <div className="w-full animate-in fade-in-50 duration-200">
            <LeaderboardPage alignToContainer />
          </div>
        </div>
      )}
    </div>
  );
}
