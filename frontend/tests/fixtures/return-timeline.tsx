import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReturnTimeline } from '../../src/components/returns/ReturnTimeline';
import type { ReturnDetail } from '../../src/services/return.service';
import '../../src/index.css';

const request: ReturnDetail = {
  id: 'fixture', orderId: 'fixture', reason: '', imageUrls: [], items: [],
  submittedAt: '2026-11-13T08:00:00Z', status: 'EXCHANGE_SHIPPED', resolution: 'EXCHANGE',
  order: { id: 'fixture', externalOrderSn: 'DH-fixture', storeName: 'Cửa hàng' },
  events: [{ id: 'shipped', type: 'EXCHANGE_PENDING_TO_EXCHANGE_SHIPPED', createdAt: '2026-11-15T08:00:00Z' }, ...Array.from({length: 11}, (_, i) => ({id: `event-${i}`, type: 'EXCHANGE_PROVIDER_STATUS', createdAt: new Date(Date.UTC(2026,10,14,8,i)).toISOString()}))],
};
createRoot(document.getElementById('root')!).render(<div style={{ padding: 20 }}><ReturnTimeline request={request} /></div>);
