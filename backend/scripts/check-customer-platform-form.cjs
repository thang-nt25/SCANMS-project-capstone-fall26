require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  let browser;
  try {
    const user = await db.user.findFirst({ where: { email: 'customer.an@scanms.vn', isActive: true, isDeleted: false }, select: { id: true, role: true, email: true, fullName: true } });
    const token = require('jsonwebtoken').sign({ sub: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '3m' });
    const p = await import('../../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
    browser = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-first-run', '--disable-extensions'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument(({ user, token }) => {
      localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user));
      if (!sessionStorage.getItem('layout-fixture')) localStorage.removeItem('scanms_kol_upgrade_draft');
    }, { user, token });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const path = new URL(request.url()).pathname;
      if (path === '/api/kyc/upgrade/my-status') return void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ kolApplication: null }) });
      if (path.startsWith('/api/') && !['GET', 'OPTIONS'].includes(request.method())) return void request.abort();
      void request.continue();
    });
    await page.goto('http://localhost:5173/customer/upgrade', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#primary-channel-url', { timeout: 30000 });
    const select = async label => page.evaluate(label => {
      const button = [...document.querySelectorAll('button[aria-pressed]')].find(element => element.textContent.trim() === label);
      if (!button) throw Error('Missing platform: ' + label);
      button.click();
    }, label);
    await page.type('#primary-channel-name', '@mytiktok');
    await page.type('#primary-channel-url', 'https://www.tiktok.com/@mytiktok');
    for (const [label, host] of [['YouTube', 'youtube.com'], ['Instagram', 'instagram.com'], ['Facebook', 'facebook.com'], ['Khác', 'example.com']]) {
      await select(label);
      const input = await page.$eval('#primary-channel-url', element => ({ value: element.value, placeholder: element.placeholder }));
      if (input.value || !input.placeholder.includes(host)) throw Error('Platform-specific fields failed for ' + label);
      if (label === 'YouTube') {
        if (!await page.$eval('label[for="primary-channel-followers"]', element => element.textContent.includes('người đăng ký'))) throw Error('Subscriber label failed');
        await page.type('#primary-channel-url', 'https://tiktok.com/@wrong');
        await page.waitForSelector('#primary-channel-url-error');
      }
    }
    await select('TikTok');
    if (!await page.$eval('#primary-channel-url', element => element.value === 'https://www.tiktok.com/@mytiktok')) throw Error('TikTok draft was lost');
    await select('YouTube');
    if (!await page.$eval('#primary-channel-url', element => element.value === 'https://tiktok.com/@wrong')) throw Error('YouTube draft was lost');
    await page.screenshot({ path: '../artifacts/manual-finance/customer-platform-form.png' });
    await page.evaluate(() => {
      sessionStorage.setItem('layout-fixture', 'true');
      localStorage.setItem('scanms_kol_upgrade_draft', JSON.stringify({
        channels: [{ platform: 'TIKTOK', channelName: '@mychannel', channelUrl: 'https://www.tiktok.com/@mychannel', followerCount: 1000, channelProofUrl: '/assets/products/real/chamomile-tea-50g.webp', isPrimary: true }],
        specialtyCategories: ['Mỹ phẩm & Chăm sóc da chuyên sâu'], bio: '',
      }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow') === '67');
    if (!await page.$('.partner-channel-proof-preview img')) throw Error('Proof preview missing');
    if ((await page.$$('.partner-form-section-title')).length !== 3) throw Error('Expected three form sections');
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Tiếp tục').click());
    await page.waitForFunction(() => document.activeElement?.id === 'kol-bio');
    await page.type('#kol-bio', 'Nội dung chăm sóc da dành cho người mới bắt đầu.');
    await page.waitForFunction(() => document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow') === '100');
    await page.evaluate(() => document.querySelector('.workspace-page-column')?.scrollTo({ top: 0 }));
    await page.screenshot({ path: '../artifacts/manual-finance/customer-partner-upgrade-desktop.png' });
    await page.setViewport({ width: 390, height: 1000 });
    if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw Error('Mobile form overflow');
    await page.screenshot({ path: '../artifacts/manual-finance/customer-partner-upgrade-mobile.png' });
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Tiếp tục').click());
    await page.waitForFunction(() => !document.querySelector('#primary-channel-url'));
    console.log('Verified three sections, restored draft/category, proof preview, accurate progress, focus on missing bio, mobile fit and next step. No application submitted.');
    console.log('Verified all five platform selections, changing labels/examples, separate drafts and mismatched URL warning. Status mocked; all writes blocked.');
  } finally { await browser?.close(); await db.$disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
