import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const base = process.env.GHN_UI_TEST_URL;
test('PayOS payment fits desktop and mobile without changing bank details or confirming unpaid orders', { skip: !base, timeout: 30000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'], timeout: 10000 });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluateOnNewDocument(() => { localStorage.setItem('token', 'qa'); localStorage.setItem('user', JSON.stringify({ id: 'qa', role: 'CUSTOMER', fullName: 'Khách kiểm thử' })); });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname === '/src/services/chat-socket.service.ts') return req.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
        if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers });
        let data = url.pathname.endsWith('/link') ? { qrCode: 'QA-PAYMENT-QR', checkoutUrl: 'https://pay.payos.vn/web/qa', accountName: 'NGUYEN DINH TUAN', accountNumber: 'VQRQAMWRD4162', amount: 189001, paymentStatus: 'WAITING_PAYMENT' } : { paymentStatus: 'WAITING_PAYMENT', orderStatus: 'PENDING' };
        if (url.pathname.endsWith('/auth/me')) data = { id: 'qa', role: 'CUSTOMER', fullName: 'Khách kiểm thử' };
        if (url.pathname.endsWith('/customer/cart')) data = { items: [] };
        if (url.pathname.endsWith('/customer/profile')) data = { user: { id: 'qa', fullName: 'Khách kiểm thử', role: 'CUSTOMER' }, stats: {} };
        if (url.pathname.endsWith('/customer/orders')) data = { total: 1, orders: [{ id: 'qa-order', externalOrderSn: 'DH-QA', storeId: 'qa-shop', store: { id: 'qa-shop', name: 'Shop kiểm thử' }, status: 'PENDING', createdAt: '2026-10-30T03:00:00Z', shippingAddress: 'Địa chỉ kiểm thử', subtotalAmount: 160000, shippingFee: 29001, finalAmount: 189001, discountAmount: 0, rawPayload: { paymentMethod: 'PAYOS', paymentStatus: 'WAITING_PAYMENT' }, orderItems: [{ id: 'qa-item', productId: 'qa-product', quantity: 1, unitPrice: 160000, product: { id: 'qa-product', title: 'Sản phẩm chờ thanh toán' } }] }] };
        if (url.pathname.endsWith('/notifications')) data = { notifications: [], total: 0 };
        if (url.pathname.includes('/notifications/unread')) data = { unreadCount: 0, categoryUnreadCounts: {} };
        return req.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
      }
      if (url.origin !== origin) return req.abort();
      return req.continue();
    });
    await page.goto(origin + '/payment/payos-return?order=DH-QA', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.payos-payment-columns img');
    const desktop = await page.$eval('.payos-return-card', el => ({ width: el.getBoundingClientRect().width, bottom: el.getBoundingClientRect().bottom, text: el.textContent }));
    assert.ok(desktop.width >= 850 && desktop.bottom <= 900);
    assert.match(desktop.text, /189\.001/);
    assert.match(desktop.text, /NGUYEN DINH TUAN/);
    assert.match(desktop.text, /VQRQAMWRD4162/);
    assert.match(desktop.text, /Chờ thanh toán/);
    assert.equal(await page.$eval('.payos-return-top a', el => el.getAttribute('href')), '/customer/orders');
    assert.ok(await page.$('.payos-buyer-sidebar'));
    assert.equal(await page.$eval('.payos-payment-columns a', el => el.href), 'https://pay.payos.vn/web/qa');
    await page.screenshot({ path: join(tmpdir(), 'scanms-payos-return-desktop.png') });
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.$eval('.payos-return-card', el => el.scrollWidth <= el.clientWidth), true);
    await page.screenshot({ path: join(tmpdir(), 'scanms-payos-return-mobile.png') });
    assert.equal(new URL(page.url()).pathname, '/payment/payos-return');
    await page.click('.payos-return-top a');
    await page.waitForSelector('[data-order-code="DH-QA"]');
    assert.equal(await page.$eval('[aria-label="Tìm đơn mua"]', el => el.value), '');
    assert.equal(new URL(page.url()).search, '');
    assert.equal(await page.$eval('[data-order-detail-link]', el => el.getAttribute('href')), '/payment/payos-return?order=DH-QA');
    assert.equal(await page.$$eval('[data-order-code="DH-QA"] .customer-order-actions a', els => els.filter(el => el.textContent.includes('Thanh toán bằng QR')).length), 1);
    await page.click('[data-order-detail-link]');
    await page.waitForSelector('.payos-payment-columns img');
  } finally { await browser.close(); }
});
