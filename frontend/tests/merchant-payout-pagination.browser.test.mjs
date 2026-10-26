import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import ts from 'typescript';
const compiled = ts.transpileModule(readFileSync(new URL('../src/utils/merchant-payout-view.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { fixturePayoutView } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const base = process.env.GHN_UI_TEST_URL;
const executablePath = process.env.GHN_UI_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

test('merchant payout pages, combined filters and store summaries survive searching and a shortened final page', {
  skip: !base || !existsSync(executablePath), timeout: 60000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const storeId = '2f67001b-09a5-5958-85fd-5f401831c871';
  const now = new Date('2026-10-26T03:00:00Z');
  let rows = Array.from({ length: 25 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, collaboratorId: 'kol', collaboratorName: `KOL ${index}`,
    collaboratorEmail: `kol${index}@example.test`, kycStatus: 'VERIFIED', storeId, amount: '1000000.00', taxAmount: '100000.00', netAmount: '900000.00',
    status: index < 23 ? 'PENDING' : 'APPROVED', processedAt: index === 23 ? now.toISOString() : index === 24 ? '2020-01-01T00:00:00Z' : null,
    createdAt: '2026-10-25T00:00:00Z', bankName: 'MB', bankAccountNumber: '12340001', bankAccountName: 'TEST ACCOUNT', hasBill: false, batchId: null,
  }));
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    await page.setViewport({ width: 1440, height: 1000 });
    const calls = [], errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(() => {
      localStorage.clear(); localStorage.setItem('token', 'fixture-only');
      localStorage.setItem('user', JSON.stringify({ id: 'owner', role: 'SHOP_MANAGER', email: 'owner@example.test' }));
      window.WebSocket = class { static OPEN = 1; readyState = 1; addEventListener() {} removeEventListener() {} send() {} close() {} };
    });
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/')) {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-skip-cache', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        assert.equal(request.method(), 'GET', 'must not create or approve any actual payouts');
        let data = {};
        if (url.pathname === '/api/stores/my-store') data = { id: storeId, name: 'Fixture Shop', onboardingData: { payoutBankName: 'MB', payoutBankAccountNumber: '12340001', payoutBankAccountName: 'TEST ACCOUNT' } };
        if (url.pathname.endsWith('/batches')) data = { batches: [], total: 0 };
        if (url.pathname === `/api/stores/${storeId}/payouts`) {
          const query = { page: Number(url.searchParams.get('page') || 1), limit: Number(url.searchParams.get('limit') || 10),
            search: url.searchParams.get('search') || '', status: url.searchParams.get('status') || '', filter: url.searchParams.get('filter') || 'ALL' };
          calls.push(query);
          data = { ...fixturePayoutView(rows, query, now), maxBillBytes: 5242880 };
        }
        return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
      }
      if (url.pathname === '/__merchant-payout-test') return request.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
        import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
        await import('/src/index.css');const source=await(await fetch('/src/pages/merchant/PayoutApprovalPage.tsx')).text(),main=await(await fetch('/src/main.tsx')).text();
        const R=await import(source.match(/"([^\"]*react[.]js[^\"]*)"/)[1]),React=R.default||R;
        const dom=await import(main.match(/"([^\"]*react-dom_client[.]js[^\"]*)"/)[1]),{BrowserRouter}=await import(source.match(/"([^\"]*react-router-dom[.]js[^\"]*)"/)[1]);
        const {default:Page}=await import('/src/pages/merchant/PayoutApprovalPage.tsx');
        (dom.createRoot||dom.default.createRoot)(document.getElementById('root')).render(React.createElement(BrowserRouter,null,React.createElement(Page)));
      </script></body></html>` });
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    await page.goto(origin + '/__merchant-payout-test');
    await page.waitForFunction(() => document.querySelector('tbody')?.querySelectorAll('tr').length === 10)
      .catch(error => { throw new Error(`${error.message}; ${errors.join('; ')}`, { cause: error }); });
    const click = text => page.evaluate(text => [...document.querySelectorAll('button')].find(element => element.textContent.trim() === text).click(), text);
    const metric = index => page.$eval(`.payout-metric:nth-child(${index})`, element => element.textContent);
    assert.match(await metric(1), /23/);
    assert.match(await metric(2), /900.000/);
    await click('Sau');
    await page.waitForFunction(() => document.body.textContent.includes('Trang 2/3') && document.querySelector('tbody')?.querySelectorAll('tr').length === 10);
    assert.match(await metric(1), /23/);
    await click('Sau');
    await page.waitForFunction(() => document.body.textContent.includes('Trang 3/3') && document.querySelector('tbody')?.querySelectorAll('tr').length === 5);
    await page.type('[aria-label="Tìm yêu cầu chi trả"]', 'KOL 22');
    await page.waitForFunction(() => document.body.textContent.includes('Trang 1/1') && document.querySelector('tbody')?.querySelectorAll('tr').length === 1);
    await page.click('.payout-metric:nth-child(1)');
    await page.waitForFunction(() => document.querySelector('.payout-metric:nth-child(1)')?.getAttribute('aria-pressed') === 'true' && document.querySelector('tbody')?.textContent.includes('KOL 22'));
    assert.ok(calls.some(query => query.filter === 'PENDING' && query.search === 'KOL 22' && query.page === 1));
    assert.match(await metric(1), /23/);
    await page.focus('[aria-label="Tìm yêu cầu chi trả"]');
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace');
    await page.waitForFunction(() => document.querySelector('tbody')?.querySelectorAll('tr').length === 10);
    await page.click('.payout-metric:nth-child(1)');
    await page.waitForFunction(() => document.querySelector('.payout-metric:nth-child(1)')?.getAttribute('aria-pressed') === 'false' && document.querySelector('tbody')?.querySelectorAll('tr').length === 10);
    await page.click('.payout-metric:nth-child(2)');
    await page.waitForFunction(() => document.querySelector('tbody')?.querySelectorAll('tr').length === 1 && document.querySelector('tbody')?.textContent.includes('KOL 23'));
    assert.ok(!(await page.$eval('tbody', element => element.textContent)).includes('KOL 24'));
    await page.click('.payout-metric:nth-child(2)');
    await page.waitForFunction(() => document.body.textContent.includes('Trang 1/3') && document.querySelector('tbody')?.querySelectorAll('tr').length === 10);
    await click('Sau'); await page.waitForFunction(() => document.body.textContent.includes('Trang 2/3') && document.querySelector('tbody')?.querySelectorAll('tr').length === 10);
    await click('Sau'); await page.waitForFunction(() => document.body.textContent.includes('Trang 3/3') && document.querySelector('tbody')?.querySelectorAll('tr').length === 5);
    rows = rows.slice(0, 20);
    await page.click('[aria-label="Tải lại payout"]');
    await page.waitForFunction(() => document.body.textContent.includes('Trang 2/2') && document.querySelector('tbody')?.querySelectorAll('tr').length === 10);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].find(element => element.textContent.trim() === 'Sau').disabled), true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
