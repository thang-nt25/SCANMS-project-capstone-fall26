import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ShopEvidencePanel } from '../../src/components/returns/ShopEvidencePanel';
import type { ReturnDetail } from '../../src/services/return.service';
import '../../src/index.css';
const request = { id: 'evidence-fixture', status: 'DISPUTED', dispute: { status: 'OPEN' }, order: { externalOrderSn: 'DH-QA-001', outboundGhnTrackingNumber: 'GHN12345' }, events: [] } as unknown as ReturnDetail;
createRoot(document.getElementById('root')!).render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><ShopEvidencePanel request={request} /></QueryClientProvider></MemoryRouter>);
