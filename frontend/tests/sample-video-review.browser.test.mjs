import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = process.env.GHN_UI_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const kolId = '11111111-1111-4111-8111-111111111111';
const storeId = '00000000-0000-4000-8000-000000000010';
const sampleId = '00000000-0000-4000-8000-000000000020';

test('Shop opens the current submitted video and reviews that exact asset once, then refreshes completion', {
  skip: !base || !existsSync(executablePath), timeout: 45000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const creator = { id: kolId, fullName: 'KOL sample approval', email: 'kol@example.test', collaboratorProfile: { kycStatus: 'VERIFIED' } };
  const user = { id: 'qa-shop', role: 'SHOP_MANAGER', fullName: 'QA Shop', email: 'shop@example.test', storeId };
  const sample = { id: sampleId, status: 'VIDEO_SUBMITTED', videoTitle: 'Current KOL review', videoUrl: 'https://www.tiktok.com/@demo/video/222', videoSubmittedAt: '2026-11-14T10:00:00Z', collaboratorId: kolId, collaborator: creator,
    createdAt: new Date().toISOString(), recipientName: 'QA Recipient', recipientPhone: '0912345678',
    shippingAddress: '15 Test, Ward, District, City', shippingCharges: [], events: [], videoAssets: [{ id: 'old-video', title: 'Old review', status: 'PENDING', urlOrContent: 'https://www.tiktok.com/@demo/video/111' }, { id: 'current-video', title: 'Current KOL review', status: 'PENDING', urlOrContent: 'https://www.tiktok.com/@demo/video/222' }],
    product: { id: 'sample-product', title: 'Sample approval regression', price: 180000, storeId, store: { id: storeId, defaultCommissionRate: 10 } } };
  let approvals = 0, inboxReads = 0, releaseApproval;
  let markReviewIntercepted;
  const reviewIntercepted = new Promise(resolve => { markReviewIntercepted = resolve; });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => {
      if (!error.message.includes('WebSocket closed without opened')) errors.push(error.message);
    });
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument(user => {
      localStorage.clear();
      localStorage.setItem('token', 'sample-approval-fixture');
      localStorage.setItem('user', JSON.stringify(user));
    }, user);
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript',
        body: 'const s={on(){return this},off(){return this},emit(){return this},connect(){return this},disconnect(){return this},connected:false};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] || 'content-type,authorization,x-skip-cache',
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,OPTIONS' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        const reply = data => request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
        if (url.pathname.startsWith('/api/media/')) {
          assert.equal(url.pathname, '/api/media/current-video/review');
          assert.equal(JSON.parse(request.postData()).status, 'APPROVED');
          assert.equal(request.method(), 'PATCH');
          approvals++;
          sample.status = 'COMPLETED';
          sample.videoAssets[1].status = 'APPROVED';
          releaseApproval = () => reply(sample);
          markReviewIntercepted();
          return;
        }
        let data = [];
        if (url.pathname === '/api/auth/me') data = user;
        if (url.pathname === '/api/customer/cart') data = { items: [] };
        if (url.pathname === '/api/sample-requests/shop') { inboxReads++; data = [sample]; }
        if (url.pathname === '/api/sample-requests/shop/stats') data = { grantedCount: sample.status === 'APPROVED' ? 1 : 0, issuedValue: sample.status === 'APPROVED' ? 180000 : 0 };
        if (url.pathname === '/api/store-collaborators/shop') data = { store: { id: storeId, name: 'QA Store' }, members: [] };
        if (url.pathname === '/api/chat/search-collaborators') data = [creator];
        if (url.pathname === '/api/stores' || url.pathname === '/api/stores/my-stores') data = [{ id: storeId, name: 'QA Store' }];
        if (url.pathname === '/api/stores/my-store') data = { id: storeId, name: 'QA Store' };
        if (url.pathname === '/api/notifications/unread-count') data = { unreadCount: 0 };
        if (url.pathname === '/api/notifications') data = { items: [], total: 0 };
        return reply(data);
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    await page.goto(`${origin}/merchant/kol-hub?kol=${kolId}&tab=samples`);
    const card = `[data-sample-request-id="${sampleId}"]`;
    await page.waitForSelector(card);
    await page.click('[data-sample-filter="VIDEO_SUBMITTED"]');
    const link = `${card} [data-sample-current-video]`;
    await page.waitForSelector(link, { visible: true });
    assert.equal(await page.$eval(link, el => el.href), sample.videoUrl);
    assert.equal(await page.$eval(link, el => el.target), '_blank');
    assert.equal(await page.$eval(link, el => Boolean(el.closest('details'))), false);
    assert.ok(await page.$eval(card, el => el.textContent.includes('Current KOL review')));
    await page.waitForFunction(selector => [...document.querySelectorAll(`${selector} button`)].some(b => b.textContent.trim() === 'Nghiệm thu video' && !b.disabled), {}, card);
    const reviewing = page.waitForRequest(r => r.url().endsWith('/api/media/current-video/review'));
    await page.$eval(card, el => {
      const button = [...el.querySelectorAll('button')].find(b => b.textContent.trim() === 'Nghiệm thu video');
      button.click(); button.click();
    });
    await reviewing;
    await reviewIntercepted;
    assert.equal(approvals, 1);
    await page.waitForFunction(selector => [...document.querySelectorAll(`${selector} button`)].some(b => b.textContent.includes('Đang xử lý') && b.disabled), {}, card);
    await releaseApproval();
    await page.waitForSelector(card, { hidden: true });
    await page.click('[data-sample-filter="ALL"]');
    await page.waitForSelector(card);
    await page.waitForFunction(selector => document.querySelector(selector)?.textContent.includes('Hoàn tất'), {}, card);
    assert.equal(await page.$eval(card, el => [...el.querySelectorAll('button')].some(b => b.textContent.trim() === 'Nghiệm thu video')), false);
    await page.reload();
    await page.waitForSelector(link, { visible: true });
    assert.equal(await page.$eval(link, el => el.href), sample.videoUrl);
    assert.equal(approvals, 1);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
