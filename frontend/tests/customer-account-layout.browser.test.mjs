import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = process.env.GHN_UI_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

test('customer account aligns fields, resets edits and keeps security help expanded', {
  skip: !base || !existsSync(executablePath), timeout: 30000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(6000);
    const errors = [], writes = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('token', 'qa-address-no-server-access');
      localStorage.setItem('user', JSON.stringify({ id: 'qa-customer', fullName: 'Khách kiểm thử', role: 'CUSTOMER' }));
      localStorage.setItem('scanms_analytics_consent', 'denied');
    });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      const respond = data => request.respond({ status: 200, contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] || 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' }, body: JSON.stringify(data) });
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.hostname === 'provinces.open-api.vn') return respond([{ code: 79, name: 'Thành phố Hồ Chí Minh', districts: [{ code: 769, name: 'Thành phố Thủ Đức', wards: [{ code: 1, name: 'Phường Phước Long B' }] }] }]);
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        if (!['GET', 'OPTIONS'].includes(request.method())) writes.push(url.pathname);
        const user = { email: 'customer@example.com', phoneNumber: '0900000000', avatarUrl: '/assets/product-placeholder.svg', id: 'qa-customer', fullName: 'Khách kiểm thử', role: 'CUSTOMER' };
        let data = [];
        if (url.pathname === '/api/auth/me') data = user;
        if (url.pathname === '/api/customer/profile') data = { user, stats: {} };
        if (url.pathname === '/api/customer/orders') data = { orders: [], total: 0 };
        if (url.pathname === '/api/customer/cart') data = { items: [] };
        if (url.pathname === '/api/customer/addresses') data = [{ id: 'qa-address', fullName: 'Khách kiểm thử', phoneNumber: '0900000000', provinceCode: '79', provinceName: 'Thành phố Hồ Chí Minh', districtCode: '769', districtName: 'Thành phố Thủ Đức', wardCode: '1', wardName: 'Phường Phước Long B', detailAddress: 'Địa chỉ kiểm thử', latitude: 10.8231, longitude: 106.6297, isDefault: true }];
        if (url.pathname.includes('/notifications/unread')) data = { unreadCount: 0, categoryUnreadCounts: {} };
        if (url.pathname === '/api/notifications') data = { notifications: [], total: 0 };
        return respond({ success: true, data });
      }
      if (url.hostname.includes('tile.openstreetmap')) return request.respond({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=', 'base64') });
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    for (const width of [1440, 390]) {
      await page.setViewport({ width, height: 1000 });
      await page.goto(`${origin}/customer/profile?sub=info`);
      await page.waitForSelector('#customer-profile-name');
      await page.waitForFunction(() => document.querySelector('#customer-profile-name').value.length > 0);
      assert.ok(await page.$('.customer-profile-form img'));
      const layout = await page.$eval('.customer-profile-form', form => {
        const name = form.querySelector('#customer-profile-name').getBoundingClientRect();
        const phone = form.querySelector('.customer-profile-readonly').getBoundingClientRect();
        return { height: name.height, phoneHeight: phone.height, aligned: Math.abs(name.top - phone.top) < 2 };
      });
      assert.equal(layout.height, 46);
      assert.equal(layout.phoneHeight, 46);
      if (width === 1440) assert.equal(layout.aligned, true);
      assert.equal(await page.$eval('.customer-profile-form button[type=submit]', el => el.disabled), true);
      const original = await page.$eval('#customer-profile-name', el => el.value);
      await page.type('#customer-profile-name', ' updated');
      assert.equal(await page.$eval('.customer-profile-form button[type=submit]', el => el.disabled), false);
      await page.evaluate(() => [...document.querySelectorAll('.customer-profile-form button')].find(button => button.textContent === 'Hủy thay đổi').click());
      assert.equal(await page.$eval('#customer-profile-name', el => el.value), original);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: join(tmpdir(), `scanms-customer-profile-${width}.png`) });
      await page.goto(`${origin}/customer/profile?sub=addresses`);
      await page.waitForSelector('.customer-address-card');
      assert.equal(await page.$eval('.customer-address-card', el => el.getBoundingClientRect().width > el.parentElement.getBoundingClientRect().width * .95), true);
      await page.screenshot({ path: join(tmpdir(), `scanms-customer-addresses-${width}.png`) });
      await page.goto(`${origin}/customer/profile?sub=security`);
      await page.waitForSelector('.customer-account-help');
      assert.equal(await page.$('.customer-account-help details'), null);
      assert.match(await page.$eval('.customer-account-help', el => el.innerText), /Xác nhận bạn là chủ tài khoản/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: join(tmpdir(), `scanms-customer-security-${width}.png`) });
      await page.click('.customer-account-methods button:nth-child(2)');
      await page.waitForSelector('#customer-security-current');
    }
    assert.deepEqual(writes, []);
    assert.deepEqual(errors.filter(error => error !== 'WebSocket closed without opened.'), []);
  } finally { await browser.close(); }
});
