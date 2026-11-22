import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
test('search uses homepage width, four desktop columns and aligned cards', { skip: !base, timeout: 60000 }, async () => {
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
    const products = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(id => ({ id, sku: id, title: id === 'b' ? 'Long product title covering two lines for alignment' : `Product ${id}`, price: 200000, originalPrice: 200000,
      imageUrl: '/assets/product-placeholder.svg', stockQuantity: 7, variants,
      store: { id: 'fixture-store', name: 'Cửa hàng' } }));
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,authorization,x-skip-cache' };
        return request.respond({ status: request.method() === 'OPTIONS' ? 204 : 200, headers,
          body: request.method() === 'OPTIONS' ? undefined : JSON.stringify({ success: true, data: url.pathname === '/api/public/products' ? products : url.pathname.endsWith('/categories') ? Array.from({length: 7}, (_, i) => ({name: `Category ${i}`, count: 1})) : url.pathname.endsWith('/stores') ? Array.from({length: 6}, (_, i) => ({id: `store-${i}`, name: `Store ${i} with a longer name`, slug: `store-${i}`})) : [] }) });
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    for (const width of [1440, 390]) {
      await page.setViewport({ width, height: 1000 });
      await page.goto(`${origin}/search`);
      await page.waitForSelector('main article');
      const layout = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('main article')];
        const grid = cards[0].parentElement.parentElement;
        return { columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
          overflow: document.documentElement.scrollWidth > innerWidth,
          heights: cards.map(c => c.getBoundingClientRect().height),
          mainWidth: document.querySelector('main').getBoundingClientRect().width,
          sort: [...document.querySelectorAll('.search-sort-options > button, .search-sort-options > div > button')].map(b => ({width:b.getBoundingClientRect().width, height:b.getBoundingClientRect().height, y:b.getBoundingClientRect().y})),
          sidebar: document.querySelector('#search-filter-sidebar').getBoundingClientRect().width,
          choices: document.querySelectorAll('#search-filter-sidebar .search-filter-choice').length,
          filterBottom: document.querySelector('#search-filter-sidebar').getBoundingClientRect().bottom };
      });
      assert.equal(layout.overflow, false);
      assert.equal(layout.choices, 15);
      assert.equal(layout.sort.length, 4);
      assert.ok(layout.sort.every(b => b.height === 40));
      assert.ok(Math.max(...layout.sort.map(b => b.width)) - Math.min(...layout.sort.map(b => b.width)) < 1);
      assert.equal(new Set(layout.sort.map(b => b.y)).size, width === 390 ? 2 : 1);
      assert.ok(Math.max(...layout.heights) - Math.min(...layout.heights) < 2, JSON.stringify(layout));
      if (width === 1440) {
        assert.equal(layout.columns, 4); assert.equal(layout.mainWidth, 1248);
        assert.equal(layout.sidebar, 260); assert.ok(layout.filterBottom <= 1000);
        await page.click('#search-filter-sidebar .search-status-choice input');
        await page.waitForFunction(() => new URL(location.href).searchParams.get('discount') === 'true');
        await page.click('#search-filter-sidebar .search-status-choice input');
        await page.evaluate(() => window.scrollTo(0,0));
      }
      await page.click('[aria-controls="price-sort-options"]');
      await page.waitForSelector('#price-sort-options button');
      await page.click('#price-sort-options button');
      await page.waitForFunction(() => new URL(location.href).searchParams.get('sort') === 'price_asc');
      await page.screenshot({ path: `${process.env.TEMP}/scanms-search-layout-${width}.png` });
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
