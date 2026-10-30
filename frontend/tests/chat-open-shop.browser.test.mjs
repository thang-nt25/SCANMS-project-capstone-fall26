import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const storeId = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';
const conversationId = 'd4e5f6a1-b2c3-4d4e-8f5a-6b7c8d9e0f1a';
const customer = { id: 'c3d4e5f6-a1b2-4c3d-8e4f-5a6b7c8d9e0f', role: 'CUSTOMER', fullName: 'Khách kiểm thử' };

test('opening Shop chat shows an empty conversation and loads existing history without sending a message', {
  skip: !base || !existsSync(executablePath), timeout: 60000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true, timeout: 10000, args: ['--no-sandbox'] });
  try {
    for (const existing of [false, true]) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      page.setDefaultNavigationTimeout(10000);
      const requests = [], errors = [];
      const conversation = { id: conversationId, storeId, store: { id: storeId, name: 'Shop kiểm thử' }, chatMessages: [], _count: { chatMessages: 0 } };
      const history = existing ? [{ id: 'e5f6a1b2-c3d4-4e5f-8a6b-7c8d9e0f1a2b', conversationId, senderId: 'shop-owner', sender: { fullName: 'Shop kiểm thử' }, messageText: 'Tin nhắn trước đây của Shop', createdAt: '2026-10-28T06:00:00Z' }] : [];
      await page.evaluateOnNewDocument(user => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'mock-shop-chat-no-real-api');
      }, customer);
      page.on('pageerror', error => errors.push(error.message));
      await page.setRequestInterception(true);
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname === '/src/main.tsx') return request.respond({ status: 200, contentType: 'application/javascript', body: "import '/tests/fixtures/chat-reply-floating.tsx';" });
        if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: `const s={connected:true,on(){return this},off(){return this},connect(){return this},timeout(){return this},emit(e,p){if(e==='send_message')window.qaAutoSent=true;return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>true;export const disconnectChatSocket=()=>{};` });
        if (url.pathname.startsWith('/api/') || url.port === '3000') {
          const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] || 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
          const respond = data => request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
          if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
          requests.push({ path: url.pathname, method: request.method(), body: request.postData() });
          if (url.pathname === '/api/chat/conversations') return respond(request.method() === 'POST' ? conversation : existing ? [conversation] : []);
          if (url.pathname.endsWith('/messages')) return respond(history);
          if (url.pathname.endsWith('/capabilities')) return respond({ messageReplies: true });
          return respond([]);
        }
        if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
        return request.continue();
      });
      await page.goto(origin + '/marketplace');
      await page.waitForSelector('#open-qa-chat');
      const historyLoaded = page.waitForResponse(response => new URL(response.url()).pathname === `/api/chat/conversations/${conversationId}/messages` && response.request().method() === 'GET');
      await page.click('#open-qa-chat');
      await historyLoaded;
      await page.waitForFunction(() => document.body.textContent.includes('Chat') && document.body.textContent.includes('Shop kiểm thử'));
      await page.waitForFunction(() => document.body.textContent.includes('Chat') && document.body.textContent.includes('(1)'));
      await page.waitForFunction(() => !document.body.textContent.includes('Chưa có cuộc trò chuyện nào.'));
      if (existing) await page.waitForFunction(() => document.body.textContent.includes('Tin nhắn trước đây của Shop'));
      else await page.waitForFunction(() => document.body.textContent.includes('Chưa có tin nhắn nào.'));
      assert.equal(requests.filter(item => item.path === '/api/chat/conversations' && item.method === 'POST').length, existing ? 0 : 1);
      assert.ok(requests.some(item => item.path === `/api/chat/conversations/${conversationId}/messages`));
      assert.equal(await page.evaluate(() => Boolean(window.qaAutoSent)), false, 'opening never automatically sends a message');
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally {
    await browser.close();
  }
});
