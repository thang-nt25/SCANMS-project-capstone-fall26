import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const base = process.env.GHN_UI_TEST_URL;
test('return warehouse opens a compact editor, preserves legacy address, saves once and resets cancelled drafts', { skip: !base, timeout: 30000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, timeout: 10000, args: ['--no-sandbox'] });
  const writes = [];
  let failLocalities = false;
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(8000);
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.hostname === 'provinces.open-api.vn') {
        if (failLocalities) return req.respond({ status: 503, headers: { 'Access-Control-Allow-Origin': '*' } });
        const province = { code: 1, name: 'Thành phố Hà Nội' };
        const district = { code: 1, name: 'Quận Ba Đình' };
        const ward = { code: 1, name: 'Phường Phúc Xá' };
        const data = url.pathname.includes('/d/') ? { ...district, wards: [ward] }
          : url.pathname.includes('/p/') ? { ...province, districts: [district], wards: [{ code: 2, name: 'Phường Ba Đình' }] }
          : [province, { code: 79, name: 'Thành phố Hồ Chí Minh' }];
        return req.respond({ headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json', body: JSON.stringify(data) });
      }
      if (url.pathname === '/warehouse-fixture') return req.respond({ contentType: 'text/html', body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/return-warehouse.tsx"></script>' });
      if (url.pathname.includes('/returns/warehouse-fixture/warehouse')) {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || '*', 'Access-Control-Allow-Methods': 'PATCH, OPTIONS' };
        if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers });
        writes.push(JSON.parse(req.postData()));
        return setTimeout(() => void req.respond({ headers, contentType: 'application/json', body: JSON.stringify({ data: {} }) }), 150);
      }
      if (url.origin !== origin) return req.abort();
      return req.continue();
    });
    await page.setViewport({ width: 1200, height: 850 });
    await page.goto(origin + '/warehouse-fixture', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('section button');
    assert.equal(await page.$('[role="dialog"]'), null);
    assert.ok(await page.$eval('section', el => el.getBoundingClientRect().height < 140));
    await page.click('section button');
    await page.waitForSelector('[role="dialog"]');
    assert.equal(await page.$eval('[role="dialog"]', el => el.getBoundingClientRect().width), 640);
    assert.equal(await page.$eval('input[autocomplete="street-address"]', el => el.value), 'đường số 2');
    await page.waitForFunction(() => document.querySelector('[data-address-ward]')?.value === '1');
    assert.equal(await page.$$eval('datalist', els => els.length), 0);
    await page.screenshot({ path: join(tmpdir(), 'scanms-return-warehouse-desktop.png') });
    await page.click('button[type="submit"]');
    await page.waitForSelector('[role="dialog"]', { hidden: true });
    assert.equal(writes.length, 1);
    assert.equal(writes[0].address, 'đường số 2, Phường Phúc Xá, Quận Ba Đình, Thành phố Hà Nội');
    await page.click('section button');
    await page.$eval('input[autocomplete="name"]', el => { el.value = 'Discarded draft'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.keyboard.press('Escape');
    await page.click('section button');
    assert.equal(await page.$eval('input[autocomplete="name"]', el => el.value), 'Bộ phận kho vận – Vela Store');
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.$eval('[role="dialog"]', el => el.scrollWidth <= el.clientWidth), true);
    await page.screenshot({ path: join(tmpdir(), 'scanms-return-warehouse-mobile.png') });
    await page.select('[data-address-province]', '79');
    assert.equal(await page.$eval('[data-address-ward]', el => el.value), '');
    assert.equal(await page.$eval('button[type="submit"]', el => el.disabled), true);
    await page.select('select[id$="-version"]', 'v2');
    await page.waitForFunction(() => !document.querySelector('[data-address-province]').disabled);
    await page.select('[data-address-province]', '1');
    await page.waitForFunction(() => [...document.querySelector('[data-address-ward]').options].some(option => option.value === '2'));
    await page.select('[data-address-ward]', '2');
    await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled);
    assert.equal(await page.$('select[id$="-district"]'), null);
    failLocalities = true;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('section button');
    await page.click('section button');
    await page.waitForSelector('[role="alert"] button');
    assert.equal(await page.$eval('button[type="submit"]', el => el.disabled), true);
    failLocalities = false;
    await page.click('[role="alert"] button');
    await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled);
  } finally { await browser.close(); }
});
