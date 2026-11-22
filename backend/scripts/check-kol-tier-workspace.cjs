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
    page.on('request',r=>new URL(r.url()).pathname.startsWith('/api/')&&!['GET','OPTIONS'].includes(r.method())?r.abort():r.continue());
    const results={};
    await page.goto('http://localhost:5173/collaborator/profile?tab=tiers',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.kol-current-tier',{timeout:45000});
    results.tiers=await page.evaluate(()=>({nav:[...document.querySelectorAll('.kol-tier-navigation a')].map(e=>({width:e.offsetWidth,height:e.offsetHeight})),policies:document.querySelectorAll('.kol-tier-policy-grid article').length,maintenanceClaims:document.querySelector('.kol-tier-maintained').textContent}));
    await page.screenshot({path:'../artifacts/manual-finance/kol-tier-redesign.png',fullPage:true});
    await page.goto('http://localhost:5173/collaborator/leaderboard',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('[data-podium-rank]',{timeout:45000});
    results.leaderboard=await page.evaluate(()=>({cards:[...document.querySelectorAll('[data-podium-rank]')].map(e=>({width:e.offsetWidth,height:e.offsetHeight,top:e.getBoundingClientRect().top})),myRankBeforePodium:document.querySelector('.leaderboard-my-rank').getBoundingClientRect().top<document.querySelector('.leaderboard-podium').getBoundingClientRect().top,leaderNameFont:getComputedStyle(document.querySelector('.leaderboard-overview>div>div:nth-child(2)>div')).fontSize,ratio150:document.querySelector('.leaderboard-podium').textContent.includes('150%')}));
    await page.screenshot({path:'../artifacts/manual-finance/kol-leaderboard-redesign.png',fullPage:true});
    await page.goto('http://localhost:5173/collaborator/bonus-progress',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.kol-monthly-card',{timeout:45000});
    results.bonus=await page.evaluate(()=>({nav:document.querySelectorAll('.kol-tier-navigation a').length,rows:document.querySelectorAll('.kol-monthly-card').length,tables:document.querySelectorAll('.monthly-reward-table').length,metrics:[...document.querySelectorAll('.kol-monthly-metrics>div')].map(e=>e.offsetWidth)}));
    await page.screenshot({path:'../artifacts/manual-finance/kol-monthly-redesign.png',fullPage:true});
    await page.click('.kol-monthly-card footer button');
    await page.waitForSelector('.kol-monthly-orders > article',{timeout:45000});
    results.bonusOrders=await page.evaluate(()=>({count:document.querySelectorAll('.kol-monthly-orders > article').length,totals:document.querySelector('.kol-monthly-orders > header').textContent}));
    await page.keyboard.press('Escape');
    await page.setViewport({width:390,height:844});
    await page.screenshot({path:'../artifacts/manual-finance/kol-monthly-mobile.png',fullPage:true});
    results.mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    console.log(JSON.stringify({results,errors}));
  } finally {if(browser)await browser.close();await db.$disconnect();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
