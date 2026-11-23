import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = process.env.GHN_UI_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const kolId = '11111111-1111-4111-8111-111111111111';
const storeId = '00000000-0000-4000-8000-000000000010';
const sampleId = '00000000-0000-4000-8000-000000000020';

test('sandbox submission appears in Shop pending reviews, supports revision and completes without live moderation', {
  skip: !base || !existsSync(executablePath), timeout: 45000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const creator = { id: kolId, fullName: 'KOL sample approval', email: 'kol@example.test', collaboratorProfile: { kycStatus: 'VERIFIED' } };
  const user = { id: 'qa-shop', role: 'SHOP_MANAGER', fullName: 'QA Shop', email: 'shop@example.test', storeId };
  const sample = { id: sampleId, status: 'APPROVED', collaboratorId: kolId, collaborator: creator,
    createdAt: new Date().toISOString(), recipientName: 'QA Recipient', recipientPhone: '0912345678',
    shippingAddress: '15 Test, Ward, District, City', shippingCharges: [{ environment: 'TEST', carrier: 'GHN', trackingNumber: 'TEST-REVIEW', amount: 21000, payer: 'SHOP', status: 'CONFIRMED', codAmount: 0 }], events: [], videoAssets: [],
    product: { id: 'sample-product', title: 'Sample approval regression', price: 180000, storeId, store: { id: storeId, defaultCommissionRate: 10 } } };
  let approvals = 0, inboxReads = 0, releaseApproval;
  const errors = [], mutations = [];
  const sandbox = { status: 'VIDEO_SUBMITTED', deliveryStatus: 'DELIVERED', receivedAt: '2026-11-14T10:00:00Z', deadlineAt: '2026-11-28T10:00:00Z', videoUrl: 'https://www.tiktok.com/@demo/video/123', videoRevision: 1, videoReview: null };
  let rejectFails = true, markApproval;
  const approvalIntercepted = new Promise(resolve => { markApproval = resolve; });
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
        if (request.method() !== 'GET') mutations.push(url.pathname);
        if (url.pathname === '/api/shipping/ghn/sandbox-sample/TEST-REVIEW') return reply(sandbox);
        if (url.pathname === '/api/shipping/ghn/sandbox-sample/TEST-REVIEW/review-video') {
          const body = JSON.parse(request.postData());
          assert.equal(body.videoUrl, sandbox.videoUrl); assert.equal(body.revision, sandbox.videoRevision);
          if (body.status === 'REJECTED' && rejectFails) { rejectFails = false; return request.respond({ status: 503, headers, body: JSON.stringify({ message: 'Temporary review failure' }) }); }
          sandbox.videoReview = { status: body.status, rejectionReason: body.rejectionReason || null, reviewedBy: 'qa-shop', reviewedAt: new Date().toISOString() };
          sandbox.status = body.status === 'APPROVED' ? 'COMPLETED' : 'REVISION_REQUIRED';
          if (body.status === 'APPROVED') { approvals++; releaseApproval = () => reply(sandbox); markApproval(); return; }
          return reply(sandbox);
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
    const panel = `${card} [data-sandbox-video-review="TEST-REVIEW"]`;
    const click = (text, twice = false) => page.$eval(card, (element, { text, twice }) => {
      const button = [...element.querySelectorAll('button')].find(button => button.textContent.trim() === text);
      if (!button) throw Error(`Missing button: ${text}`);
      button.click(); if (twice) button.click();
    }, { text, twice });
    await page.waitForSelector(panel);
    await page.waitForFunction(() => document.querySelector('[data-sample-filter="VIDEO_SUBMITTED"]')?.textContent.replace(/\s/g, '') === 'Chờduyệtvideo1');
    await page.click('[data-sample-filter="VIDEO_SUBMITTED"]');
    await page.waitForSelector(panel, { visible: true });
    assert.equal(await page.$eval(`${card} [data-sandbox-video-link]`, el => el.href), sandbox.videoUrl);
    await click('Yêu cầu sửa (sandbox)');
    await page.type(`${panel} textarea`, 'Please show the product and the affiliate link');
    await click('Gửi yêu cầu sửa');
    await page.waitForSelector(`${card} [role="alert"]`);
    await page.waitForFunction(selector => [...document.querySelectorAll(`${selector} button`)].some(b => b.textContent.trim() === 'Gửi yêu cầu sửa' && !b.disabled), {}, card);
    assert.equal(sandbox.status, 'VIDEO_SUBMITTED', 'failed review cannot change the inbox');
    await click('Gửi yêu cầu sửa');
    await page.waitForSelector(card, { hidden: true });
    await page.click('[data-sample-filter="ALL"]');
    await page.waitForFunction(selector => document.querySelector(selector)?.textContent.includes('Cần sửa video'), {}, card);
    assert.ok(await page.$eval(card, el => el.textContent.includes('Please show the product and the affiliate link')));
    // Simulate the next server snapshot after KOL submits the revised post;
    // the service test independently exercises the actual resubmission action.
    sandbox.status = 'VIDEO_SUBMITTED'; sandbox.videoRevision = 2; sandbox.videoReview = null;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForSelector(panel);
    await page.click('[data-sample-filter="VIDEO_SUBMITTED"]');
    await click('Nghiệm thu (sandbox)', true);
    await approvalIntercepted;
    await page.waitForFunction(selector => [...document.querySelectorAll(`${selector} button`)].some(b => b.textContent.includes('Đang lưu') && b.disabled), {}, card);
    assert.equal(approvals, 1);
    await releaseApproval();
    await page.waitForSelector(card, { hidden: true });
    await page.click('[data-sample-filter="ALL"]');
    await page.waitForFunction(selector => document.querySelector(selector)?.textContent.includes('đã nghiệm thu'), {}, card);
    assert.equal(await page.$(panel), null);
    await page.reload();
    await page.waitForFunction(selector => document.querySelector(selector)?.textContent.includes('đã nghiệm thu'), {}, card);
    assert.equal(sample.status, 'APPROVED', 'sandbox completion cannot complete the real sample');
    assert.equal(approvals, 1);
    // Opening the existing KOL Hub also ensures its chat conversation exists.
    const reviews = mutations.filter(path => path !== '/api/chat/conversations');
    assert.equal(reviews.length, 3, 'one failed revision request, one retry, one approval');
    assert.ok(reviews.every(path => path === '/api/shipping/ghn/sandbox-sample/TEST-REVIEW/review-video'), JSON.stringify(mutations));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
