import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const base = process.env.GHN_UI_TEST_URL;
test('pickup uses account default, edits only this pickup, keeps three parcel dimensions and prevents duplicate booking', { skip: !base, timeout: 30000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, timeout: 10000, args: ['--no-sandbox'] });
  const writes = [];
  const defaults = { id: 'home', fullName: 'Trần An', phoneNumber: '0903000001', detailAddress: '15 Lê Duẩn', provinceName: 'Thành phố Hà Nội', districtName: 'Quận Ba Đình', wardName: 'Phường Phúc Xá', isDefault: true };
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(8000);
    await page.setViewport({ width: 1200, height: 850 });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname === '/pickup-fixture') return req.respond({ contentType: 'text/html', body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/pickup-booking.tsx"></script>' });
      if (url.hostname === 'provinces.open-api.vn') {
        const province = { code: 1, name: defaults.provinceName };
        const district = { code: 1, name: defaults.districtName };
        const data = url.pathname.includes('/d/') ? { wards: [{ code: 1, name: defaults.wardName }] } : url.pathname.includes('/p/') ? { districts: [district] } : [province];
        return req.respond({ headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json', body: JSON.stringify(data) });
      }
      if (url.pathname.includes('/customer/addresses') || url.pathname.includes('/returns/pickup-fixture/pickup')) {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
        if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers });
        if (req.method() === 'GET') return req.respond({ headers, contentType: 'application/json', body: JSON.stringify({ data: [{ ...defaults, id: 'other', isDefault: false, fullName: 'Địa chỉ phụ' }, defaults] }) });
        writes.push({ path: url.pathname, body: JSON.parse(req.postData()) });
        return setTimeout(() => void req.respond({ headers, contentType: 'application/json', body: JSON.stringify({ data: { pickupContact: writes[0].body, customerShipment: { trackingNumber: 'QA-RETURN-01', carrierName: 'SCANMS Demo', provider: 'MOCK', providerStatus: 'ready_to_pick' } } }) }), 300);
      }
      if (url.origin !== origin) return req.abort();
      return req.continue();
    });
    await page.goto(origin + '/pickup-fixture', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('.pickup-contact')?.textContent.includes('Trần An'));
    assert.match(await page.$eval('.pickup-address-text', el => el.textContent), /15 Lê Duẩn/);
    assert.equal(await page.$('.pickup-card select'), null);
    assert.match(await page.$eval('.pickup-destination', el => el.textContent), /Kho Shop.*0900000000.*Đường số 2/);
    assert.ok(!(await page.$eval('.pickup-destination', el => el.textContent)).includes('Xem địa chỉ'));
    await page.screenshot({ path: join(tmpdir(), 'scanms-pickup-desktop.png') });
    const cardHeight = await page.$eval('.pickup-card', el => el.getBoundingClientRect().height);
    assert.ok(cardHeight < 360, `Card height: ${cardHeight}`);
    await page.click('.pickup-address button');
    await page.waitForFunction(() => !document.querySelector('.modal-footer .pickup-primary').disabled);
    assert.equal(await page.$eval('[role="dialog"]', el => el.getBoundingClientRect().width), 640);
    await page.select('select:not([id])', 'other');
    await page.waitForFunction(() => document.querySelector('input[autocomplete="name"]').value === 'Địa chỉ phụ');
    await page.keyboard.press('Escape');
    assert.match(await page.$eval('.pickup-contact', el => el.textContent), /Trần An/);
    await page.click('.pickup-address button');
    await page.waitForFunction(() => !document.querySelector('.modal-footer .pickup-primary').disabled);
    await page.$eval('input[autocomplete="street-address"]', el => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(el, '25 Lê Duẩn'); el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('.modal-footer .pickup-primary');
    assert.match(await page.$eval('.pickup-address-text', el => el.textContent), /25 Lê Duẩn/);
    await page.screenshot({ path: join(tmpdir(), 'scanms-pickup-desktop.png') });
    await page.setViewport({ width: 390, height: 844 });
    const tops = await page.$$eval('.pickup-dimensions input', els => els.map(el => el.getBoundingClientRect().top));
    assert.equal(new Set(tops).size, 1);
    assert.equal(await page.$eval('.pickup-card', el => el.scrollWidth <= el.clientWidth), true);
    await page.screenshot({ path: join(tmpdir(), 'scanms-pickup-mobile.png') });
    const fields = await page.$$('.pickup-parcel input');
    for (let i = 0; i < fields.length; i++) await fields[i].type(i === 0 ? '500' : '20');
    await page.click('.pickup-footer .pickup-primary');
    await page.$eval('.pickup-card form', el => el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await page.waitForSelector('[aria-label="Đã đặt lấy hàng"]');
    assert.equal(writes.length, 1);
    assert.equal(writes[0].body.name, 'Trần An');
    assert.equal(writes[0].body.weight, 500);
    assert.match(writes[0].body.address, /25 Lê Duẩn/);
    assert.match(await page.$eval('.pickup-success', el => el.textContent), /QA-RETURN-01/);
    assert.match(await page.$eval('.pickup-waybill', el => el.textContent), /Vận chuyển SCANMS/);
    assert.ok(!(await page.$eval('.pickup-waybill', el => el.textContent)).includes('Demo'));
    assert.ok(!(await page.$eval('.pickup-success', el => el.textContent)).includes('Shipper đang đến'));
    assert.equal(await page.$eval('.pickup-state', el => el.textContent), 'Chờ lấy hàng');
    assert.match(await page.$eval('.pickup-heading', el => el.textContent), /Vận đơn mô phỏng/);
    assert.match(await page.$eval('.pickup-success-footer', el => el.textContent), /500 g.*20 × 20 × 20 cm/);
    assert.equal(await page.$$eval('.pickup-success-addresses > section', els => els.length), 2);
    await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.copiedTrackingCode = value; } } }); });
    await page.click('.pickup-copy');
    await page.waitForFunction(() => document.querySelector('.pickup-copy').textContent.includes('Đã sao chép'));
    assert.equal(await page.evaluate(() => window.copiedTrackingCode), 'QA-RETURN-01');
    await page.screenshot({ path: join(tmpdir(), 'scanms-pickup-success-mobile.png') });
    await page.setViewport({ width: 1200, height: 850 });
    const panels = await page.$$eval('.pickup-success-addresses > section', els => els.map(el => { const r=el.getBoundingClientRect(); return {top:r.top,width:r.width}; }));
    assert.equal(panels[0].top, panels[1].top);
    assert.ok(Math.abs(panels[0].width-panels[1].width)<1);
    assert.ok(await page.$eval('.pickup-state', el => el.getBoundingClientRect().width < 250));
    await page.screenshot({ path: join(tmpdir(), 'scanms-pickup-success-desktop.png') });
    await page.goto(origin + '/pickup-fixture?mode=disabled', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.pickup-contact');
    assert.match(await page.$eval('.pickup-notice', el => el.textContent), /Chưa thể đặt lấy hàng/);
    assert.equal(await page.$eval('.pickup-footer .pickup-primary', el => el.disabled), true);
    assert.equal(writes.length, 1);
  } finally { await browser.close(); }
});
