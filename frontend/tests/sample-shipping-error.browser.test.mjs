import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = process.env.GHN_UI_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
test('both Shop sample dialogs keep the full GHN quota error visible without declaring a shipment',
  { skip: !base || !existsSync(executablePath), timeout: 45000 }, async () => {
    assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
    const browser = await puppeteer.launch({ executablePath, headless: true });
    const storeId = '00000000-0000-4000-8000-000000000010';
    const sample = { id: '00000000-0000-4000-8000-000000000020', status: 'APPROVED', createdAt: new Date().toISOString(),
      collaboratorId: 'audit-kol', collaborator: { id: 'audit-kol', fullName: 'KOL kiểm thử', email: 'audit@example.test' },
      recipientName: 'Người nhận mẫu', recipientPhone: '0912345678', shippingAddress: '88 Đường Mới, Phường A, Quận B, Tỉnh C',
      product: { id: 'audit-product', title: 'Mẫu kiểm thử', storeId, price: 250000 }, events: [], videoAssets: [] };
    const message = 'Tài khoản GHN thật đang bị giới hạn tạo vận đơn. Đây là hạn mức của GHN, không phải số suất mẫu Shop đã cấp. Vui lòng kiểm tra hạn mức tài khoản hoặc liên hệ GHN. Yêu cầu mẫu vẫn chờ gửi, chưa có mã vận đơn và chưa bắt đầu hạn nộp video.';
    let createAttempts = 0;
    try {
      for (const route of ['/merchant/kol-hub?kol=audit-kol&tab=samples', '/merchant/orders?tab=samples']) {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        page.setDefaultTimeout(10000);
        await page.evaluateOnNewDocument(() => {
          localStorage.setItem('token', 'fixture-no-server-access');
          localStorage.setItem('user', JSON.stringify({ id: 'audit-shop', role: 'SHOP_MANAGER', fullName: 'Audit', email: 'shop@example.test' }));
        });
        await page.setRequestInterception(true);
        page.on('request', request => {
          const url = new URL(request.url());
          if (url.pathname.startsWith('/api/') || url.port === '3000') {
            const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': new URL(base).origin,
              'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,authorization,x-skip-cache',
              'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
            if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
            if (url.pathname.includes('/shipping/ghn/create-sample/')) {
              createAttempts++;
              return request.respond({ status: 400, headers, body: JSON.stringify({ statusCode: 400, code: 'GHN_ORDER_LIMIT_REACHED', message }) });
            }
            let data = [];
            if (url.pathname === '/api/sample-requests/shop') data = [sample];
            if (url.pathname === '/api/store-collaborators/shop') data = { store: { id: storeId, name: 'Audit' }, members: [] };
            return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
          }
          if (url.origin !== new URL(base).origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
          return request.continue();
        });
        await page.goto(base + route);
        await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent.trim() === 'Tạo vận đơn GHN')).catch(async error => {
          throw new Error(`${route}: ${error.message}; ${await page.evaluate(() => document.body.innerText.slice(-1800))}`);
        });
        await page.evaluate(() => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Tạo vận đơn GHN').click());
        await page.waitForSelector('form button[type="submit"]');
        if (route.startsWith('/merchant/orders')) {
          for (const width of [1280, 390]) {
            await page.setViewport({ width, height: 720 });
            const geometry = await page.$eval('[aria-labelledby="sample-shipping-title"]', dialog => {
              const rect = dialog.getBoundingClientRect();
              const scroll = dialog.querySelector('form > div');
              scroll.scrollTop = 0;
              const titleBefore = dialog.querySelector('h3').getBoundingClientRect().top;
              const closeBefore = dialog.querySelector('[aria-label]').getBoundingClientRect().top;
              scroll.scrollTop = scroll.scrollHeight;
              const close = dialog.querySelector('[aria-label]').getBoundingClientRect();
              const submit = dialog.querySelector('button[type="submit"]').getBoundingClientRect();
              return { fits: rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight, noOverflow: dialog.scrollWidth <= dialog.clientWidth, controlsVisible: close.top >= rect.top && submit.bottom <= rect.bottom, titleScrolls: dialog.querySelector('h3').getBoundingClientRect().top < titleBefore, closeStays: Math.abs(close.top - closeBefore) < 1 };
            });
            assert.deepEqual(geometry, { fits: true, noOverflow: true, controlsVisible: true, titleScrolls: true, closeStays: true });
            if (width === 1280) {
              assert.equal(await page.$eval('[aria-labelledby="sample-shipping-title"]', dialog => dialog.getBoundingClientRect().width), 680);
              assert.equal(await page.$eval('[aria-labelledby="sample-shipping-title"]', dialog => {
                const headings = [...dialog.querySelectorAll('h4')].map(el => el.getBoundingClientRect());
                return Math.abs(headings[0].left - headings[1].left) < 1 && headings[1].top > headings[0].bottom;
              }), true, 'shipping sections are stacked in one column');
            }
            await page.screenshot({ path: join(tmpdir(), `scanms-sample-shipping-${width}.png`) });
          }
        }
        await page.$eval('form', form => form.requestSubmit());
        await page.waitForFunction(() => [...document.querySelectorAll('[role="alert"]')].some(el => el.textContent.includes('không phải số suất mẫu')));
        const alert = await page.$eval('form [role="alert"]', el => ({ text: el.innerText, overflow: getComputedStyle(el.querySelector('p:last-child')).textOverflow }));
        assert.ok(alert.text.includes(message));
        assert.notEqual(alert.overflow, 'ellipsis');
        assert.ok(await page.$('form button[type="submit"]'), 'dialog remains open for the failed shipment');
        assert.equal(sample.status, 'APPROVED');
        await page.close();
      }
      assert.equal(createAttempts, 2);
    } finally { await browser.close(); }
  });
