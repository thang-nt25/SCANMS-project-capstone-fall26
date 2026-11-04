const path = require('path');
const puppeteer = require(path.resolve(__dirname, '../frontend/node_modules/puppeteer-core'));
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve('C:/Users/Choc/.gemini/antigravity/brain/5b504607-56df-4652-866d-b790447565d8/screenshots');
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Test unauthenticated marketplace + click "Đơn hàng" to see the login modal
  console.log('[TEST 1] Visiting marketplace unauthenticated...');
  await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle2' });
  await wait(800);

  // Clear any existing session
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await wait(800);

  // Click on "Đơn hàng" button via evaluate
  console.log('[TEST 1] Clicking "Đơn hàng" button...');
  const clickedOrder = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const orderBtn = btns.find(b => b.textContent?.includes('Đơn hàng'));
    if (orderBtn) {
      orderBtn.click();
      return true;
    }
    return false;
  });

  console.log('[TEST 1] Clicked order button:', clickedOrder);
  await wait(600);
  const orderModalPath = path.join(SCREENSHOT_DIR, 'test_orders_login_modal.png');
  await page.screenshot({ path: orderModalPath });
  console.log('[SCREENSHOT] Captured order login modal to:', orderModalPath);

  // 2. Log in and capture user dropdown
  console.log('[TEST 2] Logging in as customer...');
  await page.evaluate(async () => {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'customer.an@scanms.vn', password: 'Customer@123456' })
    });
    const data = await response.json();
    const accessToken = data.data?.accessToken || data.accessToken;
    const user = data.data?.user || data.user;
    if (accessToken && user) {
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
    }
  });

  await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle2' });
  await wait(1000);

  // Capture logged-in marketplace header & banner
  const loggedInMarketplacePath = path.join(SCREENSHOT_DIR, 'new_two_tier_header_logged_in.png');
  await page.screenshot({ path: loggedInMarketplacePath });
  console.log('[SCREENSHOT] Captured logged in header to:', loggedInMarketplacePath);

  // Click user account button to open dropdown
  console.log('[TEST 2] Clicking account trigger to open dropdown...');
  const clickedAccount = await page.evaluate(() => {
    const btn = document.querySelector('.header-account-trigger');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('[TEST 2] Clicked account trigger:', clickedAccount);
  await wait(600);

  const accountDropdownPath = path.join(SCREENSHOT_DIR, 'test_account_dropdown_open.png');
  await page.screenshot({ path: accountDropdownPath });
  console.log('[SCREENSHOT] Captured account dropdown to:', accountDropdownPath);

  await browser.close();
  console.log('[DONE] All tests completed successfully!');
}

runTests().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
