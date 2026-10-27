import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const base = process.env.WITHDRAWAL_UI_TEST_URL;
const executablePath = process.env.WITHDRAWAL_UI_BROWSER_PATH;

test('manual order controls, coupon invalidation, stock, map, duplicate submit and successful close', {
  skip: !base || !executablePath,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    await page.setCacheEnabled(false);
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: () => { throw new Error('Manual customer orders must not request the merchant device location'); } } });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.qaCopied = text; } } });
    });
    const errors = [], submitted = [], quotes = [];
    let failSubmission = true;
    let failShipping = true;
    let paid = false;
    let created = false;
    let emptyPrimarySearch = false;
    let alternateSearches = 0;
    const customerStatusRequests = [];
    const paymentRequests = [];
    const shippingRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => void (async () => {
      const url = new URL(request.url());
      const headers = {
        'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'authorization,content-type,x-skip-cache',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      };
      if (url.pathname === '/src/main.tsx') return request.respond({ status: 200, contentType: 'application/javascript', body: "import '/tests/fixtures/manual-order-audit.tsx';" });
      if (url.hostname === 'provinces.open-api.vn') return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify([
        { code: 1, name: 'QA City', districts: [{ code: 11, name: 'QA District', wards: [{ code: 111, name: 'QA Ward' }] }] },
        { code: 2, name: 'Other City', districts: [{ code: 22, name: 'Other District', wards: [] }] },
      ]) });
      if (url.pathname === '/search' && !['localhost', '127.0.0.1'].includes(url.hostname)) return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify([
        { lat: '10.8', lon: '106.7', display_name: 'Khu nhà ở Gia đình Cán bộ Quân khu 7, Trung Mỹ Tây 2A, Phường Trung Mỹ Tây, Thành phố Hồ Chí Minh, Việt Nam', address: { country_code: 'vn', state: 'QA City', city_district: 'QA District', suburb: 'QA Ward' } },
      ].filter(() => !emptyPrimarySearch)) });
      if (url.hostname === 'photon.komoot.io' && url.pathname === '/api/') {
        alternateSearches++;
        return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ features: [{ geometry: { coordinates: [106.7, 10.8] }, properties: { countrycode: 'VN', state: 'QA City', county: 'QA District', district: 'QA Ward' } }] }) });
      }
      if (url.pathname === '/reverse' && !['localhost', '127.0.0.1'].includes(url.hostname)) return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ display_name: 'New GPS administrative name', address: { country_code: 'vn', state: 'QA City', suburb: 'New Ward', road: 'GPS Road' } }) });
      if (url.pathname.startsWith('/api/')) {
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        let data = { items: [], total: 0 }, status = 200;
        if (url.pathname.startsWith('/api/orders/payos/')) customerStatusRequests.push(url.pathname);
        if (url.pathname === '/api/orders/my-store' && created) data = { items: [{ id: 'qa-order-id', externalOrderSn: 'QA-ORDER-1', createdAt: '2026-10-24T03:00:00Z', updatedAt: '2026-10-24T03:00:00Z', status: 'PENDING', isManualOrder: true, paymentMethod: 'PAYOS', paymentStatus: paid ? 'PAID' : 'WAITING_PAYMENT', customerName: 'QA Buyer', customerPhone: '0902233445', shippingAddress: '123 QA Road', subtotalAmount: 200000, shippingFee: 35000, discountAmount: 10000, finalAmount: 225000, totalCommission: 0, items: [{ productId: 'p1', title: 'Product 1', sku: 'SKU1', quantity: 2, unitPrice: 100000 }] }], pagination: { total: 1, totalPages: 1 } };
        if (url.pathname === '/api/stores/my-store') data = { id: 'qa-store', name: 'QA Shop' };
        if (url.pathname === '/api/products') data = { items: Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, title: `Product ${i}`, sku: `SKU${i}`, price: 100000, stockQuantity: i === 19 ? 0 : 5, isActive: true })), pagination: { totalPages: 1 } };
        if (url.pathname === '/api/shipping/ghn/quote-address') {
          shippingRequests.push(JSON.parse(request.postData()));
          if (failShipping) { status = 400; data = null; }
          else data = { totalFee: 35000 };
        }
        if (url.pathname === '/api/orders/manual/discount') { quotes.push(JSON.parse(request.postData())); data = { code: 'SAVE', discountAmount: 10000, message: 'QA coupon applied' }; }
        if (url.pathname === '/api/orders/manual') {
          submitted.push(JSON.parse(request.postData()));
          await new Promise(resolve => setTimeout(resolve, 150));
          if (failSubmission) { status = 400; data = null; }
          else { created = true; data = { message: 'QA created', order: { id: 'qa-order-id', externalOrderSn: 'QA-ORDER-1' } }; }
        }
        if (url.pathname === '/api/orders/manual/qa-order-id/payos/link') { paymentRequests.push(url.pathname); data = { amount: 225000, qrCode: '000201QA', checkoutUrl: 'https://pay.payos.vn/web/qa-manual', accountName: 'SCANMS QA', accountNumber: '123456' }; }
        if (url.pathname === '/api/orders/manual/qa-order-id/payos/status') data = { paymentStatus: paid ? 'PAID' : 'WAITING_PAYMENT', orderStatus: 'PENDING', providerStatus: paid ? 'PAID' : 'PENDING' };
        return request.respond({ status, headers, contentType: 'application/json', body: JSON.stringify({ data, ...(status === 400 ? { message: 'QA retryable failure' } : {}) }) });
      }
      if (!['localhost', '127.0.0.1'].includes(url.hostname)) return request.abort();
      return request.continue();
    })().catch(error => { errors.push(error.message); request.abort().catch(() => {}); }));
    await page.goto(origin, { waitUntil: 'networkidle2' });
    await page.waitForSelector('dialog[open]');
    await page.waitForFunction(() => !document.querySelector('.manual-products-section button[aria-haspopup=listbox]').disabled);

    const fill = async (label, value) => {
      const handle = await page.evaluateHandle(text => [...document.querySelectorAll('dialog label')].find(e => e.textContent.trim().startsWith(text))?.querySelector('input,textarea'), label);
      assert.ok(handle.asElement(), label);
      await handle.asElement().click();
      await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
      await page.keyboard.press('Backspace'); await handle.asElement().type(value); await handle.dispose();
    };
    const pickAddress = async (index, option) => {
      const handles = await page.$$('.manual-customer-section button[aria-haspopup=listbox]');
      await handles[index].click();
      await page.evaluate(text => [...document.querySelectorAll('[role=option]')].find(e => e.textContent.trim() === text).click(), option);
    };
    const submit = () => page.$eval('dialog form', form => form.requestSubmit());
    const setNumber = async (label, value) => {
      await page.$eval(`input[aria-label="${label}"]`, (e, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(e, v); e.dispatchEvent(new Event('input', { bubbles: true })); }, value);
    };

    // Dropdown Esc closes only the list, not the native modal.
    await page.click('.manual-customer-section button[aria-haspopup=listbox]');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('dialog', e => e.open), true);
    assert.equal(await page.$('[role=listbox]'), null);
    await fill('Họ tên', 'QA Buyer'); await fill('Số điện thoại', '0902 233 445');
    await fill('Email', 'qa@example.test'); await fill('Địa chỉ chi tiết', '123 QA Road');
    await pickAddress(0, 'QA City'); await pickAddress(1, 'QA District'); await pickAddress(2, 'QA Ward');
    await fill('Địa chỉ chi tiết', '');
    emptyPrimarySearch = true;
    await page.evaluate(() => document.querySelector('.address-location-actions button').click());
    await page.waitForFunction(() => document.querySelector('.address-location-header').textContent.includes('khu vực gần đúng'));
    assert.ok(alternateSearches > 0, 'an empty result from the first provider uses the alternate provider');
    assert.equal(await page.$('.manual-map-selection'), null, 'an area center is not saved as an exact delivery pin');
    assert.equal(await page.$$eval('.manual-customer-section label', es => es.find(e => e.textContent.trim().startsWith('Địa chỉ chi tiết')).querySelector('input').value), '');
    emptyPrimarySearch = false;
    await fill('Địa chỉ chi tiết', '123 QA Road');
    // Customer shipping uses the entered address or a map pin, never the merchant's GPS.
    await page.waitForSelector('.leaflet-container');
    assert.equal(await page.$('.address-location-locate'), null);
    await page.click('.leaflet-container', { offset: { x: 200, y: 100 } });
    await page.waitForFunction(() => document.querySelector('[data-manual-order-map]').textContent.includes('New GPS administrative name'));
    assert.equal(await page.$$eval('.manual-customer-section button[aria-haspopup=listbox]', es => es[1].textContent.includes('QA District') && es[2].textContent.includes('QA Ward')), true);
    assert.equal(await page.$$eval('.manual-customer-section label', es => es.find(e => e.textContent.trim().startsWith('Địa chỉ chi tiết')).querySelector('input').value), '123 QA Road');
    await page.evaluate(() => [...document.querySelectorAll('[data-manual-order-map] button')].find(e => e.textContent.trim() === 'Bỏ qua').click());
    await pickAddress(0, 'Other City');
    assert.equal(await page.$$eval('.manual-customer-section button[aria-haspopup=listbox]', es => es[1].textContent.includes('QA District')), false);
    await pickAddress(0, 'QA City'); await pickAddress(1, 'QA District'); await pickAddress(2, 'QA Ward');
    // A geocoder result without a road must not clear a manually entered street.
    await page.evaluate(() => [...document.querySelectorAll('.address-location-actions button')].find(e => e.textContent.includes('Tìm địa chỉ')).click());
    await page.waitForFunction(() => document.querySelector('.address-location-header').textContent.includes('Đã đặt ghim'));
    if (process.env.MANUAL_LOCATION_SCREENSHOT) {
      await (await page.$('.manual-location-result')).screenshot({ path: `${process.env.MANUAL_LOCATION_SCREENSHOT}-desktop.png` });
      await page.setViewport({ width: 390, height: 844 });
      await (await page.$('.manual-location-result')).screenshot({ path: `${process.env.MANUAL_LOCATION_SCREENSHOT}-mobile.png` });
      await page.setViewport({ width: 1440, height: 1000 });
    }
    await page.evaluate(() => [...document.querySelectorAll('[data-manual-order-map] button')].find(e => e.textContent.trim() === 'Dùng địa chỉ này').click());
    assert.equal(await page.$$eval('.manual-customer-section label', es => es.find(e => e.textContent.trim().startsWith('Địa chỉ chi tiết')).querySelector('input').value), '123 QA Road');
    await page.click('.manual-map-selection button');
    assert.equal(await page.$('.manual-map-selection'), null);
    await page.evaluate(() => [...document.querySelectorAll('.address-location-actions button')].find(e => e.textContent.includes('Tìm địa chỉ')).click());
    await page.waitForFunction(() => [...document.querySelectorAll('[data-manual-order-map] button')].some(e => e.textContent.trim() === 'Dùng địa chỉ này'));
    await page.evaluate(() => [...document.querySelectorAll('[data-manual-order-map] button')].find(e => e.textContent.trim() === 'Dùng địa chỉ này').click());
    await page.waitForSelector('.manual-map-selection');
    if (process.env.MANUAL_ORDER_SCREENSHOT) await page.screenshot({ path: process.env.MANUAL_ORDER_SCREENSHOT });

    await page.click('button[aria-label="Sản phẩm dòng 1"]');
    await page.waitForSelector('[role=listbox] input');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('dialog', e => e.open), true);
    await page.click('button[aria-label="Sản phẩm dòng 1"]');
    assert.equal(await page.$eval('[role=option]:last-child', e => e.disabled), true);
    await page.evaluate(() => [...document.querySelectorAll('[role=option]')].find(e => e.textContent.includes('Product 1 ')).click());
    assert.equal(await page.$eval('input[aria-label="Đơn giá dòng 1"]', e => e.value), '100000');
    await page.waitForFunction(() => document.querySelector('.manual-payment-section').textContent.includes('Tính lại phí'));
    assert.equal(await page.$eval('input[aria-label="Phí vận chuyển GHN"]', e => e.value), '');
    assert.equal(await page.$eval('form > footer button[type=submit]', e => e.disabled), true);
    failShipping = false;
    await page.evaluate(() => [...document.querySelectorAll('.manual-payment-section button')].find(e => e.textContent.includes('Tính lại phí')).click());
    await page.waitForFunction(() => document.querySelector('input[aria-label="Phí vận chuyển GHN"]').value === '35.000');
    assert.equal(await page.$eval('input[aria-label="Phí vận chuyển GHN"]', e => e.readOnly), true);
    await fill('Số điện thoại', '0');
    await submit();
    await page.waitForFunction(() => document.querySelector('dialog [role=alert]')?.textContent.includes('SĐT'));
    assert.equal(submitted.length, 0);
    await fill('Số điện thoại', '0902 233 445');
    assert.equal(await page.$('.manual-payment-section button[aria-haspopup=listbox]'), null);
    assert.ok((await page.$eval('.manual-payment-state', e => e.textContent)).includes('Chưa thanh toán'));
    await page.evaluate(() => document.querySelector('.manual-products-section > button').click());
    await page.click('button[aria-label="Sản phẩm dòng 2"]');
    await page.evaluate(() => [...document.querySelectorAll('[role=option]')].find(e => e.textContent.includes('Product 1 ')).click());
    await setNumber('Số lượng dòng 1', '3'); await setNumber('Số lượng dòng 2', '3');
    await submit(); await page.waitForFunction(() => document.querySelector('dialog [role=alert]')?.textContent.includes('vượt tồn kho'));
    assert.equal(submitted.length, 0);
    await page.click('button[aria-label="Xóa dòng sản phẩm 2"]');
    await setNumber('Số lượng dòng 1', '1');
    await fill('Mã giảm giá', 'SAVE');
    await page.evaluate(() => [...document.querySelectorAll('.manual-payment-section button')].find(e => e.textContent.trim() === 'Áp dụng').click());
    await page.waitForFunction(() => document.querySelector('dialog [role=status]')?.textContent.includes('QA coupon applied'));
    assert.equal(quotes.length, 1);
    await setNumber('Số lượng dòng 1', '2');
    assert.equal(await page.$eval('input[aria-label="Phí vận chuyển GHN"]', e => e.value), '');
    await page.waitForFunction(() => document.querySelector('input[aria-label="Phí vận chuyển GHN"]').value === '35.000');
    await submit();
    await page.waitForFunction(() => document.querySelector('dialog [role=alert]')?.textContent.includes('áp dụng lại'));
    assert.equal(submitted.length, 0);
    await page.evaluate(() => [...document.querySelectorAll('.manual-payment-section button')].find(e => e.textContent.trim() === 'Áp dụng').click());
    await page.waitForFunction(() => document.querySelector('dialog [role=status]')?.textContent.includes('QA coupon applied'));
    await page.waitForFunction(() => document.querySelector('input[aria-label="Phí vận chuyển GHN"]').value === '35.000');
    await submit(); await page.waitForFunction(() => document.querySelector('dialog [role=alert]')?.textContent.includes('QA retryable failure'));
    assert.equal(submitted.length, 1);
    assert.equal(await page.$eval('dialog', e => e.open), true);
    failSubmission = false;
    await page.$eval('dialog form', form => { form.requestSubmit(); form.requestSubmit(); });
    await page.waitForSelector('#manual-payment-title');
    await page.waitForSelector('a[href="https://pay.payos.vn/web/qa-manual"]');
    await page.waitForSelector('img[alt="Mã VietQR cho đơn QA-ORDER-1"]');
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.$eval('dialog', dialog => dialog.scrollWidth <= dialog.clientWidth + 1), true);
    if (process.env.MANUAL_PAYMENT_SCREENSHOT) await page.screenshot({ path: process.env.MANUAL_PAYMENT_SCREENSHOT });
    await page.setViewport({ width: 1440, height: 1000 });
    assert.equal(paymentRequests.length, 1);
    await page.evaluate(() => [...document.querySelectorAll('dialog button')].find(e => e.textContent.includes('Sao chép link gửi khách')).click());
    await page.waitForFunction(() => window.qaCopied === 'https://pay.payos.vn/web/qa-manual');
    await page.click('button[aria-label="Đóng thanh toán"]');
    await page.goto(`${origin}/?table=1`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('button[title^="Xem chi tiết đơn hàng"]');
    await page.click('button[title^="Xem chi tiết đơn hàng"]');
    await page.evaluate(() => [...document.querySelectorAll('dialog button')].find(e => e.textContent.includes('Mở QR / link')).click());
    await page.waitForSelector('a[href="https://pay.payos.vn/web/qa-manual"]');
    assert.equal(paymentRequests.length, 2);
    paid = true;
    await page.waitForFunction(() => document.querySelector('dialog').textContent.includes('Đã xác nhận thanh toán'));
    await page.click('button[aria-label="Đóng thanh toán"]');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    assert.equal(submitted.length, 2);
    assert.equal(submitted[0].requestId, submitted[1].requestId);
    assert.equal(submitted[1].totalAmount, 225000);
    assert.equal(submitted[1].discountAmount, 10000);
    assert.equal(submitted[1].shippingFee, 35000);
    assert.ok(shippingRequests.some(request => request.storeId === 'qa-store' && request.address.includes('QA Ward') && request.items.some(item => item.quantity === 2)));
    assert.equal(submitted[1].paymentMethod, 'MANUAL');
    assert.equal(submitted[1].customer.address, '123 QA Road');
    assert.equal(submitted[1].customer.province, 'QA City');
    assert.equal(submitted[1].customer.latitude, 10.8);
    assert.equal(submitted[1].customer.longitude, 106.7);
    // The remaining close controls work after scrolling on a narrow viewport.
    await page.goto(origin, { waitUntil: 'networkidle2' });
    await page.setViewport({ width: 390, height: 844 });
    await page.$eval('dialog', e => { e.scrollTop = e.scrollHeight; });
    const closeVisible = await page.$eval('.manual-dialog-close', e => {
      const r = e.getBoundingClientRect();
      return e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    });
    assert.equal(closeVisible, true);
    await page.click('.manual-dialog-close');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    await page.reload({ waitUntil: 'networkidle2' });
    await page.evaluate(() => document.querySelector('dialog form > footer button[type=button]').click());
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    await page.goto(`${origin}/payment/payos-return?order=QA-ORDER-1&manual=1&status=PAID`, { waitUntil: 'networkidle2' });
    assert.ok((await page.$eval('h1', e => e.textContent)).includes('Kiểm tra thanh toán'));
    assert.deepEqual(customerStatusRequests, []);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
