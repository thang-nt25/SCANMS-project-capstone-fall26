import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = process.env.GHN_UI_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

test('checkout requires manual KOL input, never saves or automatically applies shipping/platform codes', {
  skip: !base || !existsSync(executablePath), timeout: 45000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(12000);
    await page.setViewport({ width: 1280, height: 900 });
    const calls = [], errors = [];
    const address = { id: 'address', fullName: 'Khách kiểm thử', phoneNumber: '0900000000', detailAddress: '15 Hàng Bạc', provinceCode: '1', districtCode: '2', wardCode: '3', provinceName: 'Thành phố Hà Nội', districtName: 'Quận Hoàn Kiếm', wardName: 'Phường Hàng Bạc', isDefault: true };
    await page.evaluateOnNewDocument(() => {
      localStorage.clear();
      localStorage.setItem('token', 'fixture-no-server-access');
      localStorage.setItem('user', JSON.stringify({ id: 'buyer', fullName: 'Khách kiểm thử', role: 'CUSTOMER', email: 'buyer@example.test' }));
    });
    page.on('pageerror', error => {
      // Vite's HMR socket is intentionally blocked in this isolated fixture.
      if (!error.message.includes('WebSocket closed without opened')) errors.push(error.message);
    });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] || 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' };
      const reply = data => request.respond({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(data) });
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.hostname === 'provinces.open-api.vn') return reply([{ code: 1, name: address.provinceName, districts: [{ code: 2, name: address.districtName, wards: [{ code: 3, name: address.wardName }] }] }]);
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        calls.push({ path: url.pathname, method: request.method(), body: request.postData() ? JSON.parse(request.postData()) : null });
        let data = [];
        if (url.pathname === '/api/customer/addresses') data = [address];
        if (url.pathname === '/api/customer/cart') data = { items: [], warnings: [] };
        if (url.pathname === '/api/wallets/me') data = { availableBalance: '500000' };
        if (url.pathname === '/api/orders/payos/availability') data = { available: true };
        if (url.pathname.includes('/stores/public/id/')) data = { id: 'shop', name: 'Cửa hàng kiểm thử', policyReturn: 'Đổi trả trong 14 ngày' };
        if (url.pathname === '/api/shipping/ghn/quote-address') data = { totalFee: 21001 };
        if (url.pathname === '/api/orders/validate-cart') data = { warnings: [] };
        if (url.pathname === '/api/coupons/validate') data = { valid: true, code: 'KOL10', discountAmount: 20000, discountType: 'PERCENTAGE' };
        return reply({ success: true, data });
      }
      if (url.pathname === '/__kol-manual-checkout') return request.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
        import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
        import '/src/index.css';
        const source=await(await fetch('/src/components/checkout/GuestCheckoutModal.tsx')).text();const version=source.match(/react[.]js([?]v=[^"]+)/)?.[1]||'';
        const React=await import('/node_modules/.vite/deps/react.js'+version);const dom=await import('/node_modules/.vite/deps/react-dom_client.js'+version);const {BrowserRouter}=await import('/node_modules/.vite/deps/react-router-dom.js'+version);
        const {CartProvider}=await import(source.match(/["]([^"]*CartContext[.]tsx[^"]*)["]/)[1]);const {ScanmsChatProvider}=await import(source.match(/["]([^"]*ScanmsChatContext[.]tsx[^"]*)["]/)[1]);const {GuestCheckoutModal}=await import('/src/components/checkout/GuestCheckoutModal.tsx');
        const h=React.createElement||React.default.createElement;const item={cartItemId:'line',productId:'00000000-0000-4000-8000-000000000001',title:'Sản phẩm kiểm thử',price:200000,quantity:1,stockQuantity:10,isActive:true,liveCouponCode:'MUST_NOT_AUTO_APPLY',store:{id:'shop',name:'Cửa hàng kiểm thử'}};
        (dom.createRoot||dom.default.createRoot)(document.getElementById('root')).render(h(BrowserRouter,null,h(CartProvider,null,h(ScanmsChatProvider,null,h(GuestCheckoutModal,{isOpen:true,onClose:()=>{},checkoutItems:[item],initialCouponCode:'OLD_CODE',initialExtraVoucher:{code:'OLD_SHIPPING',benefitType:'SHIPPING'}})))));
      </script></body></html>` });
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    await page.goto(`${origin}/__kol-manual-checkout`);
    await page.waitForSelector('.checkout-shop-voucher input');
    await page.waitForFunction(() => document.body.innerText.includes('221.001')).catch(async error => {
      console.error('Checkout fixture:', JSON.stringify({ calls, errors, text: await page.$eval('body', el => el.innerText) }));
      throw error;
    });
    assert.equal(calls.filter(call => call.path.includes('/coupons/')).length, 0);
    assert.equal(await page.$eval('.checkout-shop-voucher input', el => el.value), '');
    await page.type('.checkout-shop-voucher input', 'kol10');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.body.innerText.includes('201.001'));
    const couponCalls = calls.filter(call => call.path.includes('/coupons/'));
    assert.equal(couponCalls.length, 1);
    assert.equal(couponCalls[0].path, '/api/coupons/validate');
    assert.equal(couponCalls[0].body.code, 'KOL10');
    assert.equal(couponCalls[0].body.storeId, 'shop');
    await page.click('.checkout-shop-voucher button');
    await page.waitForFunction(() => document.body.innerText.includes('221.001') && !document.querySelector('.checkout-shop-voucher')?.textContent.includes('Hủy mã'));
    assert.equal(calls.filter(call => call.path === '/api/orders').length, 0);
    assert.equal(calls.filter(call => /saved|preview-stacked|platform-coupons/.test(call.path)).length, 0);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
