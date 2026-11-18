require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  let browser;
  try {
    const user = await db.user.findFirst({ where: { email: 'customer.an@scanms.vn', isActive: true, isDeleted: false }, select: { id: true, role: true, email: true, fullName: true } });
    const token = require('jsonwebtoken').sign({ sub: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '3m' });
    const p = await import('../../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
    browser = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-first-run', '--disable-extensions'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument(({ user, token }) => {
      localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user));
    }, { user, token });
    let fixture;
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/customer/wishlist' && fixture)
        return void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) });
      if (request.url().includes('/api/') && !['GET', 'OPTIONS'].includes(request.method())) return void request.abort();
      void request.continue();
    });
    await page.goto('http://localhost:5173/customer/wishlist', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.customer-wishlist-row', { timeout: 30000 });
    await page.waitForFunction(() => [...document.querySelectorAll('.customer-wishlist-photo img')].every(image => image.complete && image.naturalWidth > 0));
    if (!await page.$eval('.customer-wishlist-actions > a', element => element.getAttribute('href').startsWith('/products/'))) throw Error('Missing product link');
    await page.screenshot({ path: '../artifacts/manual-finance/customer-wishlist-desktop.png' });
    await page.setViewport({ width: 390, height: 900 });
    if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw Error('Mobile overflow');
    await page.screenshot({ path: '../artifacts/manual-finance/customer-wishlist-mobile.png' });
    // Test pagination using browser-only copies; no saved products are added to the account.
    const response = await fetch('http://localhost:3000/api/customer/wishlist', { headers: { Authorization: `Bearer ${token}` } });
    const raw = await response.json(); const items = raw.data?.data || raw.data || raw;
    fixture = Array.from({ length: 11 }, (_, index) => ({ ...items[0], wishlistId: `fixture-${index}`, product: { ...items[0].product, title: `Saved product ${index + 1}` } }));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('.customer-wishlist-row').length === 10);
    await page.$eval('.customer-wishlist-pagination nav button:last-child', element => element.click());
    await page.waitForFunction(() => document.querySelectorAll('.customer-wishlist-row').length === 1 && document.querySelector('.customer-wishlist-row').textContent.includes('Saved product 11'));
    await page.type('.customer-wishlist-search input', 'product 2');
    await page.waitForFunction(() => document.querySelectorAll('.customer-wishlist-row').length === 1 && document.querySelector('.customer-wishlist-row').textContent.includes('Saved product 2'));
    console.log('Verified real saved product layout, product link, mobile fit; 11-item browser fixture shows 10 then 1, search resets pagination. API writes blocked.');
  } finally { await browser?.close(); await db.$disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
