import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
const base = process.env.GHN_UI_TEST_URL;
const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
test('Shop replies/reports a low rating without moderation powers; platform resolves with an auditable reason', {
  skip: !base || !existsSync(executablePath), timeout: 40000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const review = { id: 'qa-review', productId: 'qa-product', rating: 1, status: 'APPROVED', isApproved: true,
    customerName: 'Khách kiểm thử', comment: 'Chai bị rò, shop xử lý chậm.', createdAt: new Date().toISOString(), images: ['/scanms-placeholder.svg'],
    product: { id: 'qa-product', title: 'Serum kiểm thử', sku: 'QA', imageUrl: '/scanms-placeholder.svg' }, reports: [] };
  const writes = [], errors = [];
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('token', 'fixture-only');
      localStorage.setItem('user', JSON.stringify({ id: 'qa-shop', role: sessionStorage.getItem('qa-role') || 'SHOP_MANAGER', fullName: 'Shop kiểm thử', stores: [{ id: 'qa-store', name: 'Shop kiểm thử', isVerified: true, onboardingStatus: 'VERIFIED' }] }));
    });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] || 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
        const respond = data => request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ data }) });
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        if (url.pathname === '/api/products/reviews/moderation') return respond([review]);
        if (url.pathname.startsWith('/api/products/reviews/')) {
          const body = JSON.parse(request.postData()); writes.push({ path: url.pathname, ...body });
          if (url.pathname.endsWith('/reply')) review.reply = { comment: body.comment, createdAt: new Date().toISOString() };
          if (url.pathname.endsWith('/report')) review.reports.push({ id: 'report', ...body, resolved: false });
          if (url.pathname.endsWith('/resolve')) { review.resolution = body; review.reports[0].resolved = true; }
          return respond({ message: 'Đã lưu kiểm thử' });
        }
        if (url.pathname === '/api/auth/me') return respond(null);
        if (url.pathname === '/api/products') return respond({ items: [], pagination: { totalPages: 0 } });
        if (url.pathname === '/api/stores/my-store') return respond({ id: 'qa-store', name: 'Shop kiểm thử', isVerified: true, onboardingStatus: 'VERIFIED' });
        if (request.method() !== 'GET') return respond({});
        return respond([]);
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    await page.goto(origin + '/merchant/products');
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Đánh giá khách hàng'));
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Đánh giá khách hàng').click());
    await page.waitForSelector('article');
    assert.match(await page.$eval('article', el => el.textContent), /Chai bị rò/);
    assert.equal(await page.$$eval('article button', elements => elements.some(el => /Ẩn|Duyệt|Từ chối/.test(el.textContent))), false);
    const clickText = text => page.evaluate(text => [...document.querySelectorAll('article button')].find(button => button.textContent.trim() === text).click(), text);
    await clickText('Trả lời khách hàng'); await page.type('article textarea', 'Shop ghi nhận và sẽ hỗ trợ bạn.');
    await page.click('article button[type="submit"]');
    await page.waitForFunction(() => document.querySelector('article')?.textContent.includes('Shop ghi nhận'));
    await clickText('Báo cáo vi phạm'); await page.type('article textarea', 'Cần kiểm tra nội dung có liên quan sản phẩm.');
    await page.click('article button[type="submit"]');
    await page.waitForFunction(() => document.querySelector('article')?.textContent.includes('Báo cáo chờ sàn'));
    assert.equal(review.rating, 1); assert.equal(review.isApproved, true);
    assert.ok(writes.every(row => !row.path.endsWith('/moderation')));
    await page.evaluate(() => sessionStorage.setItem('qa-role', 'SYSTEM_ADMIN'));
    await page.setViewport({ width: 390, height: 850 });
    await page.goto(origin + '/admin/customer-reviews');
    await page.waitForFunction(() => [...document.querySelectorAll('article button')].some(button => button.textContent.includes('Giữ / công khai')));
    await clickText('Giữ / công khai đánh giá');
    await page.type('article textarea', 'Phản hồi chất lượng hợp lệ, giữ nguyên đánh giá.');
    await page.click('article button[type="submit"]');
    await page.waitForFunction(() => document.querySelector('article')?.textContent.includes('Quyết định của sàn'));
    assert.equal(writes.at(-1).decision, 'KEEP');
    assert.equal(review.rating, 1); assert.equal(review.isApproved, true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
