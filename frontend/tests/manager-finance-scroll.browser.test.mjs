import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const base = process.env.FLOW5_UI_TEST_URL;
test('manager can scroll the finance workspace down and back up', { skip: !base, timeout: 60000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: process.env.FLOW5_UI_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, pipe: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 800 });
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('token', 'isolated-scroll-test');
      localStorage.setItem('user', JSON.stringify({ id: 'scroll-manager', role: 'SYSTEM_MANAGER', fullName: 'Scroll Manager' }));
    });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/')) return url.origin === origin ? request.continue() : request.abort();
      const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'authorization,content-type,x-skip-cache' };
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
      let data = { items: [], requests: [], total: 0 };
      if (url.pathname.endsWith('/auth/me')) data = { id: 'scroll-manager', role: 'SYSTEM_MANAGER', fullName: 'Scroll Manager' };
      if (url.pathname.endsWith('/stats')) data = { pending: { count: 0 }, approved: { count: 0 }, processingCount: 0, totalRequests: 0 };
      if (url.pathname.endsWith('/gateway')) data = { configured: false };
      if (url.pathname.endsWith('/admin/payouts')) data = { total: 20, requests: Array.from({ length: 20 }, (_, i) => ({ id: `scroll-payout-${i}`, collaboratorId: `kol-${i}`, collaboratorName: `Đối tác ${i + 1}`, kycStatus: 'VERIFIED', amount: '200000', taxAmount: '0', netAmount: '200000', status: 'PENDING', bankName: 'Test Bank', bankAccountNumber: '123456789', bankAccountName: 'TEST KOL', createdAt: '2026-11-01T00:00:00Z' })) };
      return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
    });
    await page.goto(`${origin}/admin/finance/payouts`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#admin-finance-payouts-page');
    const column = '.workspace-page-column';
    assert.equal(await page.$eval(column, el => getComputedStyle(el).overflowY), 'auto');
    assert.ok(await page.$eval(column, el => el.scrollHeight > el.clientHeight), 'finance content must extend below the viewport');
    const rect = await page.$eval(column, el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.move(rect.x, rect.y);
    await page.mouse.wheel({ deltaY: 600 });
    await page.waitForFunction(() => document.querySelector('.workspace-page-column').scrollTop > 0);
    await page.mouse.wheel({ deltaY: -2000 });
    await page.waitForFunction(() => document.querySelector('.workspace-page-column').scrollTop === 0);
    await page.setViewport({ width: 390, height: 844 });
    assert.notEqual(await page.$eval(column, el => getComputedStyle(el).overflowY), 'hidden');
  } finally { await browser.close(); }
});
