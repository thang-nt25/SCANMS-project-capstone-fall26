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

    let fixture=null;
    await page.setRequestInterception(true);
    page.on('request',request=>{
      const path=new URL(request.url()).pathname;
      if(fixture && path==='/api/admin/payouts/pending-work')return void request.respond({status:200,contentType:'application/json',body:JSON.stringify({data:fixture})});
      if(path.startsWith('/api/')&&!['GET','OPTIONS'].includes(request.method()))return void request.abort();
      return void request.continue();
    });
    const res=await fetch('http://localhost:3000/api/admin/payouts/pending-work',{headers:{Authorization:`Bearer ${token}`}});
    if(!res.ok)throw Error(`Summary ${res.status}`);
    const raw=await res.json();const live=raw.data||raw;
    await page.goto('http://localhost:5173/admin/payouts',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelectorAll('.finance-work-count').length>0 && ![...document.querySelectorAll('.finance-work-count')].some(e=>e.textContent==='\u2014'));
    const badges=await page.$$eval('.finance-main-tabs>button',tabs=>tabs.map(t=>({text:t.textContent,count:t.querySelector('.finance-work-count')?.textContent||null})));
    await page.screenshot({path:'../artifacts/manual-finance/finance-work-badges.png',fullPage:true});
    fixture={...live,customer:live.customer+2,monthly:{policies:1,grants:1,total:2,months:['2026-11','2026-12']}};
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await page.waitForFunction(expected=>document.querySelectorAll('.finance-main-tabs>button')[2].querySelector('.finance-work-count')?.textContent===String(expected),{},fixture.customer);
    await page.click('.finance-main-tabs>button:nth-child(5)');
    await page.waitForSelector('.finance-work-notice');
    const monthChoices=await page.$$eval('.finance-work-notice button',buttons=>buttons.map(b=>b.textContent));
    fixture={...live,customer:0,monthly:{policies:0,grants:0,total:0,months:[]}};
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await page.waitForFunction(()=>!document.querySelectorAll('.finance-main-tabs>button')[2].querySelector('.finance-work-count'));
    const zeroHidden=true;
    await page.setViewport({width:390,height:844});
    console.log(JSON.stringify({live,badges,monthChoices,incomingBadgeUpdated:true,zeroHidden,mobileOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),errors}));
  } finally {if(browser)await browser.close();await db.$disconnect();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
