import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const base = process.env.GHN_UI_TEST_URL;
test('promotion proposal preserves variant ranges, floor distinction, dates, batch selection and guarded retry', { skip: !base, timeout: 35000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const requests = [], errors = [];
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(7000);
    await page.setViewport({ width: 1440, height: 1000 });
    page.on('pageerror', error => {
      // Vite's development-only HMR socket is unavailable in some test sessions.
      if (error.message === 'WebSocket closed without opened.' && error.stack?.includes('/@vite/client:')) return;
      errors.push(error.stack || error.message);
    });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname === '/promotion-fixture') return req.respond({ contentType: 'text/html', body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/promotion-proposal.tsx"></script>' });
      if (url.pathname.startsWith('/api/')) {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
        if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers });
        requests.push({ path: url.pathname, body: JSON.parse(req.postData() || '{}') });
        return setTimeout(() => void req.respond({ status: 500, headers, contentType: 'application/json', body: JSON.stringify({ message: 'QA temporary failure' }) }), 150);
      }
      if (url.origin !== origin && !['ws:', 'wss:'].includes(url.protocol)) return req.abort();
      return req.continue();
    });
    await page.goto(origin + '/promotion-fixture', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.promotion-light-dialog');
    assert.equal(await page.$eval('.promotion-light-dialog', el => el.getBoundingClientRect().width), 1000);
    assert.equal(await page.$eval('#promotion-reason', el => el.value), '');
    assert.equal(await page.$eval('.promotion-product-select img', el => el.getBoundingClientRect().width), 32);
    const preview = await page.$eval('.promotion-light-preview', el => el.textContent);
    assert.match(preview, /320.000.*400.000/);
    assert.match(preview, /200.000.*240.000/);
    assert.equal(await page.$eval('.promotion-light-body', el => {
      const products = el.querySelector('.promotion-light-products').getBoundingClientRect();
      const preview = el.querySelector('.promotion-light-preview').getBoundingClientRect();
      return preview.left >= products.right && preview.top === products.top;
    }), true);
    assert.match(await page.$eval('.promotion-proposed-price', el => el.textContent), /272.000/);
    await page.type('#promotion-reason', 'QA discount request reason');
    await page.$eval('button[form="promotion-proposal-form"]', el => { el.click(); el.click(); });
    await page.waitForSelector('[role=alert]');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].body.proposedPrice, 272000);
    assert.equal(requests[0].body.variantId, undefined);
    assert.ok(Date.parse(requests[0].body.endsAt) > Date.parse(requests[0].body.startsAt));
    assert.equal(await page.$eval('#promotion-reason', el => el.value), 'QA discount request reason');
    await page.click('[aria-label="Biến thể giảm giá"]');
    await page.$$eval('[role=option]', els => els.find(el => el.textContent.includes('100 ml')).click());
    assert.match(await page.$eval('.promotion-proposed-price', el => el.textContent), /340.000/);
    await page.click('.promotion-discount-tabs button:last-child');
    assert.match(await page.$eval('.promotion-proposed-price', el => el.textContent), /350.000/);
    await page.screenshot({ path: join(tmpdir(), 'scanms-promotion-single-compact.png') });
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.$eval('.promotion-light-body', el => {
      const settings = el.querySelector('.promotion-light-settings').getBoundingClientRect();
      const preview = el.querySelector('.promotion-light-preview').getBoundingClientRect();
      const schedule = el.querySelector('.promotion-light-schedule').getBoundingClientRect();
      return settings.bottom <= preview.top && preview.bottom <= schedule.top;
    }), true);
    await page.setViewport({ width: 1440, height: 1000 });
    await page.click('.promotion-mode-switch button:last-child');
    assert.equal(await page.$$eval('.promotion-light-products input[type=checkbox]', els => els.length), 2);
    await page.screenshot({ path: join(tmpdir(), 'scanms-promotion-compact-desktop.png') });
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.$eval('.promotion-light-dialog', el => el.scrollWidth <= el.clientWidth + 1), true);
    assert.equal(await page.$eval('.promotion-light-body', el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 1);
    await page.screenshot({ path: join(tmpdir(), 'scanms-promotion-compact-mobile.png') });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
