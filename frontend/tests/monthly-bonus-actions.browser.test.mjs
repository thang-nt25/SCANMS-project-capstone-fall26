import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
test('monthly bonus uses configured amounts and confirms each financial action', { skip: !base, timeout: 45000 }, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] });
  const calls = [];
  const row = { id: 'qa-result', collaboratorId: 'qa-kol', collaboratorName: 'KOL kiểm thử', yearMonth: '2025-09', validRevenue: '12345678', bonusAmount: '345678', appliedRuleName: 'Mốc riêng của Shop', status: 'PENDING' };
  let history = [];
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', err => console.error(err.message));
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname === '/qa-monthly') return req.respond({ contentType: 'text/html', body: '<div id="root"></div><script type="module" src="/qa-monthly-entry"></script>' });
      if (url.pathname === '/qa-monthly-entry') return req.respond({ contentType: 'application/javascript', body: `import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;await import('/qa-monthly-mount');` });
      if (url.pathname === '/qa-monthly-mount') return req.respond({contentType:'application/javascript',body: `import '/src/index.css';import React from '/node_modules/.vite/deps/react.js';import ReactDOM from'/node_modules/.vite/deps/react-dom_client.js';import{ShopMonthlyBonusPanel}from'/src/components/promotions/ShopMonthlyBonusPanel.tsx';ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(ShopMonthlyBonusPanel,{storeId:'qa-store'}));` });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Access-Control-Allow-Origin': new URL(base).origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
        const respond = data => req.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
        if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers });
        const path = url.pathname;
        if (req.method() !== 'GET') {
          calls.push({ path, body: req.postData() });
          if (path.endsWith('/settle-all')) history = [{ ...row }];
          else if (path.endsWith('/approve')) history = [{ ...row, status: 'APPROVED' }];
          else if (path.endsWith('/payout')) history = [{ ...row, status: 'PAID' }];
          else assert.fail(`Unexpected mutation: ${path}`);
          return respond({ success: true, message: 'Đã xử lý kiểm thử' });
        }
        if (path.endsWith('/team-progress')) return respond({ members: [{ collaboratorId: row.collaboratorId, fullName: row.collaboratorName, validRevenue: row.validRevenue, validOrdersCount: 4, estimatedTotalBonus: row.bonusAmount }], errors: [] });
        if (path.endsWith('/history')) return respond(history);
        return respond([{ id: 'qa-rule', name: row.appliedRuleName, minMonthlyRevenue: '10000000', achievementBonus: row.bonusAmount, bonusPercentage: '0', isActive: true }]);
      }
      req.continue();
    });
    await page.goto(`${base}/qa-monthly`);
    await page.waitForFunction(() => document.body.innerText.includes('345.678'));
    assert.equal(calls.length, 0);
    await page.$eval('input[type=month]', el => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(el, '2025-09'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Quyết toán') && !b.disabled));
    const clickText = async text => { const el = await page.waitForSelector(`::-p-text(${text})`); await el.click(); };
    for (const label of ['Quyết toán mốc thưởng tháng', 'Duyệt thưởng', 'Cộng vào ví']) {
      const count = calls.length;
      await clickText(label);
      await page.waitForSelector('[role=dialog]');
      assert.equal(calls.length, count, 'opening confirmation never writes');
      await page.$$eval('[role=dialog] button', buttons => buttons.find(b => b.textContent === '\u0058\u00e1c nh\u1eadn').click());
      await page.waitForFunction(n => !document.querySelector('[role=dialog]') && !document.body.innerText.includes('\u0110ang t\u1ea3i ch\u00ednh s\u00e1ch'), {}, count);
    }
    assert.deepEqual(calls.map(c => c.path), ['/api/stores/qa-store/commission-rules/settle-all', '/api/stores/qa-store/commission-rules/settlements/qa-result/approve', '/api/stores/qa-store/commission-rules/settlements/qa-result/payout']);
    assert.equal(JSON.parse(calls[0].body).yearMonth, '2025-09');
    for (const width of [390, 1440]) {
      await page.setViewport({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
  } finally { await browser.close(); }
});
