import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const base = process.env.GHN_UI_TEST_URL;
test('shop rejection previews and removes evidence, validates limits and guards footer submission', { skip: !base, timeout: 25000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'], timeout: 10000 });
  let uploads = 0; const decisions = [];
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(7000);
    await page.setViewport({ width: 1200, height: 950 });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname === '/shop-rejection-fixture') return req.respond({ contentType: 'text/html', body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/shop-rejection.tsx"></script>' });
      const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || '*', 'Access-Control-Allow-Methods': 'POST,PATCH,OPTIONS' };
      if (url.pathname.includes('/upload/image')) {
        if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers });
        uploads++;
        return req.respond({ headers, contentType: 'application/json', body: JSON.stringify({ data: { url: 'https://example.test/evidence.png' } }) });
      }
      if (url.pathname.endsWith('/orders/order-fixture/return-request/respond')) {
        if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers });
        decisions.push(JSON.parse(req.postData()));
        return setTimeout(() => void req.respond({ status: decisions.length === 1 ? 500 : 200, headers, contentType: 'application/json', body: JSON.stringify(decisions.length === 1 ? { message: 'Chưa gửi được hồ sơ.' } : { data: { returnRequest: { id: 'rejection-fixture' } } }) }), 200);
      }
      if (url.origin !== origin) return req.abort();
      return req.continue();
    });
    await page.goto(origin + '/shop-rejection-fixture', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.shop-return-decisions > div:nth-child(2) button');
    await page.click('.shop-return-decisions > div:nth-child(2) button');
    await page.waitForSelector('.shop-rejection-form');
    assert.equal(await page.$eval('[role="dialog"]', el => el.getBoundingClientRect().width), 640);
    assert.match(await page.$eval('[role="dialog"]', el => el.textContent), /Từ chối yêu cầu.*Mã đơn: DH-QA-001/);
    assert.equal(await page.$eval('.modal-footer button[type="submit"]', el => el.disabled), true);
    assert.equal(await page.$eval('.shop-rejection-select', el => el.getBoundingClientRect().height), 42);
    assert.equal(await page.$eval('.shop-rejection-note', el => el.getBoundingClientRect().height), 88);
    await page.select('.shop-rejection-select', 'PRODUCT_MISMATCH');
    await page.type('.shop-rejection-note', 'Sản phẩm gửi trong bằng chứng không khớp sản phẩm của đơn hàng.');
    const add = async names => page.$eval('input[type="file"]', (input, names) => {
      const data = new DataTransfer();
      const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6V8AAAAASUVORK5CYII='), c => c.charCodeAt(0));
      for (const name of names) data.items.add(new File([bytes], name, { type: 'image/png', lastModified: 1 }));
      input.files = data.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    }, names);
    await add(['evidence-1.png', 'evidence-2.png']);
    await page.waitForFunction(() => document.querySelectorAll('.shop-rejection-evidence').length === 2);
    assert.equal(await page.$eval('.shop-rejection-thumbnail', el => el.getBoundingClientRect().width), 56);
    await page.click('.shop-rejection-evidence button');
    assert.equal(await page.$$eval('.shop-rejection-evidence', els => els.length), 1);
    await add(['3.png', '4.png', '5.png', '6.png', '7.png']);
    await page.waitForSelector('.shop-rejection-form [role="alert"]');
    assert.equal(await page.$$eval('.shop-rejection-evidence', els => els.length), 1);
    await page.screenshot({ path: join(tmpdir(), 'scanms-shop-rejection-desktop.png') });
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.$eval('[role="dialog"]', el => el.scrollWidth <= el.clientWidth), true);
    await page.screenshot({ path: join(tmpdir(), 'scanms-shop-rejection-mobile.png') });
    await page.$eval('.modal-footer button[type="submit"]', el => { el.click(); el.click(); });
    await page.waitForFunction(() => document.querySelector('.shop-rejection-form [role="alert"]')?.textContent === 'Chưa gửi được hồ sơ.');
    assert.equal(decisions.length, 1); assert.equal(uploads, 1);
    assert.equal(decisions[0].decision, 'REJECT'); assert.equal(decisions[0].escalateToManager, true);
    assert.equal(decisions[0].rejectionReason, 'PRODUCT_MISMATCH');
    assert.equal(await page.$$eval('.shop-rejection-evidence', els => els.length), 1);
    await page.waitForFunction(() => !document.querySelector('.modal-footer button[type="submit"]').disabled);
    await page.click('.modal-footer button[type="submit"]');
    await page.waitForFunction(() => document.body.textContent.includes('Đã chuyển vận hành xem xét'));
    assert.equal(decisions.length, 2);
    assert.equal(await page.$('.shop-rejection-form'), null);
  } finally { await browser.close(); }
});
