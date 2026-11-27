import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const base = process.env.GHN_UI_TEST_URL;
test('shop returns fill the available width with aligned rows and preserve server-side filtering', { skip: !base, timeout: 20000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'], timeout: 10000 });
  const items = ['COMPLETED', 'REQUESTED'].map((status, index) => ({ id: `return-${index}`, status, reason: index ? 'DAMAGED' : 'WRONG_ITEM', preferredResolution: 'EXCHANGE', submittedAt: '2026-11-17T04:52:15Z', order: { externalOrderSn: `DH-2026-${index}` }, items: [{ id: `line-${index}`, quantity: 1, orderItem: { product: { title: 'Kem dưỡng' }, variant: { name: 'Bản dịu nhẹ · 50 ml' } } }] }));
  const queries = [];
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(7000);
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('user', JSON.stringify({ id: 'qa-shop', role: 'SHOP_MANAGER', fullName: 'Shop' }));
    });
    const errors = []; page.on('pageerror', e => { if (!e.message.includes('WebSocket closed without opened')) errors.push(e.message); });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname === '/queue-fixture') return req.respond({ contentType: 'text/html', body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/shop-returns-queue.tsx"></script>' });
      if (/\/returns\/return-\d+$/.test(url.pathname) && url.pathname.includes('/api/')) {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || '*' };
        if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers });
        return req.respond({ status: 404, headers, contentType: 'application/json', body: '{}' });
      }
      if (url.pathname.endsWith('/returns/shop')) {
        const status = url.searchParams.get('status'); queries.push(status);
        const filtered = status ? items.filter(item => item.status === status) : items;
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || '*' };
        if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers });
        return req.respond({ headers, contentType: 'application/json', body: JSON.stringify({ data: { total: filtered.length, page: 1, items: filtered } }) });
      }
      if (url.origin !== origin) return req.abort();
      return req.continue();
    });
    await page.setViewport({ width: 1440, height: 850 });
    await page.goto(origin + '/queue-fixture', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.shop-returns-row');
    assert.equal(await page.$$eval('.shop-returns-row', els => els.length), 2);
    assert.ok(await page.$eval('.shop-returns-list', el => el.getBoundingClientRect().width > 1350));
    assert.equal(await page.$('.shop-returns-list-heading'), null);
    assert.equal(await page.$('.shop-returns-refresh'), null);
    const widths = await page.$$eval('.shop-returns-filters button', els => els.map(el => el.getBoundingClientRect().width));
    assert.ok(Math.max(...widths) - Math.min(...widths) < 1);
    assert.ok(await page.$eval('.shop-returns-toolbar', el => { const list = document.querySelector('.shop-returns-list').getBoundingClientRect(); const bar = el.getBoundingClientRect(); return bar.left === list.left && bar.width === list.width && getComputedStyle(el).backgroundColor === 'rgb(255, 255, 255)'; }));
    const heights = await page.$$eval('.shop-returns-row', els => els.map(el => el.getBoundingClientRect().height));
    assert.equal(heights[0], heights[1]); assert.ok(heights[0] < 130);
    assert.equal(await page.$eval('h1', el => getComputedStyle(el).position), 'absolute');
    assert.match(await page.$eval('.shop-returns-row', el => el.textContent), /Kem dưỡng.*SL: 1.*50 ml/);
    await page.screenshot({ path: join(tmpdir(), 'scanms-shop-returns-desktop.png') });
    await page.click('.shop-returns-filters button:nth-child(2)');
    await page.waitForFunction(() => document.querySelectorAll('.shop-returns-row').length === 1);
    assert.ok(queries.includes('REQUESTED'));
    assert.match(await page.$eval('.shop-returns-open', el => el.textContent), /Xử lý yêu cầu/);
    assert.equal(await page.$eval('.shop-returns-open', el => el.getAttribute('href')), '/merchant/returns/return-1');
    await page.click('.shop-returns-open');
    const queueBack = 'a[href="/merchant/returns?status=REQUESTED"]';
    await page.waitForSelector(queueBack);
    assert.match(await page.$eval(queueBack, el => el.textContent), /Quay lại danh sách hồ sơ/);
    await page.click(queueBack);
    await page.waitForSelector('.shop-returns-open');
    assert.equal(await page.$eval('.shop-returns-filters button:nth-child(2)', el => el.getAttribute('aria-pressed')), 'true');
    await page.setViewport({ width: 390, height: 844 });
    assert.ok(await page.$eval('.shop-returns-queue', el => el.scrollWidth <= el.clientWidth));
    assert.ok(await page.$eval('.shop-returns-row', el => el.scrollWidth <= el.clientWidth));
    await page.screenshot({ path: join(tmpdir(), 'scanms-shop-returns-mobile.png') });
    assert.deepEqual(errors, []);
    await page.goto(origin + '/queue-fixture?entry=/merchant/returns/return-0');
    await page.waitForSelector('.shop-return-detail a[href="/merchant/returns"]');
    await page.goto(origin + '/queue-fixture?entry=/merchant/orders');
    await page.click('a[href="/merchant/returns/return-0"]');
    await page.waitForSelector('.shop-return-detail a[href="/merchant/orders?status=RETURNS"]');
  } finally { await browser.close(); }
});
