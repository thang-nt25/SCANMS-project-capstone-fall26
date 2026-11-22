import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const base = process.env.GHN_UI_TEST_URL;
test('customer return details remain reachable while scrolling up and down at desktop and mobile sizes', { skip: !base, timeout: 30000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, timeout: 10000, args: ['--no-sandbox'] });
  const user = { id: 'qa-customer', fullName: 'Trần An', role: 'CUSTOMER' };
  const request = { id: 'scroll-fixture', orderId: 'order-1', status: 'SHOP_APPROVED', reason: 'WRONG_ITEM', preferredResolution: 'EXCHANGE', submittedAt: '2026-11-17T01:00:00Z', shipByAt: new Date(Date.now()+86400000).toISOString(), pickupProviderMode: 'disabled', imageUrls: ['/assets/product-placeholder.svg'], unboxingVideoUrl: null,
    order: { id: 'order-1', externalOrderSn: 'DH-QA', storeName: 'Sora Skincare', customerName: 'Trần An', customerPhone: '0903000001', shippingAddress: '15 Lê Duẩn', products: Array.from({ length: 4 }, (_,i) => ({ id: 'p'+i, title: 'Sản phẩm trong đơn ' + (i+1), quantity: 1, unitPrice: 200000 })) }, items: Array.from({length:4}, (_,i) => ({id:'line'+i, quantity:1, unitPrice:200000, orderItem:{product:{title:'Product '+(i+1)}}})), events: [], returnWarehouse: { name: 'Bộ phận kho vận', phone: '0901234567', address: 'Đường số 2', wardName: 'Phường Ba Đình', provinceName: 'Thành phố Hà Nội' } };
  const errors = [];
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(8000);
    page.on('pageerror', error => { if (!error.message.includes('WebSocket closed without opened')) errors.push(error.message); });
    await page.evaluateOnNewDocument(user => { localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('token','qa'); }, user);
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname === '/return-scroll-fixture') return req.respond({ contentType: 'text/html', body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/return-scroll.tsx"></script>' });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS' };
        let data = [];
        if (url.pathname.includes('/returns/scroll-fixture')) data = request;
        if (url.pathname.includes('/auth/me')) data = user;
        if (url.pathname.includes('/customer/cart')) data = { items: [] };
        if (url.pathname.includes('/notifications')) data = { notifications: [], unreadCount: 0 };
        if (url.pathname.includes('/customer/addresses')) data = [{ fullName: 'Trần An', phoneNumber: '0903000001', detailAddress: '15 Lê Duẩn', provinceName: 'Thành phố Hà Nội', districtName: '', wardName: 'Phường Ba Đình', isDefault: true }];
        return req.respond({ headers, contentType: 'application/json', body: JSON.stringify({ data }) });
      }
      if (url.origin !== origin) return req.abort();
      return req.continue();
    });
    for (const width of [1440, 1100, 390]) {
      await page.setViewport({ width, height: 850 });
      await page.goto(origin + '/return-scroll-fixture', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.pickup-card');
      assert.equal(await page.$eval('.workspace-page-column', el => getComputedStyle(el).overflowY), 'visible');
      for (let cycle = 0; cycle < 2; cycle++) {
        await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
        const end = await page.$eval('.pickup-card', el => el.getBoundingClientRect().bottom);
        assert.ok(end <= 850 && end > 0, `last card is clipped: ${end}`);
        await page.screenshot({ path: join(tmpdir(), `scanms-return-scroll-${width}.png`) });
        await page.mouse.move(width - 80, 600); await page.mouse.wheel({ deltaY: -600 });
        const before = await page.evaluate(() => window.scrollY);
        await page.waitForFunction(previous => window.scrollY < previous, {}, before);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        const top = await page.$eval('.workspace-page-column', el => el.firstElementChild.getBoundingClientRect().top);
        assert.ok(top >= 0 && top < 850);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    assert.deepEqual(errors, []);
    request.status = 'INSPECTING';
    for (const width of [1440, 390]) {
      await page.setViewport({ width, height: 850 });
      await page.goto(origin + '/return-scroll-fixture?mode=shop', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[role="group"][aria-label="Kết quả kiểm tra"] button');
      const buttons = await page.$$eval('[role="group"][aria-label="Kết quả kiểm tra"] > button', els => els.map(el => { const r=el.getBoundingClientRect(); return {width:r.width,height:r.height,top:r.top,text:el.textContent}; }));
      assert.equal(buttons.length, 3);
      assert.ok(buttons.every(button => Math.abs(button.width-buttons[0].width)<1 && button.height === 42));
      assert.equal(buttons[0].top === buttons[1].top, width > 639);
      assert.deepEqual(buttons.map(button => button.text), ['Hoàn tiền', 'Đổi sản phẩm', 'Từ chối yêu cầu']);
      await page.$eval('[role="group"][aria-label="Kết quả kiểm tra"]', el => el.scrollIntoView({block:'center',behavior:'instant'}));
      await page.screenshot({ path: join(tmpdir(), `scanms-return-inspection-actions-${width}.png`) });
      await page.click('[role="group"][aria-label="Kết quả kiểm tra"] button:last-child');
      await page.waitForSelector('[role="dialog"]');
      assert.match(await page.$eval('[role="dialog"]', el => el.textContent), /Từ chối sau kiểm tra/);
      await page.keyboard.press('Escape');
    }
  } finally { await browser.close(); }
});
