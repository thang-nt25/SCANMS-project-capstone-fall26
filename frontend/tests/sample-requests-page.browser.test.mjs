import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
test('sample page filters, refresh, real action payloads and failed submissions', {
  skip: !base || !existsSync(executablePath), timeout: 45000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const requests = ['PENDING', 'SHIPPED', 'RECEIVED', 'COMPLETED'].map((status, index) => ({
    id: `request-${index}`, status, createdAt: '2026-10-18T00:00:00Z', deadlineAt: index === 2 ? '2020-01-01' : null,
    trackingNumber: index === 1 ? 'GHN123' : null, carrier: 'GHN', product: { title: `Sản phẩm ${index}`, store: { id: 'shop', name: 'Shop kiểm thử' } },
  }));
  const actions = [];
  let fail = true;
  const offListShop = '00000000-0000-4000-8000-000000000099';
  let lookupAvailable = false;
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('token', 'qa-samples');
      localStorage.setItem('user', JSON.stringify({ id: 'qa-kol', fullName: 'QA', role: 'COLLABORATOR' }));
    });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/')) {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,authorization,x-skip-cache', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        let data = [];
        if (url.pathname === '/api/auth/me') data = { id: 'qa-kol', role: 'COLLABORATOR', fullName: 'QA' };
        if (url.pathname === '/api/sample-requests/my') data = requests;
        if (url.pathname === '/api/stores/marketplace') data = [{ id: 'shop', name: 'Shop kiểm thử' }];
        if (url.pathname === `/api/stores/public/id/${offListShop}`) {
          if (!lookupAvailable) return request.respond({ status: 404, headers, body: JSON.stringify({ message: 'Shop unavailable' }) });
          data = { id: offListShop, name: 'Shop ngoài danh sách' };
        }
        if (url.pathname === '/api/kyc/profile') data = { kycStatus: 'VERIFIED' };
        if (url.pathname === '/api/products') data = { items: [], pagination: { total: 0 } };
        if (url.pathname === '/api/media') data = { items: [], pagination: { total: 0 } };
        if (url.pathname === '/api/shipping/ghn/sandbox-sample/TEST123') data = { status: 'RECEIVED', receivedAt: '2026-10-20', deadlineAt: '2026-11-03', videoUrl: null, deliveryStatus: 'DELIVERED' };
        if (url.pathname === '/api/notifications/unread-count') data = { unreadCount: 0 };
        if (url.pathname === '/api/notifications') data = { items: [], total: 0 };
        if (request.method() !== 'GET') {
          actions.push([request.method(), url.pathname, JSON.parse(request.postData() || '{}')]);
          if (fail) return request.respond({ status: 400, headers, body: JSON.stringify({ message: 'Shop từ chối thao tác kiểm thử' }) });
          if (url.pathname === '/api/shipping/ghn/sandbox-sample/TEST123/video') data = { status: 'VIDEO_SUBMITTED', receivedAt: '2026-10-20', deadlineAt: '2026-11-03', videoUrl: 'https://www.tiktok.com/@qa/video/123' };
        }
        return request.respond({ status: 200, headers, body: JSON.stringify({ data }) });
      }
      if (url.origin !== origin) return request.abort();
      return request.continue();
    });
    await page.goto(`${origin}/collaborator/samples`);
    await page.waitForSelector('.samples-page-card');
    assert.equal(await page.$$eval('aside a', els => els.filter(el => el.getAttribute('href') === '/collaborator/collaboration').some(el => el.className.includes('bg-[#FBF5EB]'))), false);
    assert.deepEqual(await page.$$eval('.samples-page-metric strong', els => els.map(el => el.textContent)), ['4', '1', '1', '1']);
    await page.type('.samples-page-filters input:not([type=checkbox])', 'GHN123');
    await page.waitForFunction(() => document.querySelectorAll('.samples-page-card').length === 1);
    await page.$eval('.samples-page-filters input:not([type=checkbox])', el => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(el, ''); el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.select('.samples-page-filters select', 'RECEIVED');
    await page.waitForFunction(() => document.querySelectorAll('.samples-page-card').length === 1 && document.querySelector('.samples-page-card').textContent.includes('Sản phẩm 2'));
    await page.click('.samples-page-actions button');
    await page.waitForSelector('dialog[open]');
    await page.type('dialog input[type=url]', 'https://www.tiktok.com/@qa/video/123');
    await page.click('dialog button:not([type=button])');
    await page.waitForSelector('dialog [role=alert]');
    assert.ok(await page.$('dialog[open]'));
    fail = false;
    await page.click('dialog button:not([type=button])');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    assert.equal(actions[0][0], 'POST');
    assert.equal(actions[0][1], '/api/sample-requests/request-2/video');
    assert.equal(actions[0][2].videoUrl, 'https://www.tiktok.com/@qa/video/123');
    for (const [status, suffix] of [['SHIPPED', 'delivery-issue'], ['PENDING', 'cancel']]) {
      await page.select('.samples-page-filters select', status);
      await page.click('.samples-page-actions button');
      await page.waitForSelector('dialog[open]');
      if (status === 'SHIPPED') await page.type('dialog textarea', 'Kiện hàng có sự cố');
      await page.click('dialog button:not([type=button])');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      assert.equal(actions.at(-1)[0], 'PATCH');
      assert.ok(actions.at(-1)[1].endsWith(suffix));
    }
    await page.select('.samples-page-filters select', 'ALL');
    requests.push({ id: 'sandbox', status: 'APPROVED', createdAt: '2026-10-18', productId: 'test-product', shippingCharges: [{ environment: 'TEST', trackingNumber: 'TEST123' }], product: { title: 'Sandbox product', storeId: 'shop', store: { id: 'shop', name: 'Shop kiểm thử' } } });
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForFunction(() => document.querySelector('.samples-sandbox-receipt')?.closest('article').querySelector('.samples-page-status')?.textContent.includes('Cần nộp video'));
    assert.equal(await page.$eval('.samples-page-metric strong', el => el.textContent), '5');
    const sandbox = await page.$eval('.samples-sandbox-receipt', el => ({ text: el.closest('article').textContent, liveButtons: el.closest('article').querySelectorAll('.samples-page-actions button').length, link: el.closest('article').querySelector('.samples-page-actions a').getAttribute('href') }));
    assert.ok(sandbox.text.includes('Cần nộp video'));
    assert.equal(sandbox.liveButtons, 0);
    assert.ok(sandbox.link.includes('sampleId=sandbox'));
    await page.type('.samples-page-filters input', 'TEST123');
    await page.waitForFunction(() => document.querySelectorAll('.samples-page-card').length === 1);
    assert.ok((await page.$eval('.samples-page-card', el => el.textContent)).includes('Sandbox product'));
    await page.$eval('.samples-page-filters input', el => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(el, ''); el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('.samples-sandbox-receipt .sample-receipt-overview button');
    await page.waitForSelector('.kol-video-dialog');
    assert.ok((await page.$eval('.kol-video-form', el => el.textContent)).includes('Sandbox product'));
    assert.ok((await page.$eval('.kol-video-form button[type=submit]', el => el.textContent)).includes('Cần tải video'));
    await page.type('.kol-video-form input[type=text]', 'QA sandbox video');
    await page.type('.kol-video-form input[type=url]', 'https://www.tiktok.com/@qa/video/123');
    assert.ok((await page.$eval('.kol-video-form button[type=submit]', el => el.textContent)).includes('Lưu video kiểm thử'));
    await page.$eval('.kol-video-form', el => el.requestSubmit());
    await page.waitForFunction(() => !document.querySelector('.kol-video-dialog'));
    assert.equal(actions.at(-1)[1], '/api/shipping/ghn/sandbox-sample/TEST123/video');
    assert.equal(actions.at(-1)[2].title, 'QA sandbox video');
    assert.equal(await page.$$eval('.samples-sandbox-receipt', els => els[0].closest('article').querySelectorAll('a[href="https://www.tiktok.com/@qa/video/123"]').length), 1);
    requests[0].status = 'CANCELLED';
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForFunction(() => [...document.querySelectorAll('.samples-page-card')].some(el => el.textContent.includes('Sản phẩm 0') && el.textContent.includes('Đã hủy')));
    assert.ok(await page.$$eval('.samples-page-card', els => els.find(el => el.textContent.includes('Sản phẩm 0')).textContent.includes('Không áp dụng')));
    await page.setViewport({ width: 390, height: 844 });
    assert.ok(await page.$eval('.samples-page', el => el.scrollWidth <= el.clientWidth + 1));
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(`${origin}${sandbox.link}`);
    await page.waitForSelector('#sample-request-sandbox[data-focused=true]');
    await page.waitForFunction(() => document.activeElement?.id === 'sample-request-sandbox');
    await page.goto(`${origin}/collaborator/collaboration?shop=${offListShop}&tab=samples&sampleId=missing`);
    await page.waitForFunction(() => document.body.textContent.includes('Không mở được gian hàng trong liên kết'));
    assert.equal(new URL(page.url()).searchParams.get('shop'), offListShop);
    assert.equal(await page.$('.collaboration-context-name'), null);
    lookupAvailable = true;
    requests.push({ ...requests[0], id: 'target-sample', product: { title: 'Sản phẩm Shop đích', storeId: offListShop, store: { id: offListShop, name: 'Shop ngoài danh sách' } } });
    await page.goto(`${origin}/collaborator/collaboration?shop=${offListShop}&tab=samples&sampleId=target-sample`);
    await page.waitForSelector('#sample-request-target-sample[data-focused=true]');
    await page.waitForFunction(() => document.activeElement?.id === 'sample-request-target-sample');
    assert.equal(new URL(page.url()).searchParams.get('shop'), offListShop);
    assert.equal(await page.$('#sample-request-sandbox'), null, 'never mixes requests from other shops');
  } finally { await browser.close(); }
});
