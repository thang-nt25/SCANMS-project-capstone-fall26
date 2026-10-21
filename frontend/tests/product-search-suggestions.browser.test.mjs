import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
test('public search suggests real products with debounce, keyboard, mobile, empty/error states and stale-request cancellation', {
  skip: !base || !existsSync(executablePath), timeout: 40000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const suggestion = { id: '00000000-0000-4000-8000-000000000001', sku: 'QA-SERUM', title: 'Serum Vitamin C Sora Skin',
    storeName: 'Sora Skin', price: 250000, imageUrl: '/scanms-placeholder.svg', hasVariants: true, inStock: true };
  let hold = false, release;
  const queries = [], errors = [], queryTimes = [], catalogQueries = [];
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(8000);
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1000 });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] || 'content-type,authorization', 'Access-Control-Allow-Methods': 'GET,OPTIONS' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        const respond = (data, status = 200) => request.respond({ status, headers, contentType: 'application/json', body: JSON.stringify({ data }) });
        if (request.method() !== 'GET') return respond({});
        if (url.pathname === '/api/public/products/suggestions') {
          const query = url.searchParams.get('search'); queries.push(query); queryTimes.push(Date.now());
          if (hold && query === 'serum') { release = () => respond([suggestion]).catch(() => {}); return; }
          if (query === 'error') return respond({ message: 'unavailable' }, 503);
          if (query === 'kem') return respond([{ ...suggestion, sku: 'QA-CREAM', title: 'Kem dưỡng cấp ẩm' }]);
          if (['trị mụn', 'tri mun'].includes(query)) return respond([{ ...suggestion, matchKind: 'related' }]);
          return respond(['serum', 'mỹ phẩm', 'my pham'].includes(query) ? [suggestion] : query === 'cleanser' ? [{ ...suggestion, sku: 'QA-CLEAN', title: 'Cleanser dịu nhẹ', hasVariants: false }] : []);
        }
        if (url.pathname === '/api/public/products' && url.searchParams.has('search')) {
          const query = url.searchParams.get('search'); catalogQueries.push(query);
          const items = ['serum', 'mỹ phẩm', 'my pham', 'trị mụn', 'tri mun'].includes(query) ? [{ ...suggestion, categoryName: 'Chăm sóc da',
            matchKind: ['trị mụn', 'tri mun'].includes(query) ? 'related' : 'direct',
            store: { id: 'qa-shop', name: 'Sora Skin' }, stockQuantity: 10, variants: [] }] : [];
          return respond({ items, pagination: { total: items.length, page: 1, totalPages: 1 } });
        }
        if (url.pathname.endsWith('/landing')) return respond({ product: { ...suggestion, stockQuantity: 10, variants: [] }, store: { id: 'shop', name: 'Sora Skin' },
          images: [], videos: [], reviews: { totalReviews: 0, averageRating: 0, items: [], starDistribution: {} }, availability: { inStock: true, stockQuantity: 10 } });
        return respond([]);
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    const desktop = '.scanms-site-header > div:first-child input[role="combobox"]';
    const mobile = '.scanms-site-header > div:last-child input[role="combobox"]';
    const visit = async () => {
      await page.goto(origin + '/marketplace');
      await page.waitForSelector(page.viewport().width >= 1024 ? desktop : mobile, { visible: true });
    };
    const fill = async (selector, text) => { await page.click(selector); await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace'); await page.type(selector, text); };
    await visit();
    await page.waitForSelector(desktop);
    await page.type(desktop, 's');
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 350)));
    assert.deepEqual(queries, [], 'a single character does not call the API');
    const started = Date.now();
    await page.type(desktop, 'erum');
    await page.waitForSelector('.product-search-option');
    assert.deepEqual(queries, ['serum'], 'typing is debounced into one request');
    assert.ok(queryTimes[0] - started < 280, 'starts fetching promptly after typing instead of waiting 280ms');
    assert.match(await page.$eval('.product-search-popup', el => el.textContent), /Sora Skin/);
    assert.match(await page.$eval('.product-search-price', el => el.textContent), /250[.,]000/);
    assert.deepEqual(await page.$eval('.product-search-submit', el => {
      const style = getComputedStyle(el); return [style.width, style.height];
    }), ['52px', '36px'], 'desktop search sizing survives the Tailwind migration');
    assert.equal(await page.$eval('.product-search-popup', el => getComputedStyle(el).position), 'absolute');
    await page.keyboard.press('Escape');
    assert.equal(await page.$('.product-search-popup'), null);
    await page.click('body', { offset: { x: 5, y: 500 } });
    await page.click(desktop);
    await page.waitForSelector('.product-search-option');
    assert.deepEqual(queries, ['serum'], 'reopening the same query uses the short-lived cache');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.pathname === '/search' && new URLSearchParams(location.search).get('q') === 'serum');

    await visit();
    await page.type(desktop, 'serum'); await page.waitForSelector('.product-search-option');
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.$eval(desktop, el => el.getAttribute('aria-activedescendant')));
    assert.equal(await page.$eval('.product-search-option[aria-selected="true"]', el => getComputedStyle(el).backgroundColor), 'rgb(251, 245, 235)', 'keyboard selection remains visible');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.pathname === '/products/QA-SERUM');

    await visit();
    hold = true; await page.type(desktop, 'serum');
    await page.waitForFunction(() => document.querySelector('.product-search-status')?.textContent.includes('Đang tìm'));
    while (!release) await new Promise(resolve => setTimeout(resolve, 30));
    await fill(desktop, 'cleanser');
    await page.waitForFunction(() => document.querySelector('.product-search-title')?.textContent === 'Cleanser dịu nhẹ');
    await release();
    assert.equal(await page.$eval('.product-search-title', el => el.textContent), 'Cleanser dịu nhẹ');
    hold = false;

    await page.setViewport({ width: 390, height: 740 });
    await visit();
    await page.type(mobile, 'nothing');
    await page.waitForFunction(() => document.querySelector('.product-search-status')?.textContent.includes('Chưa có sản phẩm'));
    assert.ok(await page.$eval('.product-search-popup', el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }));
    assert.deepEqual(await page.$eval('.scanms-site-header > div:last-child .product-search-submit', el => {
      const style = getComputedStyle(el); return [style.width, style.height];
    }), ['40px', '32px'], 'mobile search keeps the compact button sizing');
    await fill(mobile, 'error');
    await page.waitForFunction(() => document.querySelector('.product-search-status')?.textContent.includes('Chưa tải được'));
    await fill(mobile, 'serum'); await page.waitForSelector('.product-search-option');
    await page.click('.product-search-option');
    await page.waitForFunction(() => location.pathname === '/products/QA-SERUM');
    await visit();
    await page.type(mobile, 'serum'); await page.waitForSelector('.product-search-option');
    await page.click('.scanms-site-header > div:last-child [aria-label="Xóa nội dung tìm kiếm"]');
    assert.equal(await page.$eval(mobile, el => el.value), '');
    assert.equal(await page.$('.product-search-popup'), null);
    await fill(mobile, 'mỹ phẩm');
    await page.waitForSelector('.product-search-option');
    assert.match(await page.$eval('.product-search-popup', el => el.textContent), /Serum Vitamin C/);
    await fill(mobile, 'my pham');
    await page.waitForFunction(() => document.querySelector('.product-search-all')?.textContent.includes('my pham') && document.querySelector('.product-search-option'));
    assert.match(await page.$eval('.product-search-popup', el => el.textContent), /Sora Skin/);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.pathname === '/search' && new URLSearchParams(location.search).get('q') === 'my pham');
    await page.waitForSelector('article a[href="/products/QA-SERUM"]');
    assert.ok(catalogQueries.includes('my pham'), 'submitted searches use the backend matcher');
    assert.ok(await page.$('button[aria-pressed="true"]'), 'relevance sorting is selected');
    assert.ok(await page.$$eval('[data-search-sort-bar] button', buttons => buttons.filter(button => button.getClientRects().length).every(button => {
      const rect = button.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth;
    })), 'mobile sorting controls fit the viewport');
    await fill(mobile, 'nothing'); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.body.textContent.includes('Không tìm thấy sản phẩm phù hợp với bộ lọc'));
    assert.equal(await page.$('article a[href="/products/QA-SERUM"]'), null, 'an empty new query clears old results');
    await fill(mobile, 'mỹ phẩm'); await page.keyboard.press('Enter');
    await page.waitForSelector('article a[href="/products/QA-SERUM"]');
    await fill(mobile, 'trị mụn'); await page.waitForSelector('.product-search-option');
    assert.match(await page.$eval('.product-search-heading', el => el.textContent), /Sản phẩm liên quan/);
    assert.match(await page.$eval('.product-search-status', el => el.textContent), /Xem công dụng/);
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-search-related-note]');
    assert.match(await page.$eval('[data-search-related-note]', el => el.textContent), /trị mụn/);
    await page.waitForSelector('article a[href="/products/QA-SERUM"]');
    // Real Chromium IME events: Vietnamese input may remain composing until
    // another click/space. Suggestions must be visible before committing it.
    const client = await page.createCDPSession();
    for (const width of [1440, 390]) {
      await page.setViewport({ width, height: 850 });
      await visit();
      const selector = width >= 1024 ? desktop : mobile;
      await page.click(selector);
      await client.send('Input.imeSetComposition', { text: 'kem', selectionStart: 3, selectionEnd: 3 });
      await page.waitForFunction(() => document.querySelector('.product-search-title')?.textContent === 'Kem dưỡng cấp ẩm');
      assert.equal(await page.$eval(selector, el => el === document.activeElement), true, 'suggestions open during typing without a second click');
      await client.send('Input.insertText', { text: 'kem' });
      await page.keyboard.press('Escape');
      assert.equal(await page.$('.product-search-popup'), null);
      await page.click(selector);
      await page.waitForSelector('.product-search-option');
      await page.click('body', { offset: { x: 5, y: 500 } });
      assert.equal(await page.$('.product-search-popup'), null, 'clicking outside still dismisses suggestions');
    }
    await client.detach();
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
