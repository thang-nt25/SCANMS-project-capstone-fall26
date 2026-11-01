import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.env.GHN_UI_TEST_URL;
test('rejected return card opens its case and escalation submits only after customer confirmation', { skip: !base, timeout: 45000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, timeout: 10000, args: ['--no-sandbox'] });
  const user = { id: 'qa-customer', fullName: 'Tuấn Đình', role: 'CUSTOMER' };
  const response = 'Lý do: Bằng chứng chưa xác nhận lỗi được phản ánh\nGiải thích: Shop chưa xác nhận được tình trạng lỗi trong ảnh khách gửi.';
  const request = { id: 'qa-return', orderId: 'qa-order', status: 'SHOP_REJECTED', shopResponse: response, reason: 'DAMAGED', details: 'Sản phẩm bị lỗi khi nhận hàng.', imageUrls: [], unboxingVideoUrl: '', submittedAt: '2026-10-28T03:00:00Z', events: [{ id: 'event-1', type: 'REQUESTED_TO_SHOP_REJECTED', createdAt: '2026-10-29T03:00:00Z' }], order: { id: 'qa-order', externalOrderSn: 'DH-RETURN-QA', storeName: 'Sora Skin' }, items: [], dispute: null };
  const order = { id: 'qa-order', storeId: 'qa-shop', externalOrderSn: 'DH-RETURN-QA', status: 'COMPLETED', createdAt: '2026-10-19T03:51:00Z', customerName: user.fullName, customerPhone: '0901234567', shippingAddress: 'Địa chỉ kiểm thử', finalAmount: 271001, subtotalAmount: 250000, shippingFee: 21001, discountAmount: 0, rawPayload: {}, store: { id: 'qa-shop', name: 'Sora Skin', slug: 'sora-skin' }, orderItems: [{ id: 'qa-item', productId: 'qa-product', quantity: 1, unitPrice: 250000, product: { id: 'qa-product', title: 'Serum Vitamin C', imageUrl: '/assets/categories/skin-v1.png' }, variant: { name: '30 ml / Tiêu chuẩn' } }], productReviews: [], returnRequest: request };
  const duplicate = { ...order, id: 'qa-order-2', externalOrderSn: 'DH-RETURN-DISPUTED', returnRequest: { ...request, id: 'qa-return-2', status: 'DISPUTED', dispute: { id: 'qa-existing', status: 'OPEN' } } };
  const writes = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    page.setDefaultTimeout(10000);
    await page.evaluateOnNewDocument(user => { localStorage.setItem('token', 'qa-return'); localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('scanms_analytics_consent', 'denied'); }, user);
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname === '/src/services/chat-socket.service.ts') return req.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
        if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers });
        let data = [];
        if (url.pathname.endsWith('/auth/me')) data = user;
        if (url.pathname.endsWith('/customer/profile')) data = { user, stats: {} };
        if (url.pathname.endsWith('/customer/orders')) data = { orders: [order, duplicate], total: 2 };
        if (url.pathname.endsWith('/customer/cart')) data = { items: [] };
        if (url.pathname.includes('/notifications/unread')) data = { unreadCount: 0, categoryUnreadCounts: {} };
        if (url.pathname.endsWith('/notifications')) data = { notifications: [], total: 0 };
        if (url.pathname === '/api/returns/qa-return/disputes' && req.method() === 'POST') {
          writes.push(JSON.parse(req.postData()));
          request.status = 'DISPUTED';
          request.dispute = { id: 'qa-dispute', status: 'OPEN', details: writes.at(-1).details };
          data = request;
        }
        if (url.pathname === '/api/returns/qa-return') data = request;
        return req.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return req.abort();
      return req.continue();
    });
    await page.goto(origin + '/customer/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.customer-order-return-review');
    assert.equal(await page.$$eval('.customer-order-return-review', els => els.length), 1);
    assert.equal(await page.$eval('[data-order-code="DH-RETURN-QA"] .customer-order-summary-status', el => el.textContent), 'Shop từ chối yêu cầu đổi trả');
    assert.equal(await page.$eval('.customer-order-return-link', el => el.getAttribute('href')), '/customer/returns/qa-return');
    assert.match(await page.$eval('.customer-order-return-reason', el => el.textContent), /Lý do từ chối/);
    await page.screenshot({ path: join(tmpdir(), 'scanms-return-rejected-card.png') });
    await page.click('.customer-order-return-review');
    await page.waitForSelector('[aria-labelledby="return-dispute-title"]');
    assert.equal(new URL(page.url()).pathname, '/customer/returns/qa-return');
    assert.equal(writes.length, 0, 'opening the form must not create a dispute');
    assert.match(await page.$eval('main', el => el.textContent), /chưa phải kết quả phân xử/);
    await page.select('[aria-labelledby="return-dispute-title"] select', 'UNJUSTIFIED_REJECTION');
    await page.type('[aria-labelledby="return-dispute-title"] textarea', 'Tôi đề nghị sàn kiểm tra lại bằng chứng sản phẩm lỗi đã gửi.');
    await page.click('[aria-labelledby="return-dispute-title"] button[type="submit"]');
    await page.waitForSelector('[aria-labelledby="return-dispute-title"]', { hidden: true });
    await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('Đang chờ phân xử'));
    assert.equal(writes.length, 1);
    assert.equal(writes[0].reason, 'UNJUSTIFIED_REJECTION');
    assert.equal(await page.$$eval('main button', els => els.filter(el => el.textContent.includes('Yêu cầu SCANMS xem xét')).length), 0);
  } finally { await browser.close(); }
});
