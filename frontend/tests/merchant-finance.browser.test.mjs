import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

test('merchant finance shows server figures and real payout requests without simulated withdrawals', {
  skip: !base || !existsSync(executablePath), timeout: 45000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const storeId = '2f67001b-09a5-5958-85fd-5f401831c871';
  let failFinance = false;
  try {
    const page = await browser.newPage();
    const errors = [], requests = [];
    page.on('pageerror', error => { if (!error.message.includes('WebSocket closed')) errors.push(error.message); });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/__shop-finance-test') return request.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
        import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
        await import('/src/index.css');const source=await(await fetch('/src/pages/merchant/ShopRevenueWalletPage.tsx')).text(),main=await(await fetch('/src/main.tsx')).text();
        const R=await import(source.match(/"([^\\"]*react[.]js[^\\"]*)"/)[1]),React=R.default||R;
        const dom=await import(main.match(/"([^\\"]*react-dom_client[.]js[^\\"]*)"/)[1]),{BrowserRouter}=await import(source.match(/"([^\\"]*react-router-dom[.]js[^\\"]*)"/)[1]);
        const {default:Page}=await import('/src/pages/merchant/ShopRevenueWalletPage.tsx');
        (dom.createRoot||dom.default.createRoot)(document.getElementById('root')).render(React.createElement(BrowserRouter,null,React.createElement(Page)));
      </script></body></html>` });
      if (!url.pathname.startsWith('/api/')) return request.continue();
      requests.push({ method: request.method(), path: url.pathname });
      assert.equal(request.method(), 'GET', 'opening finance must never submit a transaction');
      const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,authorization,x-skip-cache' };
      if (failFinance && (url.pathname === '/api/dashboard/shop' || url.pathname === `/api/stores/${storeId}/payouts`)) {
        return request.respond({ status: 503, headers, body: JSON.stringify({ success: false, message: 'unavailable' }) });
      }
      let data = {};
      if (url.pathname === '/api/stores/my-store') data = { id: storeId, name: 'Aura Bio' };
      if (url.pathname === '/api/dashboard/shop') data = { summary: { totalOrders: 2, totalRevenue: 123000, totalCommissions: 23000 }, charts: { revenueByDay: [{ date: '2026-10-28', revenue: 123000 }] } };
      if (url.pathname === `/api/stores/${storeId}/payouts`) data = { requests: [{ id: 'request-1', collaboratorName: 'KOL kiểm thử', collaboratorEmail: 'kol@example.test', amount: '200000', taxAmount: '0', netAmount: '200000', status: 'PENDING' }], summary: { pending: { count: 1, netAmount: '200000' }, approvedToday: { count: 0, netAmount: '0' }, withheldTax: { count: 0, amount: '0' } }, total: 1, page: 1, limit: 10, maxBillBytes: 5242880 };
      return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
    });
    await page.goto(`${origin}/__shop-finance-test`);
    await page.waitForFunction(() => document.body.textContent.includes('123.000 ₫'), { timeout: 8000 })
      .catch(async error => { throw new Error(`${error.message}; errors=${errors.join('; ')}; body=${(await page.$eval('body', element => element.textContent)).slice(0, 500)}`); });
    const overview = await page.$eval('body', element => element.textContent);
    assert.ok(overview.includes('Aura Bio'));
    assert.ok(overview.includes('2'));
    assert.ok(!overview.includes('14.250.000'));
    assert.ok(!overview.includes('Đã gửi yêu cầu rút tiền thành công'));
    await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].find(button => button.textContent.includes('Chi trả KOL')).click());
    await page.waitForFunction(() => document.body.textContent.includes('KOL kiểm thử'));
    assert.ok((await page.$eval('body', element => element.textContent)).includes('200.000 ₫'));
    await page.setViewport({ width: 390, height: 844 });
    assert.ok(await page.$eval('#merchant-finance-page', element => element.getBoundingClientRect().width <= innerWidth));
    failFinance = true;
    await page.evaluate(() => [...document.querySelectorAll('#merchant-finance-page button')].find(button => button.textContent.includes('Làm mới')).click());
    await page.waitForFunction(() => document.body.textContent.includes('Chưa tải được yêu cầu chi trả'));
    assert.ok(!(await page.$eval('body', element => element.textContent)).includes('KOL kiểm thử'));
    await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].find(button => button.textContent.includes('Doanh số Shop')).click());
    await page.waitForFunction(() => document.body.textContent.includes('Chưa tải được báo cáo doanh số'));
    assert.ok(!(await page.$eval('body', element => element.textContent)).includes('123.000 ₫'));
    assert.ok(requests.some(item => item.path === '/api/dashboard/shop'));
    assert.ok(requests.some(item => item.path === `/api/stores/${storeId}/payouts`));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
