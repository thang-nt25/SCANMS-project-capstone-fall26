import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShopReturnShipmentPanel } from '../../src/components/returns/ShopReturnShipmentPanel';
import type { ReturnDetail } from '../../src/services/return.service';
import '../../src/index.css';

const request = { id: 'shop-shipment-fixture', status: 'PICKUP_BOOKED', pickupSimulationEnabled: true,
  order: { customerName: 'Trần An' },
  pickupContact: { name: 'Trần An', phone: '0903000001', address: '15 Lê Duẩn', wardName: 'Phường Bến Nghé', districtName: 'Quận 1', provinceName: 'Thành phố Hồ Chí Minh', weight: 500, length: 20, width: 15, height: 10 },
  returnWarehouse: { name: 'Bộ phận kho vận – Vela Store', phone: '0901234567', address: 'Đường số 2', wardName: 'Phường Phúc Xá', districtName: 'Quận Ba Đình', provinceName: 'Thành phố Hà Nội' },
  customerShipment: { carrierName: 'SCANMS Demo', trackingNumber: 'SIM418123486578338', provider: 'MOCK', providerStatus: 'ready_to_pick' },
} as ReturnDetail;
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}><main style={{ maxWidth: 1000, margin: '24px auto', padding: 16 }}><ShopReturnShipmentPanel request={request} /></main></QueryClientProvider>);
