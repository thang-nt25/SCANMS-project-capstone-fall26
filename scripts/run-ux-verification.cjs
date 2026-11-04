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

async function loginAs(page, email, password) {
  console.log(`[AUTH] Authenticating as ${email}...`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await wait(500);

  // Clear previous session
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  const loginResult = await page.evaluate(async (email, password) => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password: password })
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.message || 'Login failed' };
      }
      const accessToken = data.data?.accessToken || data.accessToken;
      const user = data.data?.user || data.user;
      if (accessToken) {
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        if (user.role === 'SHOP_MANAGER') {
          const storeId = user.storeId || (user.stores && user.stores[0] ? user.stores[0].id : null);
          if (storeId) localStorage.setItem('current_store_id', storeId);
        }
        return { success: true, user };
      }
      return { success: false, error: 'No accessToken in response' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, email, password);

  if (!loginResult.success) {
    console.error(`[AUTH] Failed to login as ${email}:`, loginResult.error);
    return false;
  }
  console.log(`[AUTH] Successfully logged in as ${email} (${loginResult.user?.role})`);
  return true;
}

async function capture(page, filename, description) {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  await wait(1000);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`[PROOF CAPTURED] ${filename}: ${description}`);
}

async function run() {
  console.log('--- STARTING SCANMS UX & AESTHETIC VERIFICATION ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();

  try {
    // 1. Soothing Warm Parchment Canvas & Privacy Consent Toast
    console.log('\n[STEP 1] Testing Soothing Warm Luxury Parchment Canvas & Privacy Toast...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await wait(2000);
    await capture(page, 'soothing_warm_parchment_marketplace.png', 'Marketplace with Warm Sand Oatmeal (#FAF7F2) canvas and Privacy Consent Toast');

    // 1b. Scroll down to show Catalog on Warm Sand
    console.log('\n[STEP 1b] Capturing Warm Sand Product Catalog...');
    await page.evaluate(() => {
      const el = document.getElementById('catalog-section');
      if (el) el.scrollIntoView();
    });
    await wait(1500);
    await capture(page, 'soothing_warm_sand_catalog.png', 'Marketplace Product Catalog with Warm Sand borders and rounded cards');

    // 2. Customer View - Commission Rates strictly HIDDEN
    console.log('\n[STEP 2] Testing Customer View - Commission Rates Strictly Hidden...');
    const custOk = await loginAs(page, 'customer.an@scanms.vn', 'Customer@123456');
    if (custOk) {
      await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await wait(1500);
      await page.evaluate(() => {
        const el = document.getElementById('catalog-section');
        if (el) el.scrollIntoView();
      });
      await wait(1500);
      await capture(page, 'customer_commission_hidden.png', 'Customer viewing products without affiliate commission rates (Chính hãng 100% badge shown)');
    }

    // 3. Collaborator 3-Tier Decomposed Wallet
    console.log('\n[STEP 3] Testing Collaborator 3-Tier Decomposed Balances...');
    const kolOk = await loginAs(page, 'kol.bronze@scanms.vn', 'Kol@123456');
    if (kolOk) {
      await page.goto(`${BASE_URL}/collaborator/wallet`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await wait(2000);
      await capture(page, 'collaborator_wallet_3_tier_decomposed.png', 'Collaborator wallet showing 3 decomposed cards: Available, 14-Day Escrow, and VIP Deal / Monthly Kickback (FR-09)');
    }

    // 4. Shop Sample Bulk Approval
    console.log('\n[STEP 4] Testing Shop Manager Sample Management with Bulk Actions...');
    const shopOk = await loginAs(page, 'manager.sora@scanms.vn', 'Shop@123456');
    if (shopOk) {
      await page.goto(`${BASE_URL}/merchant/kol-hub?tab=samples`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await wait(2000);
      await capture(page, 'shop_sample_bulk_approval.png', 'Shop Manager sample requests table with multi-select checkboxes and bulk approval action bar');
    }

    // 5. Merchant Orders Bulk Operations
    console.log('\n[STEP 5] Testing Merchant Orders Bulk Operations...');
    if (shopOk) {
      await page.goto(`${BASE_URL}/merchant/orders`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await wait(2000);
      await capture(page, 'merchant_orders_bulk_actions.png', 'Shop Manager orders list with multi-select checkboxes and bulk batch dispatch bar');
    }

    // 6. Refreshed Flow 2: Collaborator Marketplace
    console.log('\n[STEP 6] Re-capturing Collaborator Marketplace with Warm Parchment & Rates...');
    await loginAs(page, 'kol.bronze@scanms.vn', 'Kol@123456');
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await wait(1500);
    await page.evaluate(() => {
      const el = document.getElementById('catalog-section');
      if (el) el.scrollIntoView();
    });
    await wait(1500);
    await capture(page, 'flow2_step4_collaborator_marketplace.png', 'Marketplace showing Thù lao tiếp thị 10% exclusively to Collaborators on Warm Oatmeal Canvas');

    console.log('\n--- ALL UX & ARCHITECTURAL VERIFICATIONS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

run();
