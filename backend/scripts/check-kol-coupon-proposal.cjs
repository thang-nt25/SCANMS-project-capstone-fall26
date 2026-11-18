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
    const p = await import('../../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
    browser = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-first-run', '--disable-extensions'] });
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument(({ user, token }) => {
      localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('scanms-current-role', 'kol'); localStorage.setItem('scanms-active-workspace', 'kol');
    }, { user, token });
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (new URL(request.url()).pathname.startsWith('/api/') && !['GET', 'OPTIONS'].includes(request.method())) return void request.abort();
      void request.continue();
    });
    await page.goto('http://localhost:5173/collaborator/marketing?tab=coupons',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.kc-propose-button');
    await page.click('.kc-propose-button');
    await page.waitForSelector('.kc-proposal-dialog');
    const store = await page.$eval('#coupon-partner-store',el=>el.textContent);
    await page.type('#coupon-proposal-code','a1');
    if(!await page.$eval('#coupon-proposal-code',el=>el.getAttribute('aria-invalid')==='true')) throw Error('Invalid code accepted');
    await page.$eval('.kc-proposal-suggestions button',el=>el.click());
    if(await page.$eval('#coupon-proposal-code',el=>el.value)!=='GOCREVIEW') throw Error('Suggestion not applied');
    await page.waitForFunction(()=>!document.querySelector('.kc-proposal-actions button[type=submit]').disabled);
    const widths=await page.$$eval('.kc-proposal-actions button',els=>els.map(el=>el.getBoundingClientRect().width));
    if(Math.abs(widths[0]-widths[1])>1)throw Error('Unequal buttons');
    await page.screenshot({path:'../artifacts/manual-finance/kol-coupon-proposal.png'});
    await page.setViewport({width:390,height:844});
    await page.screenshot({path:'../artifacts/manual-finance/kol-coupon-proposal-mobile.png'});
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Overflow');
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('.kc-proposal-dialog'));
    if(errors.length)throw Error(errors.join(' | '));
    console.log(JSON.stringify({result:'PASS',store,validation:'PASS',suggestion:'PASS',mobile:'fits',submit:'not executed'}));
  }finally{if(browser)await browser.close();await db.$disconnect();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
