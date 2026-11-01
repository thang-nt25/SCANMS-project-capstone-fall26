import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
test('Shop attaches multiple evidence photos, retries safely, and admin opens the report from the bell', { skip: !base || !existsSync(executablePath), timeout: 45000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aTWQAAAAASUVORK5CYII=';
  const review = { id: 'qa-report-review', product: { id: 'qa-product', title: 'Serum kiểm thử' }, customerName: 'Khách kiểm thử', rating: 1, comment: 'Đánh giá cần kiểm tra', status: 'APPROVED', isApproved: true, createdAt: '2026-10-20T10:00:00Z', reports: [] };
  let uploads = 0;
  let reportBody;
  const errors = [];
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('token', 'fixture-no-server-access');
      localStorage.setItem('user', JSON.stringify({ id: 'qa-user', role: localStorage.getItem('qa-test-role') || 'SHOP_MANAGER', fullName: 'Shop kiểm thử', stores: [{ id: 'qa-store', name: 'Shop kiểm thử', isVerified: true, onboardingStatus: 'VERIFIED' }] }));
    });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.hostname === 'evidence.example.test') return request.respond({ status: 200, contentType: 'image/png', body: Buffer.from(png, 'base64') });
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] || 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
        const respond = (data, status = 200) => request.respond({ status, headers, contentType: 'application/json', body: JSON.stringify({ data, ...(status >= 400 ? { message: 'Lỗi tải ảnh kiểm thử, vui lòng thử lại' } : {}) }) });
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        if (url.pathname.endsWith('/qa-report-review/evidence')) {
          uploads++;
          return respond({ secureUrl: `https://evidence.example.test/${uploads}.png` }, uploads === 3 ? 400 : 200);
        }
        if (url.pathname.endsWith('/qa-report-review/report')) {
          reportBody = JSON.parse(request.postData());
          review.reports = [{ id: 'qa-report', ...reportBody, resolved: false }];
          return respond({ message: 'Đã gửi báo cáo tới sàn.' });
        }
        if (request.method() !== 'GET') return respond({});
        if (url.pathname === '/api/stores/my-store') return respond({ id: 'qa-store', name: 'Shop kiểm thử', isVerified: true, onboardingStatus: 'VERIFIED' });
        if (url.pathname === '/api/products') return respond({ items: [], pagination: { totalPages: 1 } });
        if (url.pathname === '/api/products/reviews/moderation') return respond([review]);
        if (url.pathname === '/api/notifications/unread-count') return respond({ unreadCount: reportBody ? 1 : 0 });
        if (url.pathname === '/api/notifications') return respond({ items: reportBody ? [{ id: 'qa-notice', title: 'Báo cáo đánh giá cần xử lý', message: 'Shop đã báo cáo đánh giá', type: 'PRODUCT_REVIEW_REPORTED', isRead: false, createdAt: new Date().toISOString(), data: { reviewId: review.id } }] : [], unreadCount: reportBody ? 1 : 0, total: 1 });
        return respond([]);
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    await page.goto(origin + '/merchant/products');
    await page.waitForSelector('button[title="Duyệt đánh giá từ khách hàng"]');
    await page.click('button[title="Duyệt đánh giá từ khách hàng"]');
    await page.waitForSelector('#review-qa-report-review');
    await page.evaluate(() => [...document.querySelectorAll('#review-qa-report-review button')].find(button => button.textContent === 'Báo cáo vi phạm').click());
    await page.type('#review-qa-report-review form textarea', 'Có nội dung quảng cáo không liên quan sản phẩm.');
    await page.evaluate(png => {
      const transfer = new DataTransfer();
      const bytes = Uint8Array.from(atob(png), character => character.charCodeAt(0));
      for (let index = 0; index < 5; index++) transfer.items.add(new File([bytes], `proof-${index}.png`, { type: 'image/png' }));
      transfer.items.add(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'too-large.png', { type: 'image/png' }));
      const input = document.querySelector('input[aria-label="Thêm ảnh bằng chứng"]'); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    }, png);
    assert.equal(await page.$$eval('button[aria-label^="Xem ảnh bằng chứng"]', buttons => buttons.length), 5);
    assert.match(await page.$eval('[role="alert"]', el => el.textContent), /too-large.png/);
    await page.click('button[aria-label="Xóa ảnh bằng chứng 5"]');
    await page.click('button[aria-label="Xem ảnh bằng chứng 1"]');
    await page.waitForSelector('[aria-label="Xem ảnh bằng chứng"]');
    await page.keyboard.press('Escape');
    await page.waitForSelector('[aria-label="Xem ảnh bằng chứng"]', { hidden: true });
    assert.ok(await page.$('[aria-labelledby="review-management-title"]'));
    assert.equal(await page.$eval('[aria-label="Liên kết video hoặc tài liệu bằng chứng"]', el => el.closest('details')), null, 'links are always shown without an expander');
    await page.evaluate(() => {
      const files = new DataTransfer();
      files.items.add(new File([new Uint8Array(24)], 'proof.mp4', { type: 'video/mp4' }));
      files.items.add(new File([new Uint8Array(24)], 'remove.mov', { type: 'video/quicktime' }));
      files.items.add(new File([new Uint8Array(50 * 1024 * 1024 + 1)], 'too-large.mp4', { type: 'video/mp4' }));
      const input = document.querySelector('input[aria-label="Thêm video bằng chứng"]'); input.files = files.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await page.$$eval('button[aria-label^="Xem video bằng chứng"]', buttons => buttons.length), 2);
    await page.click('button[aria-label="Xóa video bằng chứng 2"]');
    await page.click('button[aria-label="Xem video bằng chứng 1"]');
    await page.waitForSelector('[aria-label="Xem video bằng chứng"] video[controls]');
    await page.keyboard.press('Escape');
    await page.waitForSelector('[aria-label="Xem video bằng chứng"]', { hidden: true });
    await page.type('[aria-label="Liên kết video hoặc tài liệu bằng chứng"]', 'https://example.com/video');
    await page.$eval('#review-qa-report-review form', form => form.requestSubmit());
    await page.waitForFunction(() => !document.querySelector('#review-qa-report-review form button[type="submit"]').disabled);
    assert.equal(uploads, 3);
    assert.equal(reportBody, undefined, 'a failed photo upload never submits an incomplete report');
    await page.$eval('#review-qa-report-review form', form => form.requestSubmit());
    await page.waitForSelector('#review-qa-report-review form', { hidden: true });
    assert.equal(uploads, 6, 'retry reuses the first two uploaded photos and uploads the video once');
    assert.equal(reportBody.images.length, 4);
    assert.equal(reportBody.videos.length, 1);
    assert.deepEqual(reportBody.evidence, ['https://example.com/video']);
    assert.equal(review.isApproved, true);
    assert.equal(review.rating, 1);
    await page.waitForSelector('button[aria-label="Xem ảnh báo cáo 4"]');
    await page.screenshot({ path: join(tmpdir(), 'scanms-review-report-shop.png') });
    await page.evaluate(() => localStorage.setItem('qa-test-role', 'SYSTEM_ADMIN'));
    await page.goto(origin + '/admin/customer-reviews');
    await page.waitForSelector('button[title="Thông báo SCANMS"]');
    await page.click('button[title="Thông báo SCANMS"]');
    await page.waitForSelector('[aria-label="Danh sách thông báo"]');
    await page.waitForFunction(() => [...document.querySelectorAll('[aria-label="Danh sách thông báo"] button')].some(button => button.textContent.includes('Báo cáo đánh giá cần xử lý')));
    await page.evaluate(() => [...document.querySelectorAll('[aria-label="Danh sách thông báo"] button')].find(button => button.textContent.includes('Báo cáo đánh giá cần xử lý')).click());
    await page.waitForFunction(() => new URLSearchParams(location.search).get('review') === 'qa-report-review');
    await page.waitForSelector('#review-qa-report-review button[aria-label="Xem ảnh báo cáo 4"]');
    await page.click('button[aria-label="Xem video báo cáo 1"]');
    await page.waitForSelector('[aria-label="Xem video bằng chứng"] video[controls]');
    await page.keyboard.press('Escape');
    await page.click('button[aria-label="Xem ảnh báo cáo 1"]');
    await page.waitForSelector('[aria-label="Xem ảnh bằng chứng"]');
    await page.keyboard.press('Escape');
    await page.screenshot({ path: join(tmpdir(), 'scanms-review-report-admin.png') });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
