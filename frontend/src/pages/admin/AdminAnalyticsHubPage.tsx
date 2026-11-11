import { ExecutiveFinanceReport } from '../../components/wallet/FinanceReports';
import { authService } from '../../services/auth.service';
import { TrendingUp, Trophy, DollarSign } from 'lucide-react';
import type { HubTabItem } from '../../components/common/HubTabs';
import { useControlledTab } from '../../hooks/useControlledTab';
import RealtimeAnalyticsPage from '../dashboard/RealtimeAnalyticsPage';
import LeaderboardPage from '../dashboard/LeaderboardPage';

const ADMIN_ANALYTICS_TABS = ['realtime', 'finance', 'leaderboard'] as const;
type AdminAnalyticsTab = (typeof ADMIN_ANALYTICS_TABS)[number];

export default function AdminAnalyticsHubPage() {
  const isAdmin = authService.getCurrentUser()?.role === 'SYSTEM_ADMIN';
  const { activeTab, setActiveTab } = useControlledTab<AdminAnalyticsTab>({
    defaultTab: 'realtime',
    validTabs: ADMIN_ANALYTICS_TABS,
  });

  const tabs: HubTabItem[] = [
    {
      id: 'realtime',
      label: 'Tổng quan hệ thống',
      icon: TrendingUp,
    },
    ...(isAdmin ? [{ id: 'finance', label: 'Tài chính doanh nghiệp', icon: DollarSign }] : []),
    {
      id: 'leaderboard',
      label: 'Bảng vinh danh Đối tác',
      icon: Trophy,
    },
  ];

  const headerTabs = (
    <div className="grid w-full grid-cols-1 gap-2.5 rounded-2xl border border-[#EAE4D7] bg-white p-2.5 text-sm sm:grid-cols-3">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AdminAnalyticsTab)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              isActive
                ? 'border-[#C59B58] bg-[#FBF5EB] text-[#1A1612] shadow-2xs'
                : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:text-[#1A1612] hover:bg-[#FAF8F5]'
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#B88E4F]' : 'text-[#7D715E]'}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="w-full min-w-0 text-[#1A1612]" id="admin-analytics-hub">
      {activeTab === 'realtime' ? (
        <RealtimeAnalyticsPage headerTabs={headerTabs} />
      ) : activeTab === 'finance' && isAdmin ? (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end pt-1 pb-2">
            <div className="w-full">{headerTabs}</div>
          </div>
          <div className="w-full animate-in fade-in-50 duration-200">
            <ExecutiveFinanceReport />
          </div>
        </div>
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
