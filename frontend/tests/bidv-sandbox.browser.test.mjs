import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.FLOW5_UI_TEST_URL;
const executablePath = process.env.FLOW5_UI_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

test('BIDV sandbox manager UI: independent runs, history, uncertainty and inquiry', { skip: !base || !existsSync(executablePath), timeout: 90000 }, async t => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true, pipe: true });
  const errors = [];
  async function open({ uncertain = false, configured = true } = {}) {
    const page = await browser.newPage();
    const runs = [], writes = [];
    page.on('pageerror', error => { if (error.message !== 'WebSocket closed without opened.') errors.push(error.message); });
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument(() => localStorage.setItem('token', 'isolated-bidv-ui-test'));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/')) {
        if (['data:', 'blob:'].includes(url.protocol) || url.origin === origin) return request.continue();
        return request.abort();
      }
      const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
      const path = url.pathname;
      let data;
      if (request.method() === 'POST') {
        const body = JSON.parse(request.postData());
        writes.push({ path, body });
        if (path.endsWith('/bidv-sandbox/runs')) {
          let run = runs.find(item => item.runId === body.runId);
          if (!run) {
            run = { runId: body.runId, environment: 'SANDBOX', status: uncertain ? 'UNKNOWN' : 'VERIFY_REQUIRED', settlementConfirmed: false,
              createdAt: '2026-11-02T06:00:00Z', request: { transDate: '261102', amount: '1864800' },
              correlation: { idempotencyKey: body.runId, interactionId: '11111111-1111-4111-8111-111111111111' },
              events: [{ id: 'start', action: 'BIDV_SANDBOX_TRANSFER_STARTED', createdAt: '2026-11-02T06:00:00Z' },
                { id: 'result', action: 'BIDV_SANDBOX_RESULT', operation: 'transfer', createdAt: '2026-11-02T06:00:02Z', message: uncertain ? 'Chưa xác định kết quả.' : 'Chưa xác nhận trạng thái hạch toán.',
                  ...(!uncertain ? { response: { httpStatus: 200, errorCode: '000', errorDesc: 'SUCCESS', transactions: [], listValid: false } } : {}) }] };
            runs.push(run);
          }
          data = run;
        } else if (path.endsWith('/inquiry')) {
          data = runs[0];
          data.status = 'VERIFY_REQUIRED';
          data.events.push({ id: `start-${body.operationId}`, operationId: body.operationId, rootSource: body.rootSource, action: 'BIDV_SANDBOX_INQUIRY_STARTED', createdAt: '2026-11-02T06:00:59Z' });
          data.events.push({ id: body.operationId, operationId: body.operationId, action: 'BIDV_SANDBOX_RESULT', operation: 'inquiry', createdAt: '2026-11-02T06:01:00Z', correlationMatched: false,
            response: { httpStatus: 200, errorCode: '000', errorDesc: 'SUCCESS', listValid: true,
              transactions: [{ rootRequestId: 'DIFFERENT-REQUEST', amount: '1000000', detailCode: '000', accountingDate: '261102', bidvId: 'BIDV-TEST-REF' }] } });
        } else { errors.push(`Unexpected payment mutation: ${path}`); return request.abort(); }
      } else if (path.endsWith('/bidv-sandbox/configuration')) data = { configured, message: configured ? 'Sẵn sàng BIDV Sandbox.' : 'BIDV Sandbox chưa được bật.', grossAmount: '2072000', taxAmount: '207200',
        fixture: { credit: '0129837294', bankCode: '970406', beneficiaryName: 'momo', amount: '1864800' } };
      else if (path.endsWith('/bidv-sandbox/runs')) data = { runs };
      else if (path.includes('/bidv-sandbox/runs/')) data = runs.find(run => path.endsWith(run.runId));
      else if (path.endsWith('/gateway')) data = { configured: false, message: 'Chọn Thử với BIDV Sandbox.' };
      else if (path.endsWith('/stats')) data = { pending: { count: 0, grossAmount: '0', taxAmount: '0', netAmount: '0' }, approved: { count: 0, grossAmount: '0', taxAmount: '0', netAmount: '0' }, processingCount: 0, totalRequests: 0 };
      else if (path.endsWith('/admin/payouts')) data = { requests: [], total: 0 };
      else { errors.push(`Unexpected API: ${path}`); return request.abort(); }
      return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
    });
    await page.goto(`${origin}/tests/flow5-finance.html`, { waitUntil: 'networkidle0' });
    return { page, writes };
  }
  async function click(page, text) {
    await page.waitForFunction(text => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === text && !button.disabled), {}, text);
    await page.evaluate(text => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === text).click(), text);
  }
  async function disclose(page, text) {
    const handle = await page.evaluateHandle(text => [...document.querySelectorAll('[role=dialog] summary')].find(summary => summary.textContent.startsWith(text)), text);
    await handle.asElement().click();
    await handle.dispose();
  }
  try {
    await t.test('no bill, one transfer, explicit source for inquiry and persistent history after reload', async () => {
      const { page, writes } = await open();
      await click(page, 'BIDV Sandbox · lịch sử thử nghiệm');
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Gửi giao dịch mẫu' && !button.disabled));
      assert.equal(await page.$('input[type=file]'), null);
      assert.equal(await page.$('[role=dialog] select'), null);
      mkdirSync('../artifacts/flow5', { recursive: true });
      await page.screenshot({ path: '../artifacts/flow5/bidv-sandbox-ready-desktop.png', fullPage: true });
      await page.evaluate(() => {
        const button = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Gửi giao dịch mẫu');
        button.click(); button.click();
      });
      await page.waitForFunction(() => document.body.innerText.includes('Đã nhận phản hồi thử nghiệm'));
      assert.equal(writes.length, 1);
      assert.deepEqual(Object.keys(writes[0].body), ['runId']);
      const runId = writes[0].body.runId;
      assert.equal(await page.$eval('[role=dialog]', dialog => dialog.innerText.includes('X-Idempotency-Key')), false);
      // Progressive disclosure is keyboard-accessible inside the modal focus trap.
      await page.$eval('.bidv-details-group > details:nth-child(2) > summary', summary => summary.focus());
      await page.keyboard.press('Enter');
      assert.ok(await page.$eval('.bidv-details-group > details:nth-child(2)', details => details.open));
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.tagName), 'SELECT');
      assert.ok(await page.$$eval('button', nodes => nodes.find(node => node.textContent.trim() === 'Vấn tin thử BIDV').disabled));
      await page.select('.bidv-details-group select', 'IDEMPOTENCY_KEY');
      await click(page, 'Vấn tin thử BIDV');
      await page.waitForFunction(() => document.querySelector('[role=dialog]')?.textContent.includes('BIDV-TEST-REF'));
      await disclose(page, 'Lịch sử xử lý');
      await page.waitForFunction(() => document.body.innerText.includes('BIDV-TEST-REF'));
      assert.equal(await page.$$eval('.bidv-operation', nodes => nodes.length), 2);
      assert.deepEqual(await page.$$eval('.bidv-event-log summary', nodes => nodes.filter(node => node.textContent.includes('Nhật ký')).map(node => node.textContent.trim())), ['Nhật ký chi tiết (2)', 'Nhật ký chi tiết (2)']);
      assert.ok(await page.$eval('.bidv-timeline', element => element.innerText.includes('Chưa khớp mã gốc và số tiền')));
      await page.$eval('.bidv-details-group', element => element.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: '../artifacts/flow5/bidv-sandbox-details-desktop.png', fullPage: true });
      await disclose(page, 'Lịch sử xử lý');
      await page.$eval('.bidv-inquiry', element => element.scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: '../artifacts/flow5/bidv-sandbox-inquiry-desktop.png', fullPage: true });
      assert.equal(writes.length, 2);
      assert.equal(writes[1].body.rootSource, 'IDEMPOTENCY_KEY');
      assert.equal(writes[1].path, `/api/admin/payouts/bidv-sandbox/runs/${runId}/inquiry`);
      assert.equal(await page.$$eval('[role=dialog]', nodes => nodes[0].textContent.includes('Đã giải ngân')), false);
      await page.reload({ waitUntil: 'networkidle0' });
      await click(page, 'BIDV Sandbox · lịch sử thử nghiệm');
      await page.waitForFunction(() => document.querySelector('[role=dialog]')?.textContent.includes('BIDV-TEST-REF'));
      assert.ok(await page.$eval('[role=dialog]', (dialog, id) => dialog.textContent.includes(id) && dialog.textContent.includes('BIDV-TEST-REF'), runId));
      assert.equal(await page.$eval('[role=dialog]', dialog => dialog.innerText.includes('X-Idempotency-Key')), false);
      assert.equal(writes.length, 2);
      mkdirSync('../artifacts/flow5', { recursive: true });
      await page.screenshot({ path: '../artifacts/flow5/bidv-sandbox-desktop.png', fullPage: true });
      await page.setViewport({ width: 390, height: 844 });
      assert.ok(await page.$eval('body', body => body.scrollWidth <= innerWidth + 1));
      assert.ok(await page.$eval('[role=dialog]', dialog => dialog.scrollWidth <= dialog.clientWidth + 1));
      assert.ok(await page.$eval('.modal-footer .payout-primary', button => { const rect = button.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= innerHeight; }));
      await page.screenshot({ path: '../artifacts/flow5/bidv-sandbox-mobile.png', fullPage: true });
      await disclose(page, 'Thông tin kỹ thuật');
      assert.ok(await page.$eval('[role=dialog]', dialog => dialog.scrollWidth <= dialog.clientWidth + 1));
      await page.$eval('.bidv-inquiry', element => element.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: '../artifacts/flow5/bidv-sandbox-inquiry-mobile.png', fullPage: true });
      await disclose(page, 'Thông tin kỹ thuật');
      await disclose(page, 'Lịch sử xử lý');
      await page.$eval('.bidv-details-group', element => element.scrollIntoView({ block: 'start' }));
      assert.ok(await page.$eval('[role=dialog]', dialog => dialog.scrollWidth <= dialog.clientWidth + 1));
      await page.screenshot({ path: '../artifacts/flow5/bidv-sandbox-details-mobile.png', fullPage: true });
      await click(page, 'Tạo lượt thử mới');
      await page.waitForFunction(() => document.body.innerText.includes('Gửi giao dịch mẫu'));
      await page.screenshot({ path: '../artifacts/flow5/bidv-sandbox-ready-mobile.png', fullPage: true });
      await disclose(page, 'Các lượt thử gần đây');
      await page.select('[role=dialog] select', runId);
      await page.waitForFunction(() => document.querySelector('[role=dialog]')?.textContent.includes('BIDV-TEST-REF'));
      assert.equal(writes.length, 2);
      await page.close();
    });
    await t.test('unknown result cannot automatically send again; refresh is read-only', async () => {
      const { page, writes } = await open({ uncertain: true });
      await click(page, 'BIDV Sandbox · lịch sử thử nghiệm');
      await click(page, 'Gửi giao dịch mẫu');
      await page.waitForFunction(() => document.body.innerText.includes('Chưa xác định kết quả'));
      assert.equal(await page.$$eval('button', nodes => nodes.some(node => node.textContent.trim() === 'Tạo lượt thử mới')), false);
      await click(page, 'Tải lại kết quả');
      assert.equal(writes.length, 1);
      await page.close();
    });
    await t.test('unavailable sandbox shows the cause without a dead transfer button', async () => {
      const { page, writes } = await open({ configured: false });
      await click(page, 'BIDV Sandbox · lịch sử thử nghiệm');
      await page.waitForFunction(() => document.body.innerText.includes('BIDV Sandbox chưa được bật.'));
      assert.equal(await page.$('[role=dialog] .payout-primary'), null);
      await click(page, 'Đóng');
      assert.equal(await page.$('[role=dialog]'), null);
      assert.equal(writes.length, 0);
      await page.close();
    });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
