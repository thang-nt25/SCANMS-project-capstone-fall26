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
    await page.goto('http://localhost:5173/collaborator/wallet',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.wallet-balance-cell');
    await page.waitForNetworkIdle({idleTime:700,timeout:25000});
    await page.waitForSelector('.kol-ledger-recent');
    await page.waitForNetworkIdle({idleTime:500,timeout:15000});
    await page.$eval('.kol-ledger-recent',el=>el.scrollIntoView({block:'start'}));
    console.log(JSON.stringify(await page.$eval('.kol-ledger-recent',el=>({rows:el.querySelectorAll('tbody tr').length,cols:el.querySelectorAll('th').length,rowHeights:[...el.querySelectorAll('tbody tr')].map(row=>row.offsetHeight),pills:el.querySelectorAll('.rounded-full').length}))));
    await page.screenshot({path:'../artifacts/manual-finance/recent-ledger-redesign.png'});
    await page.click('.kol-ledger-recent .kol-ledger-entry-button');
    await page.waitForSelector('.kol-ledger-drawer');
    console.log(JSON.stringify({details:true,errors}));
    await page.keyboard.press('Escape');
    await page.setViewport({width:390,height:844});
    console.log(JSON.stringify({mobileOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}));
    await page.screenshot({path:'../artifacts/manual-finance/recent-ledger-redesign-mobile.png',fullPage:true});
    await page.$eval('.kol-ledger-view-all',el=>el.click());
    await page.waitForSelector('.kol-ledger-history:not(.kol-ledger-recent)',{visible:true});
    console.log(JSON.stringify({viewAll:true}));
  } finally {if(browser)await browser.close();await db.$disconnect();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
