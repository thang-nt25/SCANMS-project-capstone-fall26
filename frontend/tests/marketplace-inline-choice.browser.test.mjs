import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
test('centered modal keeps card size, resolves stock and fits desktop/mobile', { skip: !base, timeout: 60000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => { if (error.message !== 'WebSocket closed without opened.') errors.push(error.message); });
    await page.setRequestInterception(true);
    const variants = [
      { id: 'black-s', name: 'Đen, Size S', price: 200000, stockQuantity: 2, isActive: true },
      { id: 'black-m', name: 'Đen, Size M', price: 220000, stockQuantity: 0, isActive: true },
      { id: 'white-m', name: 'Trắng, Size M', price: 230000, stockQuantity: 5, isActive: true },
    ];
    const products = ['a', 'b'].map(id => ({ id, sku: id, title: `Áo ${id}`, price: 200000, originalPrice: 200000,
      imageUrl: '/assets/product-placeholder.svg', stockQuantity: 7, variants,
      store: { id: 'fixture-store', name: 'Cửa hàng' } }));
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,authorization,x-skip-cache' };
        return request.respond({ status: request.method() === 'OPTIONS' ? 204 : 200, headers,
          body: request.method() === 'OPTIONS' ? undefined : JSON.stringify({ success: true, data: url.pathname === '/api/public/products' ? products : [] }) });
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    for (const width of [1440, 390]) {
      await page.setViewport({ width, height: 1000 });
      await page.goto(`${origin}/marketplace`);
      await page.waitForSelector('#catalog-section article');
      const originalHeight = await page.$eval('#catalog-section article', el => el.getBoundingClientRect().height);
      await page.click('#catalog-section article button[title="Thêm vào giỏ"]');
      await page.waitForSelector('#catalog-section article dialog[open]');
      assert.ok(Math.abs(await page.$eval('#catalog-section article', el => el.getBoundingClientRect().height) - originalHeight) <= 10, 'opening the modal must not expand the product row');
      assert.equal(await page.$eval('#catalog-section article dialog', el => { const rect = el.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth; }), true);
      assert.ok(await page.$('dialog[open]'));
      const rect = await page.$eval('dialog[open]', el => { const r = el.getBoundingClientRect(); return { center: r.left + r.width / 2, width: document.documentElement.clientWidth }; });
      assert.ok(Math.abs(rect.center - rect.width / 2) <= 8, JSON.stringify(rect));
      await page.evaluate(() => [...document.querySelectorAll('#catalog-section article dialog button')].find(button => button.textContent.trim() === 'Đen').click());
      assert.equal(await page.$eval('#catalog-section article dialog', el => [...el.querySelectorAll('button')].find(button => button.textContent.trim() === 'M').disabled), true);
      await page.evaluate(() => [...document.querySelectorAll('#catalog-section article dialog button')].find(button => button.textContent.trim() === 'S').click());
      assert.match(await page.$eval('#catalog-section article dialog', el => el.textContent), /Còn 2 sản phẩm/);
      assert.equal(await page.$eval('#catalog-section article dialog', el => [...el.querySelectorAll('button')].find(button => button.textContent.includes('Thêm vào giỏ')).disabled), false);
      assert.equal(await page.$eval('#catalog-section article dialog', el => el.scrollWidth <= el.clientWidth), true);
      await page.screenshot({ path: `${process.env.TEMP}/scanms-inline-choice-${width}.png` });
      await page.keyboard.press('Escape');
      await page.evaluate(() => document.querySelectorAll('#catalog-section article button[title="Thêm vào giỏ"]')[1].click());
      await page.waitForFunction(() => document.querySelectorAll('#catalog-section article dialog').length === 1 && !document.querySelectorAll('#catalog-section article')[0].querySelector('dialog'));
      assert.equal(await page.$eval('body', el => el.style.overflow === 'hidden'), true);
      await page.click('#catalog-section article dialog button[aria-label="Đóng chọn phân loại"]');
      assert.equal(await page.$('#catalog-section article dialog'), null);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
