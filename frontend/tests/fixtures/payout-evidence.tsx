import { createRoot } from 'react-dom/client';
import { PayoutEvidenceDialog } from '../../src/components/wallet/PayoutEvidenceDialog';
import '../../src/index.css';
createRoot(document.getElementById('root')!).render(<PayoutEvidenceDialog id="payout" onClose={() => {}} />);
