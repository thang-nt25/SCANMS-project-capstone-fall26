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
    const page = await browser.newPage(); const errors = []; let receipts=0;
    page.on('console', message => { if(message.text().startsWith('Cannot load partner conversations:')) console.log(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument(({ user, token }) => {
      localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('scanms-current-role', 'kol'); localStorage.setItem('scanms-active-workspace', 'kol');
    }, { user, token });
    await page.setRequestInterception(true);
    page.on('request', async request => {
      if(request.method()==='PATCH' && /chat\/conversations\/[^/]+\/read$/.test(new URL(request.url()).pathname)){
        receipts++;return void request.respond({status:200,contentType:'application/json',body:'{}'});
      }
      if(request.method()==='GET' && new URL(request.url()).pathname==='/api/chat/conversations'){
        const response=await fetch(request.url(),{headers:request.headers()});const body=await response.json();
        const rows=Array.isArray(body)?body:body.data;
        const row=rows.find(row=>row.store?.name?.includes('Smart Living'));
        if(row){row._count={chatMessages:1};row.chatMessages[0]={...row.chatMessages[0],senderId:'fixture-incoming',isRead:false};}
        return void request.respond({status:200,contentType:'application/json',body:JSON.stringify(body)});
      }

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

    await page.$$eval('[role="list"] button[aria-pressed]',els=>els.find(el=>el.textContent.includes('Smart Living')).click());
    await page.waitForFunction(()=>{
      const row=[...document.querySelectorAll('[role="list"] button[aria-pressed]')].find(el=>el.textContent.includes('Smart Living'));
      return row?.getAttribute('aria-pressed')==='true'&&!row.parentElement.querySelector('.animate-pulse');
    });
    await page.waitForNetworkIdle({idleTime:600,timeout:15000});
    const result=await page.evaluate(()=>({oldButton:[...document.querySelectorAll('button')].some(el=>el.textContent.includes('Xem tin nh')||el.textContent.includes('T?i th?m tin')),messages:document.querySelectorAll('.chat-message-entry').length}));
    if(result.oldButton||result.messages!==1||!receipts||errors.length)throw Error(JSON.stringify({result,receipts,errors}));
    console.log(JSON.stringify({result:'PASS',incomingReceiptClearsBadge:true,oneMessageHidesHistory:true,receiptsMocked:receipts,realMutations:0}));
  }finally{if(browser)await browser.close();await db.$disconnect();}
})().catch(e=>{console.error(e);process.exitCode=1;});
