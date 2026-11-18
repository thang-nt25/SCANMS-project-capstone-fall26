import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { PickupBookingForm } from '../../src/components/returns/PickupBookingForm';
import type { ReturnDetail } from '../../src/services/return.service';
import '../../src/index.css';

const request = { id: 'pickup-fixture', status: 'SHOP_APPROVED', shipByAt: new Date(Date.now() + 86400000).toISOString(), pickupProviderMode: new URLSearchParams(location.search).get('mode') === 'disabled' ? 'disabled' : 'mock',
  order: { customerName: 'Người nhận trong đơn cũ', shippingAddress: 'Địa chỉ cũ trong đơn' },
  returnWarehouse: { name: 'Kho Shop', phone: '0900000000', address: 'Đường số 2', wardName: 'Phường Ba Đình', provinceName: 'Thành phố Hà Nội' },
} as ReturnDetail;
createRoot(document.getElementById('root')!).render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><main style={{ maxWidth: 1000, margin: '24px auto', padding: 16 }}><PickupBookingForm request={request} /></main></QueryClientProvider></MemoryRouter>);
