import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StoreCooperationAction } from '../../src/components/affiliate/StoreCooperationAction';
import ProductManagementPage from '../../src/pages/merchant/ProductManagementPage';
import ProductModerationPage from '../../src/pages/admin/ProductModerationPage';
import ShopCollaborationPage from '../../src/pages/collaborator/ShopCollaborationPage';
import ReferralLinksPage from '../../src/pages/collaborator/ReferralLinksPage';
import '../../src/index.css';

const fixture = window as any;
let root: Root | undefined;
fixture.renderGapScene = (name: string) => {
  root?.unmount();
  const host = document.getElementById('scene')!;
  host.innerHTML = '';
  root = createRoot(host);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  root.render(<MemoryRouter initialEntries={[name === 'products' ? '/merchant/products?create=1' : name === 'kol-invitations' ? '/collaborator/collaboration' : '/marketplace']}>
    <QueryClientProvider client={queryClient}>{name === 'links' ? <ReferralLinksPage /> : name === 'kol-invitations' ? <ShopCollaborationPage /> : name === 'moderation' ? <ProductModerationPage /> : name === 'products' ? <ProductManagementPage /> : <div className="mx-auto grid max-w-xl gap-4 p-4">
      <StoreCooperationAction storeId="11111111-1111-4111-8111-111111111111" storeName="Shop A" />
      <StoreCooperationAction storeId="11111111-1111-4111-8111-111111111111" storeName="Shop A" />
      <StoreCooperationAction storeId="22222222-2222-4222-8222-222222222222" storeName="Shop B" />
    </div>}</QueryClientProvider>
  </MemoryRouter>);
};
fixture.gapSceneReady = true;
