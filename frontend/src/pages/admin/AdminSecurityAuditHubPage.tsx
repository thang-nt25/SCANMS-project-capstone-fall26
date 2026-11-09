import { Navigate } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Activity } from 'lucide-react';
import { HubTabs, type HubTabItem } from '../../components/common/HubTabs';
import { PageHeader } from '../../components/ui/PageHeader';
import { authService } from '../../services/auth.service';
import { useControlledTab } from '../../hooks/useControlledTab';
import AiFraudSentinelPage from './AiFraudSentinelPage';
import { AuditLogsPage } from './AuditLogsPage';
import InternalTrafficTestPage from './InternalTrafficTestPage';

const SECURITY_AUDIT_TABS = ['fraud', 'audit', 'sandbox'] as const;
type SecurityAuditTab = (typeof SECURITY_AUDIT_TABS)[number];

const internalTestToolsEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_TOOLS === 'true';

export default function AdminSecurityAuditHubPage() {
  const { activeTab, setActiveTab, visitedTabs } = useControlledTab<SecurityAuditTab>({
    defaultTab: 'fraud',
    validTabs: SECURITY_AUDIT_TABS,
  });

  const user = authService.getCurrentUser();
  if (user && user.role === 'SHOP_MANAGER') {
    return <Navigate to="/merchant/kol-hub" replace />;
  }
  if (user && user.role === 'COLLABORATOR') {
    return <Navigate to="/collaborator/dashboard" replace />;
  }
  if (user && user.role === 'CUSTOMER') {
    return <Navigate to="/customer/orders" replace />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const tabs: HubTabItem[] = [
    {
      id: 'fraud',
      label: 'An ninh Traffic AI',
      icon: ShieldAlert,
    },
    {
      id: 'audit',
      label: 'Sổ cái kiểm toán',
      icon: ShieldCheck,
    },
    ...(internalTestToolsEnabled
      ? [
          {
            id: 'sandbox',
            label: 'Mô phỏng thử tải',
            icon: Activity,
          },
        ]
      : []),
  ];

  return (
    <div className="w-full min-w-0 flex flex-col gap-3 text-[#1A1612]" id="admin-security-audit-hub">
      <PageHeader
        title="An ninh & Kiểm toán"
        icon={<ShieldCheck className="w-5 h-5 text-[#B88E4F]" />}
      />

      <HubTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as SecurityAuditTab)}
      />

      <div className="w-full min-w-0">
        <div style={{ display: activeTab === 'fraud' ? 'block' : 'none' }}>
          {visitedTabs['fraud'] && <AiFraudSentinelPage />}
        </div>
        <div style={{ display: activeTab === 'audit' ? 'block' : 'none' }}>
          {visitedTabs['audit'] && <AuditLogsPage />}
        </div>
        {internalTestToolsEnabled && (
          <div style={{ display: activeTab === 'sandbox' ? 'block' : 'none' }}>
            {visitedTabs['sandbox'] && <InternalTrafficTestPage />}
          </div>
        )}
      </div>
    </div>
  );
}
