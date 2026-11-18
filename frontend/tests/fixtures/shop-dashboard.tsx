import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '../../src/index.css';
import ShopDashboardPage from '../../src/pages/merchant/ShopDashboardPage';
createRoot(document.getElementById('root')!).render(<BrowserRouter><main style={{padding:20,background:'#FAF8F5'}}><ShopDashboardPage/></main></BrowserRouter>);
