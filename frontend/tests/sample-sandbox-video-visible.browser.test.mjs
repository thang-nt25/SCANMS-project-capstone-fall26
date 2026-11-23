import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = process.env.GHN_UI_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

test('KOL and Shop can open the submitted sandbox video without expanding delivery history', {
  skip: !base || !existsSync(executablePath), timeout: 45000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const videoUrl = 'https://www.tiktok.com/@demo/video/123456789';
  let videoStatus = 'VIDEO_SUBMITTED';
  const mutations = [], errors = [];
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    await page.setViewport({ width: 390, height: 844 });
    page.on('pageerror', error => {
      if (!error.message.includes('WebSocket closed without opened')) errors.push(error.message);
    });
    await page.evaluateOnNewDocument(() => {
      localStorage.clear();
      localStorage.setItem('token', 'sandbox-video-fixture');
    });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] || 'content-type,authorization,x-skip-cache',
          'Access-Control-Allow-Methods': 'GET,OPTIONS' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        if (request.method() !== 'GET') mutations.push(url.pathname);
        const data = { status: videoStatus, videoUrl, videoRevision: 1,
          videoReview: videoStatus === 'REVISION_REQUIRED' ? { status: 'REJECTED', rejectionReason: 'Please show the product clearly', reviewedAt: '2026-11-14T11:00:00Z', reviewedBy: 'shop' } : null,
          receivedAt: '2026-11-14T10:00:00Z', deadlineAt: '2026-11-28T10:00:00Z',
          deliveryStatus: 'DELIVERED', simulationStartedAt: '2026-11-14T09:58:00Z', shippingPayment: { status: 'PAID_SIMULATED', amount: 21000 } };
        return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
      }
      if (url.pathname === '/__sandbox-video-visible') return request.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
        import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
        import '/src/index.css';
        const source=await(await fetch('/src/components/shipping/SampleGhnEnvironmentPicker.tsx')).text();const version=source.match(/react[.]js([?]v=[^"]+)/)?.[1]||'';
        const React=await import('/node_modules/.vite/deps/react.js'+version);const dom=await import('/node_modules/.vite/deps/react-dom_client.js'+version);
        const {SampleSandboxWaybills}=await import('/src/components/shipping/SampleGhnEnvironmentPicker.tsx');const h=React.createElement||React.default.createElement;
        const charges=[{trackingNumber:'TEST-VIDEO',environment:'TEST',amount:21000}];
        (dom.createRoot||dom.default.createRoot)(document.getElementById('root')).render(h('main',null,...['kol','shop'].map(role=>h('div',{'data-role':role,key:role},h(SampleSandboxWaybills,{charges,role})))));
      </script></body></html>` });
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    await page.goto(`${origin}/__sandbox-video-visible`);
    for (const role of ['kol', 'shop']) {
      const selector = `[data-role="${role}"] [data-sandbox-video-link="TEST-VIDEO"]`;
      await page.waitForSelector(selector, { visible: true });
      assert.equal(await page.$eval(selector, element => element.href), videoUrl);
      assert.equal(await page.$eval(selector, element => element.target), '_blank');
      assert.equal(await page.$eval(selector, element => element.textContent.trim()), 'Xem video đã nộp');
      assert.equal(await page.$(`[data-role="${role}"] .sample-receipt-details`), null, 'video is accessible while the timeline is collapsed');
      assert.ok(await page.$eval(`[data-role="${role}"]`, element => element.textContent.includes('Đã nộp video kiểm thử') && element.textContent.includes('chờ Shop nghiệm thu')));
    }
    await page.click('[data-role="shop"] button[aria-label="Xem hành trình"]');
    await page.waitForSelector('[data-role="shop"] .sample-receipt-details');
    assert.equal(await page.$$eval('[data-role="shop"] [data-sandbox-video-link]', elements => elements.length), 1);
    assert.equal(await page.$('[data-role="kol"] [data-sandbox-video-review]'), null, 'KOL cannot review their own submission');
    videoStatus = 'REVISION_REQUIRED';
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForFunction(() => [...document.querySelectorAll('[data-role="kol"] button')].some(button => button.textContent.includes('Nộp lại video kiểm thử')));
    assert.ok(await page.$eval('[data-role="kol"]', element => element.textContent.includes('Please show the product clearly')));
    videoStatus = 'COMPLETED';
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForFunction(() => document.querySelector('[data-role="kol"]')?.textContent.includes('Đã nghiệm thu · Sandbox'));
    assert.equal(await page.$eval('[data-role="kol"]', element => [...element.querySelectorAll('button')].some(button => button.textContent.includes('Nộp lại video kiểm thử'))), false);
    assert.deepEqual(mutations, [], 'viewing a test video cannot approve a real sample or modify data');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
