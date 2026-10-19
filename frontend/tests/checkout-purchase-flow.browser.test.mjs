import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = process.env.GHN_UI_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

test('buy-now and selected cart use one checkout with real shop totals, vouchers and one place-order action', {
  skip: !base || !existsSync(executablePath), timeout: 60000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const user = { id: 'qa-checkout', role: 'CUSTOMER', fullName: 'Khách kiểm thử', email: 'buyer@example.test', phoneNumber: '0901234567' };
  const address = { id: 'address', fullName: user.fullName, phoneNumber: user.phoneNumber, detailAddress: '123 Đường Nguyễn Trãi', provinceCode: '6', districtCode: '58', wardCode: '1879', provinceName: 'Tỉnh Bắc Kạn', districtName: 'Thành Phố Bắc Kạn', wardName: 'Phường Nguyễn Thị Minh Khai', isDefault: true };
  const provinces = [{ code: 6, name: address.provinceName, districts: [{ code: 58, name: address.districtName, wards: [{ code: 1879, name: address.wardName }] }] }];
  const fixtures = [0, 1].map(index => ({
    cartItemId: `${id(index + 1)}_${id(index + 11)}`, productId: id(index + 1), variantId: id(index + 11), variantName: index ? '100 ml' : '30 ml / Tiêu chuẩn',
    title: index ? 'Sữa rửa mặt dịu nhẹ cho da nhạy cảm' : 'Serum rau má B5 Cocoon 30 ml', price: index ? 100000 : 200000, quantity: index ? 1 : 2,
    imageUrl: '/assets/products/real/amino-cleanser-ph55.jpg', stockQuantity: 10, isActive: true, sku: `FIXTURE-${index}`,
    store: { id: id(index + 21), name: index ? 'Gian hàng chăm sóc da với tên dài để kiểm tra màn hình nhỏ' : 'Cocoon', slug: `fixture-shop-${index}` },
    availableVariants: [{ id: id(index + 11), name: index ? '100 ml' : '30 ml / Tiêu chuẩn', price: index ? 100000 : 200000, stockQuantity: 10 }],
  }));
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(8000);
    const errors = [], placed = [], couponRequests = [];
    let serverCart = structuredClone(fixtures);
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(({ user, address, fixtures }) => {
      localStorage.setItem('token', 'qa-fixture-only'); localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('scanms_cart_u_qa-checkout', JSON.stringify(fixtures));
      localStorage.setItem('scanms_cart_selected_u_qa-checkout', JSON.stringify(fixtures.map(item => item.cartItemId)));
      localStorage.setItem('scanms_cached_addresses', JSON.stringify([address]));
      window.WebSocket = class { static OPEN = 1; readyState = 1; addEventListener() {} removeEventListener() {} send() {} close() {} };
    }, { user, address, fixtures });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.hostname === 'provinces.open-api.vn') return request.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(provinces) });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        let data = [];
        if (url.pathname === '/api/auth/me') data = user;
        if (url.pathname === '/api/customer/cart') {
          if (request.method() === 'PUT') serverCart = JSON.parse(request.postData()).items;
          data = { items: serverCart };
        }
        if (url.pathname === '/api/customer/addresses') data = [address];
        if (url.pathname.startsWith('/api/stores/public/id/')) data = { id: url.pathname.split('/').at(-1), policyReturn: 'Đổi trả 14 ngày theo điều kiện của gian hàng.', policyShipping: 'Giao qua GHN', policyWarranty: 'Theo chính sách gian hàng' };
        if (url.pathname === '/api/wallets/me') data = { availableBalance: 1000000, pendingBalance: 0 };
        if (url.pathname === '/api/orders/payos/availability') data = { available: true };
        if (url.pathname === '/api/orders/validate-cart') data = { items: JSON.parse(request.postData()).items.map(item => ({ ...item, currentPrice: item.clientPrice, stockQuantity: 10, isActive: true })), warnings: [] };
        if (url.pathname === '/api/shipping/ghn/quote-address') data = { totalFee: JSON.parse(request.postData()).storeId === id(21) ? 29001 : 20000 };
        if (url.pathname === '/api/coupons/validate') {
          const payload = JSON.parse(request.postData()); couponRequests.push(payload);
          data = { code: payload.code, discountAmount: payload.code === 'SHIP5' ? 5000 : 15000, discountType: 'FIXED_AMOUNT' };
        }
        if (url.pathname === '/api/orders' && request.method() === 'POST') {
          const payload = JSON.parse(request.postData()); placed.push(payload);
          const storeIds = [...new Set(payload.items.map(item => fixtures.find(fixture => fixture.productId === item.productId).store.id))];
          const orders = storeIds.map((storeId, index) => ({ publicOrderCode: `DH-FIXTURE-${index}`, finalAmount: 414001, paymentStatus: 'PAID', store: fixtures.find(item => item.store.id === storeId).store }));
          data = { publicOrderCode: orders[0].publicOrderCode, isMultiStore: orders.length > 1, paymentMethod: 'WALLET', paymentStatus: 'PAID', finalAmount: orders.length > 1 ? 534001 : 414001, orders, confirmationEmailStatus: 'SENT' };
        }
        assert.ok(!/top-up/.test(url.pathname), 'checkout must not top up a wallet');
        return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
      }
      if (url.pathname === '/__checkout-flow-test') return request.respond({ status: 200, contentType: 'text/html', body: `<html><head><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body><div id="root"></div><script type="module">
        import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
        await import('/src/index.css');
        const source=await(await fetch('/src/components/checkout/GuestCheckoutModal.tsx')).text();const version=source.match(/react[.]js([?]v=[^"]+)/)?.[1]||'';
        const React=await import('/node_modules/.vite/deps/react.js'+version);const dom=await import('/node_modules/.vite/deps/react-dom_client.js'+version);const {BrowserRouter}=await import('/node_modules/.vite/deps/react-router-dom.js'+version);
        const {CartProvider,useCart}=await import(source.match(/[\"]([^\"]*CartContext[.]tsx[^\"]*)[\"]/)[1]);const {ScanmsChatProvider}=await import(source.match(/[\"]([^\"]*ScanmsChatContext[.]tsx[^\"]*)[\"]/)[1]);const {GuestCheckoutModal}=await import('/src/components/checkout/GuestCheckoutModal.tsx');const {CartDrawer}=await import('/src/components/cart/CartDrawer.tsx');
        const fixture=${JSON.stringify(fixtures[0])};const h=React.createElement||React.default.createElement;
        function Harness(){const cart=useCart();const [direct,setDirect]=(React.useState||React.default.useState)(false);return h(React.Fragment||React.default.Fragment,null,
          h('button',{id:'direct-entry',onClick:()=>setDirect(true)},'Mua ngay'),h('button',{id:'cart-entry',onClick:cart.openCart},'Giỏ hàng'),h(CartDrawer),
          direct?h(GuestCheckoutModal,{isOpen:true,onClose:()=>setDirect(false),initialQuantity:fixture.quantity,initialVariantId:fixture.variantId,product:{id:fixture.productId,title:fixture.title,price:fixture.price,imageUrl:fixture.imageUrl,stockQuantity:10,variants:fixture.availableVariants},store:fixture.store}):null,
          cart.isCheckoutOpen?h(GuestCheckoutModal,{isOpen:true,onClose:cart.closeCheckout,checkoutItems:cart.checkoutItems}):null);}
        (dom.createRoot||dom.default.createRoot)(document.getElementById('root')).render(h(BrowserRouter,null,h(CartProvider,null,h(ScanmsChatProvider,null,h(Harness)))));
      </script></body></html>` });
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    for (const [step, mode] of ['direct', 'cart', 'selected'].entries()) {
      const expectedShops = mode === 'cart' ? 2 : 1;
      serverCart = structuredClone(fixtures);
      await page.setViewport({ width: 1440, height: 1100 });
      await page.goto(`${base}/__checkout-flow-test`);
      await page.waitForSelector('#direct-entry').catch(error => { throw new Error(`${error.message}; ${errors.join('; ')}`); });
      await page.click(mode === 'direct' ? '#direct-entry' : '#cart-entry');
      if (mode !== 'direct') {
        await page.waitForSelector('.scanms-cart-dialog[open]');
        await page.waitForFunction(() => !document.querySelector('.scanms-cart-checkout').disabled);
        if (mode === 'selected') await (await page.$$('.scanms-cart-shop__header > input'))[1].click();
        await page.click('.scanms-cart-checkout');
      }
      await page.waitForSelector('.checkout-flow-form');
      assert.equal(await page.$('.scanms-cart-dialog[open]'), null, 'buy-now and checkout do not show another basket step');
      await page.waitForFunction(() => document.querySelector('.checkout-total-final dd')?.textContent.includes('49.001') || document.querySelector('.checkout-total-final dd')?.textContent.includes('29.001'));
      assert.deepEqual(await page.$$eval('.checkout-flow-form > .checkout-section', els => els.map(el => el.classList[1])), ['checkout-address', 'checkout-products', 'checkout-vouchers', 'checkout-payment']);
      assert.equal(await page.$$('.checkout-shop').then(els => els.length), expectedShops);
      assert.equal(await page.$$('input#checkout-policy-agreement').then(els => els.length), 1);
      assert.equal(await page.$$('.checkout-flow-form button[type="submit"]').then(els => els.length), 1);
      assert.equal(placed.length, step, 'opening checkout does not place an order');
      for (const width of [1440, 1024, 768, 390, 320]) {
        await page.setViewport({ width, height: 1100 });
        assert.ok(await page.$eval('.scanms-checkout', el => el.scrollWidth <= el.clientWidth + 1), `${mode} checkout fits ${width}px`);
        assert.ok(await page.$$eval('.checkout-section', els => els.every(el => el.scrollWidth <= el.clientWidth + 1)), `${mode} sections fit ${width}px`);
        if (width === 1440 || width === 390) {
          await (await page.$('.scanms-checkout')).screenshot({ path: join(tmpdir(), `scanms-checkout-${mode}-${width}.png`) });
          await (await page.$('.checkout-payment')).screenshot({ path: join(tmpdir(), `scanms-checkout-payment-${mode}-${width}.png`) });
        }
      }
      await page.setViewport({ width: 1440, height: 1100 });
      await page.type('#checkout-voucher-shop', 'SHOP15');
      await page.$eval('#checkout-voucher-shop', el => el.parentElement.querySelector('button').click());
      await page.waitForFunction(() => document.querySelector('.checkout-voucher-message')?.textContent.includes('15.000'));
      assert.equal(couponRequests.at(-1).storeId, id(21));
      assert.ok(couponRequests.at(-1).items.every(item => item.productId === id(1)));
      const totals = await page.$eval('.checkout-totals', el => el.textContent);
      assert.match(totals, /15.000/);
      assert.match(totals, expectedShops === 1 ? /414.001/ : /534.001/);
      await page.click('input[value="WALLET"]');
      assert.equal(await page.$eval('input[value="WALLET"]', el => el.checked), true);
      await page.$eval('#checkout-policy-agreement', el => { if (el.checked) el.click(); });
      await page.$eval('.checkout-submit', el => el.click());
      await page.waitForSelector('#checkout-error');
      assert.equal(placed.length, step);
      await page.$eval('#checkout-policy-agreement', el => el.click());
      await page.type('#checkout-order-notes', 'Gọi trước khi giao');
      await page.$eval('.checkout-submit', el => el.click());
      await page.waitForSelector('.checkout-confirmation');
      assert.equal(placed.length, step + 1);
      assert.equal(placed.at(-1).paymentMethod, 'WALLET');
      assert.equal(placed.at(-1).customerEmail, user.email);
      assert.equal(placed.at(-1).items.length, expectedShops);
      assert.equal(placed.at(-1).items[0].quantity, 2);
      assert.equal(placed.at(-1).items[0].variantId, id(11));
      assert.equal(placed.at(-1).couponsByStore[id(21)], 'SHOP15');
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
