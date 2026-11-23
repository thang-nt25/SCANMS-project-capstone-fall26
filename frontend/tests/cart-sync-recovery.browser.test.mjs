import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = process.env.GHN_UI_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const productId = '00000000-0000-4000-8000-000000000001';
const row = { cartItemId: `${productId}_base`, productId, title: 'Cart regression product', sku: 'QA-CART', price: 100000,
  quantity: 1, stockQuantity: 50, isActive: true, imageUrl: '/assets/products/real/amino-cleanser-ph55.jpg', store: { id: 'shop', name: 'QA Store' } };

test('cart only persists item changes, keeps failed writes locally and shows one outage notification until recovery', {
  skip: !base || !existsSync(executablePath), timeout: 45000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    const writes = [];
    let failing = false;
    page.on('pageerror', error => {
      if (!error.message.includes('WebSocket closed without opened')) errors.push(error.message);
    });
    await page.evaluateOnNewDocument(row => {
      localStorage.clear();
      localStorage.setItem('token', 'cart-fixture-no-server-access');
      localStorage.setItem('user', JSON.stringify({ id: 'buyer', role: 'CUSTOMER' }));
      localStorage.setItem('scanms_cart_u_buyer', JSON.stringify([row]));
    }, row);
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] || 'authorization,content-type,x-skip-cache',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS', 'Content-Type': 'application/json' };
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        let data = {};
        if (url.pathname === '/api/customer/cart') {
          if (request.method() === 'PUT') {
            writes.push(JSON.parse(request.postData()));
            if (failing) return request.respond({ status: 500, headers, body: JSON.stringify({ message: 'Fixture outage' }) });
          }
          data = { items: [row], syncedAt: new Date().toISOString() };
        }
        if (url.pathname === '/api/orders/validate-cart') data = { warnings: [], items: [{ productId, currentPrice: 99000, stockQuantity: 49, isActive: true }] };
        return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
      }
      if (url.pathname === '/__cart-sync-recovery') return request.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: `<!doctype html><html><body><div id="root"></div><script type="module">
        import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
        import '/src/index.css';
        const source=await(await fetch('/src/context/CartContext.tsx')).text();const version=source.match(/react[.]js([?]v=[^"]+)/)?.[1]||'';
        const React=await import('/node_modules/.vite/deps/react.js'+version);const dom=await import('/node_modules/.vite/deps/react-dom_client.js'+version);
        const {CartProvider,useCart}=await import('/src/context/CartContext.tsx');const {Toaster}=await import('/node_modules/.vite/deps/sonner.js'+version);
        const h=React.createElement||React.default.createElement;
        function Harness(){const c=useCart();return h('div',null,h('output',{id:'quantity'},c.cart[0]?.quantity||0),h('output',{id:'stock'},c.cart[0]?.stockQuantity||0),h('output',{id:'syncing'},String(c.isCartSyncing)),h('button',{id:'increase',onClick:()=>c.updateQuantity(c.cart[0].cartItemId,c.cart[0].quantity+1)},'Increase'),h('button',{id:'stock-refresh',onClick:()=>void c.refreshCartStock()},'Refresh'));}
        (dom.createRoot||dom.default.createRoot)(document.getElementById('root')).render(h(CartProvider,null,h(Harness),h(Toaster,{duration:60000})));
      </script></body></html>` });
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    await page.goto(`${origin}/__cart-sync-recovery`);
    await page.waitForFunction(() => document.querySelector('#quantity')?.textContent === '1' && document.querySelector('#syncing')?.textContent === 'false');
    await page.waitForNetworkIdle({ idleTime: 400 });
    assert.equal(writes.length, 0, 'hydration does not echo unchanged cached items back to the server');
    await page.click('#stock-refresh');
    await page.waitForFunction(() => document.querySelector('#stock')?.textContent === '49' && document.querySelector('#syncing')?.textContent === 'false');
    await page.waitForNetworkIdle({ idleTime: 400 });
    assert.equal(writes.length, 0, 'price/stock metadata changes do not write a basket with identical quantities');
    failing = true;
    for (const quantity of [2, 3]) {
      const response = page.waitForResponse(res => res.url().endsWith('/api/customer/cart') && res.request().method() === 'PUT');
      await page.click('#increase');
      await response;
      await page.waitForFunction(expected => JSON.parse(localStorage.getItem('scanms_cart_u_buyer'))?.[0]?.quantity === expected && document.querySelector('#syncing')?.textContent === 'false', {}, quantity);
      await page.waitForSelector('[data-sonner-toast]');
      assert.equal(await page.$$eval('[data-sonner-toast]', els => els.filter(el => el.textContent.includes('Chưa thể đồng bộ giỏ hàng')).length), 1);
    }
    failing = false;
    const recovered = page.waitForResponse(res => res.url().endsWith('/api/customer/cart') && res.request().method() === 'PUT');
    await page.click('#increase');
    await recovered;
    await page.waitForFunction(() => document.querySelector('#syncing')?.textContent === 'false' && ![...document.querySelectorAll('[data-sonner-toast]')].some(el => el.textContent.includes('Chưa thể đồng bộ giỏ hàng')));
    assert.equal(writes.at(-1).items[0].quantity, 4);
    assert.deepEqual(errors, []);
  } catch (error) {
    if (errors.length) console.error('Cart browser errors:', errors);
    throw error;
  } finally { await browser.close(); }
});
