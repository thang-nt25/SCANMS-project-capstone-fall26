import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';

const base = process.env.MOBILE_LAYOUT_TEST_URL;
const executablePath = process.env.MOBILE_LAYOUT_BROWSER;
test('marketplace header and hero fit narrow phones without horizontal overflow', {
  skip: !base || !executablePath, timeout: 90000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    const user = { id: 'layout-only', fullName: 'Khách kiểm tra bố cục', role: 'CUSTOMER', email: 'layout@example.test' };
    await page.evaluateOnNewDocument(user => {
      if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', 'layout-fixture-only');
    }, user);
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/@vite/client') return request.respond({ status: 200, contentType: 'application/javascript', body: 'export const createHotContext=()=>({accept(){},acceptExports(){},prune(){},decline(){},dispose(){},invalidate(){},on(){},off(){},send(){},data:{}});export const injectQuery=url=>url;const styles=new Map();export function updateStyle(id,css){let el=styles.get(id);if(!el){el=document.createElement("style");styles.set(id,el);document.head.append(el)}el.textContent=css}export function removeStyle(id){styles.get(id)?.remove();styles.delete(id)}' });
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000' || url.pathname.startsWith('/socket.io')) {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,authorization,x-skip-cache', 'Access-Control-Allow-Methods': 'GET,OPTIONS' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        let data = [];
        if (url.pathname === '/api/auth/me') data = user;
        if (url.pathname === '/api/customer/cart') data = { items: [], syncedAt: new Date().toISOString() };
        if (url.pathname === '/api/notifications/unread-count') data = { unreadCount: 0 };
        if (url.pathname === '/api/public/products') data = { items: [], pagination: { totalPages: 1 } };
        return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    await mkdir('artifacts/mobile-layout', { recursive: true });
    for (const width of [320, 344, 390, 412, 1440]) {
      await page.setViewport({ width, height: 800, deviceScaleFactor: 1, isMobile: width < 640, hasTouch: width < 640 });
      await page.goto(`${origin}/marketplace`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('[aria-roledescription="carousel"]');
      // This layout-only account is not a real socket credential. Dismiss any
      // background notification toast before capturing the header underneath.
      await page.$$eval('[data-sonner-toast] [data-close-button]', buttons => buttons.forEach(button => button.click()));
      await page.waitForFunction(() => !document.querySelector('[data-sonner-toast]:not([data-removed="true"])'));
      const metrics = await page.evaluate(() => {
        const header = document.querySelector('.public-commerce-header');
        const brand = header.querySelector('.public-commerce-header__brand').getBoundingClientRect();
        const actions = header.querySelector(innerWidth < 640 ? '.public-commerce-header__cart-slot' : '.public-commerce-header__actions').getBoundingClientRect();
        const hero = document.querySelector('[aria-roledescription="carousel"]').getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth > innerWidth, headerHeight: header.getBoundingClientRect().height, brandY: brand.y + brand.height / 2, actionsY: actions.y + actions.height / 2, heroBottom: hero.bottom };
      });
      assert.equal(metrics.overflow, false, `${width}px horizontal overflow`);
      if (width < 640) {
        assert.ok(metrics.headerHeight <= 160, JSON.stringify({ width, ...metrics }));
        assert.ok(Math.abs(metrics.brandY - metrics.actionsY) < 3, 'brand and actions share the same row');
        assert.ok(metrics.heroBottom < 780, 'hero controls remain reachable in the first viewport');
      }
      await page.screenshot({ path: `artifacts/mobile-layout/marketplace-${width}.png` });
      if (width < 640) {
        for (const slide of [1, 2, 3]) {
          await page.click(`[aria-label="Xem banner ${slide}"]`);
          const layout = await page.evaluate(() => {
            const visible = [...document.querySelectorAll('[aria-roledescription="slide"]')].filter(el => el.getBoundingClientRect().height > 0);
            const group = visible[0];
            const photo = group.querySelector('img').getBoundingClientRect();
            const content = group.querySelector('.pointer-events-none').getBoundingClientRect();
            const controls = document.querySelector('[aria-label="Banner trước"]').getBoundingClientRect();
            return { visible: visible.length, photoY: photo.top, textBottom: content.bottom, photoBottom: photo.bottom, controlsY: controls.top };
          });
          assert.equal(layout.visible, 1, 'only the selected slide is visible');
          assert.ok(layout.photoY >= layout.textBottom - 1, 'mobile photo never sits behind the text');
          assert.ok(layout.controlsY >= layout.photoBottom - 1, 'carousel controls never cover the photo');
          if (width === 344) await page.screenshot({ path: `artifacts/mobile-layout/banner-${slide}-344.png` });
        }
        const cdp = await page.createCDPSession();
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: width / 2, y: 400 }] });
        for (let y = 380; y >= 200; y -= 20) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: width / 2, y }] });
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForFunction(() => scrollY > 80, { timeout: 3000 });
        await cdp.detach();
      }
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
