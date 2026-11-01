import React, { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ProductAiMatchDrawer } from '../../src/components/product/ProductAiMatchDrawer';
import { ExclusiveDealCardBubble } from '../../src/components/chat/ExclusiveDealCardBubble';
import MarketingToolkitPage from '../../src/pages/collaborator/MarketingToolkitPage';
import ChatBoxPage from '../../src/pages/chat/ChatBoxPage';
import ShopKolHubPage from '../../src/pages/merchant/ShopKolHubPage';
import { StoreCooperationPanel } from '../../src/components/affiliate/StoreCooperationPanel';
import { PartnerRemunerationSummary } from '../../src/components/chat/PartnerRemunerationSummary';
import { ProductIdentityWarning } from '../../src/components/product/ProductIdentityWarning';
import { Modal } from '../../src/components/ui/Modal';
import ProductPricingPage from '../../src/pages/shared/ProductPricingPage';
import VipExceptionsPage from '../../src/pages/admin/VipExceptionsPage';
import { ExclusiveOfferModal } from '../../src/components/chat/ExclusiveOfferModal';
import '../../src/index.css';

const fixtureWindow = window as any;
const product = { id: '11111111-1111-4111-8111-111111111111', title: 'Sản phẩm kiểm thử', categoryName: 'Mỹ phẩm', isActive: true, moderationStatus: 'APPROVED', price: 350000 };
let root: Root | undefined;
function DrawerScene() {
  const [open, setOpen] = useState(true);
  return <ProductAiMatchDrawer product={product as any} isOpen={open} onClose={() => { fixtureWindow.drawerClosed = true; setOpen(false); }} />;
}
function NestedIdentityScene() {
  const [open, setOpen] = useState(true);
  const [warning, setWarning] = useState(false);
  return <>{open && <Modal isOpen title="Hồ sơ sản phẩm" onClose={() => setOpen(false)}><input aria-label="Tên đang nhập" defaultValue="Serum Vitamin C" /><button type="button" onClick={() => setWarning(true)}>Kiểm tra tên</button></Modal>}{warning && <ProductIdentityWarning items={[{ id: product.id, title: product.title, sku: 'EXISTING', similarity: 90 }]} onCancel={() => setWarning(false)} onConfirm={() => { fixtureWindow.identityConfirmed = true; setWarning(false); }} />}</>;
}
fixtureWindow.renderScene = (name: string) => {
  root?.unmount();
  const container = document.getElementById('scene')!;
  container.innerHTML = '';
  root = createRoot(container);
  if (name.startsWith('chat') || name.startsWith('remuneration') || name.startsWith('hub')) localStorage.setItem('user', JSON.stringify({ id: 'fixture-shop', role: 'SHOP_MANAGER', fullName: 'Shop Test' }));
  const element = name.startsWith('pricing') ? <ProductPricingPage reviewer={name === 'pricing-reviewer'} /> : name === 'exceptions' ? <VipExceptionsPage /> : name === 'kol-proposal' ? <ExclusiveOfferModal mode="proposal" productId={product.id} onClose={() => {}} onSuccess={id => { fixtureWindow.createdConversation = id; }} /> : name === 'identity-warning' ? <NestedIdentityScene /> : name.startsWith('hub') ? <ShopKolHubPage /> : name === 'chat-offer' ? <ChatBoxPage /> : name.startsWith('remuneration') ? <PartnerRemunerationSummary role="SHOP_MANAGER" storeId="55555555-5555-4555-8555-555555555555" collaboratorId="22222222-2222-4222-8222-222222222222" tier={{ name: 'Gold' }} productId={name === 'remuneration-product' ? product.id : undefined} /> : name === 'cooperation' ? <StoreCooperationPanel mode="kol" storeId="55555555-5555-4555-8555-555555555555" /> : name === 'drawer' ? <DrawerScene /> : name === 'media' ? <MarketingToolkitPage /> : <ExclusiveDealCardBubble
    card={{ type: 'EXCLUSIVE_DEAL_PROPOSAL', proposalId: '33333333-3333-4333-8333-333333333333', initiatorRole: 'SHOP_MANAGER', status: 'PENDING', productTitle: product.title, proposedCommissionRate: 12, targetOrders: 30, commitmentDays: 30 }}
    isMine={name === 'shop-card'} isShop={name === 'shop-card'} />;
  root.render(<MemoryRouter initialEntries={[name.startsWith('hub') ? '/merchant/kol-hub?kol=22222222-2222-4222-8222-222222222222&tab=' + (name === 'hub-leaderboard' ? 'leaderboard' : 'performance') : name.startsWith('chat') ? '/chat?conversationId=44444444-4444-4444-8444-444444444444' : '/collaborator/marketing?tab=media']}>{element}</MemoryRouter>);
};
fixtureWindow.sceneReady = true;
