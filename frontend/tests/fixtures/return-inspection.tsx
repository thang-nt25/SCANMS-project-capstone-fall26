import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShopReturnInspectionDialog } from '../../src/components/returns/ShopReturnInspectionDialog';
import { useReturnDetail } from '../../src/hooks/useReturnDetail';
import { returnStatusLabel } from '../../src/utils/return-status.utils';
import '../../src/index.css';
function Fixture() {
  const detail = useReturnDetail('inspection-fixture');
  return <main style={{ maxWidth: 1000, margin: '24px auto', padding: 16 }}>{detail.data && (detail.data.status === 'INSPECTING' ? <ShopReturnInspectionDialog request={detail.data} /> : <p role="status">{returnStatusLabel(detail.data.status)}</p>)}</main>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}><Fixture /></QueryClientProvider>);
