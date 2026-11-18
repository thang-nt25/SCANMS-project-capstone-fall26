import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
test('shop refreshes receipt and completion immediately from its authenticated return event, focus and polling fallback', { skip: !base, timeout: 25000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'], timeout: 10000 });
  const request = { id: 'exchange-fixture', status: 'EXCHANGE_SHIPPED', pickupProviderMode: 'disabled', events: [], imageUrls: [], items: [],
    order: { customerName: 'Customer', customerPhone: '0903000001', shippingAddress: '15 Street', products: [] },
    exchangeShipment: { carrierName: 'SCANMS Demo', trackingNumber: 'SIMX-QA', provider: 'MOCK', providerStatus: 'delivered', feeAmount: null },
  };
  let reads = 0;
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(8000);
    await page.evaluateOnNewDocument(() => localStorage.setItem('token', 'qa-shop'));
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname === '/return-realtime-fixture') return req.respond({ contentType: 'text/html', body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/exchange-shipment.tsx"></script>' });
      if (url.pathname === '/src/services/chat-socket.service.ts') return req.respond({ contentType: 'application/javascript', body: `const listeners=new Map();const socket={on(event,fn){if(!listeners.has(event))listeners.set(event,new Set());listeners.get(event).add(fn);return this},off(event,fn){listeners.get(event)?.delete(fn);return this}};window.emitReturn=(event,payload)=>listeners.get(event)?.forEach(fn=>fn(payload));export const getChatSocket=()=>socket;` });
      if (url.pathname.includes('/returns/exchange-fixture')) {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || '*' };
        if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers });
        assert.equal(req.method(), 'GET'); reads++;
        return req.respond({ headers, contentType: 'application/json', body: JSON.stringify({ data: request }) });
      }
      if (url.origin !== origin) return req.abort();
      return req.continue();
    });
    await page.goto(origin + '/return-realtime-fixture', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.exchange-delivery-badge');
    assert.equal(await page.$eval('.exchange-delivery-badge', el => el.textContent), 'Chờ khách xác nhận');
    const before = reads;
    await page.evaluate(() => window.emitReturn('return_updated', { returnRequestId: 'unrelated-case' }));
    assert.equal(reads, before);
    request.exchangeShipment.receivedAt = '2026-11-17T08:00:00Z'; request.status = 'AWAITING_CUSTOMER_CONFIRMATION';
    await page.evaluate(() => window.emitReturn('return_updated', { returnRequestId: 'exchange-fixture' }));
    await page.waitForFunction(() => document.querySelector('.exchange-delivery-badge')?.textContent === 'Khách đã xác nhận', { timeout: 2500 });
    assert.equal(await page.$eval('[data-case-status]', el => el.textContent), 'AWAITING_CUSTOMER_CONFIRMATION');
    request.status = 'COMPLETED';
    await page.evaluate(() => window.emitReturn('return_updated', { returnRequestId: 'exchange-fixture' }));
    await page.waitForFunction(() => document.querySelector('[data-case-status]')?.textContent === 'COMPLETED', { timeout: 2500 });
    request.status = 'DISPUTED';
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForFunction(() => document.querySelector('[data-case-status]')?.textContent === 'DISPUTED', { timeout: 2500 });
    request.status = 'COMPLETED';
    await page.waitForFunction(() => document.querySelector('[data-case-status]')?.textContent === 'COMPLETED', { timeout: 7000 });
    assert.ok(reads >= 5);
  } finally { await browser.close(); }
});
