import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
const base = process.env.GHN_UI_TEST_URL;
const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
test('card upper whitespace opens detail; prices and independent controls keep their behavior', { skip: !base || !existsSync(executablePath), timeout: 25000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true, timeout: 10000, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(6000);
    page.setDefaultNavigationTimeout(10000);
    await page.setViewport({ width: 1200, height: 900 });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/src/main.tsx') return request.respond({ status: 200, contentType: 'application/javascript', body: "import '/tests/fixtures/product-card-click.tsx';" });
      if (url.origin !== origin || url.pathname.startsWith('/api/')) return request.abort();
      return request.continue();
    });
    await page.goto(origin + '/marketplace');
    await page.waitForSelector('.marketplace-product-card__details');
    const upper = await page.$eval('.marketplace-product-card__details', node => { const r = node.getBoundingClientRect(); return { x: r.left + 5, y: r.top + r.height - 5 }; });
    await page.mouse.move(upper.x, upper.y);
    await page.mouse.click(upper.x, upper.y);
    await page.waitForFunction(() => document.querySelector('#qa-route').textContent === '/products/QA-SERUM');
    await page.goBack();
    await page.waitForFunction(() => document.querySelector('#qa-route').textContent === '/marketplace');
    await page.click('button[aria-label="Lưu Serum kiểm thử"]');
    assert.equal(await page.$eval('button[aria-label="Bỏ lưu Serum kiểm thử"]', el => el.getAttribute('aria-pressed')), 'true');
    await page.click('.marketplace-product-card__purchase strong');
    assert.equal(await page.$eval('#qa-route', el => el.textContent), '/marketplace');
    await page.click('button[title="Thêm vào giỏ"]');
    assert.equal(await page.$eval('#qa-action', el => el.textContent), 'cart');
    await page.click('.marketplace-product-card__purchase button:last-child');
    assert.equal(await page.$eval('#qa-action', el => el.textContent), 'buy');
    assert.equal(await page.$eval('#qa-route', el => el.textContent), '/marketplace');
    await page.click('a[href="/shops/qa-shop"]');
    await page.waitForFunction(() => document.querySelector('#qa-route').textContent === '/shops/qa-shop');
    await page.goBack();
    await page.focus('a[aria-label="Xem chi tiết Serum kiểm thử"]');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#qa-route').textContent === '/products/QA-SERUM');
  } finally { await browser.close(); }
});
