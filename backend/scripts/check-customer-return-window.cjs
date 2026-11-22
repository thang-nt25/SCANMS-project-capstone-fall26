require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  let browser;
  try {
    const order = await db.order.findFirst({
      where: { externalOrderSn: 'DH-2026-19D529B4' },
      select: { externalOrderSn: true, status: true, createdAt: true, deliveredAt: true, completedAt: true },
    });
    console.log(JSON.stringify({ order, deadline: order?.deliveredAt ? new Date(+order.deliveredAt + 14 * 86400000) : null }));
    const user = await db.user.findFirst({ where: { email: 'customer.an@scanms.vn', isActive: true, isDeleted: false }, select: { id: true, role: true, email: true, fullName: true } });
    const token = require('jsonwebtoken').sign({ sub: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '3m' });
    const response = await fetch('http://localhost:3000/api/customer/orders', { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw Error(`Orders API: ${response.status}`);
    const raw = await response.json();
    const payload = raw.data?.data || raw.data || raw;
    const original = payload.orders.find(value => value.externalOrderSn === order.externalOrderSn);
    if (!original) throw Error('Screenshot order missing from customer API');
    const p = await import('../../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
    browser = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-first-run', '--disable-extensions'] });
    for (const detail of [false, true]) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 1000 });
      await page.evaluateOnNewDocument(({ user, token }) => {
        localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user));
      }, { user, token });
      // Browser-only boundary fixture; no database changes or return submissions.
      const fixture = { ...original, deliveredAt: new Date(Date.now() - 14 * 86400000 + 12000).toISOString(), completedAt: new Date().toISOString() };
      await page.setRequestInterception(true);
      const writes = [];
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname === '/api/customer/orders' && request.method() === 'GET')
          return void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ orders: [fixture], total: 1 }) });
        if (url.pathname === `/api/customer/orders/${original.id}` && request.method() === 'GET')
          return void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) });
        if (url.pathname.startsWith('/api/') && !['GET', 'OPTIONS'].includes(request.method())) {
          if (url.pathname !== '/api/customer/cart') writes.push(url.pathname);
          return void request.abort();
        }
        void request.continue();
      });
      await page.goto(`http://localhost:5173/customer/orders${detail ? `/${original.id}` : ''}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Trả hàng / Hoàn tiền'), { timeout: 10000 });
      if (!detail) {
        await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Trả hàng / Hoàn tiền').click());
        await page.waitForSelector('[role="dialog"]');
        await page.waitForFunction(() => document.querySelector('[role="dialog"]').textContent.includes('Đã hết hạn'), { timeout: 16000 });
        if (!await page.$eval('[role="dialog"] button[type="submit"]', button => button.disabled)) throw Error('Expired form still enabled');
        await page.evaluate(() => document.querySelector('[aria-label="Đóng"]').click());
      }
      await page.waitForFunction(() => ![...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Trả hàng / Hoàn tiền'), { timeout: 16000 });
      if (writes.length) throw Error('Unexpected mutations: ' + writes.join(','));
      console.log(`${detail ? 'Detail' : 'List and open form'}: expires automatically at delivery + 14 days without reload or writes`);
      await page.close();
    }
  } finally { await browser?.close(); await db.$disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
