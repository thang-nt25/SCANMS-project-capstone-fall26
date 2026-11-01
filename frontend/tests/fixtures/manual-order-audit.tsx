import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '../../src/index.css';
import OrdersManagementPage from '../../src/pages/merchant/OrdersManagementPage';
import PayosReturnPage from '../../src/pages/public/PayosReturnPage';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>{window.location.pathname === '/payment/payos-return' ? <PayosReturnPage /> : <OrdersManagementPage initialAction={window.location.search.includes('table=1') ? undefined : 'manual'} />}</BrowserRouter>,
);
