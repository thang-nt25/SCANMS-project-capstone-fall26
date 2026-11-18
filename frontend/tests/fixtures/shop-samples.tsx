import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ShopSampleManagementTab from '../../src/pages/merchant/ShopSampleManagementTab';
import '../../src/index.css';
createRoot(document.getElementById('root')!).render(<MemoryRouter><QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><ShopSampleManagementTab showRefreshButton={false}/></QueryClientProvider></MemoryRouter>);
