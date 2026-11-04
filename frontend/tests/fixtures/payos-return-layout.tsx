import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import PayosReturnPage from '../../src/pages/public/PayosReturnPage';
import '../../src/index.css';
createRoot(document.getElementById('root')!).render(<BrowserRouter><PayosReturnPage /></BrowserRouter>);
