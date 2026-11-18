import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const base = process.env.GHN_UI_TEST_URL;
test('customer replacement card uses actual delivery state and locks repeat receipt confirmation', { skip: !base, timeout: 30000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, timeout: 10000, args: ['--no-sandbox'] });
  const user = { id: 'qa-customer', fullName: 'Trần An', role: 'CUSTOMER' };
  const request = { id: 'scroll-fixture', orderId: 'order-1', status: 'EXCHANGE_SHIPPED', resolution: 'EXCHANGE', reason: 'WRONG_ITEM', preferredResolution: 'EXCHANGE', submittedAt: '2026-11-17T01:00:00Z', imageUrls: [], events: [],
    order: { id: 'order-1', externalOrderSn: 'DH-QA', storeName: 'Vela Store' },
    items: [{ id: 'line-1', quantity: 1, unitPrice: 200000, orderItem: { product: { title: 'Kem dưỡng' }, variant: { name: 'Bản dịu nhẹ · 50 ml' } } }],
    exchangeShipment: { id: 'shipment-1', carrierName: 'SCANMS Demo', trackingNumber: 'SIMX418123486578338', provider: 'MOCK', providerStatus: 'ready_to_pick', shippedAt: '2026-11-17T02:00:00Z' },
  };
  const errors = [];
  let receipts = 0;
  let completions = 0;
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(8000);
    page.on('pageerror', error => { if (!error.message.includes('WebSocket closed without opened')) errors.push(error.message); });
    await page.evaluateOnNewDocument(user => { localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('token', 'qa'); }, user);
    await page.setViewport({ width: 1440, height: 1000 });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname === '/return-receipt-fixture') return req.respond({ contentType: 'text/html', body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/return-scroll.tsx"></script>' });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
        if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers });
        if (req.method() === 'POST') {
          if (url.pathname.endsWith('/exchange-receipt')) {
            receipts++;
            if (receipts === 1) return setTimeout(() => void req.respond({ status: 502, headers, contentType: 'application/json', body: JSON.stringify({ message: 'Chưa xác nhận được, vui lòng thử lại.' }) }), 150);
            request.exchangeShipment.receivedAt = '2026-11-17T03:00:00Z';
            request.status = 'AWAITING_CUSTOMER_CONFIRMATION';
          } else if (url.pathname.endsWith('/confirmation')) {
            completions++; request.status = 'COMPLETED';
          } else return req.abort();
          return setTimeout(() => void req.respond({ headers, contentType: 'application/json', body: JSON.stringify({ data: request }) }), 150);
        }
        let data = [];
        if (url.pathname.includes('/returns/scroll-fixture')) data = request;
        if (url.pathname.includes('/auth/me')) data = user;
        if (url.pathname.includes('/customer/cart')) data = { items: [] };
        if (url.pathname.includes('/notifications')) data = { notifications: [], unreadCount: 0 };
        return req.respond({ headers, contentType: 'application/json', body: JSON.stringify({ data }) });
      }
      if (url.origin !== origin) return req.abort();
      return req.continue();
    });
    await page.goto(origin + '/return-receipt-fixture', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.customer-exchange-receipt');
    assert.equal(await page.$eval('.customer-exchange-confirm', el => el.disabled), true);
    assert.ok(!(await page.$eval('.customer-exchange-status', el => el.textContent)).includes('Đã giao'));
    assert.ok(!(await page.$eval('.customer-exchange-receipt', el => el.textContent)).includes('Demo'));
    assert.match(await page.$eval('.customer-exchange-products', el => el.textContent), /Kem dưỡng.*50 ml.*Số lượng: 1/);
    request.exchangeShipment.providerStatus = 'delivered';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('.customer-exchange-confirm')?.disabled === false);
    assert.equal(await page.$eval('.customer-exchange-status', el => el.textContent), 'Đã giao hàng');
    await page.screenshot({ path: join(tmpdir(), 'scanms-customer-exchange-desktop.png') });
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.$eval('.customer-exchange-receipt', el => el.scrollWidth <= el.clientWidth), true);
    assert.ok(await page.$eval('.customer-exchange-confirm', el => { const footer = el.parentElement; const css = getComputedStyle(footer); return Math.abs(el.getBoundingClientRect().width - (footer.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight))) < 1; }));
    await page.screenshot({ path: join(tmpdir(), 'scanms-customer-exchange-mobile.png') });
    await page.$eval('.customer-exchange-confirm', el => { el.click(); el.click(); });
    await page.waitForSelector('.customer-exchange-errors [role="alert"]');
    assert.equal(receipts, 1);
    await page.waitForFunction(() => !document.querySelector('.customer-exchange-confirm').disabled);
    await page.$eval('.customer-exchange-confirm', el => { el.click(); el.click(); });
    await page.waitForFunction(() => document.querySelector('.customer-exchange-confirm')?.textContent.trim() === 'Xác nhận hoàn tất');
    assert.equal(receipts, 2);
    assert.match(await page.$eval('.customer-exchange-confirmed', el => el.textContent), /Đã xác nhận nhận hàng.*17\/11\/2026/);
    assert.equal(completions, 0);
    await page.click('.customer-exchange-confirm');
    await page.waitForFunction(() => !document.querySelector('.customer-exchange-confirm'));
    assert.equal(completions, 1);
    assert.equal(await page.$eval('.customer-exchange-status', el => el.textContent), 'Đã xác nhận nhận hàng');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
