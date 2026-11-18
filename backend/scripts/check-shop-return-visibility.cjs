const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const jwt = require('jsonwebtoken');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  let browser;
  try {
    const request = await db.returnRequest.findUnique({ where: { id: '88ab1dfe-c120-4341-a8d1-2348657f8338' }, select: { id: true, status: true, order: { select: { store: { select: { ownerId: true } } } } } });
    if (!request) throw new Error('Return case not found');
    const user = await db.user.findUnique({ where: { id: request.order.store.ownerId }, select: { id: true, fullName: true, email: true, role: true } });
    const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '2m' });
    const response = await fetch(`http://127.0.0.1:3000/api/returns/${request.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json(); const detail = body.data?.data || body.data || body;
    console.log(JSON.stringify({ apiStatus: response.status, status: detail.status, hasReturnShipment: Boolean(detail.customerShipment), hasExchangeShipment: Boolean(detail.exchangeShipment), hasExchangeDeliveryField: Object.hasOwn(detail, 'exchangeDelivery') }));
    const puppeteer = await import('../../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
    browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'], timeout: 10000 });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument(({ user, token }) => { localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('token', token); localStorage.setItem('scanms_analytics_consent', 'denied'); }, { user, token });
    await page.setRequestInterception(true);
    page.on('request', req => { if (req.url().includes('/api/') && !['GET', 'OPTIONS'].includes(req.method())) return req.abort(); return req.continue(); });
    await page.goto(`http://localhost:5173/merchant/returns/${request.id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.shop-return-detail', { timeout: 15000 });
    await page.waitForSelector('[aria-label="Vận chuyển hàng trả"]', { timeout: 15000 });
    console.log(JSON.stringify(await page.evaluate(() => ({ returnCards: document.querySelectorAll('[aria-label="Vận chuyển hàng trả"]').length, exchangeForms: document.querySelectorAll('[aria-label="Tạo vận đơn hàng thay thế"]').length, exchangeCards: document.querySelectorAll('[aria-label="Vận đơn giao hàng đổi"]').length }))));
  } finally { await browser?.close(); await db.$disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
