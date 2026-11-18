import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = process.env.GHN_UI_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

test('order actions form one equal-width row and preserve return and review eligibility', {
  skip: !base || !existsSync(executablePath), timeout: 30000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(6000);
    const errors = [], writes = [];
    // The isolated fixture blocks Vite's development HMR socket.
    page.on('pageerror', error => { if (error.message !== 'WebSocket closed without opened.') errors.push(error.message); });
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
        const user = { id: 'qa-customer', fullName: 'Khách kiểm thử', role: 'CUSTOMER' };
        let data = [];
        if (url.pathname === '/api/auth/me') data = user;
        if (url.pathname === '/api/customer/profile') data = { user, stats: {} };
        if (url.pathname === '/api/customer/orders') data = { total: 2, orders: [0,1].map(index => ({ id: `order-${index}`, externalOrderSn: `DH-${index}`, status: 'COMPLETED', createdAt: new Date(Date.now() - index * 86400000).toISOString(), deliveredAt: new Date(Date.now() - (index ? 20 : 1) * 86400000).toISOString(), finalAmount: 200000, subtotalAmount: 200000, shippingFee: 0, storeId: 'shop', store: { id: 'shop', name: 'Shop' }, productReviews: index ? [{productId:'p'}] : [], orderItems: [{id:'item', productId:'p', quantity:1, unitPrice:200000, product:{id:'p', title:'Product'}}] })) };
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
    for (const width of [1440,390]) {
      await page.setViewport({width, height:1000});
      await page.goto(`${origin}/customer/orders`);
      await page.waitForSelector('.customer-order-actions');
      const groups = await page.$$eval('.customer-order-actions', groups => groups.map(group => ({text:group.textContent, children:[...group.children].map(el=>{ const r=el.getBoundingClientRect(); return {width:r.width, height:r.height, top:r.top}; })})));
      assert.equal(groups[0].children.length,4);
      assert.equal(groups[0].children[0].top,groups[0].children[1].top);
      assert.equal(groups[0].children[2].top,groups[0].children[3].top);
      assert.equal(groups[0].children[2].top,groups[0].children[0].top);
      assert.ok(groups[0].children.every(r=>r.height===42));
      assert.ok(Math.max(...groups[0].children.map(r=>r.width))-Math.min(...groups[0].children.map(r=>r.width))<1);
      assert.equal(groups[1].children.length,3);
      assert.ok(Math.abs(groups[1].children[2].width-groups[1].children[0].width)<1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:join(tmpdir(),`scanms-order-actions-${width}.png`)});
    }
    assert.deepEqual(writes,[]);
  } finally {await browser.close();}
});
