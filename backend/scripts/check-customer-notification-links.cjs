require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  let browser;
  try {
    const user = await db.user.findFirst({ where: { email: 'customer.an@scanms.vn', isActive: true, isDeleted: false }, select: { id: true, role: true, email: true, fullName: true } });
    const token = require('jsonwebtoken').sign({ sub: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '3m' });
    const raw = await (await fetch('http://localhost:3000/api/notifications?limit=20', { headers: { Authorization: `Bearer ${token}` } })).json();
    const notifications = (raw.data?.data || raw.data || raw).items;
    const withdrawal = notifications.find(item => item.data?.withdrawalId);
    const returned = notifications.find(item => item.data?.returnRequestId);
    if (!withdrawal || !returned) throw Error('Expected real withdrawal and return notifications');
    const p = await import('../../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
    browser = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-first-run', '--disable-extensions'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument(({ user, token }) => {
      localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user));
    }, { user, token });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const path = new URL(request.url()).pathname;
      if (request.method() === 'PATCH' && /^\/api\/notifications\/[^/]+\/read$/.test(path))
        return void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      if (path.startsWith('/api/') && !['GET', 'OPTIONS'].includes(request.method())) return void request.abort();
      void request.continue();
    });
    await page.goto('http://localhost:5173/customer/notifications', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(`[data-notification-id="${withdrawal.id}"] .customer-notification-open`, { timeout: 30000 });
    await page.screenshot({ path: '../artifacts/manual-finance/customer-notifications-desktop.png' });
    await page.setViewport({ width: 390, height: 900 });
    if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw Error('Mobile overflow');
    await page.screenshot({ path: '../artifacts/manual-finance/customer-notifications-mobile.png' });
    await page.$eval(`[data-notification-id="${withdrawal.id}"] .customer-notification-open`, element => element.click());
    await page.waitForFunction(id => location.pathname === '/customer/wallet' && new URLSearchParams(location.search).get('withdrawalId') === id, {}, withdrawal.data.withdrawalId);
    await page.waitForFunction(id => document.activeElement?.id === `customer-withdrawal-${id}`, { timeout: 30000 }, withdrawal.data.withdrawalId);
    if (!await page.$eval('#wallet-history-tab-withdrawals', element => element.getAttribute('aria-selected') === 'true')) throw Error('Wrong wallet history tab');
    await page.goto('http://localhost:5173/customer/notifications', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(`[data-notification-id="${returned.id}"] .customer-notification-open`);
    await page.$eval(`[data-notification-id="${returned.id}"] .customer-notification-open`, element => element.click());
    await page.waitForFunction(id => location.pathname === `/customer/returns/${id}`, {}, returned.data.returnRequestId);
    await page.waitForSelector('.customer-return-address', { timeout: 30000 });
    console.log('Verified real notification destinations: withdrawal opens and focuses exact request; return opens exact case; mobile fits. Read updates mocked; no API writes.');
  } finally { await browser?.close(); await db.$disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
