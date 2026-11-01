import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.FLOW5_UI_TEST_URL;
const executablePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
test('bonus page shows linked store without rules and distinguishes load failures', {
  skip: !base || !existsSync(executablePath), timeout: 45000,
}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const user = { id: '11111111-1111-4111-8111-111111111111', role: 'COLLABORATOR', fullName: 'KOC' };
  const store = { id: '22222222-2222-4222-8222-222222222222', name: 'Sora Skincare & Cosmetics', activeRulesCount: 0 };
  let failStores = false;
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(user => {
      localStorage.setItem('token', 'fixture-bonus');
      localStorage.setItem('user', JSON.stringify(user));
    }, user);
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/')) return request.continue();
      const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,authorization,x-skip-cache',
        'Access-Control-Allow-Methods': 'GET,OPTIONS' };
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
      let data = [];
      if (url.pathname === '/api/auth/me') data = user;
      if (url.pathname === '/api/collaborator/stores') {
        if (failStores) return request.respond({ status: 500, headers, body: JSON.stringify({ message: 'Unavailable' }) });
        data = [store];
      }
      if (url.pathname.endsWith('/bonus-progress')) data = {
        storeId: store.id, storeName: store.name, validRevenue: '0', validOrdersCount: 0,
        estimatedTotalBonus: '0', achievementBonus: '0', rangeBonuses: [], milestones: [],
        nextMilestone: null, currentMilestone: null, settlementStatus: 'ACCUMULATING',
        settlement: null, hasRefundAdjustment: false, yearMonth: '2026-10',
      };
      return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
    });
    await page.goto(`${origin}/collaborator/bonus-progress`);
    await page.waitForFunction(() => document.body.innerText.includes('Chưa có mốc thưởng được thiết lập'));
    assert.ok(await page.$eval('body', el => el.textContent.includes('Sora Skincare & Cosmetics')));
    assert.equal(await page.$eval('body', el => el.textContent.includes('Chưa có Shop liên kết')), false);
    failStores = true;
    await page.reload();
    await page.waitForFunction(() => document.body.innerText.includes('Không thể tải danh sách gian hàng'));
    assert.equal(await page.$eval('body', el => el.textContent.includes('Chưa có gian hàng liên kết')), false);
  } finally { await browser.close(); }
});
