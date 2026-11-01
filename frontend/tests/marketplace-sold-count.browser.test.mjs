import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = process.env.GHN_UI_BROWSER_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

test('product cards show API units sold, including zero and large counts, without mobile overflow', {
  skip: !base || !existsSync(executablePath), timeout: 60000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const examples = [
    { soldCount: 61, label: 'Đã bán 61' },
    { soldCount: 0, label: 'Đã bán 0' },
    { soldCount: 12345, label: 'Đã bán 12.345' },
    { label: 'Đã bán 0' },
    { soldCount: null, label: 'Đã bán 0' },
    { soldCount: -5, label: 'Đã bán 0' },
    { soldCount: 'invalid', label: 'Đã bán 0' },
  ];
  const products = examples.map((example, index) => ({
    id: `sold-product-${index}`, sku: `SOLD-${index}`, title: `Sản phẩm ${index}`,
    price: 220000, originalPrice: 250000, stockQuantity: index === 1 ? 0 : 20,
    imageUrl: '/assets/product-placeholder.svg', variants: [],
    store: { id: 'sold-store', name: 'Gian hàng kiểm thử' },
    // Exercise the commission badge alongside the new sold-count row.
    customCommissionRate: index === 2 ? 10 : undefined,
    soldCount: example.soldCount,
  }));

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = {
          'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'content-type,authorization,x-skip-cache',
        };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        const data = url.pathname === '/api/public/products'
          ? { items: products, pagination: { totalPages: 1 } } : [];
        // Isolate fixtures to this browser: never write to the shared database.
        return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });

    for (const route of ['/marketplace', '/search']) {
      await page.goto(`${origin}${route}`);
      const cards = route === '/marketplace' ? '#catalog-section article' : 'main article';
      await page.waitForFunction((selector, count) => (
        document.querySelectorAll(`${selector} [data-product-sold-count]`).length === count
      ), {}, cards, examples.length);

      for (const width of [1440, 390, 320]) {
        await page.setViewport({ width, height: 1000 });
        const rendered = await page.$$eval(cards, elements => elements.map(card => ({
          title: card.querySelector('h3').textContent,
          sold: card.querySelector('[data-product-sold-count]').textContent.trim(),
          fits: card.scrollWidth <= card.clientWidth,
          buyDisabled: [...card.querySelectorAll('button')]
            .find(button => /Mua ngay|Hết hàng/.test(button.textContent))?.disabled,
        })));
        assert.equal(rendered.length, products.length);
        for (const [index, example] of examples.entries()) {
          const card = rendered.find(item => item.title === products[index].title);
          assert.equal(card?.sold, example.label, `${route}, ${width}px, ${products[index].title}`);
          assert.equal(card.fits, true, 'the additional count must not overflow its card');
          assert.equal(card.buyDisabled, index === 1, 'availability remains independent of sales');
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      }
      assert.ok(await page.$$eval(cards, elements => elements.some(card => card.textContent.includes('Thù lao tiếp thị: 10%'))));
    }
    assert.deepEqual(errors, []);
    await page.goto(`${origin}/marketplace`);
    await page.waitForSelector('#catalog-section [data-product-sold-count]');
    await (await page.$('#catalog-section article')).screenshot({ path: join(tmpdir(), 'scanms-product-sold-count-mobile.png') });
  } finally {
    await browser.close();
  }
});
