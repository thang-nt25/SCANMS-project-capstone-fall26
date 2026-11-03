import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
test('empty conversations keep their composer after switching stores', {
  skip: !base || !existsSync(executablePath), timeout: 45000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const shop = { id: '2f67001b-09a5-5958-85fd-5f401831c871', name: 'Shop kiểm thử chat' };
  const user = { id: '11111111-1111-4111-8111-111111111111', role: 'COLLABORATOR', fullName: 'KOL kiểm thử' };
  const conversation = { id: '22222222-2222-4222-8222-222222222222', storeId: shop.id, store: shop,
    collaboratorId: user.id, collaborator: user, messageCount: 0, _count: { chatMessages: 0 }, chatMessages: [] };
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
        data = [];
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
    const composer = 'textarea, input[placeholder]';
    await page.waitForSelector('[data-collaboration-content] textarea, [data-collaboration-content] input[placeholder]');
    const choose = async id => {
      await page.evaluate(id => {
        const title = [...document.querySelectorAll('button[aria-pressed][aria-label]')].find(el => el.querySelector('strong')?.textContent.trim() === id);
        if (!title) throw new Error('Partner row not found');
        title.click();
      }, id);
      await page.waitForSelector('[data-collaboration-content] textarea, [data-collaboration-content] input[placeholder]');
    };
    const other = await page.evaluate(() => [...document.querySelectorAll('button[aria-pressed="false"][aria-label]')].find(el => el.querySelector('strong'))?.querySelector('strong').textContent.trim());
    for (let round = 0; round < 3; round++) {
      await choose(other);
      await choose(shop.name);
    }
    await page.reload();
    await page.waitForSelector('[data-collaboration-content] textarea, [data-collaboration-content] input[placeholder]');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
