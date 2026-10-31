import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.FLOW5_UI_TEST_URL;
const executablePath = process.env.FLOW5_UI_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
test('Flow 5: real report rendering, empty/error states, escrow pagination, approval review and printable receipt', { skip: !base || !existsSync(executablePath), timeout: 60000 }, async () => {
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true, pipe: true });
  const origin = new URL(base).origin;
  const errors = [];
  const id = '28b2b124-12d2-47f8-881f-c3107ee71084';
  let escrowPage = 0;
  let failReport = false;
  let referralReviewed = false;
  async function open(view = '') {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    page.on('pageerror', error => { if (error.message !== 'WebSocket closed without opened.') errors.push(error.message); });
    await page.evaluateOnNewDocument(() => { localStorage.setItem('token', 'isolated-ui-test'); });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/')) {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'authorization,content-type,x-skip-cache', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        let data = {};
        if (url.pathname.endsWith('/referral-review')) {
          const decision = JSON.parse(request.postData());
          assert.equal(decision.outcome, 'CLEARED');
          assert.ok(decision.reason.length >= 10);
          referralReviewed = true;
          data = { outcome: 'CLEARED' };
        } else if (url.pathname.endsWith('/gateway')) data = { configured: true };
        else if (url.pathname.endsWith('/stores/all-admin')) data = [];
        else if (url.pathname.endsWith('/tax-report')) data = { yearMonth: '2026-10', gross: '2072000', tax: '207200', net: '1864800', items: [], missingTaxCodes: [] };
        else if (url.pathname.endsWith('/ledger-reconciliation')) data = { balanced: true, items: [{ account: 'CUSTOMER_FUNDS', walletAmount: '100000', bookAmount: '100000', difference: '0' }] };
        else if (url.pathname.endsWith('/stats')) data = { pending: { count: 1, grossAmount: '2072000', taxAmount: '207200', netAmount: '1864800' }, approved: { count: 0, grossAmount: '0', taxAmount: '0', netAmount: '0' }, processingCount: 0, totalRequests: 1 };
        else if (url.pathname.endsWith('/escrow')) {
          escrowPage = Number(url.searchParams.get('page'));
          data = { total: 21, page: escrowPage, limit: 20, holdDays: 7, pendingAmount: '72000', items: escrowPage === 1 ? [{ id, commissionAmount: '72000', availableAt: '2026-11-07T00:00:00Z', order: { id, externalOrderSn: 'FLOW5-REAL-ORDER', status: 'DELIVERED', store: { name: 'Nhãn hàng kiểm thử' }, returnRequest: null, referralReviewRequired: !referralReviewed, referralRiskSignals: ['SHARED_DELIVERY_ADDRESS'] } }] : [] };
        } else if (url.pathname.endsWith('/admin/payouts')) data = { requests: [{ id, collaboratorId: id, collaboratorName: 'Đối tác kiểm thử', kycStatus: 'VERIFIED', amount: '2072000', taxAmount: '207200', netAmount: '1864800', status: 'PENDING', bankName: 'MB', bankAccountNumber: '001234', bankAccountName: 'TEST CREATOR', hasBill: false, createdAt: '2026-10-31T00:00:00Z' }], total: 1 };
        else if (url.pathname.endsWith('/executive-summary')) {
          if (failReport) return request.respond({ status: 500, headers, body: JSON.stringify({ message: 'Unavailable' }) });
          data = { asOf: '2026-10-31T00:00:00Z', gmv: '52000000', netRevenue: '52000000', ordersCount: 12, affiliateExpense: '5000000', affiliateExpenseRatio: '9.62', escrowPending: '72000', availableEarnings: '2072000', grossPaid: '2072000', netPaid: '1864800', taxWithheld: '207200', holdDays: 14 };
        } else if (url.pathname.endsWith('/tax-invoices')) data = { items: [{ id, amount: '2072000', taxAmount: '207200', netAmount: '1864800', bankRefCode: 'FT-TEST', processedAt: '2026-10-31T00:00:00Z' }] };
        else if (url.pathname.includes('/tax-invoices/')) data = { id, amount: '2072000', taxAmount: '207200', netAmount: '1864800', bankRefCode: 'FT-TEST', processedAt: '2026-10-31T00:00:00Z', collaborator: { fullName: '<script>unsafe</script>', collaboratorProfile: { taxCode: 'TEST' } }, bankAccountNumber: '••••1234' };
        else return request.respond({ status: 400, headers, body: JSON.stringify({ message: 'Unexpected test API' }) });
        return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
      }
      if (url.origin !== origin && !url.protocol.startsWith('data')) return request.abort();
      request.continue();
    });
    await page.goto(`${origin}/tests/flow5-finance.html${view ? `?view=${view}` : ''}`, { waitUntil: 'networkidle0' });
    return page;
  }
  async function clickText(page, text) {
    await page.evaluate(text => { const button = [...document.querySelectorAll('button')].find(button => button.textContent.includes(text)); if (!button) throw new Error(`Missing button: ${text}`); button.click(); }, text);
  }
  try {
    mkdirSync('../artifacts/flow5', { recursive: true });
    const admin = await open();
    await admin.waitForFunction(() => document.body.innerText.includes('Đối tác kiểm thử'));
    await clickText(admin, 'Xem báo cáo thuế');
    await admin.waitForFunction(() => document.body.innerText.includes('0 khoản chi đã xác nhận trong kỳ'));
    await clickText(admin, 'Đối chiếu sổ cái');
    await admin.waitForFunction(() => document.body.innerText.includes('Sổ cái khớp số dư ví'));
    await clickText(admin, 'Duyệt & Tải UNC');
    assert.ok(await admin.$('input[required][maxlength="100"]'));
    assert.ok((await admin.$eval('body', element => element.innerText)).includes('Duyệt chuyển khoản qua ngân hàng'));
    await admin.screenshot({ path: '../artifacts/flow5/payout-review.png', fullPage: true });
    await clickText(admin, 'Hủy');
    await clickText(admin, 'Escrow');
    await admin.waitForFunction(() => document.body.innerText.includes('FLOW5-REAL-ORDER'));
    assert.equal(escrowPage, 1);
    await admin.waitForSelector('textarea[aria-label="Lý do kết luận thẩm định tự mua"]');
    assert.ok(await admin.$$eval('button', buttons => buttons.find(button => button.textContent.includes('Xác nhận hợp lệ')).disabled));
    await admin.type('textarea[aria-label="Lý do kết luận thẩm định tự mua"]', 'Đã đối chiếu người mua và KOC là hai người khác nhau');
    await clickText(admin, 'Xác nhận hợp lệ');
    await admin.waitForFunction(() => !document.querySelector('textarea[aria-label="Lý do kết luận thẩm định tự mua"]'));
    assert.equal(referralReviewed, true);
    assert.ok(!(await admin.$eval('body', element => element.innerText)).includes('158.400.000'));
    await clickText(admin, 'Sau');
    await admin.waitForFunction(() => document.body.innerText.includes('Không có khoản thu nhập đang tạm giữ.'));
    assert.equal(escrowPage, 2);
    await admin.setViewport({ width: 390, height: 844 });
    assert.ok(await admin.$eval('body', element => element.scrollWidth <= window.innerWidth + 1));
    await admin.screenshot({ path: '../artifacts/flow5/escrow-mobile.png', fullPage: true });
    const executive = await open('executive');
    assert.ok((await executive.$eval('body', element => element.innerText)).includes('9.62%'));
    await executive.screenshot({ path: '../artifacts/flow5/executive.png', fullPage: true });
    failReport = true; await clickText(executive, 'Làm mới');
    await executive.waitForSelector('[role="alert"]');
    assert.ok(!(await executive.$eval('body', element => element.innerText)).includes('9.62%'));
    const partner = await open('partner');
    const popupPromise = new Promise(resolve => partner.once('popup', resolve));
    await clickText(partner, 'In / Lưu PDF');
    const popup = await popupPromise;
    await popup.waitForFunction(() => document.body.innerText.includes('FT-TEST'));
    assert.equal(await popup.$('script'), null);
    assert.ok((await popup.$eval('body', element => element.innerText)).includes('<script>unsafe</script>'));
    await popup.screenshot({ path: '../artifacts/flow5/statement.png', fullPage: true });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
