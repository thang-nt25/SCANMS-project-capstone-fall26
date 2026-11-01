import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
test('account and notifications support hover, click, Escape and touch without account frame or chevron', { skip: !base, timeout: 60000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(7000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let user = null;
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/@vite/client') return request.respond({ status: 200, contentType: 'application/javascript', body: 'export const createHotContext=()=>({accept(){},acceptExports(){},prune(){},dispose(){},invalidate(){},on(){},off(){},send(){},data:{}});export const injectQuery=x=>x;const styles=new Map();export function updateStyle(id,css){let e=styles.get(id);if(!e){e=document.createElement("style");styles.set(id,e);document.head.append(e)}e.textContent=css}export function removeStyle(id){styles.get(id)?.remove();styles.delete(id)}' });
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'content-type,authorization,x-skip-cache', 'Access-Control-Allow-Credentials': 'true' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        let data = [];
        if (url.pathname === '/api/auth/me') data = user;
        if (url.pathname === '/api/customer/cart') data = { items: [], syncedAt: new Date().toISOString() };
        if (url.pathname === '/api/notifications/unread-count') data = { unreadCount: 1 };
        if (url.pathname === '/api/notifications') data = { items: [{ id: 'qa-notice', userId: user?.id, title: 'Thông báo kiểm thử', message: 'Nội dung kiểm thử hiển thị', type: 'SYSTEM', isRead: false, createdAt: new Date().toISOString() }], total: 1, unreadCount: 1 };
        return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    const trigger = '.header-account-trigger';
    const menu = '#public-account-menu';
    const bell = 'button[aria-controls="scanms-notification-panel"]';
    const panel = '#scanms-notification-panel';
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(origin + '/cart');
    for (const role of ['CUSTOMER', 'COLLABORATOR', 'SHOP_MANAGER', 'SYSTEM_MANAGER', 'SYSTEM_ADMIN']) {
      user = { id: 'qa-hover-' + role, role, fullName: 'Tài khoản kiểm thử', email: 'qa@example.test' };
      await page.evaluate(user => { localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('token', 'qa-hover-only'); localStorage.setItem('scanms_chat_sound', 'off'); }, user);
      await page.reload();
      await page.waitForSelector(trigger);
      assert.equal(await page.$eval(trigger, el => getComputedStyle(el).borderTopWidth), '0px');
      assert.equal(await page.$(`${trigger} > svg`), null, 'no account chevron');
      await page.hover(trigger);
      await page.waitForSelector(menu);
      await page.hover(`${menu} nav a`);
      await new Promise(resolve => setTimeout(resolve, 240));
      assert.ok(await page.$(menu), role + ': menu remains open while pointer is over links');
      await page.mouse.move(15, 500);
      await page.waitForSelector(menu, { hidden: true });
      await page.click(trigger);
      await page.waitForSelector(menu);
      await page.keyboard.press('Escape');
      await page.waitForSelector(menu, { hidden: true });
    }
    await page.hover(bell);
    await page.waitForSelector(`${panel} [data-notification-id="qa-notice"]`);
    assert.equal(await page.evaluate(() => document.querySelector('#scanms-notification-panel') === document.activeElement), false, 'hover does not steal keyboard focus');
    await page.hover(`${panel} header`);
    await new Promise(resolve => setTimeout(resolve, 240));
    assert.ok(await page.$(panel), 'portal remains open across the trigger gap');
    await page.mouse.move(15, 500);
    await page.waitForSelector(panel, { hidden: true });
    await page.click(bell);
    await page.waitForSelector(panel);
    await page.keyboard.press('Escape');
    await page.waitForSelector(panel, { hidden: true });
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.reload();
    await page.waitForSelector(trigger);
    await page.tap(trigger);
    await page.waitForSelector(menu);
    await page.tap(trigger);
    await page.waitForSelector(menu, { hidden: true });
    await page.tap(bell);
    await page.waitForSelector(panel);
    await page.tap(bell);
    await page.waitForSelector(panel, { hidden: true });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
