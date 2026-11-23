import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import ShopReturnsQueuePage from '../../src/pages/merchant/ShopReturnsQueuePage';
import ReturnDetailPage from '../../src/pages/returns/ReturnDetailPage';
import '../../src/index.css';
const entry = new URLSearchParams(window.location.search).get('entry') || '/merchant/returns';
createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={[entry]}><QueryClientProvider client={new QueryClient()}>
    <Routes>
      <Route path="/merchant/returns" element={<ShopReturnsQueuePage />} />
      <Route path="/merchant/returns/:id" element={<ReturnDetailPage mode="shop" />} />
      <Route path="/merchant/orders" element={<Link to="/merchant/returns/return-0"
        state={{ shopReturnFrom: { pathname: '/merchant/orders', search: '?status=RETURNS' } }}>Mở hồ sơ từ đơn hàng</Link>} />
    </Routes>
  </QueryClientProvider></MemoryRouter>,
);
