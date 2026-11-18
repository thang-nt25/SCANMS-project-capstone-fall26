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

    const response=await fetch('http://localhost:5173/api/admin/payouts/escrow',{headers:{Authorization:`Bearer ${token}`}});
    const body=await response.json(); const live=body.data||body;
    let loads=0;
    await page.setRequestInterception(true);
    page.on('request', request => {
      const path=new URL(request.url()).pathname;
      if(path==='/api/admin/payouts/escrow') {
        loads++;
        const payload=structuredClone(live);
        if(loads===1 || process.argv.includes('--old-api')) for(const row of payload.items) {
          for(const key of ['pendingStandardAmount','pendingDealAmount','baseCommissionAmount','dealBonusAmount','dealBonusStatus'])delete row[key];
        }
        return void request.respond({status:200,contentType:'application/json',body:JSON.stringify({data:payload})});
      }
      if(path.startsWith('/api/') && !['GET','OPTIONS'].includes(request.method())) return void request.abort();
      return void request.continue();
    });
    await page.goto('http://localhost:5173/admin/payouts', {waitUntil:'domcontentloaded'});
    await page.waitForSelector('.finance-main-tabs>button:nth-child(2)');
    await page.click('.finance-main-tabs>button:nth-child(2)');
    await page.waitForFunction(()=>document.querySelectorAll('.finance-escrow tbody tr').length>0);
    await page.waitForFunction(()=>!document.querySelector('.finance-escrow')?.getAttribute('aria-busy') || document.querySelector('.finance-escrow')?.getAttribute('aria-busy')==='false');
    if(!process.argv.includes('--old-api')) await page.waitForFunction(()=>document.querySelector('.finance-escrow tfoot')?.textContent.includes('124.100'));
    else await page.waitForSelector('.finance-escrow [role="alert"]');
    const text=await page.$eval('.finance-escrow',e=>e.textContent);
    if(text.includes('NaN'))throw Error('NaN rendered');
    console.log(JSON.stringify({mode:process.argv.includes('--old-api')?'old-api':'old-snapshot-then-new',loads,noNaN:true,correctTotals:text.includes('124.100')&&text.includes('37.500'),unknown:text.includes('API'),errors}));
  } finally {if(browser)await browser.close();await db.$disconnect();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
