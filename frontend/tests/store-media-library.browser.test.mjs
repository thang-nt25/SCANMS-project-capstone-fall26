import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
test('store library: real assets, counts, preview/download, errors, empty shops and stale responses', {
  skip: !base || !existsSync(executablePath), timeout: 60000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const a = '00000000-0000-4000-8000-000000000010';
  const b = '00000000-0000-4000-8000-000000000011';
  const script = 'Mở đầu từ Shop A\nNội dung đầy đủ ở dòng hai\nKết thúc bằng lời mời trải nghiệm';
  const make = (id, assetType, urlOrContent) => ({ id, assetType, urlOrContent, storeId: a, status: 'APPROVED', title: `Shop A ${id}`, createdAt: '2026-10-01' });
  const assets = [make('video', 'VIDEO', 'https://youtu.be/qa'), make('image', 'IMAGE', `${origin}/__qa__/image.png`), make('script', 'COPYWRITE_TEXT', script)];
  let mode = 'success';
  const errors = [];
  const pages = [];
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(7000);
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('token', 'qa-library');
      localStorage.setItem('user', JSON.stringify({ id: 'qa-kol', fullName: 'QA KOL', role: 'COLLABORATOR' }));
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => {
        if (window.qaDenyCopy) throw new Error('Denied');
        window.qaCopied = value;
      } } });
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname === '/__qa__/image.png') return request.respond({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
      if (url.pathname.startsWith('/api/')) {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,authorization,x-skip-cache', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        let data = [];
        if (url.pathname === '/api/auth/me') data = { id: 'qa-kol', fullName: 'QA KOL', role: 'COLLABORATOR' };
        if (url.pathname === '/api/kyc/profile') data = { kycStatus: 'VERIFIED' };
        if (url.pathname === '/api/stores/marketplace') data = [{ id: a, name: 'Shop A' }, { id: b, name: 'Shop B' }];
        if (url.pathname === '/api/store-collaborators/my-invitations') data = [{ storeId: a, status: 'APPROVED' }, { storeId: b, status: 'APPROVED' }];
        if (url.pathname === '/api/notifications/unread-count') data = { unreadCount: 0 };
        if (url.pathname === '/api/notifications') data = { items: [], total: 0 };
        if (url.pathname === '/api/products') data = { items: [], pagination: { total: 0 } };
        if (url.pathname === '/api/media') {
          assert.equal(url.searchParams.get('scope'), 'visual-library');
          const isA = url.searchParams.get('storeId') === a;
          const countOnly = url.searchParams.get('limit') === '1';
          const pageNumber = Number(url.searchParams.get('page') || 1);
          if (!countOnly) pages.push([isA ? 'a' : 'b', pageNumber]);
          if (mode === 'fail' && !countOnly) return request.respond({ status: 503, headers, body: JSON.stringify({ message: 'Unavailable' }) });
          data = { items: isA ? countOnly ? [assets[0]] : pageNumber === 1 ? assets.slice(0, 1) : assets.slice(1, 2) : [], pagination: { total: isA ? 2 : 0, totalPages: isA ? 2 : 0 } };
          if (mode === 'delayed' && isA && !countOnly) {
            setTimeout(() => void request.respond({ status: 200, headers, body: JSON.stringify({ data }) }).catch(() => {}), 600);
            return;
          }
        }
        return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    await page.goto(`${origin}/collaborator/collaboration?shop=${a}&tab=media`);
    await page.waitForSelector('.store-media-card');
    assert.ok(pages.some(([shop, number]) => shop === 'a' && number === 2));
    assert.match(await page.$eval('#subtab-media', element => element.textContent), /2/);
    assert.deepEqual(await page.$$eval('.store-media-categories button .store-media-count', elements => elements.map(el => el.textContent)), ['1', '1']);
    assert.match(await page.$eval('.store-media-card', el => el.textContent), /Mở video gốc/);
    await page.$$eval('.store-media-categories button', elements => elements[1].click());
    await page.waitForSelector('.store-media-thumbnail img');
    await page.evaluate(() => {
      const original = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (this.href.startsWith('blob:') && this.download) window.qaDownload = this.download;
        else original.call(this);
      };
    });
    await page.$$eval('.store-media-actions button', elements => elements[1].click());
    await page.waitForFunction(() => Boolean(window.qaDownload));
    assert.equal(await page.evaluate(() => window.qaDownload), 'Shop A image.png');
    assert.equal(await page.$('.store-media-refresh'), null);
    await page.$$eval('.store-media-actions button', elements => elements[0].click());
    await page.waitForSelector('.store-media-preview[open]');
    assert.ok(await page.$('.store-media-preview-body img'));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.store-media-preview'));
    await page.screenshot({ path: join(tmpdir(), 'scanms-store-library-desktop.png') });
    await page.setViewport({ width: 390, height: 844 });
    assert.ok(await page.$eval('.store-media-library', el => el.scrollWidth <= el.clientWidth + 1));
    await (await page.$('.store-media-library')).screenshot({ path: join(tmpdir(), 'scanms-store-library-mobile.png') });
    await page.setViewport({ width: 1440, height: 1000 });
    mode = 'fail';
    await page.evaluate(() => window.dispatchEvent(new Event('scanms_media_updated')));
    await page.waitForSelector('.store-media-state[role=alert]');
    assert.equal(await page.$('.store-media-card'), null);
    mode = 'success';
    await page.click('.store-media-state button');
    await page.waitForSelector('.store-media-card');
    mode = 'delayed';
    await page.evaluate(() => window.dispatchEvent(new Event('scanms_media_updated')));
    await page.click(`#shop-item-${b} button[aria-label="Mở cuộc trò chuyện với Shop B"]`);
    await page.waitForFunction(() => document.querySelector('.store-media-state')?.textContent.includes('Shop chưa có nội dung được duyệt'));
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 800)));
    assert.equal(await page.$('.store-media-card'), null);
    assert.match(await page.$eval('#subtab-media', el => el.textContent), /0/);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
