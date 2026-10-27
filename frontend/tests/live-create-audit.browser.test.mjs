import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.LIVE_AUDIT_URL;
const executablePath = process.env.LIVE_AUDIT_BROWSER;

test('live creation audit: platform, creators, scheduling, products, voucher and invitation payload', {
  skip: !base || !executablePath, timeout: 90000,
}, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const origin = new URL(base).origin;
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const output = '../artifacts/live-create-audit';
  await mkdir(output, { recursive: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    await page.emulateTimezone('Asia/Ho_Chi_Minh');
    await page.setViewport({ width: 1440, height: 1000 });
    const store = { id: '11111111-1111-4111-8111-111111111111', name: 'QA Shop', isActive: true, isVerified: true, onboardingStatus: 'VERIFIED' };
    const user = { id: 'qa-owner', fullName: 'QA Owner', role: 'SHOP_MANAGER', stores: [{ ...store, id: '77777777-7777-4777-8777-777777777777', name: 'Other Shop' }, store] };
    const creators = [
      { id: '22222222-2222-4222-8222-222222222222', fullName: 'Nguyễn Mai Anh', isExclusiveVip: true, exclusiveDealRate: 12, baseRate: 12, campaignBonusRate: 1, currentEffectiveRate: 13, socialChannels: [{ platformName: 'TikTok', channelName: 'Mai Anh', channelUrl: 'https://example.test/maianh', followerCount: 15000 }], collaboratorProfile: { totalFollowers: 15000 } },
      { id: '33333333-3333-4333-8333-333333333333', fullName: 'Bùi Minh Anh', baseRate: 10, currentEffectiveRate: 10, socialChannels: [], collaboratorProfile: { totalFollowers: 135000 } },
    ];
    const product = { id: '44444444-4444-4444-8444-444444444444', title: 'Mặt nạ rau má', price: 90000,
      variants: [{ id: '55555555-5555-4555-8555-555555555555', name: 'Hộp 5 miếng', sku: 'MASK5', price: 90000 }] };
    const writes = [], errors = [], observations = {};
    let sessions = [], roomNumber = 0, failCreateOnce = true;
    await page.evaluateOnNewDocument(({ store, user }) => {
      localStorage.setItem('token', 'qa-isolated-live'); localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('current_store_id', store.id); localStorage.setItem('scanms-current-role', 'shop');
      localStorage.setItem('scanms-active-workspace', 'shop');
    }, { store, user });
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000' || url.pathname.startsWith('/socket.io')) {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'authorization,content-type,x-skip-cache', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        let data = [];
        if (url.pathname.endsWith('/auth/me')) data = user;
        if (url.pathname.endsWith('/notifications/unread-count')) data = { unreadCount: 0 };
        if (url.pathname.endsWith('/notifications')) data = { items: [], total: 0 };
        if (url.pathname.endsWith('/live-sessions/shop/catalog')) data = { creators, products: [product], defaultCommissionRate: 10 };
        if (url.pathname.endsWith('/live-sessions/shop') && request.method() === 'GET') data = sessions;
        if (['POST', 'PATCH'].includes(request.method())) {
          const body = JSON.parse(request.postData() || '{}'); writes.push({ path: url.pathname, body });
          if (url.pathname.endsWith('/live-sessions/shop/link-code')) data = { code: `QA123456789${roomNumber++}` };
          if (url.pathname.endsWith('/live-sessions/shop')) {
            if (failCreateOnce) {
              failCreateOnce = false;
              return request.respond({ status: 400, headers, body: JSON.stringify({ message: 'QA tạo phiên chưa thành công' }) });
            }
            const created = { ...body, id: '66666666-6666-4666-8666-666666666666', status: 'PENDING_CREATOR', inviteStatus: 'PENDING', creator: creators[0], coupon: { displayCode: 'LIVEAUDIT', status: 'ACTIVE', discountType: body.discountType, discountValue: body.discountValue, usageCount: 0, usageLimitTotal: body.usageLimitTotal }, products: [{ product }] };
            sessions = [created]; data = created;
          }
        }
        return request.respond({ status: 200, headers, body: JSON.stringify({ data }) });
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    const click = async label => assert.equal(await page.evaluate(label => {
      const button = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === label);
      button?.click(); return !!button;
    }, label), true, label);
    const setInput = async (selector, value) => page.$eval(selector, (el, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
    const setField = async (label, value) => {
      await page.evaluate(({ label, value }) => {
        const input = [...document.querySelectorAll('.live-create-form label')].find(el => el.textContent.trim().startsWith(label)).querySelector('input');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }, { label, value });
    };
    await page.goto(`${origin}/merchant/live-sessions`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.live-empty');
    await click('Tạo phiên live mới');
    await page.waitForSelector('.live-create-form');
    await page.type('input[placeholder="Tìm theo tên KOL, kênh TikTok, YouTube..."]', 'nguyen mai');
    await page.waitForFunction(() => document.querySelectorAll('.live-creator-grid button').length === 1);
    assert.ok(await page.$eval('.live-creator-grid', el => el.textContent.includes('Nguyễn Mai Anh')));
    await setInput('input[placeholder="Tìm theo tên KOL, kênh TikTok, YouTube..."]', '');
    await click('👑 Đối tác VIP (1)');
    assert.equal(await page.$$eval('.live-creator-grid button', els => els.length), 1);
    await click('Tất cả (2)');
    await click('Sắp xếp follower');
    assert.ok(await page.$eval('.live-creator-grid button', el => el.textContent.includes('Bùi Minh Anh')));
    await click('Sàn SCANMS Live');
    await click('TikTok Live');
    await page.evaluate(() => [...document.querySelectorAll('.live-creator-grid button')].find(el => el.textContent.includes('Nguyễn Mai Anh')).click());
    await page.waitForFunction(() => document.querySelector('[aria-label="Đã chọn KOL Nguyễn Mai Anh"]'));
    observations.linkRequestedWhileExternal = writes.some(write => write.path.endsWith('/link-code'));
    assert.equal(observations.linkRequestedWhileExternal, false, 'external sessions must not request a SCANMS room');
    await click('Thêm kênh phát sóng');
    assert.equal(await page.$$eval('input[placeholder="Link kênh phát sóng (https://...)"]', els => els.length), 2);
    await click('TikTok Live'); await click('Sàn SCANMS Live');
    await page.waitForFunction(() => document.querySelector('input[readonly]')?.value.includes('/live/QA'));
    observations.generatedRoom = await page.$eval('input[readonly]', el => el.value);
    await page.evaluate(() => { window.qaCopied = ''; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.qaCopied = value; } } }); });
    await page.click('button[title="Sao chép link"]');
    assert.equal(await page.evaluate(() => window.qaCopied), observations.generatedRoom);
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw Error('QA denied'); } } }));
    await page.click('button[title="Sao chép link"]');
    await page.waitForFunction(() => document.body.innerText.includes('Không sao chép được link.'));
    await setInput('input[placeholder="Ví dụ: Mega Live Deal sốc tối nay"]', 'Phiên kiểm tra giả lập');
    await page.click('[role=button][aria-label="Chọn thời gian bắt đầu"]');
    await click('Bây giờ'); await click('Xong'); await click('+2h');
    await click('Chọn đang hiển thị');
    await page.waitForFunction(() => document.querySelector('#live-products-section').textContent.includes('(1/1)'));
    await page.click('#live-products-section label input[type=checkbox]');
    await page.type('input[placeholder="Tìm nhanh theo tên sản phẩm, mã SKU..."]', 'MASK5');
    assert.equal(await page.$$eval('#live-products-section .max-h-72 > div', els => els.length), 1);
    await click('Bỏ chọn hết');
    await click('Chọn đang hiển thị');
    await page.click('#live-products-section label input[type=checkbox]');
    await click('+3% (Khuyến nghị)');
    observations.commissionPreview = await page.$eval('.live-commission-summary', el => el.innerText);
    await setField('Mức giảm', '15'); await setField('Tổng lượt dùng', '100');
    await setField('Đơn tối thiểu', '200000'); await setField('Giảm tối đa', '50000');
    observations.perCustomerRequiredMarker = await page.$$eval('.live-create-form label', els => {
      const label = els.find(el => el.textContent.includes('Lượt dùng mỗi khách')); return { text: label.textContent, required: label.querySelector('input').required };
    });
    assert.equal(observations.perCustomerRequiredMarker.required, true);
    assert.equal(await page.$$eval('.live-create-form label', els => els.find(el => el.textContent.includes('Lượt dùng mỗi khách')).querySelector('input').value), '1');
    await page.screenshot({ path: `${output}/form-desktop.png`, fullPage: true });
    await page.setViewport({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'form fits mobile width');
    await page.screenshot({ path: `${output}/form-mobile.png`, fullPage: true });
    await page.setViewport({ width: 1440, height: 1000 });
    await page.type('.live-create-form textarea', 'Lời mời chỉ trong bộ kiểm thử');
    await page.evaluate(() => document.querySelector('.live-create-form').requestSubmit());
    await page.waitForFunction(() => document.body.innerText.includes('QA tạo phiên chưa thành công'));
    assert.equal(await page.$eval('input[placeholder="Ví dụ: Mega Live Deal sốc tối nay"]', el => el.value), 'Phiên kiểm tra giả lập');
    await page.evaluate(() => { const form = document.querySelector('.live-create-form'); form.requestSubmit(); form.requestSubmit(); });
    await page.waitForSelector('.live-detail-overlay');
    const attempts = writes.filter(write => write.path.endsWith('/live-sessions/shop'));
    assert.equal(attempts.length, 2, 'one failed attempt, one retry; duplicate submit is ignored');
    const created = attempts.at(-1);
    assert.equal(created.body.storeId, store.id, 'use the active owned store instead of the first store');
    assert.equal(created.body.minimumOrderAmount, 200000);
    assert.equal(created.body.maximumDiscountAmount, 50000);
    assert.equal(created.body.commissionRate, 3, 'API expects live boost, not displayed total');
    assert.deepEqual(created.body.productIds, [product.id]);
    assert.deepEqual(created.body.variantIds, [product.variants[0].id]);
    assert.equal(created.body.creatorId, creators[0].id);
    assert.equal(new Date(created.body.endsAt) - new Date(created.body.startsAt), 7200000);
    observations.created = created;
    observations.afterCreation = await page.$eval('.live-detail-overlay', el => el.innerText);
    assert.ok(observations.afterCreation.includes('Chờ KOL'));
    assert.equal(writes.filter(write => write.path.endsWith('/link-code')).length, 1, 'history must not generate an unused room');
    await page.$eval('.live-detail-overlay > div > div:first-child > button', el => el.click());
    await page.waitForFunction(() => !document.querySelector('.live-detail-overlay'));
    await click('Tạo phiên live & Voucher mới');
    await page.waitForSelector('.live-create-form');
    await click('Sàn SCANMS Live'); await click('YouTube Live');
    await setInput('input[placeholder="Ví dụ: Mega Live Deal sốc tối nay"]', 'Phiên nền tảng ngoài');
    await setInput('input[placeholder="Link kênh phát sóng (https://...)"]', 'https://youtube.com/@qa-live');
    await setInput('input[placeholder="Số follower"]', '0');
    await page.click('[role=button][aria-label="Chọn thời gian bắt đầu"]');
    await click('Bây giờ'); await click('Xong'); await click('+1h');
    await click('Chọn đang hiển thị');
    await click('Giảm theo %'); await click('Giảm số tiền cố định (₫)');
    await setField('Mức giảm', '20000'); await setField('Tổng lượt dùng', '20');
    assert.equal(await page.$$eval('.live-create-form label', els => els.some(el => el.textContent.includes('Giảm tối đa'))), false);
    const roomsBeforeExternal = writes.filter(write => write.path.endsWith('/link-code')).length;
    await page.evaluate(() => document.querySelector('.live-create-form').requestSubmit());
    await page.waitForSelector('.live-detail-overlay');
    const external = writes.filter(write => write.path.endsWith('/live-sessions/shop')).at(-1);
    assert.equal(external.body.platform, 'YOUTUBE');
    assert.equal(external.body.liveUrl, 'https://youtube.com/@qa-live');
    assert.deepEqual(external.body.externalChannels, [{ channelUrl: 'https://youtube.com/@qa-live', followerCount: 0 }]);
    assert.equal(external.body.discountType, 'FIXED_AMOUNT');
    assert.equal(external.body.maximumDiscountAmount, undefined);
    assert.equal(writes.filter(write => write.path.endsWith('/link-code')).length, roomsBeforeExternal);
    observations.external = external;
    observations.url = page.url(); observations.writes = writes; observations.errors = errors;
    await page.screenshot({ path: `${output}/created.png` });
    await writeFile(`${output}/observations.json`, JSON.stringify(observations, null, 2));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
