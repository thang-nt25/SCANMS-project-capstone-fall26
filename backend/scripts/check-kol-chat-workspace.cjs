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
    await page.waitForSelector('.chat-exclusive-deal',{timeout:30000});
    if (process.argv.includes('--pending-fixture') || process.argv.includes('--admin-fixture')) await page.waitForSelector('#chat-pinned-deal-banner');
    const layout = await page.evaluate(()=>{
      const list=document.querySelector('.chat-message-list').getBoundingClientRect();
      const composer=document.querySelector('.chat-composer').getBoundingClientRect();
      const banner=document.querySelector('#chat-pinned-deal-banner')?.getBoundingClientRect();
      const discover=document.querySelector('#btn-discover-stores').getBoundingClientRect();
      const tab=document.querySelector('.collaboration-compact-tabs>button').getBoundingClientRect();
      return {buttonTopDelta:tab.top-discover.top,buttonBottomDelta:tab.bottom-discover.bottom,listHeight:list.height, listBottom:list.bottom, composerTop:composer.top,bannerBottom:banner?.bottom,listTop:list.top};
    });
    if(Math.abs(layout.buttonTopDelta)>0.5||Math.abs(layout.buttonBottomDelta)>0.5)throw Error('Toolbar alignment '+JSON.stringify(layout));
    if(layout.listHeight<120 || layout.listBottom>layout.composerTop+2 || layout.bannerBottom>layout.listTop+2)throw Error('Chat layout overlap '+JSON.stringify(layout));
    if (process.argv.includes('--pending-fixture')) {
      const pageTop = await page.evaluate(() => window.scrollY);
      await page.click('#btn-jump-to-deal');
      if (await page.evaluate(() => window.scrollY) !== pageTop) throw Error('Jump moved outer page');
    }
    await page.screenshot({path:'../artifacts/manual-finance/kol-chat-workspace.png'});
    const details=await page.$('.chat-deal-details-button');
    if(details){await details.click();await page.waitForSelector('.chat-deal-detail-modal');await page.screenshot({path:'../artifacts/manual-finance/kol-chat-deal-detail.png'});await page.keyboard.press('Escape');}
    await page.click('.collaboration-search-messages');
    await page.waitForSelector('[role="dialog"]');
    await page.keyboard.press('Escape');
    await page.setViewport({width:390,height:844});
    const mobileComposer = await page.$eval('.chat-composer', el => ({ bottom: el.getBoundingClientRect().bottom, right: el.getBoundingClientRect().right }));
    if (mobileComposer.bottom > 790 || mobileComposer.right > 390) throw Error('Mobile composer clipped '+JSON.stringify(mobileComposer));
    await page.screenshot({path:'../artifacts/manual-finance/kol-chat-workspace-mobile.png'});
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Mobile page overflow');
    if(errors.length)throw Error(errors.join(' | '));
    console.log(JSON.stringify({result:'PASS',layout,details:Boolean(details),search:'PASS',mobile:'fits',messagesSent:0}));
  }finally{if(browser)await browser.close();await db.$disconnect();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
