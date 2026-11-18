import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ShopReturnsQueuePage from '../../src/pages/merchant/ShopReturnsQueuePage';
import '../../src/index.css';
createRoot(document.getElementById('root')!).render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><ShopReturnsQueuePage /></QueryClientProvider></MemoryRouter>);
