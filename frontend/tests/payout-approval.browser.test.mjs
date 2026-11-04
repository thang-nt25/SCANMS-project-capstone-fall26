import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.FLOW5_UI_TEST_URL;
const executablePath = process.env.FLOW5_UI_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

test('Manager payout: bank approval, manual evidence and isolated simulation', { skip: !base || !existsSync(executablePath), timeout: 90000 }, async t => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true, pipe: true });
  const errors = [];
  const id = '28b2b124-12d2-47f8-881f-c3107ee71084';

  async function open({ configured = false, timeout = false, blocked = false, provider = 'GATEWAY' } = {}) {
    const page = await browser.newPage();
    const writes = [];
    let status = 'PENDING';
    page.on('pageerror', error => { if (error.message !== 'WebSocket closed without opened.') errors.push(error.message); });
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('token', 'isolated-payout-ui-test');
      window.simulationDownloads = [];
      const send = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.send = function (body) {
        if (body instanceof FormData) window.manualProof = {
          bankRefCode: body.get('bankRefCode'),
          note: body.get('note'),
          filename: body.get('bill')?.name,
        };
        return send.call(this, body);
      };
      const original = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (this.download) window.simulationDownloads.push({ filename: this.download, body: fetch(this.href).then(res => res.json()) });
        else original.call(this);
      };
    });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/')) {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        let data;
        if (request.method() !== 'GET') {
          writes.push({ path: url.pathname, method: request.method(), body: request.postData() });
          if (url.pathname === `/api/payouts/${id}/approve`) {
            status = timeout ? 'PROCESSING' : 'APPROVED';
            if (timeout) return request.respond({ status: 503, headers, body: JSON.stringify({ message: 'Chưa xác định kết quả ngân hàng. Cần đối soát.' }) });
          } else if (url.pathname === `/api/payouts/${id}/reconcile`) status = 'APPROVED';
          else if (url.pathname === `/api/admin/payouts/${id}/approve` && request.method() === 'PATCH') status = 'APPROVED';
          else {
            errors.push(`Unexpected mutation: ${request.method()} ${url.pathname}`);
            return request.abort();
          }
          data = { status, provider, bankRefCode: provider === 'BIDV_SANDBOX' ? `SBX-${id}` : 'TEST-PROVIDER-REF' };
        } else if (url.pathname.endsWith('/gateway')) data = { configured, provider, message: configured ? 'Gateway kiểm thử đã cấu hình.' : 'API chi hộ BIDV chưa được tích hợp.' };
        else if (url.pathname.endsWith('/stats')) data = { pending: { count: status === 'PENDING' ? 1 : 0, grossAmount: '2000000', taxAmount: '200000', netAmount: '1800000' }, approved: { count: status === 'APPROVED' ? 1 : 0, grossAmount: '0', taxAmount: '0', netAmount: '0' }, processingCount: status === 'PROCESSING' ? 1 : 0, totalRequests: 1 };
        else if (url.pathname.endsWith('/admin/payouts')) data = { requests: [{ id, collaboratorId: id, collaboratorName: 'KOC kiểm thử', kycStatus: 'VERIFIED', amount: '2000000', taxAmount: '200000', netAmount: '1800000', status, bankName: 'Bank Test', bankAccountNumber: '000000', bankAccountName: 'KOC TEST', hasBill: false, bankRefCode: status === 'APPROVED' ? 'TEST-PROVIDER-REF' : null, createdAt: '2026-11-02T00:00:00Z', ...(blocked ? { risk: { status: 'BLOCKED', passedChecks: 0, totalChecks: 1, checks: [] } } : {}) }], total: 1 };
        else { errors.push(`Unexpected API: ${url.pathname}`); return request.abort(); }
        if (data?.requests) data.requests.forEach(item => {
          item.transferProvider = status === 'PENDING' ? null : provider;
          if (provider === 'BIDV_SANDBOX' && status === 'APPROVED') item.bankRefCode = `SBX-${id}`;
        });
        return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
      }
      if (url.protocol === 'blob:' || url.protocol === 'data:' || url.origin === origin) return request.continue();
      return request.abort();
    });
    await page.goto(`${origin}/tests/flow5-finance.html`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('KOC kiểm thử'));
    return { page, writes };
  }

  async function click(page, text) {
    await page.waitForFunction(text => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === text && !button.disabled), {}, text);
    await page.evaluate(text => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === text).click(), text);
  }

  try {
    await t.test('BIDV Sandbox completes the selected KOL request with no bill and clear Sandbox labels', async () => {
      const { page, writes } = await open({ configured: true, provider: 'BIDV_SANDBOX' });
      await click(page, 'Duyệt chi trả');
      assert.equal(await page.$('[role="dialog"] input[type="file"]'), null);
      assert.equal(await page.$eval('[role="dialog"]', node => node.innerText.includes('Không chuyển tiền ngoài đời')), true);
      mkdirSync('../artifacts/flow5', { recursive: true });
      await page.screenshot({ path: '../artifacts/flow5/payout-bidv-integrated-desktop.png', fullPage: true });
      await page.setViewport({ width: 390, height: 844 });
      assert.ok(await page.$eval('[role="dialog"]', node => node.scrollWidth <= node.clientWidth + 1));
      await page.screenshot({ path: '../artifacts/flow5/payout-bidv-integrated-mobile.png', fullPage: true });
      await page.evaluate(() => {
        const button = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Duyệt qua BIDV Sandbox');
        button.click(); button.click();
      });
      await page.waitForFunction(() => document.body.innerText.includes('Hoàn tất · Sandbox'));
      assert.equal(await page.evaluate(id => document.body.innerText.includes(`Mã Sandbox: SBX-${id}`), id), true);
      assert.equal(writes.length, 1);
      assert.equal(writes[0].path, `/api/payouts/${id}/approve`);
      await page.close();
    });

    await t.test('Sandbox timeout reconciles the same request and does not offer manual live confirmation', async () => {
      const { page, writes } = await open({ configured: true, provider: 'BIDV_SANDBOX', timeout: true });
      await click(page, 'Duyệt chi trả');
      await click(page, 'Duyệt qua BIDV Sandbox');
      await click(page, 'Đối soát chi trả');
      assert.equal(await page.$eval('[role="dialog"]', node => node.innerText.includes('Đã chuyển khoản thủ công')), false);
      await click(page, 'Đối soát kết quả ngân hàng');
      await page.waitForFunction(() => document.body.innerText.includes('Hoàn tất · Sandbox'));
      assert.deepEqual(writes.map(item => item.path), [`/api/payouts/${id}/approve`, `/api/payouts/${id}/reconcile`]);
      await page.close();
    });

    await t.test('API approval needs no bill, submits once and displays bank reference', async () => {
      const { page, writes } = await open({ configured: true });
      await click(page, 'Duyệt chi trả');
      assert.equal(await page.$('[role="dialog"] input[type="file"]'), null);
      assert.equal(await page.$('[role="dialog"] input[maxlength="100"]'), null);
      await page.evaluate(() => {
        const button = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Duyệt chuyển khoản qua ngân hàng');
        button.click(); button.click();
      });
      await page.waitForFunction(() => document.body.innerText.includes('Mã ngân hàng: TEST-PROVIDER-REF'));
      assert.equal(writes.length, 1);
      assert.equal(writes[0].path, `/api/payouts/${id}/approve`);
      assert.deepEqual(JSON.parse(writes[0].body), {});
      await page.close();
    });

    await t.test('manual proof remains mandatory and is cleared when the review is reopened', async () => {
      const { page, writes } = await open();
      await click(page, 'Duyệt chi trả');
      assert.equal(await page.$$eval('[role=dialog] button', buttons => buttons.some(button => button.textContent.includes('Duyệt chuyển khoản qua ngân hàng'))), false);
      assert.equal(await page.$eval('[role=dialog] .payout-primary', button => button.textContent.trim()), 'Chưa kết nối chi trả');
      assert.equal(await page.$eval('[role=dialog] .payout-primary', button => button.disabled), true);
      assert.equal(await page.$$eval('[role=dialog] button', buttons => buttons.some(button => /Sandbox|giao dịch mẫu/.test(button.textContent))), false);
      assert.equal(await page.$eval('[role=dialog]', dialog => dialog.innerText.includes('Chưa thể chuyển tiền qua API')), true);
      assert.equal(await page.$eval('[role=dialog]', dialog => dialog.innerText.includes('API chi hộ BIDV chưa được tích hợp.')), false);
      mkdirSync('../artifacts/flow5', { recursive: true });
      await page.screenshot({ path: '../artifacts/flow5/payout-approval-desktop.png', fullPage: true });
      await page.click('input[name="payout-method"]:not(:checked)');
      assert.equal(await page.$eval('input[type="file"]', input => input.required), true);
      assert.equal(await page.$eval('input[maxlength="100"]', input => input.required), true);
      await page.type('input[maxlength="100"]', 'OLD-REFERENCE');
      await click(page, 'Xác nhận đã chuyển khoản');
      assert.equal(writes.length, 0);
      await click(page, 'Hủy');
      await click(page, 'Duyệt chi trả');
      await page.click('input[name="payout-method"]:not(:checked)');
      assert.equal(await page.$eval('input[maxlength="100"]', input => input.value), '');
      assert.equal(await page.$eval('input[type="file"]', input => input.files.length), 0);
      await page.close();
    });

    await t.test('manual confirmation uploads the chosen evidence and reference once', async () => {
      const { page, writes } = await open();
      await click(page, 'Duyệt chi trả');
      await page.click('input[name="payout-method"]:not(:checked)');
      await page.type('input[maxlength="100"]', ' test-manual-ref ');
      await page.type('input[maxlength="500"]', 'Isolated UI test');
      await page.evaluate(() => {
        const transfer = new DataTransfer();
        const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFoQAAAAASUVORK5CYII='), char => char.charCodeAt(0));
        transfer.items.add(new File([png], 'test-receipt.png', { type: 'image/png' }));
        const input = document.querySelector('input[type="file"]');
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await page.evaluate(() => { const button = document.querySelector('button[type="submit"]'); button.click(); button.click(); });
      await page.waitForFunction(() => document.body.innerText.includes('Mã ngân hàng: TEST-PROVIDER-REF'));
      assert.equal(writes.length, 1);
      assert.equal(writes[0].method, 'PATCH');
      assert.equal(writes[0].path, `/api/admin/payouts/${id}/approve`);
      assert.deepEqual(await page.evaluate(() => window.manualProof), { bankRefCode: 'TEST-MANUAL-REF', note: 'Isolated UI test', filename: 'test-receipt.png' });
      await page.close();
    });

    await t.test('uncertain bank result reloads PROCESSING and next action reconciles instead of sending again', async () => {
      const { page, writes } = await open({ configured: true, timeout: true });
      await click(page, 'Duyệt chi trả');
      await click(page, 'Duyệt chuyển khoản qua ngân hàng');
      await click(page, 'Đối soát chi trả');
      await click(page, 'Đối soát kết quả ngân hàng');
      await page.waitForFunction(() => document.body.innerText.includes('Mã ngân hàng: TEST-PROVIDER-REF'));
      assert.deepEqual(writes.map(item => item.path), [`/api/payouts/${id}/approve`, `/api/payouts/${id}/reconcile`]);
      await page.close();
    });

    await t.test('risk-blocked requests cannot use either approval method', async () => {
      const { page, writes } = await open({ configured: true, blocked: true });
      await click(page, 'Duyệt chi trả');
      assert.ok(await page.$$eval('button', buttons => buttons.find(button => button.textContent.includes('Duyệt chuyển khoản qua ngân hàng')).disabled));
      await page.click('input[name="payout-method"]:not(:checked)');
      assert.ok(await page.$eval('button[type="submit"]', button => button.disabled));
      assert.equal(writes.length, 0);
      await page.close();
    });

    await t.test('all local simulation scenarios leave real payout data untouched', async () => {
      const { page, writes } = await open();
      await click(page, 'Thử quy trình chi trả');
      await click(page, 'Duyệt thử');
      await page.waitForFunction(() => document.body.innerText.includes('Mô phỏng thành công'));
      await click(page, 'Tải kết quả mô phỏng');
      const result = await page.evaluate(async () => ({ filename: window.simulationDownloads[0].filename, data: await window.simulationDownloads[0].body }));
      assert.match(result.filename, /^SIM-.*\.json$/);
      assert.equal(result.data.simulated, true);
      assert.equal(result.data.source, 'SCANMS_LOCAL_SIMULATION');
      assert.equal(result.data.status, 'succeeded');
      assert.equal(result.data.amount, '1800000.00');
      assert.equal('payoutId' in result.data, false);
      await click(page, 'Thử lại');
      await page.select('select', 'processing');
      await click(page, 'Duyệt thử');
      await click(page, 'Đối soát thử');
      await page.waitForFunction(() => document.body.innerText.includes('Mô phỏng thành công'));
      await click(page, 'Thử lại');
      await page.select('select', 'failed');
      await click(page, 'Duyệt thử');
      await page.waitForFunction(() => document.body.innerText.includes('Mô phỏng: giao dịch thất bại'));
      await page.setViewport({ width: 390, height: 844 });
      assert.ok(await page.$eval('body', body => body.scrollWidth <= innerWidth + 1));
      mkdirSync('../artifacts/flow5', { recursive: true });
      await page.screenshot({ path: '../artifacts/flow5/payout-simulation-mobile.png', fullPage: true });
      await click(page, 'Đóng mô phỏng');
      await click(page, 'Duyệt chi trả');
      assert.equal(await page.$$eval('[role=dialog] button', buttons => buttons.some(button => button.textContent.trim() === 'Thử với dữ liệu mẫu')), false);
      assert.ok(await page.$eval('[role=dialog]', dialog => dialog.scrollWidth <= dialog.clientWidth + 1));
      await page.screenshot({ path: '../artifacts/flow5/payout-approval-mobile.png', fullPage: true });
      await click(page, 'Hủy');
      assert.ok(await page.$$eval('button', buttons => buttons.some(button => button.textContent.trim() === 'Duyệt chi trả')));
      assert.equal(writes.length, 0);
      await page.close();
    });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
