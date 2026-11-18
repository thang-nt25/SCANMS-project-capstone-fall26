import { Navigate } from 'react-router-dom';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { HubTabs, type HubTabItem } from '../../components/common/HubTabs';
import { authService } from '../../services/auth.service';
import { useControlledTab } from '../../hooks/useControlledTab';
import AiFraudSentinelPage from './AiFraudSentinelPage';
import { AuditLogsPage } from './AuditLogsPage';

const SECURITY_AUDIT_TABS = ['fraud', 'audit'] as const;
type SecurityAuditTab = (typeof SECURITY_AUDIT_TABS)[number];

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
  ];

  return (
    <div className="w-full min-w-0 flex flex-col gap-3 text-[#1A1612]" id="admin-security-audit-hub">
      <HubTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as SecurityAuditTab)}
        stretchTabs
        tone="white"
        className="mb-0"
      />

      <div className="w-full min-w-0">
        <div style={{ display: activeTab === 'fraud' ? 'block' : 'none' }}>
          {visitedTabs['fraud'] && <AiFraudSentinelPage />}
        </div>
        <div style={{ display: activeTab === 'audit' ? 'block' : 'none' }}>
          {visitedTabs['audit'] && <AuditLogsPage />}
        </div>
      </div>
    </div>
  );
}
