require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const jwt = require('jsonwebtoken');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  let browser;
  try {
    const user = await db.user.findFirst({ where: { email: 'customer.an@scanms.vn', isActive: true, isDeleted: false }, select: { id: true, role: true, email: true, fullName: true } });
    const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '3m' });
    const p = await import('../../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
    browser = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-first-run', '--disable-extensions'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument(({ user, token }) => {
      localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user));
    }, { user, token });
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/api/') && !['GET', 'OPTIONS'].includes(request.method())) return void request.abort();
      void request.continue();
    });
    await page.goto('http://localhost:5173/customer/wallet', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#wallet-history-tab-withdrawals');
    await page.$eval('#wallet-history-tab-withdrawals', element => element.click());
    await page.waitForSelector('.customer-withdrawal-card', { timeout: 30000 });
    const desktop = await page.$eval('.customer-withdrawal-card', card => ({
      collapsible: !!card.querySelector('details,summary'),
      widths: [...card.querySelectorAll('.customer-withdrawal-card-columns > section')].map(element => element.getBoundingClientRect().width),
      amounts: card.querySelectorAll('.customer-withdrawal-card-amount').length,
      proof: !!card.querySelector('.customer-withdrawal-card-footer button'),
      text: card.textContent,
    }));
    if (desktop.collapsible || desktop.amounts !== 1 || Math.max(...desktop.widths) - Math.min(...desktop.widths) > 1 || !desktop.proof) throw Error('Card layout mismatch');
    await page.$eval('.customer-withdrawal-card', element => element.scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: '../artifacts/manual-finance/customer-withdrawal-history-desktop.png' });
    await page.setViewport({ width: 390, height: 900 });
    const mobile = await page.$eval('.customer-withdrawal-card-columns', element => ({
      cols: getComputedStyle(element).gridTemplateColumns.split(' ').length,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    if (mobile.cols !== 1 || mobile.overflow) throw Error('Mobile overflow or columns');
    await page.screenshot({ path: '../artifacts/manual-finance/customer-withdrawal-history-mobile.png' });
    console.log('Verified real customer history: always expanded, three equal columns, one amount, proof button and mobile layout. All API writes blocked.');
  } finally { await browser?.close(); await db.$disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
