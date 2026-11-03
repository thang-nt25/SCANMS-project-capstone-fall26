import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

test('merchant order polling preserves the table and focus, prevents overlapping refreshes and retains data after errors', {
  skip: !base || !existsSync(executablePath), timeout: 40000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  let customerName = 'Khách kiểm thử';
  let hold = false;
  let release;
  const waitForHeldRequest = async () => {
    const deadline = Date.now() + 8000;
    while (!release && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    assert.ok(release, 'expected an intercepted order refresh request');
  };
  let listRequests = 0;
  const orderQueries = [];
  let sampleRequests = 0;
  let partialMapAddress = false;
  const errors = [];
  const store = { id: 'qa-store', name: 'Shop kiểm thử', isVerified: true, onboardingStatus: 'VERIFIED' };
  const order = () => ({ id: 'qa-order', storeId: store.id, externalOrderSn: 'QA-REFRESH', status: 'PENDING',
    customerName, customerPhone: '0901234567', customerEmail: 'nguoi.mua.kiemthu@example.com',
    shippingAddress: 'Khu Công Nghệ Cao, Phường Phước Long B, Thành phố Thủ Đức, Thành phố Hồ Chí Minh',
    createdAt: '2026-10-20T10:00:00Z', subtotalAmount: 250000,
    finalAmount: 279001, shippingFee: 29001, discountAmount: 0, totalCommission: 21000, paymentMethod: 'WALLET', paymentStatus: 'PAID',
    trackingNumber: 'QA-GHN123', carrierName: 'Giao Hàng Nhanh (GHN)',
    items: [{ id: 'qa-item', productId: 'qa-product', title: 'Serum kiểm thử', sku: 'QA-SERUM-001', quantity: 1, unitPrice: 250000,
      imageUrl: '/scanms-placeholder.svg' }] });
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluateOnNewDocument(store => {
      localStorage.setItem('token', 'fixture-only');
      localStorage.setItem('user', JSON.stringify({ id: 'qa-owner', fullName: 'Shop kiểm thử', role: 'SHOP_MANAGER', stores: [store] }));
      localStorage.setItem('scanms_analytics_consent', 'denied');
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.copiedTracking = value; } } });
      const now = Date.now.bind(Date); let offset = 0;
      Date.now = () => now() + offset;
      window.advanceRefreshClock = () => { offset += 11000; window.dispatchEvent(new Event('focus')); };
      // Drive polling through focus events without waiting for real 10-second timers.
      const interval = window.setInterval.bind(window);
      window.setInterval = (callback, ms, ...args) => interval(callback, ms === 10000 ? 3600000 : ms, ...args);
    }, store);
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.hostname === 'provinces.open-api.vn') return request.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify([{ code: 1, name: 'Thành phố Hà Nội', districts: [{ code: 2, name: 'Quận Hoàn Kiếm', wards: [{ code: 3, name: 'Phường Hàng Bạc' }] }] }]) });
      if (url.hostname === 'nominatim.openstreetmap.org') {
        const location = { lat: '21.033039448', lon: '105.850813376', display_name: '15 Hàng Bạc, Hà Nội, Việt Nam', address: { country_code: 'vn', state: 'Hà Nội', city_district: 'Hoàn Kiếm', suburb: partialMapAddress ? 'Phường chưa khớp danh mục' : 'Hàng Bạc', house_number: '15', road: 'Hàng Bạc' } };
        return request.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(url.pathname === '/search' ? [location] : location) });
      }
      if (url.hostname.includes('tile.openstreetmap')) return request.respond({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aTWQAAAAASUVORK5CYII=', 'base64') });
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] || 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
        const respond = (data, status = 200) => request.respond({ status, headers, contentType: 'application/json', body: JSON.stringify({ data }) });
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        if (request.method() !== 'GET') {
          assert.equal(url.pathname.startsWith('/api/orders/'), false, 'test must never submit an order action');
          return respond({});
        }
        if (url.pathname === '/api/stores/my-store') return respond(store);
        if (url.pathname === '/api/products') return respond({ items: [], pagination: { totalPages: 1 } });
        if (url.pathname === '/api/products/reviews/moderation') return respond(Array.from({ length: 8 }, (_, index) => ({ id: `qa-review-${index}`, customerName: 'Khách kiểm thử', createdAt: '2026-10-20T10:00:00Z', rating: 5, status: 'APPROVED', isApproved: true, comment: 'Sản phẩm kiểm thử', product: { title: 'Serum kiểm thử' }, reports: [] })));
        if (url.pathname === '/api/media') return respond({ items: [
          { id: 'qa-video-pending', title: 'Video review chờ duyệt', status: 'PENDING', posterUrl: '/scanms-placeholder.svg', urlOrContent: 'data:video/mp4;base64,', collaborator: { fullName: 'KOL kiểm thử' }, product: { title: 'Serum kiểm thử', sku: 'QA-SERUM' } },
          { id: 'qa-video-approved', title: 'Video review đã duyệt', status: 'APPROVED', posterUrl: '/scanms-placeholder.svg', urlOrContent: 'data:video/mp4;base64,', collaborator: { fullName: 'KOL thứ hai' }, product: { title: 'Mặt nạ kiểm thử', sku: 'QA-MASK' } },
        ] });
        if (url.pathname === '/api/sample-requests/shop') { sampleRequests++; return respond([
          { id: 'sample-approved', status: 'APPROVED', createdAt: '2026-10-21T10:00:00Z', recipientName: 'Người nhận mẫu', recipientPhone: '0901234567', shippingAddress: '15 Hàng Bạc, Hà Nội',
            product: { id: 'qa-product', title: 'Serum rau má B5 kiểm thử', imageUrl: '/scanms-placeholder.svg', price: 200000 }, collaborator: { id: 'qa-kol', fullName: 'Nhà sáng tạo kiểm thử', collaboratorProfile: { totalFollowers: 255000, kycStatus: 'VERIFIED', tier: { name: 'Đồng' } } } },
          { id: 'sample-received', status: 'RECEIVED', createdAt: '2026-10-20T10:00:00Z', receivedAt: '2026-10-21T10:00:00Z', deadlineAt: '2099-01-01T10:00:00Z',
            recipientName: 'Người nhận mẫu', recipientPhone: '0901234567', shippingAddress: '15 Hàng Bạc, Hà Nội', trackingNumber: 'DEMO-SAMPLE-GHN-7',
            shippingCharges: [{ environment: 'TEST', amount: null, trackingNumber: 'DEMO-SAMPLE-GHN-7', status: 'DELIVERED', payer: 'SHOP', codAmount: 0 }],
            product: { id: 'qa-product2', title: 'Mặt nạ rau má kiểm thử', imageUrl: '/scanms-placeholder.svg', price: 90000 }, collaborator: { id: 'qa-kol2', fullName: 'KOL kiểm thử' } },
        ]); }
        if (url.pathname === '/api/orders/my-store') {
          orderQueries.push(Object.fromEntries(url.searchParams));
          const data = () => ({ items: [order(), { ...order(), id: 'qa-completed', externalOrderSn: 'QA-COMPLETE', status: 'COMPLETED', trackingNumber: null,
            discountAmount: 10000, finalAmount: 269001, couponCode: 'SHOP10',
            returnRequest: { id: 'qa-return', status: 'APPROVED', reason: 'DAMAGED', details: 'Chai sản phẩm bị rò trong kiện hàng.',
              submittedAt: '2026-10-21T08:00:00Z', imageUrls: ['https://example.com/return-proof.jpg'], unboxingVideoUrl: 'https://example.com/unboxing.mp4', shopResponse: 'Đã tiếp nhận bằng chứng của khách hàng.' } }], pagination: { total: 2, totalPages: 1, page: 1 } });
          if (url.searchParams.get('limit') === '12') {
            listRequests++;
            if (hold) { release = (status = 200) => respond(status === 200 ? data() : { message: 'Temporary failure' }, status); return; }
          }
          return respond(data());
        }
        return respond(url.pathname === '/api/auth/me' ? null : []);
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    await page.goto(origin + '/merchant/orders');
    await page.waitForSelector('.merchant-orders-data tbody tr');
    await page.waitForNetworkIdle({ idleTime: 300 });
    assert.equal(await page.$('[aria-label="Chọn tiêu chí tìm kiếm"]'), null);
    assert.ok(orderQueries.some(query => query.searchField === "ALL"));
    const filterLayout = await page.$eval("[data-order-filter-row]", el => {
      const buttons = [...el.querySelectorAll("[role=group] button")].map(button => button.getBoundingClientRect());
      const input = el.querySelector("[role=search]").getBoundingClientRect();
      return { aligned: buttons.every(rect => Math.abs(rect.top - input.top) < 2 && Math.abs(rect.height - input.height) < 2), equal: buttons.every(rect => Math.abs(rect.width - buttons[0].width) < 2), fits: el.scrollWidth <= el.clientWidth };
    });
    assert.deepEqual(filterLayout, { aligned: true, equal: true, fits: true });
    assert.equal(await page.$$eval('.merchant-orders-data th', els => els.length), 6);
    const headings = await page.$$eval('.merchant-orders-data th', els => els.map(el => el.textContent));
    assert.ok(!headings.includes('Mã đơn & Ngày tạo') && !headings.includes('Vận đơn'));
    assert.doesNotMatch(await page.$eval('.merchant-orders-data tbody', el => el.textContent), /QA-REFRESH|QA-GHN123/);
    const menuButton = '[aria-label="Thông tin và thao tác đơn QA-REFRESH"]';
    const menu = '[aria-label="Thông tin đơn QA-REFRESH"]';
    for (const width of [1440, 390]) {
      await page.setViewport({ width, height: 900 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const positions = await page.$$eval('.merchant-orders-data tbody tr', rows => rows.map(row => {
        const eye = row.querySelector('button[title^="Xem chi tiết đơn hàng"]').getBoundingClientRect();
        const menu = row.querySelector('button[title="Thao tác khác"]').getBoundingClientRect();
        return { eyeX: eye.left, menuX: menu.left, eyeY: eye.top + eye.height / 2, menuY: menu.top + menu.height / 2 };
      }));
      assert.ok(Math.abs(positions[0].eyeX - positions[1].eyeX) < 1, 'eye buttons line up across orders with and without a primary action');
      assert.ok(Math.abs(positions[0].menuX - positions[1].menuX) < 1, 'more buttons line up across rows');
      assert.ok(positions.every(position => Math.abs(position.eyeY - position.menuY) < 1), 'eye and more buttons share the same horizontal line');
      await page.click(menuButton);
      await page.waitForSelector(menu, { visible: true });
      assert.match(await page.$eval(menu, el => el.textContent), /QA-REFRESH/);
      assert.match(await page.$eval(menu, el => el.textContent), /20\/10\/2026/);
      assert.match(await page.$eval(menu, el => el.textContent), /QA-GHN123/);
      assert.match(await page.$eval(menu, el => el.textContent), /Giao Hàng Nhanh/);
      assert.ok(await page.$eval(menu, el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }), 'menu must fit the viewport without being clipped by the table');
      await page.screenshot({ path: join(tmpdir(), `scanms-order-actions-${width}.png`) });
      await page.click('[aria-label="Sao chép mã vận đơn QA-GHN123"]');
      assert.equal(await page.evaluate(() => window.copiedTracking), 'QA-GHN123');
      assert.ok(await page.$(menu), 'copying a tracking code keeps its menu open');
      await page.keyboard.press('Escape');
      assert.equal(await page.$(menu), null);
      assert.equal(await page.$eval(menuButton, el => document.activeElement === el), true);

      const eye = '.merchant-orders-data tbody tr:first-child button[title^="Xem chi tiết đơn hàng"]';
      await page.click(eye);
      await page.waitForSelector('dialog[open][aria-labelledby="order-detail-title"]');
      const detail = 'dialog[open][aria-labelledby="order-detail-title"]';
      assert.match(await page.$eval(detail, el => el.textContent), /nguoi.mua.kiemthu@example.com/);
      assert.match(await page.$eval(detail, el => el.textContent), /Thành phố Hồ Chí Minh/);
      assert.match(await page.$eval('[data-order-detail-total]', el => el.textContent), /279[.,]001/);
      assert.equal(await page.$eval(detail, el => el.scrollWidth <= el.clientWidth), true, 'long recipient and product information must not cause horizontal overflow');
      assert.ok(await page.$eval(detail, el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }));
      await page.$eval('[data-order-detail-content]', el => { el.scrollTop = el.scrollHeight; });
      assert.ok(await page.$eval('dialog[open] footer button', el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), 'close action stays visible while scrolling details');
      await page.$eval('[data-order-detail-content]', el => { el.scrollTop = 0; });
      await (await page.$(detail)).screenshot({ path: join(tmpdir(), `scanms-order-detail-${width}.png`) });
      await page.keyboard.press('Tab');
      assert.ok(await page.$eval(detail, el => el.contains(document.activeElement)), 'focus remains inside the modal');
      await page.keyboard.press('Escape');
      assert.equal(await page.$(detail), null);
      assert.equal(await page.$eval(eye, el => document.activeElement === el), true, 'closing returns focus to the selected order');
    }
    await page.setViewport({ width: 1440, height: 900 });
    await page.click('.merchant-orders-data tbody tr:nth-child(2) button[title^="Xem chi tiết đơn hàng"]');
    await page.waitForSelector('dialog[open] .order-detail-return');
    assert.match(await page.$eval('dialog[open] .order-detail-return', el => el.textContent), /Sản phẩm hư hỏng/);
    assert.match(await page.$eval('dialog[open] .order-detail-return', el => el.textContent), /Đã tiếp nhận bằng chứng/);
    assert.equal(await page.$eval('dialog[open] .order-detail-return a', el => el.href), 'https://example.com/return-proof.jpg');
    assert.match(await page.$eval('dialog[open]', el => el.textContent), /SHOP10/);
    assert.match(await page.$eval('[data-order-detail-total]', el => el.textContent), /269[.,]001/);
    await page.$eval('dialog[open] footer button', el => el.click());
    await page.waitForSelector('dialog[open][aria-labelledby="order-detail-title"]', { hidden: true });
    const search = 'input[placeholder="Tìm mã đơn, tên, SĐT, vận đơn..."]';
    await page.focus(search);
    await page.evaluate(() => {
      window.originalOrderRow = document.querySelector('.merchant-orders-data tbody tr');
      document.querySelector('.merchant-orders-scroll').scrollLeft = 100;
      window.originalOrderScroll = document.querySelector('.merchant-orders-scroll').scrollLeft;
    });
    hold = true;
    await page.evaluate(() => window.advanceRefreshClock());
    await waitForHeldRequest();
    const requestsWhileHeld = listRequests;
    assert.equal(await page.$eval('.merchant-orders-data tbody tr', el => el === window.originalOrderRow), true);
    assert.equal(await page.evaluate(() => document.body.textContent.includes('Đang tải đơn hàng...')), false);
    assert.equal(await page.$eval(search, el => document.activeElement === el), true);
    assert.equal(await page.$eval('.merchant-orders-scroll', el => el.scrollLeft === window.originalOrderScroll), true);
    await page.evaluate(() => { window.advanceRefreshClock(); document.dispatchEvent(new Event('visibilitychange')); });
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(listRequests, requestsWhileHeld, 'focus/visibility and timer refreshes cannot overlap a pending fetch');
    customerName = 'Khách đã cập nhật';
    hold = false; await release(); release = undefined;
    await page.waitForFunction(() => document.querySelector('.merchant-orders-data')?.textContent.includes('Khách đã cập nhật'));
    assert.equal(await page.$eval('.merchant-orders-data tbody tr', el => el === window.originalOrderRow), true);

    // Background failures leave the last successful data and table mounted.
    hold = true; await page.evaluate(() => window.advanceRefreshClock());
    await waitForHeldRequest();
    hold = false; await release(503); release = undefined;
    await page.waitForNetworkIdle({ idleTime: 200 });
    assert.match(await page.$eval('.merchant-orders-data', el => el.textContent), /Khách đã cập nhật/);
    assert.equal(await page.evaluate(() => document.body.textContent.includes('Đang tải đơn hàng...')), false);

    assert.equal(await page.$$eval('button', buttons => buttons.some(button => button.textContent.trim() === 'Làm mới')), false, 'commercial toolbar no longer displays a refresh button');
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Tạo đơn thủ công').click());
    await page.waitForSelector('[data-manual-order-map] .leaflet-container');
    await page.$eval('dialog[open]', el => { el.scrollTop = 500; });
    assert.ok(await page.$eval('dialog[open] button[aria-label="Đóng"]', el => {
      const rect = el.getBoundingClientRect();
      const modal = el.closest('dialog').getBoundingClientRect();
      return rect.top >= modal.top && rect.bottom < modal.top + 65;
    }), 'close button stays at the top of the manual order dialog during scroll');
    await page.$eval('dialog[open]', el => { el.scrollTop = 0; });
    const layout = await page.evaluate(() => {
      const form = document.querySelector('dialog[open]');
      const labels = [...form.querySelectorAll('label')];
      const rect = text => labels.find(label => label.textContent.trim().startsWith(text)).getBoundingClientRect();
      const province = rect('Tỉnh/Thành phố'), district = rect('Quận/Huyện'), ward = rect('Phường/Xã');
      const detail = form.querySelector('input[placeholder="Số nhà, đường, tòa nhà..."]').getBoundingClientRect();
      const map = form.querySelector('[data-manual-order-map]').getBoundingClientRect();
      return { provinceWidth: province.width, districtWidth: district.width, provinceTop: province.top, districtTop: district.top, wardTop: ward.top, detailTop: detail.top, mapTop: map.top };
    });
    assert.ok(layout.provinceWidth > layout.districtWidth * 1.8, 'province spans a full row');
    assert.ok(Math.abs(layout.districtTop - layout.wardTop) < 1, 'district and ward share one row');
    assert.ok(layout.provinceTop < layout.districtTop && layout.districtTop < layout.detailTop && layout.detailTop < layout.mapTop, 'address fields follow the reference order');
    await page.type('dialog[open] input[placeholder="Số nhà, đường, tòa nhà..."]', '15 Hàng Bạc');
    await page.click('[data-manual-order-map] .address-location-actions button');
    await page.waitForSelector('[data-manual-order-map] .leaflet-marker-icon');
    await page.waitForFunction(() => [...document.querySelectorAll('dialog[open] button')].some(button => button.textContent.trim() === 'Phường Hàng Bạc'));
    assert.equal(await page.$eval('dialog[open] input[placeholder="Số nhà, đường, tòa nhà..."]', el => el.value), '15, Hàng Bạc');
    assert.match(await page.$eval('dialog[open]', el => el.textContent), /Quận Hoàn Kiếm/);
    await page.type('dialog[open] input[placeholder="Số nhà, đường, tòa nhà..."]', ' mới');
    await page.waitForFunction(() => !document.querySelector('[data-manual-order-map] .leaflet-marker-icon'));
    partialMapAddress = true;
    await page.click('[data-manual-order-map] .leaflet-container', { offset: { x: 130, y: 100 } });
    await page.waitForFunction(() => document.querySelector('[data-manual-order-map]')?.textContent.includes('Một số địa danh chưa khớp'));
    assert.equal(await page.$$eval('dialog[open] button', buttons => buttons.some(button => button.textContent.trim() === 'Phường Hàng Bạc')), false, 'unknown map wards must not reuse old administrative codes');
    await page.setViewport({ width: 390, height: 900 });
    assert.equal(await page.$eval('[data-manual-order-map]', el => el.scrollWidth <= el.clientWidth), true);
    await page.$eval('dialog[open] button[aria-label="Đóng"]', el => el.click());
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Nhập Excel').click());
    await page.waitForSelector('dialog[open][aria-labelledby="order-dialog-title"]');
    const excelDialog = 'dialog[open][aria-labelledby="order-dialog-title"]';
    assert.equal(await page.$eval('[data-excel-instructions]', el => el.open), false, 'technical instructions are collapsed by default');
    for (const width of [1440, 390]) {
      await page.setViewport({ width, height: 900 });
      assert.ok(await page.$eval(excelDialog, el => { const r = el.getBoundingClientRect(); return r.width <= 600 && r.left >= 0 && r.right <= innerWidth && el.scrollWidth <= el.clientWidth; }), 'Excel dialog is compact and fits mobile');
      await (await page.$(excelDialog)).screenshot({ path: join(tmpdir(), `scanms-excel-import-${width}.png`) });
    }
    await page.click('[data-excel-instructions] summary');
    assert.match(await page.$eval('[data-excel-instructions]', el => el.textContent), /shipping_address/);
    await page.click('[data-excel-instructions] summary');
    const setExcelFile = (name, type) => page.$eval('dialog[open] input[type="file"]', (input, { name, type }) => {
      const transfer = new DataTransfer(); transfer.items.add(new File(['fixture only'], name, { type }));
      input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    }, { name, type });
    await setExcelFile('invalid.txt', 'text/plain');
    assert.equal(await page.$$eval('dialog[open] footer button', buttons => buttons.find(button => button.textContent.trim() === 'Nhập đơn hàng').disabled), true);
    await setExcelFile('orders.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await page.waitForSelector('[aria-label="Bỏ file đã chọn"]');
    assert.match(await page.$eval(excelDialog, el => el.textContent), /orders.xlsx/);
    assert.equal(await page.$$eval('dialog[open] footer button', buttons => buttons.find(button => button.textContent.trim() === 'Nhập đơn hàng').disabled), false);
    await page.click('[aria-label="Bỏ file đã chọn"]');
    assert.equal(await page.$('[aria-label="Bỏ file đã chọn"]'), null);
    assert.equal(await page.$$eval('dialog[open] footer button', buttons => buttons.find(button => button.textContent.trim() === 'Nhập đơn hàng').disabled), true);
    await page.click('dialog[open] header button[aria-label="Đóng"]');
    await page.waitForSelector(excelDialog, { hidden: true });
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Hàng mẫu KOL').click());
    await page.waitForSelector('a[href="/merchant/kol-hub"]');
    await page.waitForNetworkIdle({ idleTime: 300 });
    assert.ok(sampleRequests > 0);
    await page.waitForSelector('[data-sample-row="sample-received"]');
    assert.equal(await page.$eval('[data-sample-row="sample-received"] a[aria-label^="Xem hồ sơ"]', el => el.getAttribute('href')), '/merchant/kol-hub?kol=qa-kol2&tab=profile');
    assert.equal(await page.$eval('[data-sample-row="sample-received"] a[aria-label^="Xem sản phẩm"]', el => el.getAttribute('href')), '/products/qa-product2');
    assert.equal(await page.$eval('[data-sample-row="sample-received"] a[aria-label^="Xem sản phẩm"] img', el => Boolean(el.closest('a'))), true);
    assert.equal(await page.$('.sample-queue-table details'), null, 'the overview does not expand recipient/shipping details inside rows');
    assert.ok(await page.$eval('[data-sample-row="sample-received"]', el => el.getBoundingClientRect().height < 160), 'sample rows stay compact');
    await page.click('[data-sample-row="sample-received"] button[title="Chi tiết hàng mẫu"]');
    await page.waitForSelector('[aria-labelledby="sample-details-title"]');
    assert.match(await page.$eval('[aria-labelledby="sample-details-title"]', el => el.textContent), /15 Hàng Bạc/);
    assert.match(await page.$eval('[aria-labelledby="sample-details-title"]', el => el.textContent), /Gia hạn/);
    await page.waitForSelector('[aria-label="Vận đơn mẫu GHN sandbox"]', { visible: true });
    await (await page.$('[aria-labelledby="sample-details-title"]')).screenshot({ path: join(tmpdir(), 'scanms-sample-details.png') });
    await page.keyboard.press('Escape');
    await page.waitForSelector('[aria-labelledby="sample-details-title"]', { hidden: true });
    await page.click('[aria-label="Lọc trạng thái hàng mẫu"] button:nth-child(3)');
    assert.equal(await page.$$eval('[data-sample-row]', els => els.length), 1);
    await page.click('[aria-label="Lọc trạng thái hàng mẫu"] button:first-child');
    for (const width of [1440, 390]) {
      await page.setViewport({ width, height: 900 });
      await page.$eval('.sample-queue-table', el => el.scrollIntoView({ block: 'center' }));
      const toolbar = await page.$eval('[data-sample-toolbar]', el => {
        const buttons = [...el.querySelectorAll('button')].map(button => button.getBoundingClientRect());
        const input = el.querySelector('input').getBoundingClientRect();
        const outer = el.getBoundingClientRect();
        return { fits: el.scrollWidth <= el.clientWidth && input.right <= outer.right + 1,
          widths: buttons.map(rect => rect.width), allOnOneRow: buttons.every(rect => Math.abs(rect.top - input.top) < 1) };
      });
      assert.ok(toolbar.fits, 'sample filters and search fit without horizontal scrolling');
      assert.ok(Math.max(...toolbar.widths) - Math.min(...toolbar.widths) < 1, 'filter buttons have equal widths');
      if (width === 1440) assert.ok(toolbar.allOnOneRow, 'desktop search and filters share a row');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sample layout must not overflow the page');
      await page.screenshot({ path: join(tmpdir(), `scanms-sample-queue-${width}.png`) });
    }
    assert.equal(await page.$$eval('button', els => els.some(el => ['Nhập Excel', 'Tạo đơn thủ công'].includes(el.textContent.trim()))), false, 'sample orders must not use commercial order creation actions');
    assert.equal(await page.$$eval('button', buttons => buttons.some(button => button.textContent.trim() === 'Làm mới')), false, 'sample toolbar no longer displays refresh controls');
    assert.equal(await page.$eval('[data-video-deadline]', el => el.dataset.videoDeadline), 'normal');
    for (const [clock, expected] of [['2098-12-31T10:30:00Z', 'soon'], ['2099-01-01T10:01:00Z', 'overdue']]) {
      await page.evaluate(clock => { Date.now = () => new Date(clock).getTime(); document.dispatchEvent(new Event('visibilitychange')); }, clock);
      await page.waitForSelector(`[data-video-deadline="${expected}"]`);
      assert.equal(await page.$eval('[data-video-deadline]', el => getComputedStyle(el).color), 'rgb(220, 38, 38)');
      assert.equal(await page.$eval('[data-video-deadline] svg', el => getComputedStyle(el).color), 'rgb(220, 38, 38)');
      assert.equal(await page.$('[data-sample-row="sample-approved"] [data-video-deadline]'), null);
    }
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.includes('Deal & voucher')).click());
    const invitationOrigin = page.url();
    const originalDealCard = await page.$('[data-deal-card]');
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.includes('Mời Thêm KOL & Tạo Deal')).click());
    await page.waitForSelector('[aria-labelledby="invite-kol-title"]', { visible: true });
    assert.equal(page.url(), invitationOrigin, 'invitation opens over the deals page without navigating');
    assert.equal(await originalDealCard.evaluate(el => el.isConnected), true, 'original deal content stays mounted behind the invitation');
    assert.equal(await page.$eval('#kol-invite-email', el => el.value), '');
    await page.click('[aria-labelledby="invite-kol-title"] button[aria-label]');
    await page.waitForSelector('[aria-labelledby="invite-kol-title"]', { hidden: true });
    assert.equal(page.url(), invitationOrigin);
    await page.waitForSelector('[data-deal-card]');
    assert.ok(await page.$$eval('h3', headings => headings.some(heading => heading.textContent.includes('Thỏa Thuận Hoa Hồng'))), 'closing the invitation returns to the original deals section');
    await page.goto(origin + '/merchant/products');
    await page.setViewport({ width: 1440, height: 900 });
    await page.waitForSelector('[aria-label="Lọc trạng thái sản phẩm"]');
    await page.click('[aria-label="Lọc trạng thái sản phẩm"]');
    await page.waitForSelector('[role="listbox"]');
    assert.equal(await page.$eval('[role="listbox"]', list => {
      const options = [...list.querySelectorAll('[role="option"]')];
      const listRect = list.getBoundingClientRect();
      return options.filter(option => { const rect = option.getBoundingClientRect(); return rect.top >= listRect.top && rect.bottom <= listRect.bottom; }).every(option => {
        const rect = option.getBoundingClientRect();
        return option.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
      });
    }), true, 'product filter options remain above the product table and receive clicks');
    await page.evaluate(() => [...document.querySelectorAll('[role="option"]')].find(option => option.textContent.trim() === 'Đang bán').click());
    assert.match(await page.$eval('[aria-label="Lọc trạng thái sản phẩm"]', el => el.textContent), /Đang bán/);
    await page.waitForSelector('[role="listbox"]', { hidden: true });
    await page.click('button[title="Duyệt video nghiệm thu từ KOL"]');
    await page.waitForSelector('.kol-video-picker-item');
    for (const width of [1440, 390]) {
      await page.setViewport({ width, height: 900 });
      const layout = await page.$eval('.kol-video-review-modal', dialog => {
        const rect = dialog.getBoundingClientRect();
        const thumbnails = [...dialog.querySelectorAll('.kol-video-picker-thumb img')].map(img => img.getBoundingClientRect());
        const player = dialog.querySelector('video').getBoundingClientRect();
        return { fits: rect.left >= 0 && rect.right <= innerWidth && dialog.scrollWidth <= dialog.clientWidth, compactThumbnails: thumbnails.every(rect => rect.width <= 44 && rect.height <= 56), playerBounded: player.height <= 300 };
      });
      assert.deepEqual(layout, { fits: true, compactThumbnails: true, playerBounded: true });
      await page.screenshot({ path: join(tmpdir(), `scanms-video-review-${width}.png`) });
    }
    await page.click('.kol-video-picker-item[data-status="APPROVED"]');
    assert.match(await page.$eval('.kol-video-selected', el => el.textContent), /Video review đã duyệt/);
    assert.ok(await page.$$eval('.kol-video-actions button', buttons => buttons.some(button => button.textContent.includes('Ẩn video'))));
    await page.click('[aria-label="Đóng cửa sổ duyệt video"]');
    await page.waitForSelector('.kol-video-review-modal', { hidden: true });
    await page.click('button[title="Duyệt đánh giá từ khách hàng"]');
    await page.waitForSelector('[data-review-management-scroll] article');
    const reviewScroll = await page.$eval('[aria-labelledby="review-management-title"]', dialog => {
      const body = dialog.querySelector('[data-review-management-scroll]');
      const title = dialog.querySelector('h2');
      const close = dialog.querySelector('[aria-label="Đóng quản lý đánh giá"]');
      const titleTop = title.getBoundingClientRect().top;
      const closeTop = close.getBoundingClientRect().top;
      body.scrollTop = body.scrollHeight;
      return { titleScrolls: title.getBoundingClientRect().top < titleTop, closeStays: close.getBoundingClientRect().top === closeTop, removedText: !dialog.textContent.includes('Shop chỉ được phản hồi') };
    });
    assert.deepEqual(reviewScroll, { titleScrolls: true, closeStays: true, removedText: true });
    await page.click('[aria-label="Đóng quản lý đánh giá"]');
    await page.waitForSelector('[aria-labelledby="review-management-title"]', { hidden: true });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
