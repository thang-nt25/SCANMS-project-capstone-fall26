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
    await page.goto('http://localhost:5173/collaborator/profile',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.kol-profile-tabs [role=tab]');
    await page.waitForSelector('#creator-account-name');
    await new Promise(r=>setTimeout(r,700));
    const desktop = await page.evaluate(()=>({tabs:[...document.querySelectorAll('.kol-profile-tabs [role=tab]')].map(e=>({width:e.offsetWidth,height:e.offsetHeight})),columns:getComputedStyle(document.querySelector('.creator-account-layout')).gridTemplateColumns,inputHeight:document.querySelector('#creator-account-name').offsetHeight,saveDisabled:document.querySelector('.creator-account-footer .primary').disabled}));
    await page.type('#creator-account-name',' test');
    const dirty = await page.$eval('.creator-account-footer .primary',e=>!e.disabled);
    await page.click('.creator-account-footer button');
    const reset = await page.$eval('.creator-account-footer .primary',e=>e.disabled);
    await page.evaluate(()=>document.querySelectorAll('.creator-birthday button')[1].click());
    await page.evaluate(()=>[...document.querySelectorAll('[role=option]')].find(b=>b.textContent.trim().endsWith(' 2')).click());
    await page.evaluate(()=>document.querySelector('.creator-birthday button').click());
    const calendarDays = await page.$$eval('[role=option]',opts=>opts.length);
    await page.keyboard.press('Escape');
    await page.click('.creator-account-footer button');
    console.log(JSON.stringify({calendarDays}));
    const image = await page.evaluate(()=>{const c=document.createElement('canvas');c.width=400;c.height=250;const x=c.getContext('2d');x.fillStyle='#c59b58';x.fillRect(0,0,400,250);return c.toDataURL('image/png').split(',')[1]});
    const input = await page.$('.creator-avatar-panel input[type=file]');
    const fixture = require('path').resolve('../artifacts/manual-finance/avatar-crop-fixture.png');
    require('fs').writeFileSync(fixture,Buffer.from(image,'base64'));
    await input.uploadFile(fixture);
    await page.waitForSelector('.creator-crop-dialog');
    const cropOpened = await page.$eval('.creator-crop-dialog canvas',c=>c.width===512);
    await page.evaluate(()=>document.querySelector('.creator-crop-dialog footer .primary').click());
    await page.waitForSelector('.creator-avatar-pending');
    const avatarPending = await page.$eval('.creator-account-footer .primary',e=>!e.disabled);
    await page.click('.creator-account-footer button');
    console.log(JSON.stringify({cropOpened,avatarPending}));
    await page.screenshot({path:'../artifacts/manual-finance/profile-redesign-desktop.png',fullPage:true});
    await page.setViewport({width:390,height:844});
    await new Promise(r=>setTimeout(r,200));
    await page.screenshot({path:'../artifacts/manual-finance/profile-redesign-mobile.png',fullPage:true});
    console.log(JSON.stringify({desktop,dirty,reset,mobileOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),errors}));
  } finally {if(browser)await browser.close();await db.$disconnect();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
