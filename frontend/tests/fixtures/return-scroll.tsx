import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReturnDetailPage from '../../src/pages/returns/ReturnDetailPage';
import { CartProvider } from '../../src/context/CartContext';
import '../../src/index.css';
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/customer/returns/scroll-fixture']}><QueryClientProvider client={new QueryClient()}><CartProvider><Routes><Route path="/customer/returns/:id" element={<ReturnDetailPage mode={new URLSearchParams(location.search).get('mode') === 'shop' ? 'shop' : 'customer'} />} /></Routes></CartProvider></QueryClientProvider></MemoryRouter>);
