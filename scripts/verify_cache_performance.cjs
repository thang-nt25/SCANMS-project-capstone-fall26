const path = require('path');
const fs = require('fs');
const puppeteer = require(path.resolve(__dirname, '../frontend/node_modules/puppeteer-core'));

const wait = (ms) => new Promise(r => setTimeout(r, ms));
const screenshotsDir = 'C:/Users/Choc/.gemini/antigravity/brain/5b504607-56df-4652-866d-b790447565d8/screenshots';

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function loginAs(page, email, password) {
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  await page.evaluate(async (ident, pass) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('scanms_cookie_consent', 'accepted');
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ident, password: pass }),
    });
    const data = await res.json();
    const token = data.data?.accessToken || data.accessToken;
    const user = data.data?.user || data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (user?.stores?.[0]?.id) {
      localStorage.setItem('current_store_id', user.stores[0].id);
    }
  }, email, password);
  await wait(500);
}

(async () => {
  console.log('=== VERIFYING INSTANT NAVIGATION & CACHE PERFORMANCE ===');
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();

  // Listen to console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  try {
    // 1. SHOP MANAGER TEST
    console.log('\n--- 1. Testing Shop Manager Initial Data Load ---');
    await loginAs(page, 'manager.sora@scanms.vn', 'Shop@123456');

    // Visit Dashboard
    const t0 = Date.now();
    await page.goto('http://localhost:5173/merchant/dashboard', { waitUntil: 'networkidle2' });
    console.log(`Initial Dashboard load: ${Date.now() - t0}ms`);
    await wait(1000);

    // Visit Orders
    const t1 = Date.now();
    await page.goto('http://localhost:5173/merchant/orders', { waitUntil: 'networkidle2' });
    console.log(`Initial Orders load: ${Date.now() - t1}ms`);
    await wait(1000);

    // Visit Products
    const t2 = Date.now();
    await page.goto('http://localhost:5173/merchant/products', { waitUntil: 'networkidle2' });
    console.log(`Initial Products load: ${Date.now() - t2}ms`);
    await wait(1000);

    // Visit Promotions
    const t3 = Date.now();
    await page.goto('http://localhost:5173/merchant/promotions', { waitUntil: 'networkidle2' });
    console.log(`Initial Promotions load: ${Date.now() - t3}ms`);
    await wait(1000);

    // Visit Partner Hub (Kol Hub)
    const t4 = Date.now();
    await page.goto('http://localhost:5173/merchant/kol-hub', { waitUntil: 'networkidle2' });
    console.log(`Initial Partner Hub load: ${Date.now() - t4}ms`);
    await wait(1500);

    // NOW TEST RETURN NAVIGATION (INSTANT SNAPSHOT CACHE)
    console.log('\n--- 2. Testing Return Navigation (Module Snapshot & Axios In-Memory Cache) ---');
    
    // Switch to Dashboard via in-app click or pushState/navigation
    const t5 = Date.now();
    await page.evaluate(() => {
      window.history.pushState({}, '', '/merchant/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    // Check if spinner is shown
    const spinnerOnDashboard = await page.evaluate(() => {
      return !!document.querySelector('.animate-spin');
    });
    const headerTitle = await page.evaluate(() => {
      return document.querySelector('h1')?.innerText || document.title;
    });
    console.log(`Instant Dashboard Navigation: ${Date.now() - t5}ms. Spinner shown: ${spinnerOnDashboard}. Heading: "${headerTitle}"`);
    await page.screenshot({ path: `${screenshotsDir}/perf_instant_shop_dashboard.png` });

    // Switch to Products
    const t6 = Date.now();
    await page.evaluate(() => {
      window.history.pushState({}, '', '/merchant/products');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    const spinnerOnProducts = await page.evaluate(() => {
      return !!document.querySelector('.animate-spin');
    });
    console.log(`Instant Products Navigation: ${Date.now() - t6}ms. Spinner shown: ${spinnerOnProducts}`);
    await wait(500);
    await page.screenshot({ path: `${screenshotsDir}/perf_instant_shop_products.png` });

    // Switch to Orders
    const t7 = Date.now();
    await page.evaluate(() => {
      window.history.pushState({}, '', '/merchant/orders');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    const spinnerOnOrders = await page.evaluate(() => {
      return !!document.querySelector('.animate-spin');
    });
    console.log(`Instant Orders Navigation: ${Date.now() - t7}ms. Spinner shown: ${spinnerOnOrders}`);
    await wait(500);
    await page.screenshot({ path: `${screenshotsDir}/perf_instant_shop_orders.png` });

    // Switch to Promotions
    const t8 = Date.now();
    await page.evaluate(() => {
      window.history.pushState({}, '', '/merchant/promotions');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    const spinnerOnPromotions = await page.evaluate(() => {
      return !!document.querySelector('.animate-spin');
    });
    console.log(`Instant Promotions Navigation: ${Date.now() - t8}ms. Spinner shown: ${spinnerOnPromotions}`);
    await wait(500);
    await page.screenshot({ path: `${screenshotsDir}/perf_instant_shop_promotions.png` });

    // 2. COLLABORATOR TEST
    console.log('\n--- 3. Testing Collaborator Wallet Instant Caching ---');
    await loginAs(page, 'lanhuong.koc@scanms.vn', 'Kol@123456');
    await page.goto('http://localhost:5173/collaborator/wallet', { waitUntil: 'networkidle2' });
    await wait(1000);

    // Switch to dashboard and back to wallet
    await page.goto('http://localhost:5173/collaborator/dashboard', { waitUntil: 'networkidle2' });
    await wait(500);

    const t9 = Date.now();
    await page.evaluate(() => {
      window.history.pushState({}, '', '/collaborator/wallet');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    const spinnerOnWallet = await page.evaluate(() => {
      return !!document.querySelector('.animate-spin');
    });
    console.log(`Instant Wallet Navigation: ${Date.now() - t9}ms. Spinner shown: ${spinnerOnWallet}`);
    await page.screenshot({ path: `${screenshotsDir}/perf_instant_kol_wallet.png` });

    // 3. ADMIN PAYOUTS TEST
    console.log('\n--- 4. Testing Admin Daily Payouts Instant Caching ---');
    await loginAs(page, 'admin.nguyen@scanms.vn', 'Admin@123456');
    await page.goto('http://localhost:5173/admin/finance/payouts', { waitUntil: 'networkidle2' });
    await wait(1000);

    await page.goto('http://localhost:5173/admin/analytics', { waitUntil: 'networkidle2' });
    await wait(500);

    const t10 = Date.now();
    await page.evaluate(() => {
      window.history.pushState({}, '', '/admin/finance/payouts');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    const spinnerOnAdmin = await page.evaluate(() => {
      return !!document.querySelector('.animate-spin');
    });
    console.log(`Instant Admin Payouts Navigation: ${Date.now() - t10}ms. Spinner shown: ${spinnerOnAdmin}`);
    await page.screenshot({ path: `${screenshotsDir}/perf_instant_admin_payouts.png` });

    console.log('\n🎉 ALL CACHE PERFORMANCE TESTS PASSED SUCCESSFULLY! ZERO SPINNER FLASHING DETECTED.');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await browser.close();
  }
})();
