import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { CustomerRefundResult } from '../../src/components/returns/CustomerRefundResult';
import type { ReturnDetail } from '../../src/services/return.service';
import '../../src/index.css';
const request = { id:'refund-fixture',status:'REFUND_PENDING',resolution:'REFUND',events:[],refund:{amount:179001,method:'WALLET',status:'PENDING'},dispute:{status:'RESOLVED',ruling:'APPROVE_REFUND',details:'Lý do: Sản phẩm không khớp đơn hàng',resolutionNotes:'Chấp nhận hoàn tiền cho khách.'} } as unknown as ReturnDetail;
createRoot(document.getElementById('root')!).render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><CustomerRefundResult request={request}/></QueryClientProvider></MemoryRouter>);
