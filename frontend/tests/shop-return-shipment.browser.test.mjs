import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const base = process.env.GHN_UI_TEST_URL;
test('shop return shipment keeps details compact and advances only after successful, non-duplicate actions', { skip: !base, timeout: 30000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, timeout: 10000, args: ['--no-sandbox'] });
  const writes = [];
  let failNext = false;
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(8000);
    await page.setViewport({ width: 1200, height: 850 });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname === '/shop-shipment-fixture') return req.respond({ contentType: 'text/html', body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/shop-return-shipment.tsx"></script>' });
      if (url.pathname.includes('/returns/shop-shipment-fixture/')) {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || '*', 'Access-Control-Allow-Methods': 'PATCH,OPTIONS' };
        if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers });
        writes.push({ path: url.pathname, body: req.postData() ? JSON.parse(req.postData()) : null });
        if (failNext) { failNext = false; return req.respond({ status: 500, headers, contentType: 'application/json', body: JSON.stringify({ message: 'Không cập nhật được vận chuyển' }) }); }
        const inspecting = url.pathname.endsWith('/inspection/start');
        const picked = writes.at(-1).body?.status === 'picked';
        return setTimeout(() => void req.respond({ headers, contentType: 'application/json', body: JSON.stringify({ data: {
          id: 'shop-shipment-fixture', status: inspecting ? 'INSPECTING' : picked ? 'RETURN_SHIPPED' : 'RETURN_RECEIVED', pickupSimulationEnabled: true,
          order: { customerName: 'Trần An', shippingAddress: '15 Lê Duẩn' },
          pickupContact: { name: 'Trần An', phone: '0903000001', address: '15 Lê Duẩn', provinceName: 'Thành phố Hồ Chí Minh', wardName: 'Phường Bến Nghé', weight: 500, length: 20, width: 15, height: 10 },
          returnWarehouse: { name: 'Bộ phận kho vận', phone: '0901234567', address: 'Đường số 2', provinceName: 'Thành phố Hà Nội', wardName: 'Phường Phúc Xá' },
          customerShipment: { carrierName: 'SCANMS Demo', trackingNumber: 'SIM418123486578338', provider: 'MOCK', providerStatus: picked ? 'picked' : 'delivered', receivedAt: picked ? null : new Date().toISOString() },
        } }) }), 200);
      }
      if (url.origin !== origin) return req.abort();
      return req.continue();
    });
    await page.goto(origin + '/shop-shipment-fixture', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.pickup-shipment-actions button');
    assert.equal(await page.$$eval('.pickup-card', els => els.length), 1);
    assert.ok(!(await page.$eval('.pickup-card', el => el.textContent)).includes('Chế độ mô phỏng'));
    assert.match(await page.$eval('.pickup-waybill', el => el.textContent), /Vận chuyển SCANMS.*SIM418123486578338/);
    assert.match(await page.$eval('.pickup-success-footer', el => el.textContent), /500 g.*20 × 15 × 10 cm/);
    const positions = await page.$$eval('.pickup-success-addresses > section', els => els.map(el => { const r=el.getBoundingClientRect(); return { top:r.top,width:r.width }; }));
    assert.equal(positions[0].top, positions[1].top);
    assert.ok(Math.abs(positions[0].width-positions[1].width)<1);
    await page.screenshot({ path: join(tmpdir(), 'scanms-shop-return-shipment-desktop.png') });
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.$eval('.pickup-card', el => el.scrollWidth <= el.clientWidth), true);
    await page.screenshot({ path: join(tmpdir(), 'scanms-shop-return-shipment-mobile.png') });
    await page.$eval('.pickup-shipment-actions button', el => { el.click(); el.click(); });
    await page.waitForFunction(() => document.querySelector('.pickup-shipment-actions button')?.textContent === 'Xác nhận hàng đến kho');
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].body, { status: 'picked' });
    failNext = true;
    await page.click('.pickup-shipment-actions button');
    await page.waitForSelector('.pickup-action-error');
    assert.match(await page.$eval('.pickup-state', el => el.textContent), /đã lấy hàng/i);
    await page.click('.pickup-shipment-actions button');
    await page.waitForFunction(() => document.querySelector('.pickup-shipment-actions button')?.textContent === 'Bắt đầu kiểm tra');
    assert.equal(await page.$eval('.pickup-state', el => el.textContent), 'Shop đã nhận hàng');
    await page.click('.pickup-shipment-actions button');
    await page.waitForSelector('.pickup-shipment-actions button', { hidden: true });
    assert.equal(writes.at(-1).path, '/api/returns/shop-shipment-fixture/inspection/start');
  } finally { await browser.close(); }
});
