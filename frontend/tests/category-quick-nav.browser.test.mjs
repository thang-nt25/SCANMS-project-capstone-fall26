import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';

const base = process.env.CATEGORY_NAV_TEST_URL;
const executablePath = process.env.CATEGORY_NAV_BROWSER;

test('homepage categories have consistent illustrations, correct destinations and shortcuts in the header', {
  skip: !base || !executablePath, timeout: 90000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    const store = { id: 'qa-store', name: 'Gian hàng kiểm thử', slug: 'qa-shop', isVerified: true };
    const products = [
      { id: 'skin', title: 'Serum kiểm thử', categoryName: 'Chăm sóc da', price: 100000, originalPrice: 150000, stockQuantity: 0, variants: [{ id: 'v1', name: '30 ml', stockQuantity: 5, isActive: true }] },
      { id: 'makeup', title: 'Son kiểm thử', categoryName: 'Trang điểm', price: 120000, originalPrice: 120000, stockQuantity: 3 },
      { id: 'body', title: 'Sữa tắm kiểm thử', categoryName: 'Chăm sóc cơ thể', price: 100000, stockQuantity: 3 },
      { id: 'hair', title: 'Dầu gội kiểm thử', categoryName: 'Chăm sóc tóc', price: 80000, stockQuantity: 3 },
      { id: 'health', title: 'Vitamin kiểm thử', categoryName: 'Thực phẩm bổ sung', price: 150000, stockQuantity: 3 },
      { id: 'health-out', title: 'Vitamin hết hàng', categoryName: 'Thực phẩm chức năng', price: 100000, originalPrice: 200000, stockQuantity: 0 },
      { id: 'food', title: 'Bánh kiểm thử', categoryName: 'Thực phẩm khô', price: 50000, stockQuantity: 3 },
    ].map(product => ({ ...product, sku: product.id, imageUrl: product.id === 'skin' ? '/assets/products/real/centella-b5-serum.jpg' : '/scanms-placeholder.svg', store }));
    const errors = [], writes = [];
    let account = null;
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/@vite/client') return request.respond({ status: 200, contentType: 'application/javascript', body: 'export const createHotContext=()=>({accept(){},acceptExports(){},prune(){},decline(){},dispose(){},invalidate(){},on(){},off(){},send(){},data:{}});export const injectQuery=url=>url;const styles=new Map();export function updateStyle(id,css){let el=styles.get(id);if(!el){el=document.createElement("style");styles.set(id,el);document.head.append(el)}el.textContent=css}export function removeStyle(id){styles.get(id)?.remove();styles.delete(id)}' });
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000' || url.pathname.startsWith('/socket.io')) {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,authorization,x-skip-cache', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        if (request.method() !== 'GET') writes.push(url.pathname);
        let data = [];
        if (url.pathname === '/api/auth/me') data = account;
        if (url.pathname === '/api/customer/cart') data = { items: [], syncedAt: new Date().toISOString() };
        if (url.pathname === '/api/notifications/unread-count') data = { unreadCount: 0 };
        if (url.pathname === '/api/public/products') data = { items: products, pagination: { totalPages: 1 } };
        if (url.pathname === '/api/public/products/categories') data = [...new Set(products.map(product => product.categoryName))].map(name => ({ name, count: products.filter(product => product.categoryName === name).length }));
        if (url.pathname === '/api/public/products/stores') data = [store];
        return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    const home = async () => {
      await page.goto(`${origin}/marketplace`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.category-quick-nav');
    };
    const names = () => page.$$eval('main article h3', els => els.map(el => el.textContent));
    await page.setViewport({ width: 1440, height: 1000 });
    await home();
    await mkdir('../artifacts/header-audit', { recursive: true });
    await page.$('.marketplace-header').then(el => el.screenshot({ path: '../artifacts/header-audit/header-desktop.png' }));
    assert.equal(await page.$$eval('nav[aria-label="Khám phá SCANMS"] a, nav[aria-label="Khám phá SCANMS"] button', els => els.length), 3);
    for (const [role, destination] of [
      ['CUSTOMER', '/customer/orders'], ['COLLABORATOR', '/collaborator/dashboard'],
      ['SHOP_MANAGER', '/merchant/dashboard'], ['SYSTEM_MANAGER', '/admin/users'], ['SYSTEM_ADMIN', '/admin/analytics'],
    ]) {
      account = { id: 'qa-' + role, role, fullName: 'Tài khoản kiểm thử', email: 'qa@example.test' };
      await page.evaluate(user => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'qa-header-only');
        dispatchEvent(new Event('auth-user-updated'));
      }, account);
      await page.click('button[aria-controls="public-account-menu"]');
      await page.waitForSelector('#public-account-menu');
      assert.ok(await page.$(`#public-account-menu a[href="${destination}"]`), role + ' has its own destination');
      assert.doesNotMatch(await page.$eval('#public-account-menu', el => el.textContent), /Chuyển vai trò/);
      await page.keyboard.press('Escape');
      await page.waitForSelector('#public-account-menu', { hidden: true });
      assert.equal(await page.$eval('button[aria-controls="public-account-menu"]', el => document.activeElement === el), true);
    }
    account = null;
    await page.evaluate(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); dispatchEvent(new Event('auth-user-updated')); });
    await page.click('button[aria-label="Tra cứu đơn"]');
    await page.waitForFunction(() => location.pathname === '/tracking');
    await page.waitForSelector('form');
    await home();
    await page.click('button[aria-label="Giỏ hàng"]');
    await page.waitForSelector('.scanms-cart-dialog[open]');
    await page.keyboard.press('Escape');
    await page.waitForSelector('.scanms-cart-dialog[open]', { hidden: true });
    await page.click('nav[aria-label="Khám phá SCANMS"] a[href="/marketplace#featured-stores"]');
    await page.waitForFunction(() => location.hash === '#featured-stores');
    assert.equal(await page.$eval('nav[aria-label="Khám phá SCANMS"] a[href="/marketplace#featured-stores"]', el => el.getAttribute('aria-current')), 'location');
    await page.click('.scanms-site-header a[href="/marketplace"]');
    await page.waitForFunction(() => !location.hash);
    await mkdir('../artifacts/category-quick-nav', { recursive: true });
    await page.$eval('.category-quick-nav', el => el.scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: '../artifacts/category-quick-nav/desktop.png' });
    await page.$('.category-quick-nav__panel').then(el => el.screenshot({ path: '../artifacts/category-quick-nav/section-desktop.png' }));
    assert.equal(await page.$$eval('.category-quick-nav__categories a', els => els.length), 4);
    assert.equal(await page.$$eval('.category-quick-nav [href*="commission"]', els => els.length), 0);
    assert.equal(await page.$('.category-quick-nav__discover'), null, 'duplicate Live and discount shortcuts are not in the category panel');
    assert.equal(await page.$$eval('.category-quick-nav__category svg', els => els.length), 4);
    for (const [group, expected] of [
      ['skin', ['Serum kiểm thử']], ['makeup', ['Son kiểm thử']],
      ['body', ['Dầu gội kiểm thử', 'Sữa tắm kiểm thử']], ['health', ['Vitamin kiểm thử', 'Vitamin hết hàng']],
    ]) {
      await page.click(`.category-quick-nav__categories a[href="/search?categoryGroup=${group}"]`);
      await page.waitForFunction(() => location.pathname === '/search' && document.querySelectorAll('main article').length > 0);
      assert.equal(new URL(page.url()).searchParams.get('categoryGroup'), group);
      assert.deepEqual((await names()).sort(), expected.sort());
      await home();
    }
    await page.click('.category-quick-nav__all');
    await page.waitForFunction(() => document.querySelectorAll('main article').length === 7);
    assert.equal(new URL(page.url()).search, '');
    await home();
    await page.click('nav[aria-label="Khám phá SCANMS"] a[href="/search?discount=true&inStock=true"]');
    await page.waitForFunction(() => document.querySelectorAll('main article').length === 1);
    assert.deepEqual(await names(), ['Serum kiểm thử']);
    assert.equal(new URL(page.url()).searchParams.get('discount'), 'true');
    assert.equal(new URL(page.url()).searchParams.get('inStock'), 'true');
    await home();
    const before = page.url();
    await page.click('nav[aria-label="Khám phá SCANMS"] button');
    await page.waitForSelector('[role="dialog"][aria-labelledby="scanms-live-title"]');
    assert.equal(page.url(), before, 'KOC opens the real Live hub instead of a hidden commission filter');
    await page.click('button[aria-label="Đóng danh sách phiên live"]');
    await page.waitForFunction(() => !document.querySelector('[role="dialog"][aria-labelledby="scanms-live-title"]'));
    for (const width of [768, 390, 320]) {
      await page.setViewport({ width, height: 844 });
      if (width === 390) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.$('.marketplace-header').then(el => el.screenshot({ path: '../artifacts/header-audit/header-mobile.png' }));
      }
      await page.$eval('.category-quick-nav', el => el.scrollIntoView({ block: 'center' }));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `no overflow at ${width}`);
      assert.ok(await page.$$eval('.category-quick-nav__category', els => {
        const heights = els.map(el => el.getBoundingClientRect().height); return Math.max(...heights) - Math.min(...heights) < 1;
      }), 'category tiles stay equal height');
    }
    await page.setViewport({ width: 390, height: 844 });
    await page.$eval('.category-quick-nav', el => el.scrollIntoView({ block: 'center' }));
    await page.$('.category-quick-nav__panel').then(el => el.screenshot({ path: '../artifacts/category-quick-nav/section-mobile.png' }));
    await page.screenshot({ path: '../artifacts/category-quick-nav/mobile.png' });
    assert.deepEqual(errors, []);
    assert.ok(writes.every(path => /analytics|interaction/.test(path) || ['/api/customer/cart', '/api/stores/my-store/presence'].includes(path)), 'unexpected mocked writes: ' + [...new Set(writes)].join(', '));
  } finally { await browser.close(); }
});
