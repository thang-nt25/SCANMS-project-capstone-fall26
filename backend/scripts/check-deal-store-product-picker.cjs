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
    await page.waitForNetworkIdle({idleTime:600,timeout:15000});
    await page.click('.collaboration-heading-actions>button:first-child');
    await page.waitForSelector('#deal-product-picker-title');
    await page.waitForNetworkIdle({idleTime:800,timeout:15000});
    console.log(await page.$eval('[aria-labelledby="deal-product-picker-title"]',el=>el.textContent));
    const selector='[aria-labelledby="deal-product-picker-title"]';
    await page.screenshot({path:'../artifacts/manual-finance/deal-store-product-picker.png'});
    await page.type(selector+' input','Serum');
    await new Promise(resolve=>setTimeout(resolve,500));
    await page.waitForNetworkIdle({idleTime:600,timeout:15000});
    const rows=await page.$$eval(selector+' button strong',els=>els.map(el=>el.textContent));
    if(!rows.length||rows.some(title=>!title.includes('Serum')))throw Error('Search mismatch '+JSON.stringify(rows));
    await page.setViewport({width:390,height:844});
    const mobile=await page.$eval(selector,el=>{const box=el.getBoundingClientRect();return {left:box.left,right:box.right,bottom:box.bottom,top:box.top};});
    await page.screenshot({path:'../artifacts/manual-finance/deal-store-product-picker-mobile.png'});
    if(mobile.left<0||mobile.right>390||mobile.top<0||mobile.bottom>844||errors.length)throw Error(JSON.stringify({mobile,errors}));
    await page.keyboard.press('Escape');
    if(await page.$(selector))throw Error('Escape failed');
    console.log(JSON.stringify({result:'PASS',searchMatches:rows.length,mobile,mutations:0}));
  }finally{if(browser)await browser.close();await db.$disconnect();}
})().catch(e=>{console.error(e);process.exitCode=1;});
