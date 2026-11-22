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
    await page.goto('http://localhost:5173/collaborator/marketing?tab=links',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.kol-link-metrics');
    const alignment = await page.evaluate(() => {
      const tabs = [...document.querySelectorAll('#marketing-toolkit-hub [role="tab"]')];
      const cells = [...document.querySelectorAll('.kol-link-metrics > div')];
      return tabs.slice(1).map((tab,i) => {
        const style = getComputedStyle(tab,'::before');
        const line = tab.getBoundingClientRect().left + parseFloat(getComputedStyle(tab).borderLeftWidth) + parseFloat(style.left);
        return Math.abs(line-cells[i+1].getBoundingClientRect().left);
      });
    });
    if(alignment.some(delta=>delta>1)) throw Error('Divider mismatch '+alignment);
    console.log(JSON.stringify({result:'PASS',dividerOffsets:alignment}));
  } finally { if(browser) await browser.close(); await db.$disconnect(); }
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
