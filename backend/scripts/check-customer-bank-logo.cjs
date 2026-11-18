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
    await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='\u0052\u00fat ti\u1ec1n'));
    await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='\u0052\u00fat ti\u1ec1n').click());
    await page.waitForSelector('form');
    await page.evaluate(()=>[...document.querySelectorAll('form button')].find(b=>b.textContent.includes('\u0043h\u1ecdn')||b.textContent.includes('\u0110\u1ed5i')).click());
    await page.waitForSelector('dialog[open] button[aria-label^="Vietcombank,"]');
    await page.click('dialog[open] button[aria-label^="Vietcombank,"]');
    await page.waitForSelector('form button img[alt="Vietcombank"]');
    await page.waitForFunction(()=>document.querySelector('form button img[alt="Vietcombank"]')?.naturalWidth>0);
    const selected=await page.$eval('form button img[alt="Vietcombank"]',img=>({src:img.src,loaded:img.naturalWidth>0,triggerText:img.closest('button').textContent}));
    await page.screenshot({path:'../artifacts/manual-finance/customer-selected-bank-logo.png',fullPage:true});
    console.log(JSON.stringify({selected,allApiWritesBlocked:true}));
  } finally { await browser?.close(); await db.$disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
