import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = process.env.GHN_UI_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
for (const screen of ['dashboard', 'media']) {
  test(`approved ${screen} flow handles errors or more than 100 assets without false empty states`, {
    skip: !base || !existsSync(executablePath), timeout: 60000,
  }, async () => {
    const origin = new URL(base).origin;
    assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
    const browser = await puppeteer.launch({ executablePath, headless: true });
    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(10000);
      const errors = [], mediaPages = [], ranges = [];
      let failWallet = true;
      page.on('pageerror', error => errors.push(error.message));
      await page.evaluateOnNewDocument(() => {
        localStorage.clear(); localStorage.setItem('token', 'fixture-only');
        localStorage.setItem('user', JSON.stringify({ id: 'fixture-kol', role: 'COLLABORATOR', fullName: 'KOL test', email: 'test@example.test' }));
        window.WebSocket = class { static OPEN = 1; readyState = 1; addEventListener() {} removeEventListener() {} send() {} close() {} };
      });
      await page.setRequestInterception(true);
      page.on('request', async request => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/')) {
          const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-skip-cache', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
          if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
          assert.equal(request.method(), 'GET', 'this test must not mutate anything');
          let data = {};
          if (url.pathname === '/api/wallets/me') {
            if (failWallet) return request.respond({ status: 503, headers, contentType: 'application/json', body: JSON.stringify({ message: 'Unavailable fixture' }) });
            data = { availableBalance: '1234567.00', pendingBalance: '0.00' };
          }
          if (url.pathname.endsWith('/ledger')) data = { entries: [
            { id: 'withdraw', transactionType: 'PAYOUT_WITHDRAW', balanceBucket: 'AVAILABLE', amount: '-1000000.00' },
            { id: 'move-pending', transactionType: 'COMMISSION_APPROVED', balanceBucket: 'PENDING', amount: '-25000.00' },
            { id: 'move-available', transactionType: 'COMMISSION_APPROVED', balanceBucket: 'AVAILABLE', amount: '25000.00' },
            { id: 'zero', transactionType: 'REVERSAL', balanceBucket: 'AVAILABLE', amount: '0.00' },
          ].map(entry => ({ ...entry, createdAt: '2026-10-26T00:00:00Z' })) };
          if (url.pathname === '/api/dashboard/realtime/overview') {
            ranges.push(url.searchParams.get('startDate'));
            data = { metrics: { totalClicks: 0, totalOrders: 0, completedOrders: 0, conversionRate: 0, averageOrderValue: 0,
              grossRevenue: 0, totalCommission: 0, activeReferralLinks: 0 } };
          }
          if (url.pathname.includes('time-series')) data = [];
          if (url.pathname.includes('/tiers/')) data = { currentTier: { name: 'Đồng', extraBonusPercentage: 0 }, nextTier: null };
          if (url.pathname === '/api/media') {
            const pageNumber = Number(url.searchParams.get('page')); mediaPages.push(pageNumber);
            data = { items: Array.from({ length: 251 }, (_, index) => ({ id: String(index), title: `Tài nguyên kiểm thử ${index}`,
              assetType: 'COPYWRITE_TEXT', urlOrContent: `Kịch bản ${index}`, createdAt: '2026-10-26T00:00:00Z',
              storeId: 'shop', store: { name: 'Shop fixture', slug: 'fixture' }, collaboratorId: 'fixture-kol' }))
              .slice((pageNumber - 1) * 100, pageNumber * 100), pagination: { total: 251, page: pageNumber, limit: 100, totalPages: 3 } };
          }
          return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
        }
        if (url.pathname === '/__approved-flow-test') return request.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
          import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
          await import('/src/index.css');
          const source=await(await fetch('/src/pages/collaborator/KolDashboardPage.tsx')).text(),main=await(await fetch('/src/main.tsx')).text();
          const R=await import(source.match(/"([^\"]*react[.]js[^\"]*)"/)[1]),React=R.default||R;
          const dom=await import(main.match(/"([^\"]*react-dom_client[.]js[^\"]*)"/)[1]);
          const {BrowserRouter}=await import(source.match(/"([^\"]*react-router-dom[.]js[^\"]*)"/)[1]);
          const {default:Page}=await import('/src/pages/collaborator/${screen === 'dashboard' ? 'KolDashboardPage' : 'MediaHubBrowserPage'}.tsx');
          (dom.createRoot||dom.default.createRoot)(document.getElementById('root')).render(React.createElement(BrowserRouter,null,React.createElement(Page)));
        </script></body></html>` });
        if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
        return request.continue();
      });
      await page.goto(origin + '/__approved-flow-test');
      if (screen === 'dashboard') {
        await page.waitForSelector('[role=alert]').catch(error => { throw new Error(`${error.message}; ${errors.join('; ')}`, { cause: error }); });
        const wallet = '[aria-label="Số dư ví KOL"]';
        assert.match(await page.$eval(wallet, el => el.textContent), /—/);
        assert.deepEqual(await page.$$eval('[data-testid="dashboard-ledger-amount"]', elements => elements.map(element => ({ text: element.textContent, direction: element.dataset.direction }))), [
          { text: '-1.000.000 ₫', direction: 'debit' },
          { text: '-25.000 ₫', direction: 'debit' },
          { text: '+25.000 ₫', direction: 'credit' },
          { text: '0 ₫', direction: 'neutral' },
        ]);
        assert.ok(ranges[0].includes('T17:00:00.000Z'));
        failWallet = false;
        await page.evaluate(() => [...document.querySelectorAll('button')].find(el => el.textContent === 'Thử tải lại').click());
        await page.waitForFunction(() => document.querySelector('[aria-label="Số dư ví KOL"]')?.textContent.includes('1.234.567'));
        await page.waitForFunction(() => !document.querySelector('[role=alert]'));
      } else {
        await page.waitForSelector('.kol-media-card').catch(error => { throw new Error(`${error.message}; ${errors.join('; ')}`, { cause: error }); });
        assert.deepEqual(mediaPages, [1, 2, 3]);
        assert.equal(await page.$$('.kol-media-card').then(list => list.length), 24);
        assert.match(await page.$eval('[aria-label="Phân trang kho nội dung"]', el => el.textContent), /251 tài nguyên/);
        await page.type('input[placeholder^="Tìm theo tiêu đề"]', 'Tài nguyên kiểm thử 250');
        await page.waitForFunction(() => document.querySelectorAll('.kol-media-card').length === 1);
        assert.match(await page.$eval('.kol-media-card', el => el.textContent), /Tài nguyên kiểm thử 250/);
        assert.match(await page.$eval('[aria-label="Phân trang kho nội dung"]', el => el.textContent), /Trang 1\/1/);
      }
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
}
