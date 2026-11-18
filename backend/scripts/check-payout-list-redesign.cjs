require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  let browser;
  try {
    const user = await db.user.findFirst({ where: { role: 'SYSTEM_MANAGER', isActive: true, isDeleted: false }, select: { id: true, role: true, email: true, fullName: true } });
    if (!user) throw Error('Missing collaborator');
    const token = require('jsonwebtoken').sign({ sub: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '3m' });
    if (process.argv.includes('--counts')) {
      const response = await fetch('http://localhost:3000/api/chat/conversations', { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      const rows = Array.isArray(body) ? body : body.data;
      console.log(JSON.stringify({status:response.status,conversationCounts:Array.isArray(rows)?rows.map(row=>({store:row.store?.name,count:row.messageCount})):Object.keys(body)}));
    }
    const p = await import('../../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
    browser = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-first-run', '--disable-extensions'] });
    const page = await browser.newPage(); const errors = [];
    page.on('console', message => { if(message.text().startsWith('Cannot load partner conversations:')) console.log(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument(({ user, token }) => {
      localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('scanms-current-role', 'admin'); localStorage.setItem('scanms-active-workspace', 'admin');
    }, { user, token });

    await page.setRequestInterception(true);
    page.on('request', request => {
      if(new URL(request.url()).pathname.startsWith('/api/') && !['GET','OPTIONS'].includes(request.method())) return void request.abort();
      return void request.continue();
    });
    await page.goto('http://localhost:5173/admin/payouts', {waitUntil:'domcontentloaded'});
    await page.waitForSelector('.payout-person-heading');
    const rows = await page.$$eval('.finance-ledger-table tbody tr', rows => rows.map(row => ({height:row.getBoundingClientRect().height,text:row.textContent,moneyFont:getComputedStyle(row.querySelector('.payout-money-cell strong')).fontSize,riskHeight:row.querySelector('.payout-risk-trigger')?.getBoundingClientRect().height})));
    await page.screenshot({path:'../artifacts/manual-finance/payout-list-redesign.png', fullPage:true});
    await (await page.$$('.payout-risk-trigger'))[3].click();
    await page.waitForSelector('[data-check-code]');
    const checks=await page.$$eval('[data-check-code]', rows=>rows.map(row=>({code:row.dataset.checkCode,text:row.textContent,open:row.open})));
    await page.screenshot({path:'../artifacts/manual-finance/payout-conditions-redesign.png', fullPage:true});
    console.log(JSON.stringify({rowHeights:[...new Set(rows.map(row=>row.height))],missingFirst:checks.slice(0,2).map(row=>row.code),errors}));
  } finally {if(browser)await browser.close();await db.$disconnect();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
