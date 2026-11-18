require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  let browser;
  try {
    const user = await db.user.findFirst({ where: { email: 'kol.bronze@scanms.vn', isActive: true, isDeleted: false }, select: { id: true, role: true, email: true, fullName: true } });
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
      localStorage.setItem('scanms-current-role', 'kol'); localStorage.setItem('scanms-active-workspace', 'kol');
    }, { user, token });
    await page.setRequestInterception(true);
    page.on('request', async request => {
      if ((process.argv.includes('--pending-fixture') || process.argv.includes('--admin-fixture')) && /\/api\/affiliate-deals\/[0-9a-f-]{36}$/.test(new URL(request.url()).pathname) && request.method() === 'GET') {
        const response = await fetch(request.url(), { headers: request.headers() });
        const body = await response.json();
        const state = body.data || body;
        Object.assign(state, { status: process.argv.includes('--admin-fixture') ? 'PENDING_ADMIN_APPROVAL' : 'PENDING', closedAt: null, initiatorRole: 'SHOP_MANAGER', shortUrl: null, vipVoucherCode: null });
        return void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      }
      if (new URL(request.url()).pathname.startsWith('/api/') && !['GET', 'OPTIONS'].includes(request.method())) return void request.abort();
      void request.continue();
    });
    await page.goto('http://localhost:5173/collaborator/collaboration?tab=messages',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('[role="list"] button[aria-pressed]',{timeout:30000});
    await page.$$eval('[role="list"] button[aria-pressed]',els=>els.find(el=>el.textContent.includes('Sora Skincare')).click());
    await page.waitForSelector('#chat-message-input',{timeout:30000});
    await page.waitForNetworkIdle({idleTime:600,timeout:20000});

    await page.$$eval('[role="list"] button[aria-pressed]',els=>els.find(el=>el.textContent.includes('Sora Skincare')).click());
    await page.waitForFunction(()=>document.querySelector('.collaboration-shop-heading').textContent.includes('Sora Skincare'));
    await page.click('.collaboration-compact-tabs>button:nth-child(3)');
    await page.waitForSelector('.collaboration-sample-card');
    await page.waitForNetworkIdle({idleTime:600,timeout:15000});
    const desktop=await page.evaluate(()=>({columns:getComputedStyle(document.querySelector('.collaboration-sample-filters')).gridTemplateColumns,buttons:[...document.querySelectorAll('.collaboration-sample-primary-actions>button')].slice(0,3).map(el=>({width:el.offsetWidth,height:el.offsetHeight})),cards:document.querySelectorAll('.collaboration-sample-card').length}));
    await page.screenshot({path:'../artifacts/manual-finance/collaboration-sample-library.png'});
    await page.click('.collaboration-sample-primary-actions>button:first-child');
    await page.waitForSelector('[role="dialog"]');
    await page.screenshot({path:'../artifacts/manual-finance/collaboration-sample-details.png'});
    await page.keyboard.press('Escape');
    await page.setViewport({width:390,height:844});
    const mobile=await page.$eval('.collaboration-sample-filters',el=>({columns:getComputedStyle(el).gridTemplateColumns,right:el.getBoundingClientRect().right}));
    await page.screenshot({path:'../artifacts/manual-finance/collaboration-sample-library-mobile.png'});
    if(desktop.buttons.some(button=>button.height!==40)||mobile.right>390||errors.length)throw Error(JSON.stringify({desktop,mobile,errors}));
    console.log(JSON.stringify({result:'PASS',desktop,mobile,mutations:0}));
  }finally{if(browser)await browser.close();await db.$disconnect();}
})().catch(e=>{console.error(e);process.exitCode=1;});
