import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';

const base = process.env.GHN_UI_TEST_URL;
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const variants = [
  { id: id(11), name: '100 ml / Tiêu chuẩn', sku: 'CLEAN-100', price: 160000, stockQuantity: 3, isActive: true },
  { id: id(12), name: '150 ml / Hộp quà', sku: 'CLEAN-150', price: 210000, stockQuantity: 5, isActive: true },
  { id: id(13), name: '100 ml / Hộp quà', sku: 'CLEAN-GIFT', price: 180000, stockQuantity: 0, isActive: true },
];
const items = [
  { productId: id(1), variantId: variants[0].id, variantName: variants[0].name, availableVariants: variants,
    title: 'Sữa rửa mặt dịu nhẹ pH 5.5', price: 160000, originalPrice: 190000, quantity: 2,
    imageUrl: '/assets/products/real/amino-cleanser-ph55.jpg', store: { id: id(101), name: 'Herbal Spa', slug: 'herbal-spa' } },
  { productId: id(2), title: 'Serum Vitamin C 15% dưỡng sáng da', price: 250000, quantity: 1,
    imageUrl: '/assets/products/real/vitamin-c-15-serum.jpg', store: { id: id(101), name: 'Herbal Spa', slug: 'herbal-spa' } },
  { productId: id(3), title: 'Serum rau má B5', price: 200000, quantity: 1, stockQuantity: 0,
    imageUrl: '/assets/products/real/one-thing-centella-b5.jpg', store: { id: id(102), name: 'Medimix' } },
  ...Array.from({ length: 5 }, (_, index) => ({ productId: id(index + 4), title: ['Mặt nạ rau má dịu da', 'Tinh chất rau má B5', 'Nước cân bằng BHA 2%', 'Sữa rửa mặt pH 5.5', 'Serum dưỡng sáng Vitamin C'][index],
    price: 90000 + index * 10000, quantity: 1, variantName: 'Tiêu chuẩn',
    imageUrl: '/assets/products/real/' + ['centella-sheet-mask.jpg', 'centella-b5-serum.jpg', 'bha-toner-2pct.png', 'amino-cleanser-ph55.jpg', 'vitamin-c-15-serum.jpg'][index],
    store: { id: id(103), name: 'Gian hàng chăm sóc da', slug: 'cham-soc-da' } })),
].map(item => ({ sku: 'QA', stockQuantity: 3, isActive: true, ...item, cartItemId: `${item.productId}_${item.variantId || 'base'}` }));

test('cart page supports multiple shops, aligned photos, sticky checkout, variants, quantity and selection', { skip: !base, timeout: 60000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let validations = 0;
    const seed = await page.evaluateOnNewDocument(items => {
      localStorage.setItem('scanms_cart_guest', JSON.stringify(items));
      localStorage.setItem('scanms_cart_selected_guest', JSON.stringify(items.map(item => item.cartItemId)));
      localStorage.setItem('scanms_chat_sound', 'off');
    }, items);
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/@vite/client') return request.respond({ status: 200, contentType: 'application/javascript', body: 'export const createHotContext=()=>({accept(){},acceptExports(){},prune(){},dispose(){},invalidate(){},on(){},off(){},send(){},data:{}});export const injectQuery=x=>x;const styles=new Map();export function updateStyle(id,css){let e=styles.get(id);if(!e){e=document.createElement("style");styles.set(id,e);document.head.append(e)}e.textContent=css}export function removeStyle(id){styles.get(id)?.remove();styles.delete(id)}' });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'content-type,authorization,x-skip-cache', 'Access-Control-Allow-Credentials': 'true' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        let data = [];
        if (url.pathname.endsWith('/orders/validate-cart')) {
          validations++;
          data = { items: JSON.parse(request.postData()).items.map(item => ({ ...item, currentPrice: item.clientPrice, stockQuantity: item.productId === id(3) ? 0 : 10, isActive: true })), warnings: [] };
        }
        return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(origin + '/cart');
    await page.waitForSelector('.cart-page__item');
    const amount = () => page.$eval('.cart-page__checkout-total strong', el => Number(el.textContent.replace(/\D/g, '')));
    const initial = items.filter(item => item.stockQuantity > 0).reduce((sum, item) => sum + item.price * item.quantity, 0);
    assert.equal(await amount(), initial);
    assert.equal(await page.$$eval('.cart-page__shop', elements => elements.length), 3);
    assert.equal(await page.$$eval('.cart-page__image img', images => images.length), 8);
    assert.equal(await page.$eval('.public-commerce-header--cart', el => el.textContent.includes('AFFILIATE COMMERCE NETWORK')), false);
    assert.ok(await page.$('.public-commerce-header--cart .product-search input'));
    assert.ok(await page.$('.public-commerce-header--cart button[aria-label="Tra cứu đơn"]'));
    assert.equal(await page.$('.cart-page__item--unavailable input').then(el => el.evaluate(el => el.disabled)), true);
    await page.waitForFunction(() => Array.from(document.querySelectorAll('.cart-page__image img')).every(img => img.complete && img.naturalWidth > 0));
    assert.equal(await page.$eval('.cart-page__shop-heading a', el => el.getAttribute('href')), '/shops/herbal-spa');
    assert.equal(await page.$eval('.cart-page__image', el => el.getAttribute('href')), '/products/' + id(1));
    await mkdir('../artifacts/cart-page', { recursive: true });
    await page.screenshot({ path: '../artifacts/cart-page/desktop.png' });
    const barBottom = await page.$eval('.cart-page__checkout', el => el.getBoundingClientRect().bottom);
    assert.ok(barBottom <= 901 && barBottom >= 880, 'checkout stays at the viewport bottom');
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
    assert.ok(Math.abs(await page.$eval('.cart-page__checkout', el => el.getBoundingClientRect().bottom) - barBottom) <= 1, 'checkout stays put while scrolling through multiple shops');
    await page.screenshot({ path: '../artifacts/cart-page/multiple-shops.png' });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.click('.cart-page__item .cart-page__quantity button:last-child');
    assert.equal(await amount(), initial + 160000);
    assert.equal(await page.$eval('.cart-page__quantity button:last-child', el => el.disabled), true);
    await page.select('.cart-page__product-info select', variants[1].id);
    assert.equal(await amount(), initial + 310000);
    assert.equal(await page.$eval('.cart-page__product-info option:last-child', el => el.disabled), true);
    await page.click('.cart-page__bulk input');
    assert.equal(await amount(), 0);
    assert.equal(await page.$eval('#cart-checkout-btn', el => el.disabled), true);
    await page.click('.cart-page__shop-heading input');
    assert.equal(await amount(), 880000);
    await page.click('.cart-page__item input');
    assert.equal(await amount(), 250000);
    assert.equal(await page.$eval('.cart-page__shop-heading input', el => el.indeterminate), true);
    await page.click('.cart-page__bulk input');
    for (const width of [1024, 768, 390, 320]) {
      await page.setViewport({ width, height: 844 });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `no overflow at ${width}px`);
      assert.ok(await page.$eval('#cart-checkout-btn', el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }), `buy button remains visible at ${width}px`);
      if (width === 390) await page.screenshot({ path: '../artifacts/cart-page/mobile.png' });
    }
    await page.setViewport({ width: 1440, height: 900 });
    await page.click('.cart-page__refresh');
    await page.waitForFunction(() => !document.querySelector('.cart-page__refresh').disabled);
    assert.equal(validations, 1);
    await page.click('#cart-scanms-voucher-btn');
    await page.waitForSelector('button[aria-label="Đóng bảng chọn voucher"]');
    await page.click('button[aria-label="Đóng bảng chọn voucher"]');
    await page.click('#cart-checkout-btn');
    await page.waitForFunction(() => !!localStorage.getItem('scanms_pending_checkout'));
    const pending = await page.evaluate(() => JSON.parse(localStorage.getItem('scanms_pending_checkout')));
    assert.equal(pending.itemIds.length, 7);
    assert.ok(!pending.itemIds.includes(items[2].cartItemId));
    await page.removeScriptToEvaluateOnNewDocument(seed.identifier);
    await page.evaluate(() => { localStorage.removeItem('scanms_pending_checkout'); localStorage.removeItem('scanms_cart_guest'); localStorage.removeItem('scanms_cart_selected_guest'); });
    await page.goto(origin + '/cart');
    await page.waitForSelector('.cart-page__empty');
    assert.equal(await page.$('#cart-checkout-btn'), null);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
