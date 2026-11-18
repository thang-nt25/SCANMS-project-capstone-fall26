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

    const response = await fetch('http://localhost:3000/api/social-channels', {headers:{Authorization:`Bearer ${token}`}});
    const body = await response.json();
    const real = Array.isArray(body) ? body : body.data;
    if(!Array.isArray(real))throw Error('Channels unavailable');
    let fixture = null; let writes=0;
    await page.setRequestInterception(true);
    page.on('request', async request=>{
      const path = new URL(request.url()).pathname;
      if(fixture && path==='/api/social-channels' && request.method()==='GET') return void request.respond({status:200,contentType:'application/json',body:JSON.stringify({data:fixture})});
      if(fixture && /\/api\/social-channels\/[0-9a-f-]+$/.test(path) && request.method()==='PATCH') {
        writes++; const data=JSON.parse(request.postData()); const id=path.split('/').pop();
        fixture=fixture.map(c=>c.id===id?{...c,...data,updatedAt:new Date().toISOString()}:c);
        return void request.respond({status:200,contentType:'application/json',body:JSON.stringify({data:{channel:fixture.find(c=>c.id===id)}})});
      }
      if(path.startsWith('/api/')&&!['GET','OPTIONS'].includes(request.method()))return void request.abort();
      return void request.continue();
    });
    await page.goto('http://localhost:5173/collaborator/profile?tab=social',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.social-channel-row');
    const desktop=await page.evaluate(()=>({rows:document.querySelectorAll('.social-channel-row').length,overview:[...document.querySelectorAll('.social-summary>div')].map(e=>({width:e.offsetWidth,height:e.offsetHeight})),toolbar:[...document.querySelectorAll('.social-controls input,.social-controls button')].map(e=>e.offsetHeight),createLinkButtons:[...document.querySelectorAll('.social-channel-actions button')].filter(e=>e.textContent.includes('link')).length}));
    await page.screenshot({path:'../artifacts/manual-finance/social-channels-desktop.png',fullPage:true});
    await page.setViewport({width:390,height:844});
    await page.screenshot({path:'../artifacts/manual-finance/social-channels-mobile.png',fullPage:true});
    const mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    await page.setViewport({width:1440,height:1000});
    fixture=[{...real[0],isPrimary:true},{...real[0],id:'00000000-0000-4000-a000-000000000002',channelName:'Secondary',channelUrl:'https://youtube.com/@secondary',platformName:'YOUTUBE',isPrimary:false,followerCount:100}];
    await page.reload({waitUntil:'domcontentloaded'}); await page.waitForSelector('.social-channel-row');
    console.log('fixture ready');
    await page.click('.social-channel-actions > button'); await page.waitForSelector('.social-channel-dialog');
    await page.focus('#social-channel-followers'); await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace'); await page.type('#social-channel-followers','70000');
    await page.click('.social-channel-dialog footer button[type=submit]');
    console.log('submitted',writes);
    await page.screenshot({path:'../artifacts/manual-finance/social-edit-check.png',fullPage:true});
    await page.waitForFunction(()=>!document.querySelector('.social-channel-dialog'));
    await page.waitForFunction(()=>document.querySelector('.social-channel-metric strong')?.textContent==='70.000');
    console.log('edited');
    const editWorked=writes===1;
    await page.click('.social-controls>.social-add'); await page.waitForSelector('.social-channel-dialog');
    await page.type('#social-channel-name','Duplicate'); await page.type('#social-channel-url',real[0].channelUrl); await page.type('#social-channel-followers','1');
    await page.click('.social-channel-dialog footer button[type=submit]');
    const duplicateBlocked=await page.$eval('#social-channel-url',e=>e.getAttribute('aria-invalid')==='true')&&writes===1;
    await page.click('.social-channel-dialog header>button');
    await page.click('.social-channel-menu summary');
    const primaryProtected=await page.$eval('.social-channel-menu .danger',e=>e.disabled);
    console.log(JSON.stringify({desktop,mobileOverflow,editWorked,duplicateBlocked,primaryProtected,errors}));
  } finally {if(browser)await browser.close();await db.$disconnect();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
