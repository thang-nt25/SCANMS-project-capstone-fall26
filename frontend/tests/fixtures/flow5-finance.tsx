import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import AdminFinancePayoutsPage from '../../src/pages/admin/AdminFinancePayoutsPage';
import { ExecutiveFinanceReport, PartnerTaxStatements } from '../../src/components/wallet/FinanceReports';

const view = new URLSearchParams(window.location.search).get('view');
createRoot(document.getElementById('root')!).render(<main style={{ padding: 20, maxWidth: 1400, margin: 'auto' }}>{view === 'executive' ? <ExecutiveFinanceReport /> : view === 'partner' ? <PartnerTaxStatements /> : <AdminFinancePayoutsPage />}</main>);
