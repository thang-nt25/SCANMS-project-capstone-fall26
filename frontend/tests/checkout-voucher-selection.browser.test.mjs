import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = process.env.GHN_UI_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

test('checkout discovers unsaved product vouchers, validates the selected shop, retries and supports keyboard navigation', {
  skip: !base || !existsSync(executablePath), timeout: 60000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    const calls = [], errors = [];
    let failPlatform = true;
    const coupon = (id, storeId, extra = {}) => ({ id, code: id, storeId, discountType: 'PERCENTAGE', discountValue: 10,
      minimumOrderAmount: 0, maximumDiscountAmount: 50000, remainingUses: 10, expiresAt: null,
      scopeType: 'PRODUCTS', products: [{ id: 'product-' + storeId }], categories: [], storeName: storeId, fundingSource: 'SHOP_FUNDED', benefitType: 'GOODS', ...extra });
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(() => {
      localStorage.clear();
      window.WebSocket = class { static OPEN = 1; readyState = 1; addEventListener() {} removeEventListener() {} send() {} close() {} };
    });
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/')) {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-skip-cache', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        let data = [];
        if (url.pathname === '/api/coupons/available' && failPlatform) return request.respond({ status: 503, headers, body: JSON.stringify({ message: 'Retry fixture' }) });
        if (url.pathname === '/api/coupons/available') data = [coupon('PLATFORM_B', 'b', { fundingSource: 'PLATFORM_FUNDED', scopeType: 'STORE_WIDE', store: { id: 'b', name: 'Shop B' } })];
        if (url.pathname === '/api/coupons/stores/a/available') data = [coupon('SHOP_A', 'a')];
        if (url.pathname === '/api/coupons/stores/b/available') data = [coupon('SHOP_B', 'b')];
        if (request.method() === 'POST') {
          assert.ok(['/api/coupons/validate', '/api/coupons/preview-stacked'].includes(url.pathname), 'only preview APIs are allowed');
          const body = JSON.parse(request.postData()); calls.push({ path: url.pathname, body });
          data = { valid: true, code: body.code, discountAmount: body.code === 'SHOP_B' ? 20000 : 18000 };
        }
        return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
      }
      if (url.pathname === '/__voucher-selection-test') return request.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
        import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
        await import('/src/index.css');
        const src=await(await fetch('/src/components/checkout/ScanmsCheckoutVoucherModal.tsx')).text();
        const main=await(await fetch('/src/main.tsx')).text();
        const reactModule=await import(src.match(/"([^\"]*react[.]js[^\"]*)"/)[1]);const React=reactModule.default||reactModule;
        const dom=await import(main.match(/"([^\"]*react-dom_client[.]js[^\"]*)"/)[1]);
        const {BrowserRouter}=await import(src.match(/"([^\"]*react-router-dom[.]js[^\"]*)"/)[1]);
        const {ScanmsCheckoutVoucherModal}=await import('/src/components/checkout/ScanmsCheckoutVoucherModal.tsx');
        const h=React.createElement, groups=['a','b'].map((id,i)=>({store:{id,name:'Shop '+id.toUpperCase()},subtotal:(i+1)*100000,items:[{productId:'product-'+id,quantity:1,price:(i+1)*100000}]})), fees={a:20000,b:30000};
        function Harness(){const [open,setOpen]=React.useState(false),[shops,setShops]=React.useState({}),[platform,setPlatform]=React.useState(null),[shipping,setShipping]=React.useState(null);
          return h(React.Fragment,null,h('button',{id:'open',onClick:()=>setOpen(true)},'Mở voucher'),h('output',{id:'selection'},JSON.stringify({shops,platform,shipping})),h(ScanmsCheckoutVoucherModal,{isOpen:open,onClose:()=>setOpen(false),groups,shippingFeesByStore:fees,totalShippingFee:50000,rawGoodsSubtotal:300000,appliedShopCoupons:shops,appliedPlatformCoupon:platform,appliedShippingCoupon:shipping,onApplyShopCoupon:(id,v)=>setShops(prev=>({...prev,[id]:v})),onRemoveShopCoupon:id=>setShops(prev=>{const next={...prev};delete next[id];return next;}),onApplyPlatformCoupon:setPlatform,onRemovePlatformCoupon:()=>setPlatform(null),onApplyShippingCoupon:setShipping,onRemoveShippingCoupon:()=>setShipping(null)}));}
        (dom.createRoot||dom.default.createRoot)(document.getElementById('root')).render(h(BrowserRouter,null,h(Harness)));
      </script></body></html>` });
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    await page.goto(origin + '/__voucher-selection-test');
    await page.waitForSelector('#open').catch(error => { throw new Error(`${error.message}; ${errors.join('; ')}`, { cause: error }); });
    await page.click('#open');
    await page.waitForSelector('[role=alert]');
    await page.waitForFunction(() => [...document.querySelectorAll('[role=button]')].some(el => el.textContent.includes('SHOP_B')));
    assert.equal(await page.$eval('body', el => /SAN07SHIP|FREESHIP30K|SAN07SAVE/.test(el.innerText)), false);
    failPlatform = false;
    await page.evaluate(() => [...document.querySelectorAll('button')].find(el => el.textContent === 'Thử tải lại').click());
    await page.waitForFunction(() => [...document.querySelectorAll('[role=button]')].some(el => el.textContent.includes('PLATFORM_B')));
    await page.evaluate(() => [...document.querySelectorAll('[role=button]')].find(el => el.textContent.includes('SHOP_B')).click());
    await page.waitForFunction(() => JSON.parse(document.querySelector('#selection').textContent).shops.b?.discountAmount === 20000)
      .catch(error => { throw new Error(`${error.message}; calls=${JSON.stringify(calls)}; ${errors.join('; ')}; ${page.url()}`, { cause: error }); });
    assert.equal(calls.at(-1).body.storeId, 'b');
    assert.deepEqual(calls.at(-1).body.items, [{ productId: 'product-b', quantity: 1 }]);
    await page.evaluate(() => [...document.querySelectorAll('[role=button]')].find(el => el.textContent.includes('PLATFORM_B')).focus());
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => JSON.parse(document.querySelector('#selection').textContent).platform?.storeId === 'b');
    assert.equal(calls.at(-1).body.shopDiscount, 20000);
    assert.equal(calls.at(-1).body.goodsSubtotal, 200000);
    for (const width of [1440, 390, 320]) {
      await page.setViewport({ width, height: 900 });
      assert.ok(await page.$eval('[role=dialog]', el => el.scrollWidth <= el.clientWidth + 1));
    }
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[role=dialog]'));
    assert.equal(await page.evaluate(() => document.activeElement.id), 'open');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
