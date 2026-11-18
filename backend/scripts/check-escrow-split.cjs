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
    await page.waitForSelector('.finance-main-tabs>button:nth-child(2)');
    await page.click('.finance-main-tabs>button:nth-child(2)');
    await page.waitForFunction(()=>document.querySelector('.finance-escrow tbody tr'));
    const report=await page.$eval('.finance-escrow', el=>({headings:[...el.querySelectorAll('th')].map(e=>e.textContent.trim()),rows:[...el.querySelectorAll('tbody tr')].map(row=>({order:row.children[0].textContent,standard:row.children[3].textContent,deal:row.children[4].textContent,hold:row.children[5].textContent})),totals:el.querySelector('tfoot')?.textContent}));
    await page.screenshot({path:'../artifacts/manual-finance/escrow-split-redesign.png',fullPage:true});
    await page.click('.finance-escrow tbody tr button');
    await page.waitForSelector('[role="dialog"]');
    const history=await page.$eval('[role="dialog"]',el=>el.textContent);
    console.log(JSON.stringify({report,history,errors}));
  } finally {if(browser)await browser.close();await db.$disconnect();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
