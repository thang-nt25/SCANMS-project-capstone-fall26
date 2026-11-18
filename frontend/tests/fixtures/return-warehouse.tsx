import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReturnWarehouseCard } from '../../src/components/returns/ReturnWarehouseCard';
import type { ReturnDetail } from '../../src/services/return.service';
import '../../src/index.css';

const request = { id: 'warehouse-fixture', order: { storeName: 'Vela Store' }, returnWarehouse: {
  name: 'Bộ phận kho vận – Vela Store', phone: '0901234567',
  address: 'đường số 2, Phường Phúc Xá, Quận Ba Đình, Thành phố Hà Nội',
  wardName: 'Phường Phúc Xá', districtName: 'Quận Ba Đình', provinceName: 'Thành phố Hà Nội',
} } as ReturnDetail;
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}><main style={{ maxWidth: 1000, margin: '24px auto', padding: 16 }}><ReturnWarehouseCard request={request} /></main></QueryClientProvider>);
