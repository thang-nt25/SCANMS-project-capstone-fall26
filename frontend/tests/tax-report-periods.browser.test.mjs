import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const base = process.env.GHN_UI_TEST_URL;
test('tax report reloads each month and distinguishes sandbox totals', { skip: !base, timeout: 45000 }, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] });
  const requested = [];
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(12000);
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname === '/qa-tax') return req.respond({ contentType: 'text/html', body: '<div id="root"></div><script type="module" src="/qa-tax-entry"></script>' });
      if (url.pathname === '/qa-tax-entry') return req.respond({ contentType: 'application/javascript', body: `import R from '/@react-refresh';R.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>t=>t;window.__vite_plugin_react_preamble_installed__=true;await import('/qa-tax-mount');` });
      if (url.pathname === '/qa-tax-mount') return req.respond({ contentType: 'application/javascript', body: `import '/src/index.css';import React from '/node_modules/.vite/deps/react.js';import DOM from '/node_modules/.vite/deps/react-dom_client.js';import{FinanceOperations}from'/src/components/wallet/FinanceOperations.tsx';DOM.createRoot(document.getElementById('root')).render(React.createElement(FinanceOperations));` });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Access-Control-Allow-Origin': new URL(base).origin, 'Access-Control-Allow-Headers': '*' };
        if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers });
        assert.equal(req.method(), 'GET', 'report checks must not mutate financial data');
        let data = [];
        if (url.pathname.endsWith('/tax-report')) {
          const ym = url.searchParams.get('yearMonth'); requested.push(ym);
          const real = ym === '2026-10'; const sbx = ym === '2026-11';
          data = { yearMonth: ym, gross: real ? '21000000' : '0', tax: real ? '2100000' : '0', net: real ? '18900000' : '0', items: real ? Array.from({ length: 4 }, (_, id) => ({ id })) : [], missingTaxCodes: [], sandbox: { count: sbx ? 5 : 0, gross: sbx ? '2956160' : '0', tax: sbx ? '225616' : '0', net: sbx ? '2730544' : '0' } };
        }
        return req.respond({ headers, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
      }
      req.continue();
    });
    await page.goto(`${base}/qa-tax`);
    await page.waitForSelector('.finance-tax-result');
    const select = async (label, value) => {
      await page.waitForFunction(label => !document.querySelector(`[aria-label="${label}"]`).disabled, {}, label);
      await page.select(`[aria-label="${label}"]`, value);
      await page.waitForSelector('.finance-tax-result');
    };
    await select('Năm chi trả', '2026'); await select('Tháng chi trả', '11');
    await page.click('[aria-label="Loại chi trả"] button:last-child');
    await page.waitForFunction(() => document.querySelector('.finance-tax-totals').innerText.includes('225.616'));
    assert.match(await page.$eval('.finance-tax-result', el => el.innerText), /5 khoản/);
    await select('Tháng chi trả', '10');
    await page.click('[aria-label="Loại chi trả"] button:first-child');
    await page.waitForFunction(() => document.querySelector('.finance-tax-totals').innerText.includes('2.100.000'));
    await select('Tháng chi trả', '12');
    assert.equal(await page.$$eval('.finance-tax-totals dd', els => els.every(el => el.textContent === '0 ₫')), true);
    await select('Tháng chi trả', '11');
    await page.click('[aria-label="Loại chi trả"] button:last-child');
    await page.waitForFunction(() => document.querySelector('.finance-tax-totals').innerText.includes('225.616'));
    assert.ok(requested.includes('2026-10') && requested.includes('2026-11') && requested.includes('2026-12'));
    for (const width of [390, 1440]) {
      await page.setViewport({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
  } finally { await browser.close(); }
});
