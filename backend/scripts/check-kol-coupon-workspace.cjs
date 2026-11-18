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
    await page.goto('http://localhost:5173/collaborator/marketing?tab=coupons', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.kc-card', { timeout: 30000 });
    const cards = await page.$$('.kc-card');
    if (cards.length > 10) throw Error('More than ten cards');
    const widths = await page.$$eval('.kc-card', els => els.slice(0, 2).map(el => el.getBoundingClientRect().width));
    if (widths.length === 2 && Math.abs(widths[0] - widths[1]) > 1) throw Error('Unequal cards');
    await page.screenshot({path:'../artifacts/manual-finance/kol-coupons-workspace.png'});
    const firstCode = await page.$eval('.kc-code strong', el => el.textContent);
    const hasNext = await page.$eval('.kc-pagination button:last-child', el => !el.disabled);
    if (hasNext) {
      await page.$eval('.kc-pagination button:last-child', el => el.click());
      await page.waitForFunction(code => document.querySelector('.kc-code strong')?.textContent !== code, {}, firstCode);
      await page.$eval('.kc-pagination button:first-child', el => el.click());
    }
    await page.$eval('.kc-card footer button:first-child', el => el.click());
    await page.waitForSelector('.kc-detail');
    await page.waitForFunction(() => {
      const history = document.querySelector('.kc-history');
      return history && !history.textContent.includes('Đang tải');
    });
    if (await page.$('.kc-history [role="alert"]')) throw Error('History failed to load');
    await page.screenshot({path:'../artifacts/manual-finance/kol-coupon-details.png'});
    await page.keyboard.press('Escape');
    await page.setViewport({width:390,height:844});
    await page.screenshot({path:'../artifacts/manual-finance/kol-coupons-workspace-mobile.png'});
    if(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw Error('Mobile overflow');
    if(errors.length) throw Error(errors.join(' | '));
    console.log(JSON.stringify({result:'PASS',cards:cards.length,pagination:hasNext,mobile:'fits'}));
  } finally { if(browser) await browser.close(); await db.$disconnect(); }
})().catch(e => {console.error(e.message);process.exitCode=1;});
