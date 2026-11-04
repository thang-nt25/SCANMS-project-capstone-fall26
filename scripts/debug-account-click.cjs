const path = require('path');
const puppeteer = require(path.resolve(__dirname, '../frontend/node_modules/puppeteer-core'));

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle2' });

  // Login as KOL Lê Hoàng Yến Nhi
  const loginRes = await page.evaluate(async () => {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'kol.bronze@scanms.vn', password: 'Kol@123456' })
    });
    const data = await res.json();
    const token = data.data?.accessToken || data.accessToken;
    const user = data.data?.user || data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    return { token: Boolean(token), user: user?.role };
  });
  console.log('Login result:', loginRes);

  await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle2' });
  await wait(1000);

  // Open account dropdown
  const trigger = await page.$('.header-account-trigger');
  if (!trigger) {
    console.log('Error: .header-account-trigger not found');
    await browser.close();
    return;
  }
  await trigger.click();
  await wait(600);

  // Check account menu links
  const links = await page.evaluate(() => {
    const el = document.querySelector('.account-menu');
    if (!el) return { found: false };
    const anchors = Array.from(el.querySelectorAll('a')).map(a => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href'),
      target: a.getAttribute('target')
    }));
    return { found: true, anchors };
  });
  console.log('Account menu anchors:', links);

  // Click the first link in account menu: "Không gian KOL/KOC"
  console.log('Clicking on first collaborator link...');
  const clicked = await page.evaluate(() => {
    const el = document.querySelector('.account-menu');
    const firstLink = el ? el.querySelector('a[href*="collaborator"]') : null;
    if (firstLink) {
      firstLink.click();
      return { clicked: true, href: firstLink.getAttribute('href') };
    }
    return { clicked: false };
  });
  console.log('Clicked result:', clicked);

  await wait(2000);
  console.log('Current URL after click:', page.url());

  await browser.close();
})().catch(console.error);
