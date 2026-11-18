import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import ProductManagementPage from '../../src/pages/merchant/ProductManagementPage';
import '../../src/index.css';
createRoot(document.getElementById('root')!).render(<MemoryRouter><QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><ProductManagementPage/></QueryClientProvider></MemoryRouter>);
