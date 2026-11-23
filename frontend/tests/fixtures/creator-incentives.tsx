import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ShopCreatorIncentivesTab } from '../../src/components/promotions/ShopCreatorIncentivesTab';
import ShopPromotionsHubPage from '../../src/pages/merchant/ShopPromotionsHubPage';
import '../../src/index.css';
createRoot(document.getElementById('root')!).render(<BrowserRouter>{new URLSearchParams(location.search).has('hub') ? <ShopPromotionsHubPage/> : <ShopCreatorIncentivesTab/>}</BrowserRouter>);
