const path = require('path');
const puppeteer = require(path.resolve(__dirname, '../frontend/node_modules/puppeteer-core'));

const SCREENSHOT_DIR = path.resolve('C:/Users/Choc/.gemini/antigravity/brain/5b504607-56df-4652-866d-b790447565d8/screenshots');
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

  // Login as KOL Lê Hoàng Yến Nhi
  await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle2' });
  await page.evaluate(async () => {
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
  });

  await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle2' });
  await wait(800);

  // 1. Click "Kênh KOC Tiếp Thị" link
  console.log('Testing "Kênh KOC Tiếp Thị"...');
  const kocLink = await page.$('a[title*="KOC"]');
  if (kocLink) {
    await kocLink.click();
    await wait(1200);
    console.log('URL after clicking KOC link:', page.url());
    const kocScreenshot = path.join(SCREENSHOT_DIR, 'test_koc_workspace_navigated.png');
    await page.screenshot({ path: kocScreenshot });
    console.log('Captured KOC workspace to:', kocScreenshot);
  }

  // 2. Go back to marketplace, open dropdown, click "Ví hoa hồng"
  await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle2' });
  await wait(800);

  const trigger = await page.$('.header-account-trigger');
  await trigger.click();
  await wait(400);

  console.log('Clicking "Ví hoa hồng" in dropdown...');
  const walletLink = await page.$('.account-menu a[href*="wallet"]');
  if (walletLink) {
    const linkBox = await walletLink.boundingBox();
    await page.mouse.click(linkBox.x + linkBox.width / 2, linkBox.y + linkBox.height / 2);
    await wait(1200);
    console.log('URL after clicking wallet link:', page.url());
    const walletScreenshot = path.join(SCREENSHOT_DIR, 'test_wallet_navigated.png');
    await page.screenshot({ path: walletScreenshot });
    console.log('Captured Wallet page to:', walletScreenshot);
  }

  await browser.close();
  console.log('All navigation verification complete!');
})().catch(console.error);
