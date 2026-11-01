import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const base = process.env.WITHDRAWAL_UI_TEST_URL;
const browserPath = process.env.WITHDRAWAL_UI_BROWSER_PATH;
test('wallet disables stale withdrawals on a network outage and recovers with fresh data', { skip: !base || !browserPath, timeout: 60000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, pipe: true });
  try {
    const page = await browser.newPage();
    let offline = false;
    let mutations = 0;
    const summary = { stores: [{ storeId: '38b2b124-12d2-47f8-881f-c3107ee71084', storeName: 'Test Shop', availableBalance: '500000.00', pendingBalance: '0.00', isActive: true }], availableBalance: '500000.00', pendingBalance: '0.00', unallocatedAvailableBalance: '0.00', unallocatedPendingBalance: '0.00', minimumWithdrawalAmount: '200000.00', withdrawalTaxPolicy: { threshold: '2000000.00', rate: '0.10' }, kycStatus: 'VERIFIED', canWithdraw: true, bankAccount: { bankName: 'Test Bank', maskedAccountNumber: '••••1234', accountName: 'TEST KOL' } };
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('token', 'isolated-browser-test-token');
      localStorage.setItem('user', JSON.stringify({ id: 'test-kol', role: 'COLLABORATOR', fullName: 'Test KOL' }));
      const interval = window.setInterval.bind(window);
      window.setInterval = (callback, delay, ...args) => {
        if (delay === 30000) window.qaWalletPoll = () => callback(...args);
        return interval(callback, delay, ...args);
      };
    });
    await page.setRequestInterception(true);
    page.on('request', request => {
      void (async () => {
        const u = new URL(request.url());
        if (u.pathname === '/src/services/chat-socket.service.ts') return request.respond({status:200,contentType:'application/javascript',body:'const s={on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};'});
        if (!u.pathname.startsWith('/api/')) return u.origin === origin ? request.continue() : request.abort();
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'authorization,content-type,x-skip-cache', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
        if (request.method() === 'OPTIONS') return request.respond({status:204,headers});
        if (request.method() !== 'GET') mutations++;
        if (offline && u.pathname.startsWith('/api/wallets/')) return request.abort('connectionrefused');
        let data = { items: [], total: 0, page: 1, limit: 10 };
        if (u.pathname === '/api/auth/me') data = {id:'test-kol',role:'COLLABORATOR',fullName:'Test KOL'};
        else if (u.pathname === '/api/wallets/me') data = summary;
        else if (u.pathname === '/api/wallets/withdrawals') data = {requests:[],total:0,page:1,limit:10};
        else if (u.pathname === '/api/wallets/me/ledger') data = {entries:[],total:0,page:1,limit:10};
        return request.respond({status:200,headers,contentType:'application/json',body:JSON.stringify({success:true,data})});
      })().catch(() => {});
    });
    await page.goto(`${origin}/collaborator/wallet`, {waitUntil:'networkidle0'});
    await page.waitForFunction(() => document.querySelector('#kol-wallet-page')?.textContent.includes('Đủ điều kiện rút'), {timeout:10000}).catch(async error => { throw new Error(`Wallet did not render: ${await page.$eval('body', el=>el.textContent.slice(0,3000))}`,{cause:error}); });
    await page.type('#withdrawal-amount','200000');
    offline = true;
    await page.evaluate(() => window.qaWalletPoll());
    await page.waitForSelector('[data-testid="wallet-sync-error"]');
    assert.ok(await page.$eval('#kol-wallet-page', el => el.textContent.includes('Chờ kết nối và đồng bộ ví')));
    assert.equal(await page.$eval('[data-testid="wallet-withdraw-submit"]', el => el.disabled), true);
    offline = false;
    summary.availableBalance = '600000.00';
    summary.stores[0].availableBalance = '600000.00';
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForFunction(() => !document.querySelector('[data-testid="wallet-sync-error"]') && document.querySelector('.kol-wallet-balances')?.textContent.includes('600.000'));
    assert.equal(await page.$eval('[data-testid="wallet-withdraw-submit"]', el => el.disabled), false);
    assert.equal(await page.$eval('#withdrawal-amount', el => el.value), '200000');
    assert.equal(mutations, 0, 'network recovery never replays a withdrawal');
  } finally { await browser.close(); }
});
