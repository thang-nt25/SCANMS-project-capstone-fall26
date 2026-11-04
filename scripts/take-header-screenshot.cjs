const path = require('path');
const puppeteer = require(path.resolve(__dirname, '../frontend/node_modules/puppeteer-core'));
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve('C:/Users/Choc/.gemini/antigravity/brain/5b504607-56df-4652-866d-b790447565d8/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('[SCREENSHOT] Loading marketplace...');
  await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle2', timeout: 20000 });
  await wait(1000);

  const screenshotPath = path.join(SCREENSHOT_DIR, 'new_two_tier_header_marketplace.png');
  await page.screenshot({ path: screenshotPath });
  console.log('[SCREENSHOT] Captured marketplace to:', screenshotPath);

  // Also capture scrolled state (compact or sticky)
  await page.evaluate(() => window.scrollBy(0, 300));
  await wait(500);
  const scrolledPath = path.join(SCREENSHOT_DIR, 'new_two_tier_header_scrolled.png');
  await page.screenshot({ path: scrolledPath });
  console.log('[SCREENSHOT] Captured scrolled state to:', scrolledPath);

  await browser.close();
}

capture().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
