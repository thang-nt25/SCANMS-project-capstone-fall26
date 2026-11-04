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

  await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle2' });

  // Login as KOL Lê Hoàng Yến Nhi
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
  await wait(1000);

  // Hover over the account trigger like a human
  console.log('Hovering over trigger...');
  const trigger = await page.$('.header-account-trigger');
  const box = await trigger.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await wait(400);

  // Now move mouse down towards the dropdown menu
  console.log('Moving mouse towards dropdown...');
  const menu = await page.$('.account-menu');
  if (!menu) {
    console.log('Menu not opened by hover, clicking trigger...');
    await trigger.click();
    await wait(400);
  }

  // Find the first link in the menu
  const firstLink = await page.$('.account-menu a');
  if (firstLink) {
    console.log('Hovering over first link...');
    const linkBox = await firstLink.boundingBox();
    console.log('Link box:', linkBox);
    if (linkBox) {
      await page.mouse.move(linkBox.x + linkBox.width / 2, linkBox.y + linkBox.height / 2);
      await wait(200);
      console.log('Physically clicking link with mouse...');
      await page.mouse.click(linkBox.x + linkBox.width / 2, linkBox.y + linkBox.height / 2);
    }
  } else {
    console.log('No link found in .account-menu!');
  }

  await wait(2000);
  console.log('URL after physical mouse click:', page.url());

  // Also test clicking "Kênh KOC Tiếp Thị" and "Quản Trị Nhãn Hàng"
  console.log('Testing click on "Kênh KOC Tiếp Thị"...');
  await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle2' });
  await wait(800);

  const kocLink = await page.$('a[href*="kol"], a[href*="workspace"]');
  if (kocLink) {
    console.log('Clicking KOC link...');
    await kocLink.click();
    await wait(1500);
    console.log('URL after KOC link click:', page.url());
  }

  await browser.close();
})().catch(console.error);
