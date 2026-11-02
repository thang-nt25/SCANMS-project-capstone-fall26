import { useSearchParams } from 'react-router-dom';
import { TrendingUp, Trophy } from 'lucide-react';
import type { HubTabItem } from '../../components/common/HubTabs';
import RealtimeAnalyticsPage from '../dashboard/RealtimeAnalyticsPage';
import LeaderboardPage from '../dashboard/LeaderboardPage';

export default function AdminAnalyticsHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'realtime';

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const tabs: HubTabItem[] = [
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
    <div className="flex items-center rounded-xl border border-[#EAE4D7] bg-[#F3EFE6] p-1 text-xs font-semibold">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              isActive
                ? 'bg-[#C59B58] text-[#231D15] font-bold shadow-xs'
                : 'text-[#7D715E] hover:text-[#1A1612] hover:bg-[#EAE4D7]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
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
      ) : (
        <div className="flex flex-col gap-3">
          {/* Header for Leaderboard */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 pb-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#7D715E] font-medium mb-1">
                <span>Trang chủ</span>
                <span>/</span>
                <span className="text-[#1A1612] font-semibold">Bảng vinh danh</span>
              </div>
              <h1 className="text-2xl font-black text-[#1A1612] tracking-tight">
                Bảng vinh danh Đối tác Xuất sắc
              </h1>
              <p className="text-xs text-[#7D715E] mt-0.5">
                Xếp hạng doanh số và thành tích tiếp thị của các Nhà sáng tạo nội dung hàng đầu
              </p>
            </div>
            <div className="self-start sm:self-auto">{headerTabs}</div>
          </div>

          <div className="w-full animate-in fade-in-50 duration-200">
            <LeaderboardPage alignToContainer />
          </div>
        </div>
      )}
    </div>
  );
}
