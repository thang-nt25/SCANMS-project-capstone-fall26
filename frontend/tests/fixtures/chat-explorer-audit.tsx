import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '../../src/index.css';
import ChatBoxPage from '../../src/pages/chat/ChatBoxPage';

createRoot(document.getElementById('root')!).render(<BrowserRouter><ChatBoxPage /></BrowserRouter>);
