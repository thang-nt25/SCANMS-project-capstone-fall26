import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
test('collaboration deep link renders the selected shop and chat without crashing', {
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
    await page.setViewport({ width: 1440, height: 1000 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(user => {
      localStorage.setItem('token', 'fixture-chat');
      localStorage.setItem('user', JSON.stringify(user));
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
        data = Array.from({ length: 10 }, (_, index) => ({
          id: `history-${index}`, conversationId: conversation.id, senderId: 'shop-owner',
          sender: index === 0 ? undefined : index === 1 ? null : { id: 'shop-owner', fullName: 'Đại diện shop', role: 'SHOP_MANAGER' },
          messageText: `Tin nhắn lịch sử ${index + 1}`, createdAt: '2026-10-26T00:00:00Z', isRead: true,
        }));
        return setTimeout(() => void request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) }), 500);
      }
      if (url.pathname === '/api/stores/marketplace') data = [shop];
      if (url.pathname.includes('/stores/public/id/')) data = shop;
      if (url.pathname === '/api/kyc/profile') data = { kycStatus: 'VERIFIED' };
      if (url.pathname === '/api/products') data = { items: [], pagination: { total: 0 } };
      if (url.pathname === '/api/notifications') data = { items: [], total: 0 };
      if (url.pathname.endsWith('/unread-count')) data = { unreadCount: 0 };
      return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
    });
    await page.goto(`${origin}/collaborator/collaboration?shop=${shop.id}&tab=messages`);
    await page.waitForFunction(() => document.body.innerText.includes('Shop kiểm thử chat') || document.body.innerText.includes('Đã xảy ra sự cố khi tải trang'));
    const body = await page.$eval('body', element => element.textContent);
    assert.ok(!body.includes('Đã xảy ra sự cố khi tải trang'), body);
    await page.waitForFunction(() => document.body.textContent.includes('Tin nhắn lịch sử 10') || document.body.textContent.includes('Đã xảy ra sự cố khi tải trang'));
    const loaded = await page.$eval('body', element => element.textContent);
    assert.ok(!loaded.includes('Đã xảy ra sự cố khi tải trang'), loaded);
    assert.ok(loaded.includes('Shop chưa có tin nhắn'), 'existing empty conversations remain in the shop list');
    for (let index = 1; index <= 10; index++) assert.ok(loaded.includes(`Tin nhắn lịch sử ${index}`));
    await page.waitForSelector('#subtab-messages [aria-label="10 tin nhắn"]');
    assert.ok(loaded.includes('Đã tải 10 tin nhắn'));
    await page.waitForFunction(() => document.querySelector('.chat-message-list')?.scrollTop > 0);
    await page.click('button[title="Cuộn lên đầu lịch sử đã tải"]');
    await page.waitForFunction(() => document.querySelector('.chat-message-list')?.scrollTop === 0);
    assert.ok(await page.$eval('.chat-message-list', element => {
      const firstMessage = [...element.querySelectorAll('p')].find(p => p.textContent === 'Tin nhắn lịch sử 1');
      const frame = element.getBoundingClientRect();
      const message = firstMessage?.getBoundingClientRect();
      return message && message.top >= frame.top && message.bottom <= frame.bottom;
    }), 'the oldest loaded message is reachable and visible');
    assert.deepEqual(errors, []);
    await page.waitForSelector('textarea, input[placeholder*="Nhập tin nhắn"]');
  } finally { await browser.close(); }
});
