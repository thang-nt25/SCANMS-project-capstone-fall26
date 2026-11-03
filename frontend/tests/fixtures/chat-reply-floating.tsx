import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ScanmsChatProvider, useScanmsChat } from '../../src/context/ScanmsChatContext';
import { ScanmsFloatingChatWidget } from '../../src/components/chat/ScanmsFloatingChatWidget';
import '../../src/index.css';

function Harness() {
  const { openChat } = useScanmsChat();
  return <><button id="open-qa-chat" onClick={() => openChat({ id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d', name: 'Shop kiểm thử' })}>Mở chat kiểm thử</button><ScanmsFloatingChatWidget /></>;
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><ScanmsChatProvider><Harness /></ScanmsChatProvider></BrowserRouter>);
