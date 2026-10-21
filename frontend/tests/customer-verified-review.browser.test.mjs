import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
test('customer confirms receipt before rating; receipt actions stay evenly aligned on desktop and mobile', {
  skip: !base || !existsSync(executablePath), timeout: 40000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const user = { id: 'qa-buyer', fullName: 'Khách kiểm thử', role: 'CUSTOMER' };
  const productId = '2f67001b-09a5-5958-85fd-5f401831c871';
  const orders = ['PENDING', 'DELIVERED'].map((status, i) => ({ id: `00000000-0000-4000-8000-00000000000${i + 1}`, externalOrderSn: `DH-REVIEW-${i}`, status,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deliveredAt: new Date().toISOString(), customerName: user.fullName,
    customerPhone: '0901234567', shippingAddress: 'Địa chỉ kiểm thử', subtotalAmount: 250000, finalAmount: 271001, shippingFee: 21001, discountAmount: 0,
    store: { id: 'shop', name: 'Shop kiểm thử' }, rawPayload: { paymentMethod: 'WALLET', paymentStatus: 'PAID' }, productReviews: [],
    orderItems: [{ id: `line-${i}`, productId, quantity: 1, unitPrice: 250000, product: { id: productId, title: 'Serum kiểm thử', imageUrl: '/scanms-placeholder.svg' } }],
  }));
  const errors = [], writes = [];
  let fail = true;
  let unavailable = false;
  let uploads = 0;
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(8000);
    await page.setViewport({ width: 1440, height: 1000 });
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(user => { localStorage.setItem('token', 'fixture-only'); localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('scanms_analytics_consent', 'denied'); }, user);
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.hostname === 'example.com') return request.respond({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aTWQAAAAASUVORK5CYII=', 'base64') });
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] || 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
        const respond = (data, status = 200) => request.respond({ status, headers, contentType: 'application/json', body: JSON.stringify(data) });
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        if (url.pathname.endsWith('/landing')) {
          if (unavailable) return respond({ message: 'Sản phẩm đã ngừng bán' }, 404);
          return respond({ data: { product: { ...orders[0].orderItems[0].product, sku: 'QA-REVIEW', price: 250000, stockQuantity: 10, variants: [], isActive: true },
            store: orders[0].store, images: [], videos: [], availability: { inStock: true, stockQuantity: 10 },
            reviews: { averageRating: orders[1].productReviews.length ? 4 : null, totalReviews: orders[1].productReviews.length * 2,
              photoReviewCount: orders[1].productReviews.length,
              starDistribution: { 4: orders[1].productReviews.length * 2 }, items: orders[1].productReviews.map(review => ({ ...review,
                customerName: 'Khách kiểm thử', createdAt: new Date().toISOString(), isVerifiedBuyer: true,
                reply: { comment: 'Shop ghi nhận và hỗ trợ khách hàng.', createdAt: new Date().toISOString() } })).concat(orders[1].productReviews.length ? [{ id: 'older-review', rating: 4, customerName: 'Khách trước', createdAt: '2020-01-01T00:00:00Z', comment: 'Đánh giá cũ hơn, không có ảnh.', isVerifiedBuyer: true, images: [] }] : []) } } });
        }
        if (url.pathname === '/api/upload/image') { uploads++; return respond({ data: { secureUrl: `https://example.com/review-${uploads % 2 ? 1 : 2}.png` } }); }
        const match = url.pathname.match(/^\/api\/customer\/orders\/([^/]+)(?:\/(confirm-receipt|reviews))?$/);
        if (match) {
          const order = orders.find(row => row.id === match[1]);
          assert.ok(order);
          if (match[2] === 'confirm-receipt') { writes.push('receipt'); order.status = 'COMPLETED'; return respond({ data: order }); }
          if (match[2] === 'reviews') {
            const payload = JSON.parse(request.postData()); writes.push(payload);
            assert.equal(order.status, 'COMPLETED');
            if (fail) { fail = false; return respond({ message: 'Chưa gửi được đánh giá, hãy thử lại' }, 503); }
            order.productReviews.push({ ...payload, id: 'review', status: 'APPROVED' });
            return respond({ data: { message: 'Đánh giá đã được đăng', review: order.productReviews[0] } });
          }
          return respond({ data: order });
        }
        let data = [];
        if (url.pathname === '/api/customer/orders') data = { orders, total: orders.length };
        if (url.pathname === '/api/customer/profile') data = { user, stats: {} };
        if (url.pathname === '/api/auth/me') data = user;
        if (url.pathname === '/api/customer/cart') data = { items: [] };
        if (url.pathname.includes('/notifications/unread')) data = { unreadCount: 0, categoryUnreadCounts: {} };
        if (url.pathname === '/api/notifications') data = { notifications: [], total: 0 };
        if (request.method() !== 'GET') return respond({ data: {} });
        return respond({ data });
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    await page.goto(`${origin}/customer/orders`);
    await page.waitForSelector('[data-order-code="DH-REVIEW-1"]');
    await page.$$eval('.customer-order-summary', summaries => summaries.forEach(summary => summary.click()));
    assert.equal(await page.$$eval('.customer-order-card button', els => els.some(el => el.textContent.includes('Đánh giá'))), false);
    await page.$eval('[data-order-code="DH-REVIEW-1"]', el => [...el.querySelectorAll('button')].find(button => button.textContent.trim() === 'Xem chi tiết').click());
    await page.waitForSelector('[aria-label="Thao tác đơn hàng"]');
    const assertGrid = async columns => {
      const sizes = await page.$$eval('[aria-label="Thao tác đơn hàng"] > button', els => els.map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })));
      assert.ok(sizes.every(size => Math.abs(size.width - sizes[0].width) < 1 && size.height >= 44));
      assert.equal(await page.$eval('[aria-label="Thao tác đơn hàng"]', el => getComputedStyle(el).gridTemplateColumns.split(' ').length), columns);
    };
    await assertGrid(3);
    await page.setViewport({ width: 390, height: 740 }); await assertGrid(2);
    assert.equal(await page.$$eval('[aria-label="Thao tác đơn hàng"] button', els => els.some(el => /Đã nhận hàng|Trả hàng/.test(el.textContent))), false, 'receipt and return actions are not duplicated inside details');
    assert.equal(await page.$$eval('[aria-label="Thao tác đơn hàng"] button', els => els.some(el => el.textContent.trim() === 'Đóng')), false);
    await page.click('[aria-label="Đóng chi tiết đơn hàng"]');
    await page.$eval('[data-order-code="DH-REVIEW-1"]', el => [...el.querySelectorAll('button')].find(button => button.textContent.includes('Đã nhận hàng')).click());
    await page.waitForSelector('#verified-review-title');
    assert.equal(writes[0], 'receipt');
    assert.equal(await page.$$eval('[aria-label="Chọn số sao"] button[aria-pressed=true]', els => els.length), 0, 'no rating is preselected');
    await page.type('form[aria-labelledby="verified-review-title"] textarea', 'Sản phẩm chất lượng, giao hàng tốt.');
    assert.equal(await page.$eval('form[aria-labelledby="verified-review-title"] button[type=submit]', el => el.disabled), true, 'comment alone cannot submit without a chosen rating');
    await page.click('[aria-label="4 sao"]');
    assert.ok(await page.$('[data-review-product] img'), 'review composer shows the purchased product image');
    const addPhotos = (count = 2) => page.$eval('input[aria-label="Thêm ảnh đánh giá"]', (input, count) => {
      const files = new DataTransfer();
      const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aTWQAAAAASUVORK5CYII='), char => char.charCodeAt(0));
      for (const name of ['experience-1.png', 'experience-2.png'].slice(0, count)) files.items.add(new File([bytes], name, { type: 'image/png' }));
      input.files = files.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    }, count);
    await addPhotos(); await page.waitForSelector('[aria-label="Xóa ảnh 2"]');
    await page.click('[aria-label="Xóa ảnh 2"]');
    assert.equal(await page.$('[aria-label="Xóa ảnh 2"]'), null, 'photos can be removed before posting');
    await addPhotos(1); await page.waitForSelector('[aria-label="Xóa ảnh 2"]');
    await (await page.$('form[aria-labelledby="verified-review-title"]')).screenshot({ path: join(tmpdir(), 'scanms-review-composer-mobile.png') });
    assert.equal(await page.$eval('[aria-label="4 sao"]', el => el.getAttribute('aria-pressed')), 'true');
    assert.equal(await page.$eval('form[aria-labelledby="verified-review-title"] button[type=submit]', el => el.disabled), false);
    await page.click('form[aria-labelledby="verified-review-title"] button[type=submit]');
    await page.waitForFunction(() => document.body.innerText.includes('Chưa gửi được đánh giá'));
    assert.equal(await page.$eval('[aria-label="4 sao"]', el => el.getAttribute('aria-pressed')), 'true');
    await page.click('form[aria-labelledby="verified-review-title"] button[type=submit]');
    await page.waitForFunction(() => !document.querySelector('#verified-review-title'));
    assert.deepEqual(writes.at(-1), { productId, rating: 4, comment: 'Sản phẩm chất lượng, giao hàng tốt.', images: ['https://example.com/review-1.png', 'https://example.com/review-2.png'] });
    await page.waitForFunction(() => document.querySelector('[data-order-code="DH-REVIEW-1"]')?.textContent.includes('Đã đánh giá'));
    assert.equal(await page.$$eval('[data-order-code="DH-REVIEW-1"] button', els => els.some(el => el.textContent.includes('Đánh giá sản phẩm'))), false);
    await page.goto(`${origin}/products/${productId}`);
    await page.waitForSelector('[data-customer-review]');
    assert.match(await page.$eval('[aria-label="Lọc đánh giá"]', el => el.textContent), /Tất cả \(2\)/);
    assert.doesNotMatch(await page.$eval('[aria-label="Lọc đánh giá"]', el => el.textContent), /Có hình ảnh/);
    const summary = await page.$eval('[data-review-summary]', el => el.textContent);
    assert.match(summary, /4,0/);
    assert.equal(await page.$eval('[aria-label="Sắp xếp đánh giá"]', el => el.value), 'newest');
    assert.match(await page.$eval('[data-customer-review]', el => el.textContent), /Khách kiểm thử/);
    await page.select('[aria-label="Sắp xếp đánh giá"]', 'oldest');
    await page.waitForFunction(() => document.querySelector('[data-customer-review]')?.textContent.includes('Khách trước'));
    await page.select('[aria-label="Sắp xếp đánh giá"]', 'newest');
    await page.waitForFunction(() => document.querySelector('[data-customer-review]')?.textContent.includes('Khách kiểm thử'));
    await page.waitForSelector('[data-customer-review] img[alt="Ảnh trải nghiệm 1"]');
    assert.equal(await page.$$eval('[data-customer-review] button[aria-label^="Xem ảnh đánh giá"]', elements => elements.length), 2, 'all uploaded photos are visible');
    assert.match(await page.$eval('[data-customer-review]', el => el.textContent), /Shop ghi nhận/);
    await (await page.$('section[aria-labelledby="product-customer-reviews-title"]')).screenshot({ path: join(tmpdir(), 'scanms-review-public-mobile.png') });
    await page.click('[data-customer-review] button[aria-label^="Xem ảnh đánh giá"]');
    await page.waitForSelector('[aria-label="Ảnh đánh giá phóng lớn"]');
    await page.keyboard.press('Escape');
    assert.equal(await page.$('[aria-label="Ảnh đánh giá phóng lớn"]'), null);
    await page.$eval('[aria-label="Lọc đánh giá"]', el => [...el.querySelectorAll('button')].find(button => button.textContent.startsWith('1 sao')).click());
    assert.equal(await page.$('[data-customer-review]'), null, 'star filtering does not show a different rating');
    assert.equal(await page.$eval('[data-review-summary]', el => el.textContent), summary, 'filtering must not change the overall rating');
    assert.match(await page.$eval('section[aria-labelledby="product-customer-reviews-title"]', el => el.textContent), /Chưa có đánh giá trong bộ lọc này/);
    for (const surface of ['summary', 'expanded', 'modal']) {
      for (const index of [0, 1]) {
        await page.setViewport({ width: index ? 390 : 1440, height: 900 });
        await page.goto(`${origin}/customer/orders`);
        await page.waitForSelector('[data-order-code="DH-REVIEW-1"]');
        const card = '[data-order-code="DH-REVIEW-1"]';
        let selector = `${card} summary [data-order-product-link]`;
        if (surface !== 'summary') {
          await page.$eval(`${card} summary`, el => el.click());
          selector = `${card} > div [data-order-product-link]`;
        }
        if (surface === 'modal') {
          await page.$eval(card, el => [...el.querySelectorAll('button')].find(button => button.textContent.trim() === 'Xem chi tiết').click());
          await page.waitForSelector('#customer-order-detail-title');
          selector = '[aria-labelledby="customer-order-detail-title"] [data-order-product-link]';
        }
        const links = await page.$$(selector);
        assert.equal(links.length, 2, `${surface} has links on both image and title`);
        assert.equal(await links[index].evaluate(el => el.getAttribute('href')), `/products/${productId}`);
        await links[index].click();
        await page.waitForFunction(id => location.pathname === `/products/${id}`, {}, productId);
        await page.waitForFunction(() => document.querySelector('h1')?.textContent.includes('Serum kiểm thử'));
        assert.equal(await page.$('#customer-order-detail-title'), null, 'details modal closes on product navigation');
      }
    }
    unavailable = true;
    await page.goto(`${origin}/customer/orders`);
    await page.waitForSelector('[data-order-code="DH-REVIEW-1"] .customer-order-summary-title a');
    await page.click('[data-order-code="DH-REVIEW-1"] .customer-order-summary-title a');
    await page.waitForFunction(() => document.querySelector('h1')?.textContent.includes('Không tìm thấy sản phẩm'));
    assert.equal(writes.filter(write => write === 'receipt').length, 1, 'product links do not trigger order actions');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
