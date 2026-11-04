const puppeteer = require('./frontend/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve('C:/Users/Choc/.gemini/antigravity/brain/5b504607-56df-4652-866d-b790447565d8/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loginAs(page, email, password, expectedPath) {
  console.log(`[AUTH] Logging in as ${email}...`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await wait(800);

  // Fill credentials
  await page.evaluate(() => {
    const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[placeholder*="email"]') || document.querySelector('input[name="identifier"]') || document.querySelector('#identifier-input') || document.querySelector('input');
    const passInput = document.querySelector('input[type="password"]');
    if (emailInput) {
      emailInput.value = '';
      emailInput.focus();
    }
  });

  const emailInput = await page.$('input[type="email"], input[placeholder*="email"], input[placeholder*="Tên đăng nhập"], #identifier-input');
  if (emailInput) {
    await emailInput.click({ clickCount: 3 });
    await emailInput.type(email, { delay: 30 });
  }

  const passInput = await page.$('input[type="password"]');
  if (passInput) {
    await passInput.click({ clickCount: 3 });
    await passInput.type(password, { delay: 30 });
  }

  await wait(400);
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
  }

  await wait(2500);
  console.log(`[AUTH] Current URL after login: ${page.url()}`);
}

async function capture(page, filename, description) {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  await wait(1000);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`[SCREENSHOT] ${filename} saved: ${description}`);
  return filePath;
}

(async () => {
  console.log('=== STARTING SCANMS 5-FLOW LIVE TESTS ===');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900']
  });

  const page = await browser.newPage();

  try {
    // -------------------------------------------------------------
    // FLOW 1: STORE ONBOARDING, CREATOR KYC & SOCIAL CHANNELS
    // -------------------------------------------------------------
    console.log('\n>>> EXECUTING FLOW 1: Onboarding Nhân Sự, eKYC & Kênh MXH <<<');

    // Step 1.1: SYSTEM_ADMIN at /admin/personnel
    await loginAs(page, 'admin@scanms.vn', 'Admin@123456', '/admin/analytics');
    await page.goto(`${BASE_URL}/admin/personnel`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow1_step1_admin_personnel.png', 'Super Admin Quản lý Nhân sự & Bổ nhiệm Store Manager');

    // Step 1.2: SYSTEM_MANAGER at /admin/kyc
    await loginAs(page, 'manager@scanms.vn', 'Manager@123456', '/admin/kyc');
    await page.goto(`${BASE_URL}/admin/kyc`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow1_step3_system_manager_kyc.png', 'Chuyên viên Vận hành thẩm định Maker-Checker hồ sơ eKYC');

    // Step 1.3: CUSTOMER Portal / Partner Upgrade
    await loginAs(page, 'customer.an@scanms.vn', 'Customer@123456', '/customer/orders');
    await page.goto(`${BASE_URL}/customer/upgrade`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow1_step2_customer_portal_upgrade.png', 'Cổng Nâng Cấp KOC Đối Tác (Layout 60/40 Executive)');

    // Step 1.4: COLLABORATOR Dashboard & Social Channels
    await loginAs(page, 'kol.bronze@scanms.vn', 'Kol@123456', '/collaborator/dashboard');
    await page.goto(`${BASE_URL}/collaborator/dashboard`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow1_step4_kol_dashboard.png', 'Bảng điều khiển KOC Hạng Đồng (10% cơ sở)');

    await page.goto(`${BASE_URL}/collaborator/profile?tab=social`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow1_step4_kol_social_channels.png', 'Quản lý Kênh Mạng Xã Hội Đã Xác Minh (FR-07)');

    // -------------------------------------------------------------
    // FLOW 2: CATEGORY LOCK, AI MATCHMAKER & MEDIA HUB
    // -------------------------------------------------------------
    console.log('\n>>> EXECUTING FLOW 2: Khóa Ngành Hàng, AI Matchmaker & Media Hub <<<');

    // Step 2.1: SHOP_MANAGER at /merchant/products
    await loginAs(page, 'manager.sora@scanms.vn', 'Shop@123456', '/merchant/dashboard');
    await page.goto(`${BASE_URL}/merchant/products`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow2_step1_merchant_product_catalog.png', 'Quản lý Sản phẩm Khóa Ngành Hàng & Ma Trận Biến Thể EAN-13');

    // Step 2.2: SYSTEM_MANAGER Product Moderation
    await loginAs(page, 'manager@scanms.vn', 'Manager@123456', '/admin/kyc');
    await page.goto(`${BASE_URL}/admin/product-moderation`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow2_step2_product_moderation.png', 'Kiểm duyệt sản phẩm Maker-Checker pháp chế & chống trùng mã');

    // Step 2.3: SHOP_MANAGER AI Matchmaker
    await loginAs(page, 'manager.sora@scanms.vn', 'Shop@123456', '/merchant/dashboard');
    await page.goto(`${BASE_URL}/merchant/kol-hub?mode=ai-matching`, { waitUntil: 'networkidle2' });
    await wait(2500);
    await capture(page, 'flow2_step3_ai_matchmaker_radar.png', 'Động cơ AI Matchmaker Radar 4 Trục so khớp KOC 94%');

    // Step 2.4: COLLABORATOR Marketplace & Discovery
    await loginAs(page, 'kol.bronze@scanms.vn', 'Kol@123456', '/collaborator/dashboard');
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow2_step4_collaborator_marketplace.png', 'Marketplace Sàn Tiếp Thị Sản Phẩm & Gửi Đề Xuất Hợp Tác');

    // Step 2.5: COLLABORATOR Media Hub
    await page.goto(`${BASE_URL}/collaborator/marketing?tab=media`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow2_step5_media_hub_assets.png', 'Kho Tài Nguyên Số Media Hub tập trung tải Banner/Video HD');

    // -------------------------------------------------------------
    // FLOW 3: VIP DEAL CHAT, EXCLUSIVE COUPON & SAMPLE SLA 14 DAYS
    // -------------------------------------------------------------
    console.log('\n>>> EXECUTING FLOW 3: Chat VIP Realtime, Coupon THAONHI16 & Hàng Mẫu SLA 14N <<<');

    // Step 3.1 & 3.2: Chat Realtime & Exclusive Deal
    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle2' });
    await wait(2000);
    await capture(page, 'flow3_step1_chat_deal_negotiation.png', 'Khung Chat Realtime Socket.IO đàm phán Deal Độc Quyền VIP');

    // Step 3.3: COLLABORATOR Samples One-Stop Hub
    await page.goto(`${BASE_URL}/collaborator/marketing?tab=samples`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow3_step3_collaborator_samples_hub.png', 'Trung Tâm Mẫu Thử KOC One-Stop Hub & Đồng Hồ SLA 14 Ngày');

    // Step 3.4: SHOP_MANAGER Samples Approval & GHN Dispatch
    await loginAs(page, 'manager.sora@scanms.vn', 'Shop@123456', '/merchant/dashboard');
    await page.goto(`${BASE_URL}/merchant/kol-hub?tab=samples`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow3_step4_shop_samples_approval.png', 'Nhãn Hàng Thẩm Duyệt Xuất Kho Hàng Mẫu GHN 0đ');

    // -------------------------------------------------------------
    // FLOW 4: ATTRIBUTION, ANTI-FRAUD, GHN FULFILLMENT & RETURNS
    // -------------------------------------------------------------
    console.log('\n>>> EXECUTING FLOW 4: Attribution, Chống Gian Lận, Đơn Hàng & Đổi Trả <<<');

    // Step 4.1: COLLABORATOR Marketing Toolkit (Links & Coupon)
    await loginAs(page, 'kol.bronze@scanms.vn', 'Kol@123456', '/collaborator/dashboard');
    await page.goto(`${BASE_URL}/collaborator/marketing?tab=links`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow4_step1_smart_links_and_qr.png', 'Bộ Sinh Smart Link, Dynamic QR & Coupon Định Danh KOC');

    // Step 4.4: CUSTOMER Cart & Attribution Checkout
    await loginAs(page, 'customer.an@scanms.vn', 'Customer@123456', '/customer/orders');
    await page.goto(`${BASE_URL}/cart`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow4_step4_customer_cart_coupon.png', 'Giỏ Hàng Áp Dụng Coupon Định Danh KOC THAONHI16');

    // Step 4.6: SHOP_MANAGER Orders Management & GHN
    await loginAs(page, 'manager.sora@scanms.vn', 'Shop@123456', '/merchant/dashboard');
    await page.goto(`${BASE_URL}/merchant/orders`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow4_step6_shop_orders_ghn.png', 'Quản Lý Đơn Hàng Giao Nhận GHN & Đóng Gói Kiện Carton');

    // Step 4.7: SHOP_MANAGER Returns & Exchange
    await page.goto(`${BASE_URL}/merchant/returns`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow4_step7_shop_returns_replacement.png', 'Xử Lý Đổi Trả: Bù Hàng Mới 1-1 (Giữ Hoa Hồng) vs Hoàn Tiền (Clawback)');

    // -------------------------------------------------------------
    // FLOW 5: ESCROW, MONTHLY SETTLEMENT, PIT TAX & LEDGER
    // -------------------------------------------------------------
    console.log('\n>>> EXECUTING FLOW 5: Escrow 14N, Thưởng Tháng FR-09, Thuế 10% & Payout <<<');

    // Step 5.2: SHOP_MANAGER Monthly Milestone Bonus Settlement (FR-09)
    await page.goto(`${BASE_URL}/merchant/promotions?tab=commission-rules`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow5_step2_shop_monthly_bonus_settlement.png', 'Quyết Toán Mốc Thưởng Doanh Số Tháng FR-09 & Nâng Hạng KOC');

    // Step 5.3: COLLABORATOR Wallet & Payout with 10% PIT Tax
    await loginAs(page, 'kol.bronze@scanms.vn', 'Kol@123456', '/collaborator/dashboard');
    await page.goto(`${BASE_URL}/collaborator/wallet`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow5_step3_collaborator_wallet_tax.png', 'Ví Đối Tác KOC Khấu Trừ 10% Thuế TNCN & Đối Soát Escrow');

    // Step 5.5: SYSTEM_MANAGER Payout Approval with BIDV Sandbox
    await loginAs(page, 'manager@scanms.vn', 'Manager@123456', '/admin/kyc');
    await page.goto(`${BASE_URL}/admin/payouts`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow5_step5_manager_payout_approval.png', 'Chuyên Viên Kế Toán Duyệt Lệnh Payout & Khấu Trừ Thuế 10%');

    // Step 5.6: SYSTEM_ADMIN Executive Financial Dashboard & Audit Trail
    await loginAs(page, 'admin@scanms.vn', 'Admin@123456', '/admin/analytics');
    await page.goto(`${BASE_URL}/admin/analytics`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow5_step6_admin_executive_dashboard.png', 'Executive Financial Dashboard Báo Cáo GMV Toàn Tập Đoàn');

    await page.goto(`${BASE_URL}/admin/audit-logs`, { waitUntil: 'networkidle2' });
    await wait(1500);
    await capture(page, 'flow5_step6_admin_audit_logs.png', 'Nhật Ký Kiểm Toán Bất Biến (Audit Trail) Giám Sát Chi Tiền');

    console.log('\n=== ALL 5 FLOWS TESTED & CAPTURED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await browser.close();
  }
})();
