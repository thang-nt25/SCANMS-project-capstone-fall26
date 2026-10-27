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
    collaboratorId: user.id, collaborator: user,
    chatMessages: [{ messageText: 'Chào bạn', createdAt: '2026-10-26T00:00:00Z', senderId: 'shop-owner', isRead: false }] };
  try {
    const page = await browser.newPage();
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
      if (url.pathname === '/api/chat/conversations') data = [conversation];
      if (url.pathname.endsWith('/messages')) {
        data = [undefined, null, { id: 'shop-owner', fullName: 'Đại diện shop', role: 'SHOP_MANAGER' }].map((sender, index) => ({
          id: `history-${index}`, conversationId: conversation.id, senderId: 'shop-owner', sender,
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
    await page.waitForFunction(() => document.body.textContent.includes('Tin nhắn lịch sử 3') || document.body.textContent.includes('Đã xảy ra sự cố khi tải trang'));
    const loaded = await page.$eval('body', element => element.textContent);
    assert.ok(!loaded.includes('Đã xảy ra sự cố khi tải trang'), loaded);
    for (const index of [1, 2, 3]) assert.ok(loaded.includes(`Tin nhắn lịch sử ${index}`));
    assert.deepEqual(errors, []);
    await page.waitForSelector('textarea, input[placeholder*="Nhập tin nhắn"]');
  } finally { await browser.close(); }
});
