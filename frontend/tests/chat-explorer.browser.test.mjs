import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const conversationId = 'd4e5f6a1-b2c3-4d4e-8f5a-6b7c8d9e0f1a';
const otherConversationId = 'a7b8c9d0-e1f2-4a3b-8c4d-5e6f7a8b9c0d';
const customer = { id: 'qa-customer', role: 'CUSTOMER', fullName: 'Khách kiểm thử' };
const makeMessage = (id, extra = {}) => ({ id, conversationId, senderId: customer.id, sender: customer, messageText: '', createdAt: '2026-10-24T06:00:00Z', isRead: true, ...extra });
const assets = [
  makeMessage('product', { messageText: JSON.stringify({ type: 'PRODUCT_INQUIRY', productId: 'qa-product', productSku: 'SKU /?#', productTitle: 'Mặt nạ kiểm thử', productPrice: 90000, message: 'Tham khảo sản phẩm' }) }),
  makeMessage('coupon', { messageText: JSON.stringify({ type: 'COUPON_VOUCHER', couponId: 'qa-coupon', couponCode: 'SHOP10', discountType: 'PERCENTAGE', discountValue: 10, storeName: 'Shop kiểm thử' }) }),
  makeMessage('text', { messageText: 'Báo giá https://files.example.test/catalog?version=2' }),
  makeMessage('image', { mediaType: 'IMAGE', mediaUrl: 'https://files.example.test/photo.png', mediaName: 'Ảnh kiểm thử' }),
  makeMessage('document', { mediaType: 'DOCUMENT', mediaUrl: '/uploads/bao-gia.pdf', mediaName: 'Báo giá.pdf' }),
  makeMessage('unsafe', { mediaType: 'DOCUMENT', mediaUrl: 'javascript:alert(1)', mediaName: 'Tệp hỏng' }),
  makeMessage('video', { mediaType: 'VIDEO', mediaUrl: 'https://files.example.test/video.mp4', mediaName: 'Video kiểm thử' }),
];

test('Shop content explorer: entry, filters, links, copy, pagination, retries, reset, dates and mobile', { skip: !base || !existsSync(executablePath), timeout: 60000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const errors = [], queries = [], mutations = [];
  let failOlder = true, failInitial = false, releaseSlow;
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('token', 'fixture-no-server-access');
      localStorage.setItem('user', JSON.stringify({ id: 'qa-shop', role: 'SHOP_MANAGER', fullName: 'Shop kiểm thử' }));
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async value => { window.qaCopied = value; } } });
    });
    await page.setRequestInterception(true);
    page.on('request', request => void (async () => {
      const url = new URL(request.url());
      if (url.pathname === '/src/main.tsx') return request.respond({ status: 200, contentType: 'application/javascript', body: "import '/tests/fixtures/chat-explorer-audit.tsx';" });
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:true,active:true,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>true;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] || 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS' };
        const respond = (data, status = 200) => request.respond({ status, headers, contentType: 'application/json', body: JSON.stringify({ data, ...(status >= 400 ? { message: 'Lỗi kiểm thử' } : {}) }) });
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        if (request.method() !== 'GET') { mutations.push(url.pathname); return respond({ count: 0 }); }
        if (url.pathname.endsWith('/explore')) {
          const query = Object.fromEntries(url.searchParams);
          queries.push({ ...query, path: url.pathname });
          if (query.q === 'slow') { releaseSlow = () => respond({ items: [makeMessage('slow', { messageText: 'Kết quả cũ' })], nextCursor: null }).catch(() => {}); return; }
          if (query.cursor && failOlder) return respond(null, 500);
          if (!query.cursor && failInitial) return respond(null, 500);
          const items = query.cursor ? [assets[0], makeMessage('older', { messageText: 'Tin nhắn cũ' })]
            : query.kind === 'DOCUMENT' ? assets.filter(item => item.mediaType === 'DOCUMENT')
            : query.kind === 'IMAGE' ? assets.filter(item => item.mediaType === 'IMAGE')
            : query.kind === 'VIDEO' ? assets.filter(item => item.mediaType === 'VIDEO') : assets;
          return respond({ items, nextCursor: query.cursor || query.kind !== 'ALL' ? null : 'older-cursor' });
        }
        if (url.pathname === '/api/chat/conversations') return respond([conversationId, otherConversationId].map((id, index) => ({ id, storeId: 'qa-store', store: { id: 'qa-store', name: 'Shop kiểm thử', owner: { id: 'qa-shop' } }, customerId: index ? 'qa-other-customer' : customer.id, customer: { ...customer, id: index ? 'qa-other-customer' : customer.id, fullName: index ? 'Khách thứ hai' : customer.fullName }, chatMessages: [], lastMessageAt: '2026-10-24T06:00:00Z' })));
        if (url.pathname.endsWith('/messages')) return respond([makeMessage('initial', { messageText: 'Xin chào Shop' })]);
        return respond([]);
      }
      if (url.hostname === 'files.example.test') return request.respond({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aTWQAAAAASUVORK5CYII=', 'base64') });
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    })().catch(error => errors.push(error.message)));
    const modal = '[role="dialog"][aria-label="Kho nội dung hội thoại"]';
    const open = async () => { await page.click('[aria-label="Tìm tin nhắn và tệp"]'); await page.waitForSelector(modal); };
    const search = async () => {
      const response = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/explore'));
      await page.$eval(modal + ' form', form => form.requestSubmit());
      await response;
      await page.waitForNetworkIdle({ idleTime: 150 });
      await page.waitForFunction(selector => document.querySelector(selector + ' [aria-busy="false"]'), {}, modal);
    };
    await page.goto(origin + '/merchant/customer-messages');
    await page.waitForSelector('[aria-label="Tìm tin nhắn và tệp"]');
    const mutationCount = mutations.length;
    await open();
    assert.equal(queries.length, 0, 'opening the search does not fetch until submitted');
    assert.equal(await page.$eval('body', el => el.style.overflow), 'hidden');
    assert.equal(await page.$eval('[aria-label="Làm mới kết quả"]', el => el.disabled), true);
    await search();
    assert.equal(queries.at(-1).path, `/api/chat/conversations/${conversationId}/explore`);
    assert.equal(await page.$eval(modal + ' a[href^="/products/"]', el => el.getAttribute('href')), '/products/SKU%20%2F%3F%23');
    await page.$$eval(modal + ' button', buttons => buttons.find(button => button.textContent.includes('Sao chép')).click());
    await page.waitForFunction(() => window.qaCopied === 'SHOP10');
    assert.equal(await page.$eval(modal + ' a[href^="https://files.example.test/catalog"]', el => el.href), 'https://files.example.test/catalog?version=2');
    assert.equal(await page.$eval(modal + ' a[href$="/uploads/bao-gia.pdf"]', el => el.href), origin + '/uploads/bao-gia.pdf');
    assert.equal(await page.$(modal + ' a[href^="javascript:"]'), null);
    assert.equal(await page.$$eval(modal + ' a[href$="photo.png"]', els => els.length), 1, 'image preview is not duplicated as a second file action');
    assert.ok(await page.$(modal + ' video[controls]'));
    const loadOlder = async () => page.$$eval(modal + ' button', buttons => buttons.find(button => button.textContent.includes('Xem nội dung cũ hơn')).click());
    await loadOlder();
    await page.waitForSelector(modal + ' [role="alert"]');
    assert.ok(await page.$(modal + ' a[href^="/products/"]'), 'pagination failure retains existing content');
    failOlder = false;
    await page.$eval(modal + ' [role="alert"] button', button => button.click());
    await page.waitForFunction(selector => document.querySelector(selector).textContent.includes('Tin nhắn cũ'), {}, modal);
    assert.equal(queries.at(-1).cursor, 'older-cursor');
    assert.equal(await page.$$eval(modal + ' a[href^="/products/"]', els => els.length), 1, 'pagination deduplicates messages');
    for (const kind of ['IMAGE', 'VIDEO', 'DOCUMENT']) {
      await page.select(modal + ' select', kind);
      await search();
      assert.equal(queries.at(-1).kind, kind);
      assert.equal(queries.at(-1).cursor, undefined, 'new filters reset pagination');
    }
    await page.select(modal + ' select:nth-of-type(1)', 'ALL');
    const selects = await page.$$(modal + ' select');
    await selects[1].select('OTHER');
    await search();
    assert.equal(queries.at(-1).sender, 'OTHER');
    const reset = () => page.click('[aria-label="Đặt lại điều kiện lọc; nội dung hội thoại sẽ không bị xóa"]');
    await reset();
    assert.equal(await page.$(modal + ' article'), null);
    await page.type(modal + ' form input', 'slow');
    await page.$eval(modal + ' form', form => form.requestSubmit());
    await page.waitForFunction(() => document.querySelector('[aria-busy="true"]'));
    await reset();
    await releaseSlow?.();
    await page.waitForNetworkIdle({ idleTime: 200 });
    assert.equal(await page.$(modal + ' article'), null, 'reset ignores an in-flight stale response');
    failInitial = true;
    await search();
    await page.waitForSelector(modal + ' [role="alert"]');
    failInitial = false;
    await page.$eval(modal + ' [role="alert"] button', button => button.click());
    await page.waitForSelector(modal + ' article');
    assert.equal(queries.at(-1).cursor, undefined, 'retry of the first page does not use an old cursor');
    await reset();
    await page.click('[aria-label="Chọn ngày bắt đầu"][role="button"]');
    await page.waitForSelector('[role="group"][aria-label="Chọn ngày bắt đầu"]');
    await page.keyboard.press('Escape');
    assert.ok(await page.$(modal), 'Escape in the calendar closes only the calendar');
    assert.equal(await page.$('[role="group"][aria-label="Chọn ngày bắt đầu"]'), null);
    await page.click('[aria-label="Chọn ngày kết thúc"][role="button"]');
    await page.$$eval('[role="group"][aria-label="Chọn ngày kết thúc"] button', buttons => buttons.find(button => button.getAttribute('aria-label')?.startsWith('10/')).click());
    await page.click('[aria-label="Chọn ngày bắt đầu"][role="button"]');
    await page.$$eval('[role="group"][aria-label="Chọn ngày bắt đầu"] button', buttons => buttons.find(button => button.getAttribute('aria-label')?.startsWith('20/')).click());
    const beforeInvalidDate = queries.length;
    await page.$eval(modal + ' form', form => form.requestSubmit());
    await page.waitForSelector(modal + ' [role="alert"]');
    assert.equal(queries.length, beforeInvalidDate, 'invalid dates never trigger a search');
    assert.equal(await page.$(modal + ' [role="alert"] button'), null, 'validation errors do not retry an unrelated previous search');
    await reset();
    await search();
    const artifactDirectory = new URL('../../artifacts/chat-content-audit/', import.meta.url);
    await mkdir(artifactDirectory, { recursive: true });
    await page.screenshot({ path: fileURLToPath(new URL('desktop.png', artifactDirectory)), fullPage: false });
    await page.setViewport({ width: 390, height: 844 });
    const fits = await page.$eval(modal, el => { const box = el.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight && el.scrollWidth <= el.clientWidth; });
    assert.ok(fits, 'the dialog fits a mobile viewport');
    await page.screenshot({ path: fileURLToPath(new URL('mobile.png', artifactDirectory)), fullPage: false });
    await page.click('[aria-label="Đóng kho nội dung"]');
    await page.waitForSelector(modal, { hidden: true });
    assert.equal(await page.$eval('body', el => el.style.overflow), '');
    await page.setViewport({ width: 1440, height: 1000 });
    await page.click('#conv-item-' + otherConversationId);
    await open();
    assert.equal(await page.$eval(modal + ' input', input => input.value), '');
    assert.equal(await page.$(modal + ' article'), null, 'another conversation never inherits previous results');
    await search();
    assert.equal(queries.at(-1).path, `/api/chat/conversations/${otherConversationId}/explore`);
    await page.keyboard.press('Escape');
    await page.waitForSelector(modal, { hidden: true });
    assert.ok(mutations.slice(mutationCount).every(path => path.endsWith('/read')), 'content search performs no writes or deletes');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
