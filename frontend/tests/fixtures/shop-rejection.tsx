import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ShopReturnDecisionForm } from '../../src/components/returns/ShopReturnDecisionForm';
import type { ReturnDetail } from '../../src/services/return.service';
import '../../src/index.css';
const request = { id: 'rejection-fixture', status: 'REQUESTED', reason: 'WRONG_ITEM', preferredResolution: 'EXCHANGE', order: { externalOrderSn: 'DH-QA-001' }, items: [{ id: 'line-1', quantity: 1, orderItem: { product: { title: 'Kem dưỡng' }, variant: { name: 'Bản dịu nhẹ · 50 ml' } } }] } as ReturnDetail;
createRoot(document.getElementById('root')!).render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><ShopReturnDecisionForm orderId="order-fixture" request={request} /></QueryClientProvider></MemoryRouter>);
