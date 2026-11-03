import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.COUPONS_AUDIT_URL;
const executablePath = process.env.COUPONS_AUDIT_BROWSER;

test('merchant voucher audit: isolated navigation, filters, issuance, approval, rejection and blocking', {
  skip: !base || !executablePath, timeout: 90000,
}, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const origin = new URL(base).origin;
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const output = '../artifacts/coupons-audit';
  await mkdir(output, { recursive: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    await page.setViewport({ width: 1440, height: 1000 });
    const store = { id: '11111111-1111-4111-8111-111111111111', name: 'QA Shop', isActive: true, isVerified: true, onboardingStatus: 'VERIFIED' };
    const user = { id: 'qa-owner', fullName: 'QA Owner', role: 'SHOP_MANAGER', stores: [store] };
    const common = { storeId: store.id, discountType: 'PERCENTAGE', discountValue: 10,
      usageCount: 1, usageLimitTotal: 100, usageLimitPerCustomer: 1, budgetTotal: 1000000, budgetUsed: 10000,
      fundingSource: 'SHOP_FUNDED', scopeType: 'STORE_WIDE', expiresAt: '2099-12-31T16:59:59.999Z' };
    const rows = [
      { ...common, id: 'shop', displayCode: 'SHOPTEST', codeNormalized: 'SHOPTEST', status: 'ACTIVE', collaboratorId: user.id,
        collaborator: { id: user.id, fullName: 'QA Owner', email: 'owner@example.test' } },
      { ...common, id: 'kol', displayCode: 'KOLNOTIER', codeNormalized: 'KOLNOTIER', status: 'ACTIVE', collaboratorId: 'qa-kol',
        collaborator: { id: 'qa-kol', fullName: 'KOL chưa có hạng', email: 'kol@example.test', collaboratorProfile: { tier: null } } },
      { ...common, id: 'paused', displayCode: 'PAUSEDTEST', status: 'PAUSED' },
      { ...common, id: 'expired', displayCode: 'EXPIREDTEST', status: 'ACTIVE', expiresAt: '2000-01-01T00:00:00Z' },
      { ...common, id: 'future', displayCode: 'FUTURETEST', status: 'ACTIVE', startsAt: '2099-01-01T00:00:00Z' },
      { ...common, id: 'pending', displayCode: 'PENDINGTEST', status: 'PENDING_APPROVAL', scopeType: 'PRODUCTS',
        startsAt: '2026-11-01T00:00:00Z', maximumDiscountAmount: 0, minimumOrderAmount: 0,
        collaborator: { id: 'qa-kol', fullName: 'KOL đề xuất', collaboratorProfile: { tier: { name: 'Bronze' } } },
        couponProducts: [{ id: 'scope', product: { id: 'product', title: 'QA Product', price: 100000 } }] },
      { ...common, id: 'reject', displayCode: 'REJECTTEST', status: 'PENDING_APPROVAL' },
    ];
    const writes = [], reads = [], errors = [];
    let failList = false;
    await page.evaluateOnNewDocument(({ user, store }) => {
      localStorage.setItem('token', 'qa-isolated-coupons');
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('current_store_id', store.id);
      localStorage.setItem('scanms-current-role', 'shop');
      localStorage.setItem('scanms-active-workspace', 'shop');
    }, { user, store });
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000' || url.pathname.startsWith('/socket.io')) {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'authorization,content-type,x-skip-cache',
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        let data = [];
        if (url.pathname.endsWith('/auth/me')) data = user;
        if (url.pathname.endsWith('/stores/my-store')) data = store;
        if (url.pathname === '/api/notifications/unread-count') data = { unreadCount: 0 };
        if (url.pathname === '/api/notifications') data = { items: [], total: 0 };
        if (url.pathname === '/api/products') data = { items: [{ id: 'product', title: 'QA Product', price: 100000 }] };
        if (url.pathname.endsWith('/coupons/subsidies')) data = [{ storeId: store.id, storeName: store.name,
          reimbursementReady: true, orders: [
            { orderId: 'order', orderCode: 'QA-ORDER', amount: 25000, paidAmount: 0, outstandingAmount: 25000, payments: [] },
            { orderId: 'paid', orderCode: 'QA-PAID', amount: 15000, paidAmount: 15000, outstandingAmount: 0, payments: [] },
          ] }];
        if (url.pathname === `/api/stores/${store.id}/coupons` && request.method() === 'GET') {
          reads.push(url.search);
          if (failList) return request.respond({ status: 500, headers, body: JSON.stringify({ message: 'QA list failure' }) });
          data = { data: rows, meta: { page: 1, limit: 20, total: 25, totalPages: 2 } };
        }
        if (['POST', 'PATCH', 'DELETE'].includes(request.method())) {
          const body = JSON.parse(request.postData() || '{}');
          writes.push({ path: url.pathname, body });
          const row = rows.find(item => url.pathname.includes(`/${item.id}/`));
          if (url.pathname.endsWith('/approve') && row) row.status = 'ACTIVE';
          if (url.pathname.endsWith('/reject') && row) row.status = 'REJECTED';
          if (url.pathname.endsWith('/block') && row) row.status = 'BLOCKED';
          data = { success: true };
        }
        return request.respond({ status: 200, headers, body: JSON.stringify({ data }) });
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    const click = async (label, selector = 'button') => {
      const found = await page.evaluate(({ label, selector }) => {
        const compact = value => value.replace(/\s/g, '');
        const element = [...document.querySelectorAll(selector)].find(el => compact(el.textContent) === compact(label));
        if (!element) return false;
        element.click(); return true;
      }, { label, selector });
      assert.equal(found, true, `button exists: ${label}`);
    };
    const card = async code => page.evaluate(code => [...document.querySelectorAll('.coupon-card')].find(el => el.textContent.includes(code))?.innerText, code);
    await page.goto(`${origin}/merchant/promotions?tab=coupons`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.coupon-card');
    const audit = { listRequests: reads, initialMetrics: await page.$eval('.coupon-metrics', el => el.innerText),
      unrankedKolCard: await card('KOLNOTIER'), pausedCard: await card('PAUSEDTEST'),
      expiredCard: await card('EXPIREDTEST'), futureCard: await card('FUTURETEST') };
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true,
      value: { writeText: () => Promise.reject(new Error('QA clipboard denied')) } }));
    await page.evaluate(() => document.querySelector('.coupon-card button[title="Sao chép mã"]').click());
    await page.waitForFunction(() => document.body.innerText.includes('Đã sao chép mã: SHOPTEST'));
    audit.clipboardFailureReportsSuccess = true;
    await click('KOL đề xuất');
    audit.kolFilterCodes = await page.$$eval('.coupon-card-heading', els => els.map(el => el.innerText));
    await click('Tất cả');
    await page.type('input[placeholder="Tìm mã voucher..."]', 'SHOPTEST');
    await page.waitForFunction(() => document.querySelectorAll('.coupon-card').length === 1);
    await page.$eval('input[placeholder="Tìm mã voucher..."]', el => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(el, ''); el.dispatchEvent(new Event('input', { bubbles: true })); });
    await click('Lịch sử tài trợ 1');
    await page.waitForFunction(() => document.body.innerText.includes('QA-PAID'));
    assert.equal(await page.evaluate(() => document.body.innerText.includes('QA-ORDER')), false);
    await click('Tạo chiến dịch');
    await page.waitForSelector('#campaign-name');
    await click('✕');
    await click('Phát hành voucher mới');
    await page.waitForSelector('#store-voucher-form');
    await page.$eval('#store-voucher-form input[type=text]:not(#voucher-discount-value)', el => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(el, 'QANEW10'); el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.evaluate(() => document.querySelector('#store-voucher-form').requestSubmit());
    await page.waitForFunction(() => !document.querySelector('#store-voucher-form'));
    assert.ok(writes.some(write => write.path === `/api/stores/${store.id}/coupons`));
    await click('KOL chờ duyệt 2');
    await page.waitForFunction(() => document.querySelectorAll('.coupon-card').length === 2);
    await page.evaluate(() => [...document.querySelectorAll('.coupon-card')].find(el => el.textContent.includes('PENDINGTEST')).querySelectorAll('button')[2].click());
    await page.waitForFunction(() => document.body.innerText.includes('Phê duyệt & Kích hoạt'));
    await click('Phê duyệt & Kích hoạt');
    await page.waitForFunction(() => !document.body.innerText.includes('Phê duyệt & Kích hoạt'));
    audit.approvalPayload = writes.find(write => write.path.endsWith('/pending/approve'))?.body;
    assert.ok(audit.approvalPayload);
    await click('Từ chối');
    await page.type('textarea', 'Lý do kiểm thử từ chối');
    await click('Xác nhận từ chối');
    await page.waitForFunction(() => !document.querySelector('textarea'));
    assert.ok(writes.some(write => write.path.endsWith('/reject/reject')));
    await click('Đang áp dụng (6)');
    await page.waitForSelector('.coupon-card');
    await page.evaluate(() => [...document.querySelectorAll('.coupon-card')].find(el => el.textContent.includes('SHOPTEST')).querySelector('.coupon-card-actions button:last-child').click());
    await page.type('textarea', 'x');
    audit.shortBlockReasonEnabled = await page.$eval('form button[type=submit]', el => !el.disabled);
    await page.type('textarea', ' lý do khóa thử');
    await click('Xác nhận khóa');
    await page.waitForFunction(() => !document.querySelector('textarea'));
    assert.ok(writes.some(write => write.path.endsWith('/shop/block')));
    await click('Lịch sử (2)');
    await page.waitForFunction(() => [...document.querySelectorAll('.coupon-card')].some(el => el.textContent.includes('SHOPTEST')));
    await page.screenshot({ path: `${output}/history.png` });
    await click('Hoa hồng & thưởng');
    await page.waitForFunction(() => location.search.includes('commission-rules'));
    await click('Link tiếp thị');
    await page.waitForFunction(() => location.search.includes('referral-links'));
    await click('Mã giảm giá');
    await page.waitForSelector('.coupon-card');
    audit.urlAfterTabReturn = page.url();
    failList = true;
    await page.reload({ waitUntil: 'networkidle0' });
    audit.failedListLooksEmpty = await page.evaluate(() => document.body.innerText.includes('Không có mã giảm giá nào'));
    audit.writes = writes;
    audit.pageErrors = errors;
    await writeFile(`${output}/observations.json`, JSON.stringify(audit, null, 2));
    assert.deepEqual(errors.filter(error => !error.includes('QA clipboard denied')), []);
  } finally { await browser.close(); }
});
