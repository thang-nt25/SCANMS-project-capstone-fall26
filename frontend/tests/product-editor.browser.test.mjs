import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const base = process.env.PRODUCT_EDITOR_TEST_URL;
const executablePath = process.env.PRODUCT_EDITOR_BROWSER;

test('product editor navigation, gallery limits, evidence, variants, stock and submission',
  { skip: !base || !executablePath, timeout: 90000 }, async () => {
    const browser = await puppeteer.launch({ executablePath, headless: true });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 1000 });
      const store = { id: '11111111-1111-4111-8111-111111111111', name: 'QA Shop',
        isVerified: true, onboardingStatus: 'VERIFIED', isActive: true };
      const user = { id: 'qa-owner', role: 'SHOP_MANAGER', fullName: 'QA Owner', stores: [store] };
      await page.evaluateOnNewDocument(({ user, store }) => {
        localStorage.setItem('token', 'qa-mocked-session');
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('current_store_id', store.id);
        localStorage.setItem('scanms-current-role', 'shop');
        localStorage.setItem('scanms-active-workspace', 'shop');
      }, { user, store });
      let uploads = 0;
      let failUploadAt = 0;
      let pauseNextUpload = false;
      let releaseUpload;
      let notifyUploadHeld;
      const uploadHeld = new Promise(resolve => { notifyUploadHeld = resolve; });
      const submissions = [];
      const updates = [];
      let product;
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setRequestInterception(true);
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io')) {
          const headers = { 'Access-Control-Allow-Origin': new URL(base).origin,
            'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'authorization,content-type,x-skip-cache',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS' };
          if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
          let data = { items: [], total: 0, count: 0, unreadCount: 0 };
          if (url.pathname.endsWith('/auth/me')) data = user;
          if (url.pathname.includes('/stores')) data = store;
          if (url.pathname.endsWith('/products') && request.method() === 'GET') data = { items: product ? [product] : [] };
          if (url.pathname.endsWith('/upload/image')) {
            uploads++;
            if (uploads === failUploadAt) return request.respond({ status: 500, headers,
              contentType: 'application/json', body: JSON.stringify({ message: 'QA upload failed' }) });
            data = { secureUrl: `https://qa.invalid/image-${uploads}.png` };
            if (pauseNextUpload) {
              pauseNextUpload = false;
              return new Promise(resolve => {
                releaseUpload = () => resolve(request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ data }) }));
                notifyUploadHeld();
              });
            }
          }
          if (url.pathname.endsWith('/products') && request.method() === 'POST') {
            submissions.push(JSON.parse(request.postData()));
            product = { ...submissions.at(-1), id: 'qa-product', originalPrice: 200000,
              variants: submissions.at(-1).variants.map((variant, index) => ({ ...variant, id: `qa-variant-${index}`, isActive: true })),
              mediaAssets: submissions.at(-1).subImages.map(urlOrContent => ({ urlOrContent })),
              isActive: false, moderationStatus: 'DRAFT' };
            data = { product: { id: 'qa-product' } };
          }
          if (request.method() === 'PUT' && url.pathname.startsWith('/api/products/')) {
            updates.push({ path: url.pathname, body: JSON.parse(request.postData()) });
            data = { product };
          }
          return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ data }) });
        }
        if (url.origin === new URL(base).origin) return request.continue();
        return request.abort();
      });
      await page.goto(`${base}/merchant/products?create=1`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#product-editor-form');
      const footerBounds = await page.$eval('.product-editor-form-footer', el => {
        const rect = el.getBoundingClientRect();
        const scroll = el.closest('.modal-scroll-body').scrollTop;
        return { top: rect.top + scroll, bottom: rect.bottom + scroll };
      });
      const closeTop = await page.$eval('.product-editor-fixed-close', el => el.getBoundingClientRect().top);
      const rows = await page.evaluate(() => {
        const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; };
        return [
          [rect('#product-section-basic'), rect('#product-section-media')],
          [rect('#product-section-pricing'), rect('.product-editor-partner-column')],
          [rect('#product-section-legal-evidence'), rect('.product-editor-variants-column')],
        ];
      });
      for (const [left, right] of rows) {
        assert.ok(Math.abs(left.top - right.top) < 2 && Math.abs(left.bottom - right.bottom) < 2, 'Paired cards must align');
      }
      const fieldPairs = await page.evaluate(() => {
        const pairs = [
          ['#product-section-pricing input[placeholder="VD: 280.000"]', '.product-editor-commission-summary'],
          ['#product-ean13', '.product-editor-affiliate-options'],
          ['.product-editor-shipping > div:first-child', '#product-section-legal-origin > div:first-child > div:first-child'],
          ['#product-section-shipping input', '#product-section-legal-origin input'],
        ];
        return pairs.map(pair => pair.map(selector => {
          const r = document.querySelector(selector).getBoundingClientRect();
          return { selector, top: r.top, bottom: r.bottom };
        }));
      });
      for (const [left, right] of fieldPairs) {
        assert.ok(Math.abs(left.top - right.top) < 1 && Math.abs(left.bottom - right.bottom) < 1,
          `Paired fields must align: ${JSON.stringify([left, right])}`);
      }
      const tabWidths = await page.$$eval('.product-editor-navigation button', buttons => buttons.map(button => button.getBoundingClientRect().width));
      assert.ok(Math.max(...tabWidths) - Math.min(...tabWidths) < 1, 'Desktop navigation tabs must have equal width');
      if (process.env.PRODUCT_EDITOR_SCREENSHOT_DIR) {
        const dir = process.env.PRODUCT_EDITOR_SCREENSHOT_DIR;
        await mkdir(dir, { recursive: true });
        await page.screenshot({ path: join(dir, 'product-editor-desktop.png') });
        for (const section of ['pricing', 'legal-origin', 'variants']) {
          await page.$eval(`#product-section-${section}`, el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await page.screenshot({ path: join(dir, `product-editor-${section}.png`) });
        }
        await page.setViewport({ width: 390, height: 844 });
        await page.$eval('#product-editor-form', el => { el.parentElement.scrollTop = 0; });
        await page.screenshot({ path: join(dir, 'product-editor-mobile.png') });
        assert.equal(await page.$eval('.product-editor-modal', el => el.scrollWidth <= el.clientWidth), true, 'Mobile modal must not overflow horizontally');
        await page.setViewport({ width: 1440, height: 1000 });
        await page.$eval('#product-editor-form', el => { el.parentElement.scrollTop = 0; });
      }
      const clickText = async (selector, text) => {
        const found = await page.evaluate((selector, text) => {
          const el = [...document.querySelectorAll(selector)].find(el => el.textContent.includes(text));
          if (!el) return false;
          el.click(); return true;
        }, selector, text);
        assert.equal(found, true, `Button ${text} exists`);
      };
      const fill = async (selector, value) => {
        await page.$eval(selector, (el, value) => {
          const prototype = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(prototype, 'value').set.call(el, String(value));
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }, value);
      };
      await clickText('#product-section-variants button', 'Thêm phân loại mới');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'form-category-select-trigger');
      for (let i = 0; i < 7; i++) {
        const id = await page.$eval(`.product-editor-navigation button:nth-child(${i + 1})`, el => {
          el.click();
          return ['basic', 'media', 'pricing', 'affiliate', 'legal-origin', 'legal-evidence', 'variants'][Number(el.textContent.trim()[0]) - 1];
        });
        await page.waitForFunction(id => {
          const form = document.querySelector('#product-editor-form');
          const target = document.querySelector(`#product-section-${id}`);
          const viewport = form.parentElement.getBoundingClientRect();
          const rect = target.getBoundingClientRect();
          return rect.top >= viewport.top - 2 && rect.top < viewport.bottom;
        }, {}, id);
        assert.deepEqual(await page.$eval('.product-editor-form-footer', el => {
          const rect = el.getBoundingClientRect(); const scroll = el.closest('.modal-scroll-body').scrollTop;
        return { top: rect.top + scroll, bottom: rect.bottom + scroll };
        }), footerBounds, 'Footer stays at the end of the form and scrolls with content');
        assert.equal(await page.$eval('.product-editor-fixed-close', el => el.getBoundingClientRect().top), closeTop, 'Close stays visible while content scrolls');
      }
      await page.$eval('#product-editor-form', el => { el.parentElement.scrollTop = 150; });
      await page.waitForFunction(() => ['1', '2'].includes(document.querySelector('.product-editor-navigation [aria-current]').textContent.trim()[0]));
      assert.equal(await page.$eval('#product-section-basic', el => el.getBoundingClientRect().bottom > el.closest('form').parentElement.getBoundingClientRect().top), true);
      await page.$eval('button[form="product-editor-form"]', el => el.click());
      await page.waitForSelector('#product-save-error');
      await page.waitForFunction(() => {
        const error = document.querySelector('#product-save-error').getBoundingClientRect();
        const body = document.querySelector('#product-editor-form').parentElement.getBoundingClientRect();
        return error.top >= body.top && error.top < body.bottom;
      });
      assert.equal(submissions.length, 0, 'Incomplete submission must show its error without sending data');
      await page.$eval('#form-category-select-trigger', el => el.click());
      await clickText('[role="option"]', 'Mỹ phẩm & Chăm sóc da');
      await fill('#product-section-basic input[placeholder^="VD: Serum"]', 'QA Serum');
      await fill('#product-section-basic textarea', 'Mô tả serum kiểm tra đầy đủ.');
      await fill('#product-section-pricing input[placeholder="VD: 280.000"]', 150000);
      await fill('#product-ean13', '4006381333931');
      const packageInputs = await page.$$('#product-section-shipping input');
      for (let i = 0; i < packageInputs.length; i++) {
        await packageInputs[i].evaluate((el, value) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value));
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }, [500, 20, 10, 10][i]);
      }
      await fill('#product-section-legal-origin input', 'Việt Nam');
      await fill('#product-section-legal-origin input[placeholder^="VD: Nước"]', 'Panthenol');
      await fill('#product-section-legal-evidence input[type="text"]', 'Dùng ngoài da.');
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jPioAAAAASUVORK5CYII=', 'base64');
      const upload = async (selector, count = 1, waitForFinish = true) => {
        await page.$eval(selector, (el, { png, count }) => {
          const transfer = new DataTransfer();
          for (let i = 0; i < count; i++) transfer.items.add(new File([new Uint8Array(png)], `qa-${i}.png`, { type: 'image/png' }));
          el.files = transfer.files; el.dispatchEvent(new Event('change', { bubbles: true }));
        }, { png: [...png], count });
        if (waitForFinish) await page.waitForFunction(() => !document.querySelector('button[form="product-editor-form"]').disabled);
      };
      failUploadAt = 2;
      pauseNextUpload = true;
      await upload('#bulk-images-input', 3, false);
      await uploadHeld;
      assert.equal(await page.$eval('#product-editor-form fieldset', el => el.disabled), true, 'Do not allow changing SKU/image targets during upload');
      await page.$eval('.product-editor-modal button[aria-label="Đóng cửa sổ"]', el => el.click());
      assert.ok(await page.$('#product-editor-form'), 'Keep the form open until upload completes');
      releaseUpload();
      await page.waitForFunction(() => !document.querySelector('button[form="product-editor-form"]').disabled);
      assert.equal(await page.$eval('#product-section-media img', el => el.src), 'https://qa.invalid/image-1.png');
      failUploadAt = 0;
      await upload('#bulk-images-input', 6);
      assert.equal(await page.$$eval('#product-section-media img', els => els.length), 5);
      assert.equal(await page.$eval('button', () => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Thêm ảnh').disabled), true);
      const previousCover = await page.$eval('#product-section-media img', el => el.src);
      const nextCover = await page.$eval('#product-section-media img[alt="Ảnh phụ 1"]', el => el.src);
      await page.$eval('#product-section-media button[title="Đặt làm ảnh chính"]', el => el.click());
      assert.equal(await page.$eval('#product-section-media img', el => el.src), nextCover);
      assert.equal(await page.$eval('#product-section-media img[alt="Ảnh phụ 1"]', el => el.src), previousCover);
      await upload('#origin-proof-images');
      await upload('#label-proof-images');
      for (const section of ['legal-origin', 'legal-evidence']) {
        assert.match(await page.$eval(`#product-section-${section} a[aria-label="Mở ảnh minh chứng 1"]`, el => el.href), /^https:\/\/qa\.invalid\/image-\d+\.png$/);
        await page.$eval(`#product-section-${section} button[aria-label="Xóa ảnh minh chứng"]`, el => el.click());
        assert.equal(await page.$$eval(`#product-section-${section} a[aria-label="Mở ảnh minh chứng 1"]`, els => els.length), 0);
      }
      await upload('#origin-proof-images');
      await upload('#label-proof-images');
      const combinationInputs = await page.$$('#product-section-variants label input');
      for (let i = 0; i < 3; i++) {
        await combinationInputs[i].evaluate((el, value) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }, ['30 ml, 50 ml', 'Serum', 'Chai'][i]);
      }
      await clickText('#product-section-variants button', 'Tạo tổ hợp SKU tự động');
      assert.equal(await page.$$eval('[id^="variant-card-"]', els => els.length), 2);
      await clickText('#product-section-variants button', 'Tạo tổ hợp SKU tự động');
      assert.equal(await page.$$eval('[id^="variant-card-"]', els => els.length), 2, 'Generating identical combinations must not duplicate SKUs');
      await page.$eval('#variant-card-1 button[title="Xóa phân loại này"]', el => el.click());
      await page.$eval('#variant-card-0 button[title="Xóa phân loại này"]', el => el.click());
      await clickText('#product-section-variants button', 'Thêm phân loại mới');
      const attrs = await page.$$('#variant-card-0 label input');
      for (let i = 0; i < 3; i++) {
        await attrs[i].evaluate((el, value) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }, ['30 ml', 'Serum', 'Chai'][i]);
      }
      await fill('#variant-card-0 label:last-child input', 7);
      await upload('#variant-image-input-0');
      assert.equal(await page.$eval('#product-section-pricing input[placeholder="VD: 100"]', el => el.value), '7');
      assert.equal(await page.$eval('#product-section-pricing input[placeholder="VD: 100"]', el => el.readOnly), true);
      await page.$eval('button[form="product-editor-form"]', el => el.click());
      await page.waitForFunction(() => !document.querySelector('#product-editor-form'));
      assert.equal(submissions.length, 1);
      assert.equal(submissions[0].stockQuantity, 7);
      assert.equal(submissions[0].variants[0].stockQuantity, 7);
      assert.equal(submissions[0].subImages.length, 4);
      assert.equal(submissions[0].customCommissionRate, 10);
      await page.waitForSelector('button[title="Chỉnh sửa sản phẩm"]');
      await page.$eval('button[title="Chỉnh sửa sản phẩm"]', el => el.click());
      assert.equal(await page.$eval('#product-section-basic input[placeholder="VD: SKIN-A109"]', el => el.readOnly), true);
      await fill('#product-section-pricing input[placeholder="VD: 350.000"]', '');
      await fill('#variant-card-0 label:last-child input', 1.5);
      await page.$eval('button[form="product-editor-form"]', el => el.click());
      assert.equal(updates.length, 0, 'Invalid variant stock must not trigger a partial product update');
      await fill('#variant-card-0 label:last-child input', 8);
      await page.$eval('button[form="product-editor-form"]', el => el.click());
      await page.waitForFunction(() => !document.querySelector('#product-editor-form'));
      assert.equal(updates[0].body.originalPrice, null, 'Clearing original price is persisted');
      assert.equal(updates[0].body.stockQuantity, 8);
      assert.equal(updates.length, 1, 'Product and variants must be saved through one request');
      assert.equal(updates[0].path, '/api/products/qa-product/editor');
      assert.equal(updates[0].body.variants[0].stockQuantity, 8);
      await page.goto(`${base}/merchant/products?create=1`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#product-editor-form');
      await page.$eval('#form-category-select-trigger', el => el.click());
      await clickText('[role="option"]', 'Thiết bị điện tử & Phụ kiện');
      await fill('#product-section-basic input[placeholder^="VD: Serum"]', 'Tai nghe một loại');
      await fill('#product-section-basic textarea', 'Tai nghe có dây.');
      await fill('#product-section-pricing input[placeholder="VD: 280.000"]', 100000);
      await fill('#product-section-pricing input[placeholder="VD: 100"]', 9);
      const singlePackage = await page.$$('#product-section-shipping input');
      for (let i = 0; i < singlePackage.length; i++) {
        await singlePackage[i].evaluate((el, value) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value));
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }, [500, 20, 10, 10][i]);
      }
      await fill('#product-section-legal-origin input', 'Việt Nam');
      assert.equal(await page.$eval('#product-section-legal-origin input[placeholder^="VD: Nhựa"]', el => el.required), false);
      await fill('#product-section-legal-evidence input[type="text"]', 'Hướng dẫn bảo quản.');
      await upload('#origin-proof-images');
      await upload('#label-proof-images');
      await upload('#main-image-input');
      assert.equal(await page.$eval('#product-ean13', el => el.value), '', 'Single-product barcode should be empty');
      await page.$eval('button[form="product-editor-form"]', el => el.click());
      await page.waitForFunction(() => !document.querySelector('#product-editor-form') || document.querySelector('#product-save-error'));
      assert.equal(await page.$eval('body', () => document.querySelector('#product-save-error')?.textContent || ''), '', 'Single-product form must save successfully');
      await page.waitForFunction(() => !document.querySelector('#product-editor-form'));
      assert.equal(submissions.length, 2);
      assert.deepEqual(submissions[1].variants, []);
      assert.equal(submissions[1].stockQuantity, 9);
      assert.equal(submissions[1].barcode, undefined);
      assert.equal(submissions[1].ingredients, undefined);
      assert.equal(errors.length, 0, errors.join('\n'));
    } finally { await browser.close(); }
  });
