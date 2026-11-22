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
    await page.goto('http://localhost:5173/collaborator/marketing?tab=deals', {waitUntil:'domcontentloaded'});
    await page.waitForSelector('.kol-deal-card');
    const count = (await page.$$('.kol-deal-card')).length;
    await page.type('.kol-deals-search input','khongco-deal-12345');
    await page.waitForFunction(() => document.querySelectorAll('.kol-deal-card').length === 0);
    console.log('Search empty: PASS');
    await page.focus('.kol-deals-search input');
    await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.waitForFunction(n => document.querySelectorAll('.kol-deal-card').length === n, {}, count);
    console.log('Clear search: PASS');
    await page.screenshot({path:'../artifacts/manual-finance/kol-deal-search.png'});
    const widths = await page.$$eval('.kol-deals-toolbar > button',els=>els.map(el=>el.getBoundingClientRect().width));
    if(Math.abs(widths[0]-widths[1])>1) throw Error('Unequal buttons');
    await page.setViewport({width:390,height:844});
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)) throw Error('Overflow');
    console.log(JSON.stringify({result:'PASS',count,widths,mobile:'fits'}));
  } finally { if(browser) await browser.close(); await db.$disconnect(); }
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
