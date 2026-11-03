import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';

const base = process.env.GHN_UI_TEST_URL;
test('cart hover preview scrolls, opens product details and cart, supports empty state and touch', { skip: !base, timeout: 45000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(7000);
    const items = Array.from({ length: 12 }, (_, index) => ({
      cartItemId: 'qa-' + index + '_base', productId: 'qa-' + index, title: 'Sản phẩm kiểm thử ' + index,
      sku: 'QA-' + index, price: 100000 + index * 1000, quantity: 1, stockQuantity: 10, isActive: true,
      imageUrl: '/scanms-placeholder.svg', store: { id: 'qa-shop', name: 'Shop kiểm thử' },
    }));
    const cartSeed = await page.evaluateOnNewDocument(items => {
      localStorage.setItem('scanms_cart_guest', JSON.stringify(items));
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
        if (url.pathname.endsWith('/landing')) data = { product: { id: 'qa-11', sku: 'QA-11', title: 'Sản phẩm kiểm thử 11', price: 111000, stockQuantity: 10, variants: [] }, store: { id: 'qa-shop', name: 'Shop kiểm thử' }, images: [], videos: [], reviews: { items: [], totalReviews: 0, averageRating: 0, starDistribution: {} } };
        return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    const cart = 'button[aria-label="Giỏ hàng"]';
    const panel = '.header-cart-preview';
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(origin + '/marketplace');
    await page.waitForSelector(cart);
    await page.hover(cart);
    await page.waitForSelector(panel);
    assert.equal(await page.$('.scanms-cart-dialog[open]'), null, 'hover does not open the drawer');
    await page.hover('.header-cart-preview__product');
    await page.mouse.wheel({ deltaY: 700 });
    await page.waitForFunction(() => document.querySelector('.header-cart-preview__list').scrollTop > 0);
    assert.ok(await page.$eval(panel, el => {
      const rect = el.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
    }));
    await mkdir('../artifacts/header-audit', { recursive: true });
    await page.$eval('.header-cart-preview__list', el => { el.scrollTop = 0; });
    await page.$(panel).then(el => el.screenshot({ path: '../artifacts/header-audit/cart-preview.png' }));
    await page.click('.header-cart-preview__product');
    await page.waitForFunction(() => location.pathname === '/products/qa-11');
    await page.goto(origin + '/marketplace');
    await page.waitForSelector(cart);
    await page.hover(cart);
    await page.waitForSelector(panel);
    await page.click('.header-cart-preview footer a');
    await page.waitForFunction(() => location.pathname === '/cart');
    await page.goto(origin + '/marketplace');
    await page.waitForSelector(cart);
    await page.hover(cart);
    await page.waitForSelector(panel);
    await page.mouse.move(10, 700);
    await page.waitForSelector(panel, { hidden: true });
    await page.focus(cart);
    await page.waitForSelector(panel);
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => document.querySelector('.header-cart-preview').contains(document.activeElement));
    await page.keyboard.press('Escape');
    await page.waitForSelector(panel, { hidden: true });
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(origin + '/marketplace');
    await page.waitForSelector(cart);
    await page.tap(cart);
    await page.waitForSelector('.scanms-cart-dialog[open]');
    assert.equal(await page.$(panel), null, 'touch opens the existing drawer without an overlapping preview');
    await page.goto(origin + '/marketplace');
    await page.removeScriptToEvaluateOnNewDocument(cartSeed.identifier);
    await page.evaluate(() => localStorage.removeItem('scanms_cart_guest'));
    await page.reload();
    await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false });
    await page.waitForSelector(cart);
    await page.hover(cart);
    await page.waitForSelector('.header-cart-preview__empty');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
