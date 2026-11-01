import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.env.GHN_UI_TEST_URL;
test('order detail fits desktop, keeps actions visible on mobile and closes with Escape', { skip: !base, timeout: 90000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, timeout: 10000, args: ['--no-sandbox'] });
  const user = { id: 'qa-customer', fullName: 'Khách kiểm thử', role: 'CUSTOMER' };
  const order = { id: '00000000-0000-4000-8000-000000000001', externalOrderSn: 'DH-2026-QA', status: 'DELIVERED', createdAt: '2026-10-19T03:51:00Z', customerName: 'Tuấn Đình', customerPhone: '0901234567', shippingAddress: 'Khu Công Nghệ Cao, Phường Phước Long B, Thành phố Thủ Đức, Thành phố Hồ Chí Minh', finalAmount: 271001, subtotalAmount: 250000, shippingFee: 21001, discountAmount: 0, rawPayload: { ghnOrderCode: 'L8RAYL', ghnEnvironment: 'TEST' }, storeId: 'qa-shop', store: { id: 'qa-shop', name: 'Sora Skin', slug: 'sora-skin' }, orderItems: [{ id: 'qa-item', productId: 'qa-product', quantity: 1, unitPrice: 250000, product: { id: 'qa-product', title: 'Serum Vitamin C', imageUrl: '/assets/categories/skin-v1.png' }, variant: { name: '30 ml / Tiêu chuẩn' } }], productReviews: [] };
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    page.setDefaultTimeout(20000);
    await page.evaluateOnNewDocument(user => { localStorage.setItem('token', 'qa-layout'); localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('scanms_analytics_consent', 'denied'); }, user);
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] || '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        let data = [];
        if (url.pathname.endsWith('/auth/me')) data = user;
        if (url.pathname.endsWith('/customer/profile')) data = { user, stats: {} };
        if (url.pathname.endsWith('/customer/orders')) data = { orders: [order], total: 1 };
        if (url.pathname.endsWith('/customer/orders/' + order.id)) data = order;
        if (url.pathname.includes('/notifications/unread')) data = { unreadCount: 0, categoryUnreadCounts: {} };
        if (url.pathname.endsWith('/notifications')) data = { notifications: [], total: 0 };
        if (url.pathname.endsWith('/customer/cart')) data = { items: [] };
        if (url.pathname.includes('/shipping/ghn/track/')) data = { orderCode: 'L8RAYL', status: 'delivered', statusText: 'Giao hàng thành công', environment: 'TEST', isSimulation: true, lastCheckedAt: '2026-10-19T03:56:00Z', timeline: ['ready_to_pick', 'picked', 'storing', 'delivering', 'delivered'].map((status, index) => ({ status, title: status, time: `2026-10-19T03:5${index}:00Z` })) };
        return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    await page.goto(origin + '/customer/orders', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('.customer-order-card');
    await page.evaluate(() => [...document.querySelectorAll('.customer-order-card button')].find(button => button.textContent.trim() === 'Xem chi tiết').click());
    await page.waitForSelector('.customer-order-detail-dialog .ghn-journey__steps');
    await page.click('.ghn-journey__toggle');
    assert.equal(await page.$eval('.ghn-journey__toggle', el => el.getAttribute('aria-expanded')), 'false');
    assert.equal(await page.$eval('.ghn-journey__steps', el => el.getClientRects().length), 0);
    assert.match(await page.$eval('.ghn-journey__status', el => el.textContent), /Giao hàng thành công/);
    await page.click('.ghn-journey__toggle');
    assert.equal(await page.$eval('.ghn-journey__toggle', el => el.getAttribute('aria-expanded')), 'true');
    await page.click('.ghn-journey__history summary');
    assert.equal(await page.$$eval('.ghn-journey__history-marker [aria-label="Đã ghi nhận"]', elements => elements.length), 5);
    await page.click('.ghn-journey__history summary');
    const desktop = await page.$eval('.customer-order-detail-dialog', dialog => {
      const body = dialog.querySelector('.customer-order-detail-body');
      const left = dialog.querySelector('.customer-order-detail-journey').getBoundingClientRect();
      const right = dialog.querySelector('.customer-order-detail-information').getBoundingClientRect();
      return { width: dialog.getBoundingClientRect().width, overflow: body.scrollHeight - body.clientHeight, sameRow: Math.abs(left.top - right.top) < 2 };
    });
    assert.ok(desktop.width >= 1100);
    assert.ok(desktop.sameRow);
    await page.screenshot({ path: join(tmpdir(), 'scanms-order-detail-desktop.png') });
    assert.ok(desktop.overflow < 3, JSON.stringify(desktop));
    await page.setViewport({ width: 390, height: 844 });
    const mobile = await page.$eval('.customer-order-detail-dialog', dialog => {
      const footer = dialog.querySelector('footer').getBoundingClientRect();
      dialog.querySelector('.customer-order-detail-body').scrollTop = 9999;
      return { width: dialog.getBoundingClientRect().width, footerBottom: footer.bottom, horizontalOverflow: dialog.scrollWidth > dialog.clientWidth };
    });
    assert.ok(mobile.width <= 390 && mobile.footerBottom <= 844 && !mobile.horizontalOverflow);
    await page.screenshot({ path: join(tmpdir(), 'scanms-order-detail-mobile.png') });
    await page.keyboard.press('Escape');
    await page.waitForSelector('.customer-order-detail-dialog', { hidden: true });
  } finally { await browser.close(); }
});

