import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
test('confirmed shop order exposes shipping without waiting for a list refresh', { skip: !base, timeout: 30000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, timeout: 10000, args: ['--no-sandbox'] });
  const store = { id: 'qa-store', name: 'Shop kiểm thử', isVerified: true, onboardingStatus: 'VERIFIED' };
  const user = { id: 'qa-owner', role: 'SHOP_MANAGER', fullName: 'Chủ shop', stores: [store] };
  const order = { id: 'qa-order', storeId: store.id, externalOrderSn: 'QA-CONFIRM', status: 'PENDING', shopConfirmedAt: null,
    createdAt: '2026-11-10T00:00:00Z', customerName: 'Khách kiểm thử', customerPhone: '0901234567', shippingAddress: 'Hồ Chí Minh',
    finalAmount: 200000, subtotalAmount: 200000, shippingFee: 0, discountAmount: 0, paymentMethod: 'COD', paymentStatus: 'UNPAID',
    items: [{ id: 'qa-item', productId: 'qa-product', title: 'Sản phẩm thử', quantity: 1, unitPrice: 200000, imageUrl: '/scanms-placeholder.svg' }] };
  let confirmations = 0;
  let releaseRefresh;
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(10000);
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluateOnNewDocument(user => {
      localStorage.setItem('token', 'fixture-only'); localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('scanms_analytics_consent', 'denied');
    }, user);
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname === '/src/services/chat-socket.service.ts') return req.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
        const respond = data => req.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
        if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers });
        if (url.pathname === '/api/orders/qa-order/confirm') {
          confirmations++; order.shopConfirmedAt = '2026-11-10T03:00:00Z';
          return respond({ success: true, shopConfirmedAt: order.shopConfirmedAt });
        }
        if (req.method() !== 'GET') { assert.equal(url.pathname.startsWith('/api/orders/'), false, 'never submit shipping'); return respond({}); }
        if (url.pathname === '/api/orders/my-store') {
          const send = () => respond({ items: [order], pagination: { total: 1, totalPages: 1, page: 1 } });
          if (confirmations && !releaseRefresh) { releaseRefresh = send; return; }
          return send();
        }
        if (url.pathname.endsWith('/auth/me')) return respond(user);
        if (url.pathname === '/api/stores/my-store') return respond(store);
        if (url.pathname.includes('/notifications/unread')) return respond({ unreadCount: 0 });
        if (url.pathname.endsWith('/notifications')) return respond({ notifications: [], total: 0 });
        return respond({ items: [], pagination: { total: 0, totalPages: 1 } });
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return req.abort();
      return req.continue();
    });
    await page.goto(origin + '/merchant/orders', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent.trim() === 'Xác nhận đơn'));
    await page.evaluate(() => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Xác nhận đơn').click());
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent.trim() === 'Giao hàng'));
    assert.equal(confirmations, 1);
    assert.equal(await page.$$eval('button', els => els.filter(el => el.textContent.trim() === 'Xác nhận đơn').length), 0);
    assert.match(await page.$eval('.merchant-orders-table', el => el.textContent), /Chuẩn bị hàng/);
    if (releaseRefresh) await releaseRefresh();
    await page.evaluate(() => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Giao hàng').click());
    await page.waitForFunction(() => document.querySelector('[role="dialog"]') || document.body.textContent.includes('Tạo vận đơn'));
  } finally { await browser.close(); }
});
