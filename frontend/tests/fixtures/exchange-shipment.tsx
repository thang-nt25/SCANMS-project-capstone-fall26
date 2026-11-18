import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReturnDetail } from '../../src/hooks/useReturnDetail';
import { ExchangeShipmentPanel } from '../../src/components/returns/ExchangeShipmentPanel';
import '../../src/index.css';
function Fixture() {
  const detail = useReturnDetail('exchange-fixture');
  return <main style={{ maxWidth: 1100, margin: '24px auto', padding: 16 }}>{detail.data && <><output data-case-status>{detail.data.status}</output><ExchangeShipmentPanel request={detail.data} /></>}</main>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}><Fixture /></QueryClientProvider>);
