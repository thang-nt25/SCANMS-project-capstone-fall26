import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
test('chat pins unique Deals in one compact bar and jumps to the original message without shifting chat', {
  skip: !base || !existsSync(executablePath), timeout: 45000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const shop = { id: '2f67001b-09a5-5958-85fd-5f401831c871', name: 'Shop kiểm thử chat' };
  const user = { id: '11111111-1111-4111-8111-111111111111', role: 'COLLABORATOR', fullName: 'KOL kiểm thử' };
  const conversation = { id: '22222222-2222-4222-8222-222222222222', storeId: shop.id, store: shop,
    collaboratorId: user.id, collaborator: user, messageCount: 10, _count: { chatMessages: 0 },
    chatMessages: [{ messageText: 'Chào bạn', createdAt: '2026-10-26T00:00:00Z', senderId: 'shop-owner', isRead: false }] };
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(8000);
    await page.setViewport({ width: 1440, height: 1000 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(user => {
      localStorage.setItem('token', 'fixture-chat');
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('scanms_privacy_consent', 'essential_only');
    }, user);
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200,
        contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (!url.pathname.startsWith('/api/')) return request.continue();
      const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,authorization,x-skip-cache',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
      let data = [];
      if (url.pathname === '/api/auth/me') data = user;
      if (url.pathname === '/api/chat/conversations') data = [conversation, {
        id: '33333333-3333-4333-8333-333333333333',
        storeId: '44444444-4444-4444-8444-444444444444',
        store: { id: '44444444-4444-4444-8444-444444444444', name: 'Shop chưa có tin nhắn' },
        collaboratorId: user.id, collaborator: user,
        messageCount: 0, _count: { chatMessages: 0 }, chatMessages: [],
      }];
      if (url.pathname.endsWith('/messages')) {
        data = [
          {type:'EXCLUSIVE_DEAL_PROPOSAL',proposalId:'deal-one',status:'PENDING',productTitle:'Serum One',proposedCommissionRate:14},
          {type:'EXCLUSIVE_DEAL_DECISION',proposalId:'deal-one',status:'APPROVED',productTitle:'Serum One',approvedCommissionRate:14},
          {type:'EXCLUSIVE_DEAL_PROPOSAL',proposalId:'deal-two',status:'PENDING',productTitle:'Serum Two',proposedCommissionRate:18},
        ].map((card,index)=>({id:'history-'+index,conversationId:conversation.id,senderId:'shop-owner',sender:{id:'shop-owner',fullName:'Shop QA',role:'SHOP_MANAGER'},messageText:JSON.stringify(card),createdAt:'2026-10-26T00:00:00Z',isRead:true}));
        return setTimeout(() => void request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) }), 500);
      }
      if(url.pathname.startsWith('/api/affiliate-deals/')) data={id:url.pathname.split('/').pop(),status:url.pathname.endsWith('deal-one')?'APPROVED':'PENDING',initiatorRole:'SHOP_MANAGER',product:{title:'Serum QA',price:390000},proposedCommissionRate:18,targetOrders:30,commitmentDays:14,salesCommitment:'QA Complete Terms',couponTerms:{discountPercent:5,minimumOrderAmount:200000}};
      if (url.pathname === '/api/stores/marketplace') data = [shop];
      if (url.pathname.includes('/stores/public/id/')) data = shop;
      if (url.pathname === '/api/kyc/profile') data = { kycStatus: 'VERIFIED' };
      if (url.pathname === '/api/products') data = { items: [], pagination: { total: 0 } };
      if (url.pathname === '/api/notifications') data = { items: [], total: 0 };
      if (url.pathname.endsWith('/unread-count')) data = { unreadCount: 0 };
      return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
    });
    await page.goto(`${origin}/collaborator/collaboration?shop=${shop.id}&tab=messages`);
    await page.waitForSelector('#chat-pinned-deal-banner');
    await page.waitForFunction(()=>document.querySelector('#chat-pinned-deal-banner')?.textContent.includes('2'));
    assert.equal(await page.$$eval('#chat-pinned-deal-banner',els=>els.length),1);
    assert.equal(await page.$eval('#chat-pinned-deal-banner',el=>el.getBoundingClientRect().height),40);
    const before=await page.$eval('.chat-message-list',el=>el.getBoundingClientRect().top);
    await page.click('#chat-pinned-deal-banner');
    await page.waitForSelector('.chat-pinned-deals-list');
    assert.equal(await page.$$eval('.chat-pinned-deals-list > div > button',els=>els.length),2);
    assert.equal(await page.$eval('.chat-message-list',el=>el.getBoundingClientRect().top),before);
    await page.click('.chat-pinned-deals-list > div > button:first-child');
    await page.waitForSelector('.chat-pinned-deals-list',{hidden:true});
    assert.equal(await page.$('.chat-pinned-deal-detail'),null);
    await page.waitForSelector('#chat-message-history-2.chat-message-highlight');
    await page.click('#chat-pinned-deal-banner');
    await page.click('.chat-pinned-deals-list > div > button:last-child');
    await page.waitForSelector('#chat-message-history-0.chat-message-highlight');
    await page.click('#chat-pinned-deal-banner');
    await page.keyboard.press('Escape');
    await page.waitForSelector('.chat-pinned-deals-list',{hidden:true});
    await page.setViewport({width:390,height:844});
    await page.click('#chat-pinned-deal-banner');
    await page.waitForSelector('.chat-pinned-deals-list');
    assert.equal(await page.$eval('.chat-pinned-deals-list',el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=window.innerWidth;}),true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
