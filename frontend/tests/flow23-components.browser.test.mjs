import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import JSZip from 'jszip';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = process.env.GHN_UI_BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const productId = '11111111-1111-4111-8111-111111111111';
const creatorId = '22222222-2222-4222-8222-222222222222';
const proposalId = '33333333-3333-4333-8333-333333333333';
const storeId = '55555555-5555-4555-8555-555555555555';
const conversationId = '44444444-4444-4444-8444-444444444444';
const product = { id: productId, storeId, title: 'Sản phẩm kiểm thử', categoryName: 'Mỹ phẩm', isActive: true, moderationStatus: 'APPROVED', price: 350000 };
const creator = { collaboratorId: creatorId, fullName: 'KOC không có lịch sử', tierName: 'Đồng', matchScore: 0, isRisingStar: true,
  scoreBreakdown: { categoryScore: 0, conversionRateScore: 0, tierAndSocialScore: 0, priceFitScore: 0 },
  aiReasoning: 'Chưa có dữ liệu bán hàng.', lifetimeStats: { totalOrders: 0, conversionRate: 0, grossRevenue: 0, dataConfidence: 'LOW' }, socialChannels: [] };
// Real React components, isolated API fixtures. PostgreSQL/Socket.IO integration
// is verified separately by the backend suite, never by these fixture responses.
const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><button id="prior">Before drawer</button><div id="scene"></div><script type="module">
import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
try { await import("/tests/fixtures/flow23-harness.tsx"); } catch(error) { window.sceneError = String(error); }
</script></body></html>`;

async function fixture() {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => {
    // Vite's development-only HMR transport is outside this isolated harness.
    // Keep application/Socket.IO failures visible; exclude only its exact stack.
    if (error.message === 'WebSocket closed without opened.' && error.stack?.includes('/@vite/client')) return;
    errors.push(error.message);
  });
  const calls = [];
  const state = { mode: 'success', status: 'PENDING', cooperation: null };
  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = new URL(req.url());
    const headers = { 'Access-Control-Allow-Origin': new URL(base).origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Skip-Cache,X-Requested-With', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' };
    const json = (data, status = 200) => req.respond({ status, headers, contentType: 'application/json', body: JSON.stringify({ success: status < 400, data, ...(status >= 400 ? { message: 'Không có quyền xem sản phẩm.' } : {}) }) });
    if (req.isNavigationRequest() && url.pathname === '/__flow23_test__') return req.respond({ status: 200, contentType: 'text/html', body: html });
    if (url.pathname === '/src/services/chat-socket.service.ts') return req.respond({ status: 200, contentType: 'application/javascript', body: 'const socket={connected:false,on(){return socket},off(){return socket},emit(){return socket},timeout(){return socket}};export const getChatSocket=()=>socket;export const disconnectChatSocket=()=>{};export const isChatSocketAuthenticated=()=>false;' });
    if (url.pathname.startsWith('/api/')) {
      if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers });
      calls.push({ path: url.pathname, query: Object.fromEntries(url.searchParams), method: req.method(), body: req.postData() ? JSON.parse(req.postData()) : null });
      if (url.pathname === '/api/pricing/catalog') return json([{ ...product, listPrice: 350000, floorPrice: 250000, variants: [], store: { name: 'Store Test' } }]);
      if (url.pathname === '/api/pricing/promotions') return req.method() === 'POST' ? json({ id: 'promotion', status: 'PENDING' }, 201) : json([]);
      if (url.pathname.endsWith('/floor')) return json({ ...product, floorPrice: calls.at(-1).body.floorPrice });
      if (url.pathname === '/api/affiliate-deals/exceptions') return json([{ id: proposalId, store: { name: 'Store Test' }, collaborator: { fullName: 'KOC Test' }, product: { title: product.title }, proposedCommissionRate: 20, scopeType: 'STORE_WIDE', targetRevenue: 10000000, commitmentDays: 30, salesCommitment: 'Video review' }]);
      if (url.pathname.endsWith('/exception-review')) return json({ status: 'APPROVED' });
      if (url.pathname === '/api/referral-links/products') return json([{ ...product, store: { id: storeId } }]);
      if (url.pathname === '/api/affiliate-deals/proposals') return json({ id: proposalId, conversationId }, 201);
      if (url.pathname.includes('/ai/recommend-kols')) return state.mode === 'denied' ? json(null, 403) : json({ targetProduct: { productId }, recommendedKols: state.mode === 'empty' ? [] : [creator], totalKolsScanned: 1 });
      if (url.pathname === '/api/products') return json({ items: [product, { ...product, id: '66666666-6666-4666-8666-666666666666', storeId: 'other-store', title: 'Sản phẩm của Shop khác' }] });
      if (url.pathname === '/api/chat/conversations') return json([{ id: conversationId, storeId, collaboratorId: creatorId, store: { id: storeId, name: 'Store Test' }, collaborator: { id: creatorId, fullName: creator.fullName, role: 'COLLABORATOR', collaboratorProfile: { tier: { name: 'Gold' } } }, chatMessages: [{ messageText: 'Tin nhắn thật trong fixture', createdAt: new Date().toISOString() }], lastMessageAt: new Date().toISOString() }]);
      if (url.pathname.endsWith('/messages')) return json([]);
      const profileCreator = { id: creatorId, fullName: 'Đối tác Gold', email: 'kol@example.test', collaboratorProfile: { tier: { name: 'Gold' }, totalEarnedCommission: 9000000, totalOrdersReferred: 700 }, socialChannels: [] };
      if (url.pathname === '/api/chat/search-collaborators') return json([profileCreator]);
      if (url.pathname === '/api/store-collaborators/shop') return json({ store: { id: storeId, name: 'Store Test' }, members: [{ id: 'member', collaboratorId: creatorId, collaborator: profileCreator, stats: { totalRevenue: 1200000, totalOrders: 2, completedVideosCount: 1 } }] });
      if (url.pathname === '/api/dashboard/shop/kol-orders') return json({ items: ['DELIVERED', 'COMPLETED', 'RETURN_REQUESTED'].map((status, index) => ({ id: 'order-fixture-' + index, orderCode: 'ORDER-' + index, createdAt: '2026-11-01T00:00:00Z', customerName: 'Test', productTitle: product.title, status, finalAmount: 100000, commissionAmount: 11000 })), page: Number(url.searchParams.get('page') || 1), totalPages: 2, summary: { totalOrders: 2, totalRevenue: url.searchParams.get('period') === '7d' ? 800000 : 1200000, accruedCommission: 150000 } });
      if (url.pathname === '/api/affiliate-deals/shop') return state.mode === 'deal-error' ? json(null, 503) : json([
        { id: proposalId, storeId, collaboratorId: creatorId, productId, status: 'APPROVED', isCurrentDeal: true, approvedCommissionRate: 13 },
        { id: 'closed', storeId, collaboratorId: creatorId, productId: 'old', status: 'APPROVED', isCurrentDeal: true, closedAt: new Date().toISOString(), approvedCommissionRate: 12 },
        { id: 'other', storeId: 'other-store', collaboratorId: creatorId, productId: 'other', status: 'APPROVED', isCurrentDeal: true, approvedCommissionRate: 11 },
      ]);
      if (url.pathname === '/api/store-collaborators/my-invitations') return json(state.cooperation ? [state.cooperation] : []);
      if (url.pathname === '/api/store-collaborators/request') { state.cooperation = { id: 'request', storeId, status: 'PENDING', requestedByKol: true, note: JSON.parse(req.postData()).note }; return json(state.cooperation, 201); }
      if (url.pathname === '/api/store-collaborators/request/reject') { state.cooperation.status = 'REJECTED'; return json(state.cooperation); }
      if (url.pathname === '/api/affiliate-deals/offers') return json({ id: proposalId, conversationId: '44444444-4444-4444-8444-444444444444' }, 201);
      if (url.pathname.endsWith('/accept')) { state.status = state.mode === 'high-rate' ? 'PENDING_ADMIN_APPROVAL' : 'APPROVED'; return state.mode === 'high-rate' ? json({ status: state.status }) : json({ status: state.status, shortUrl: 'http://localhost:5173/r/fixture', vipVoucherCode: 'FIXTURE7' }); }
      if (url.pathname === '/api/affiliate-deals/' + proposalId) return json({ id: proposalId, status: state.status });
      if (url.pathname === '/api/media') return json({ items: [{ id: 'media', title: 'Kịch bản kiểm thử', storeId: 'store', status: 'APPROVED', assetType: 'COPYWRITE_TEXT', urlOrContent: 'Nội dung tài nguyên kiểm thử.', createdAt: '2026-11-01', product: { id: productId, title: product.title }, store: { name: 'Gian hàng kiểm thử', slug: 'fixture' } }], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } });
      return json([]);
    }
    if (url.origin !== new URL(base).origin && !['data:', 'blob:'].includes(url.protocol)) return req.abort();
    return req.continue();
  });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('token', 'fixture-token');
    localStorage.setItem('user', JSON.stringify({ id: 'fixture-koc', fullName: 'KOC Test', role: 'COLLABORATOR' }));
  });
  await page.goto(base + '/__flow23_test__', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.sceneReady === true || Boolean(window.sceneError));
  const sceneError = await page.evaluate(() => window.sceneError);
  if (sceneError) { await browser.close(); throw new Error(sceneError); }
  return { browser, page, calls, state, errors, render: scene => page.evaluate(scene => window.renderScene(scene), scene) };
}
async function button(page, label) {
  await page.waitForFunction(label => [...document.querySelectorAll('button')].some(el => el.textContent.includes(label)), {}, label);
  await page.evaluate(label => {
    const found = [...document.querySelectorAll('button')].find(el => el.textContent.includes(label));
    if (!found) throw new Error('Button not found: ' + label);
    found.click();
  }, label);
}
const options = { skip: !base || !existsSync(executablePath), timeout: 90000 };

test('acceptance waiting for Admin does not falsely display issued links or coupons', options, async () => {
  const f = await fixture();
  try {
    f.state.mode = 'high-rate'; await f.render('kol-card'); await button(f.page, 'Chấp nhận đề nghị');
    await f.page.waitForFunction(() => document.body.textContent.includes('Chờ Admin duyệt'));
    const body = await f.page.$eval('body', el => el.textContent);
    assert.equal(body.includes('FIXTURE7'), false); assert.equal(body.includes('Link tiếp thị độc quyền'), false);
    assert.equal(await f.page.evaluate(() => [...document.querySelectorAll('button')].some(el => el.textContent.includes('Chấp nhận đề nghị'))), false);
  } finally { await f.browser.close(); }
});

test('reviewer configures MAP and Shop submits a dated promotion with an explicit budget', options, async () => {
  const f = await fixture();
  try {
    await f.render('pricing-reviewer'); await button(f.page, 'Cấu hình MAP');
    await f.page.waitForSelector('[aria-label="Giá cấu hình"]');
    await f.page.$eval('[aria-label="Giá cấu hình"]', el => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, '260000'); el.dispatchEvent(new Event('input', { bubbles: true })); });
    await f.page.type('textarea', 'Reviewed floor and margin policy');
    await f.page.click('[role="dialog"] button[type="submit"]');
    await f.page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    assert.equal(f.calls.find(call => call.path.endsWith('/floor')).body.floorPrice, 260000);
    await f.render('pricing-shop'); await button(f.page, 'Đề xuất khuyến mãi');
    await f.page.waitForSelector('[aria-label="Giá cấu hình"]');
    await f.page.type('[aria-label="Giá cấu hình"]', '300000');
    await f.page.type('textarea', 'Limited launch promotion budget');
    await capture(f.page, 'enterprise-promotion-form');
    await f.page.click('[role="dialog"] button[type="submit"]');
    await f.page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    const request = f.calls.find(call => call.path === '/api/pricing/promotions' && call.method === 'POST');
    assert.equal(request.body.proposedPrice, 300000); assert.ok(request.body.budgetTotal > 0); assert.ok(new Date(request.body.endsAt) > new Date(request.body.startsAt));
    assert.deepEqual(f.errors, []);
  } finally { await f.browser.close(); }
});

test('Admin exception decision requires a reason and preserves the offered rate and scope', options, async () => {
  const f = await fixture();
  try {
    await f.render('exceptions'); await button(f.page, 'Duyệt ngoại lệ');
    await f.page.waitForSelector('textarea'); await f.page.type('textarea', 'Independent budget exception review');
    await capture(f.page, 'enterprise-admin-exception');
    await f.page.click('[role="dialog"] button[type="submit"]');
    await f.page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    assert.deepEqual(f.calls.find(call => call.path.endsWith('/exception-review')).body, { approve: true, note: 'Independent budget exception review' });
    assert.deepEqual(f.errors, []);
  } finally { await f.browser.close(); }
});

test('KOC submits a Store-wide revenue contract using the same form as Shop offers', options, async () => {
  const f = await fixture();
  try {
    await f.render('kol-proposal'); await f.page.waitForSelector('[aria-label="Phạm vi VIP"]');
    await f.page.select('[aria-label="Phạm vi VIP"]', 'STORE_WIDE');
    await f.page.$eval('[aria-label="Thù lao VIP"]', el => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, '20'); el.dispatchEvent(new Event('input', { bubbles: true })); });
    await f.page.click('[role="dialog"] button[type="submit"]');
    await f.page.waitForFunction(() => Boolean(window.createdConversation));
    const body = f.calls.find(call => call.path.endsWith('/proposals')).body;
    assert.equal(body.scopeType, 'STORE_WIDE'); assert.equal(body.targetRevenue, 10000000); assert.equal(body.proposedCommissionRate, 20); assert.equal('collaboratorId' in body, false);
    assert.deepEqual(f.errors, []);
  } finally { await f.browser.close(); }
});
async function capture(page, name) {
  const directory = fileURLToPath(new URL('../../.dev-runtime/flow23-ui-previews/', import.meta.url));
  mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, name + '.png'), fullPage: true });
}

test('drawer preserves zero scores, submits a real offer contract and fits mobile', options, async () => {
  const f = await fixture();
  try {
    await f.page.setViewport({ width: 390, height: 844 });
    await f.render('drawer');
    try { await f.page.waitForSelector('[data-kol-recommendation]'); }
    catch { throw new Error(JSON.stringify({ errors: f.errors, calls: f.calls, text: await f.page.$eval('body', el => el.textContent.slice(0, 1800)) })); }
    const text = await f.page.$eval('[data-kol-recommendation]', el => el.textContent);
    assert.ok(text.includes('0/100')); assert.ok(text.includes('0%')); assert.ok(text.includes('Chưa có dữ liệu'));
    assert.equal(await f.page.$eval('body', el => el.scrollWidth <= innerWidth), true);
    await button(f.page, 'Đề nghị VIP');
    await f.page.waitForSelector('select[aria-label="Sản phẩm áp dụng"]');
    await f.page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled);
    await f.page.click('[role="dialog"] button[type="submit"]');
    await f.page.waitForFunction(() => !document.querySelector('select[aria-label="Sản phẩm áp dụng"]'));
    const sent = f.calls.find(call => call.path.endsWith('/offers'));
    assert.equal(sent.body.productId, productId); assert.equal(sent.body.collaboratorId, creatorId);
    assert.equal(sent.body.proposedCommissionRate, 11); assert.equal(sent.body.targetRevenue, 10000000);
    await f.page.keyboard.press('Escape');
    await f.page.waitForFunction(() => window.drawerClosed === true);
  } finally { await f.browser.close(); }
});

test('drawer exposes denied and empty states without a fabricated fallback team', options, async () => {
  const f = await fixture();
  try {
    f.state.mode = 'denied'; await f.render('drawer');
    await f.page.waitForSelector('[role="alert"]');
    assert.equal((await f.page.$$('[data-kol-recommendation]')).length, 0);
    assert.equal(f.calls.some(call => call.path.includes('/store-collaborators')), false);
    f.state.mode = 'empty'; await button(f.page, 'Thử lại');
    await f.page.waitForFunction(() => document.body.textContent.includes('Chưa có KOC phù hợp'));
    assert.equal((await f.page.$$('[data-kol-recommendation]')).length, 0);
  } finally { await f.browser.close(); }
});

test('KOC accepts a Shop offer and receives its issued artifacts; Shop cannot self-accept', options, async () => {
  const f = await fixture();
  try {
    await f.render('shop-card');
    await f.page.waitForFunction(() => document.body.textContent.includes('Chờ phản hồi'));
    assert.equal(await f.page.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Chấp nhận đề nghị'))), false);
    await f.render('kol-card');
    await f.page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Chấp nhận đề nghị')));
    await button(f.page, 'Chấp nhận đề nghị');
    await f.page.waitForFunction(() => document.body.textContent.includes('FIXTURE7'));
    assert.ok(f.calls.some(call => call.path.endsWith('/accept') && call.method === 'PATCH'));
    assert.equal(await f.page.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Chấp nhận đề nghị'))), false);
  } finally { await f.browser.close(); }
});

test('Media Hub is reachable from the toolkit and downloads a ZIP containing the asset', options, async t => {
  const f = await fixture();
  try {
    const downloadPath = mkdtempSync(path.join(os.tmpdir(), 'scanms-flow23-media-'));
    const cdp = await f.page.createCDPSession();
    await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath });
    await f.render('media');
    await f.page.waitForFunction(() => document.body.textContent.includes('Kịch bản kiểm thử'));
    await button(f.page, 'Tải trọn bộ Pack');
    const deadline = Date.now() + 15000;
    let file;
    while (!file && Date.now() < deadline) { file = readdirSync(downloadPath).find(name => name.endsWith('.zip')); if (!file) await new Promise(resolve => setTimeout(resolve, 100)); }
    assert.ok(file, 'ZIP download must complete');
    const zip = await JSZip.loadAsync(readFileSync(path.join(downloadPath, file)));
    const texts = await Promise.all(Object.values(zip.files).filter(file => !file.dir).map(file => file.async('text')));
    assert.ok(texts.some(text => text.includes('Nội dung tài nguyên kiểm thử.')));
    t.diagnostic('Fixture ZIP: ' + path.join(downloadPath, file));
  } finally { await f.browser.close(); }
});

test('the actual chat opens a product VIP offer even offline and only lists the conversation Store products', options, async () => {
  const f = await fixture();
  try {
    await f.render('chat-offer');
    await f.page.waitForSelector('#btn-open-vip-invite');
    await f.page.click('#btn-open-vip-invite');
    await f.page.waitForFunction(() => Boolean(document.querySelector('select[aria-label="Sản phẩm áp dụng"] option[value="11111111-1111-4111-8111-111111111111"]')));
    const titles = await f.page.$$eval('select[aria-label="Sản phẩm áp dụng"] option', options => options.map(option => option.textContent));
    assert.equal(titles.includes('Sản phẩm của Shop khác'), false);
    await capture(f.page, 'chat-product-offer-fixture');
    await f.page.click('[role="dialog"] button[type="submit"]');
    await f.page.waitForFunction(() => !document.querySelector('select[aria-label="Sản phẩm áp dụng"]'));
    const offer = f.calls.find(call => call.path.endsWith('/offers'));
    assert.equal(offer.body.collaboratorId, creatorId);
    assert.equal(offer.body.productId, productId);
    assert.equal(f.calls.some(call => call.path.includes('/campaigns') && call.method === 'POST'), false);
    assert.deepEqual(f.errors, []);
  } finally { await f.browser.close(); }
});

test('chat remuneration preserves the stored Gold tier and never presents a product VIP as Store-wide', options, async () => {
  const f = await fixture();
  try {
    await f.render('remuneration');
    await f.page.waitForFunction(() => document.body.textContent.includes('1 thỏa thuận VIP theo phạm vi'));
    assert.ok((await f.page.$eval('[data-partner-remuneration]', el => el.textContent)).includes('Theo cấp bậc: 12%'));
    await f.render('remuneration-product');
    await f.page.waitForFunction(() => document.body.textContent.includes('VIP 13% cho sản phẩm đang trao đổi'));
    f.state.mode = 'deal-error'; await f.render('remuneration');
    await f.page.waitForFunction(() => document.body.textContent.includes('Chưa đồng bộ VIP'));
    assert.equal((await f.page.$eval('[data-partner-remuneration]', el => el.textContent)).includes('VIP 13%'), false);
  } finally { await f.browser.close(); }
});

test('KOC sends a cooperation plan and can explicitly decline a Shop invitation', options, async () => {
  const f = await fixture();
  try {
    await f.render('cooperation');
    await f.page.waitForFunction(() => document.body.textContent.includes('Gửi yêu cầu hợp tác'));
    await button(f.page, 'Gửi yêu cầu hợp tác');
    await f.page.type('textarea[aria-label="Kế hoạch hợp tác với gian hàng"]', 'Review skincare twice monthly.');
    await f.page.click('[role="dialog"] button[type="submit"]');
    await f.page.waitForFunction(() => document.body.textContent.includes('Chờ Shop duyệt yêu cầu'));
    const requests = f.calls.filter(call => call.path === '/api/store-collaborators/request');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].body.note, 'Review skincare twice monthly.');
    f.state.cooperation = { id: 'request', storeId, status: 'PENDING', requestedByKol: false };
    await f.render('cooperation');
    await f.page.waitForFunction(() => document.body.textContent.includes('Từ chối lời mời'));
    await button(f.page, 'Từ chối lời mời');
    await f.page.waitForFunction(() => document.body.textContent.includes('Yêu cầu bị từ chối'));
    assert.ok(f.calls.some(call => call.path.endsWith('/request/reject') && call.method === 'PATCH'));
  } finally { await f.browser.close(); }
});

test('partner rankings keep persisted tiers and Store figures; performance filters and pagination use API aggregates', options, async () => {
  const f = await fixture();
  try {
    await f.render('hub-leaderboard');
    await f.page.waitForFunction(() => document.body.textContent.includes('1.200.000'));
    const ranking = await f.page.$eval('tbody', el => el.textContent);
    assert.ok(ranking.includes('Vàng'));
    assert.ok(ranking.includes('1.200.000'));
    assert.equal(ranking.includes('72.000.000'), false);
    await f.render('hub-performance');
    await f.page.waitForFunction(() => document.querySelector('.kol-performance-metrics')?.textContent.includes('150.000'));
    assert.ok((await f.page.$eval('.kol-performance-metrics', el => el.textContent)).includes('1.200.000'));
    assert.equal((await f.page.$eval('[data-order-status-count="pending"]', el => el.textContent)).trim(), '0 \u0111\u01a1n');
    assert.equal((await f.page.$eval('[data-order-status-count="delivered"]', el => el.textContent)).trim(), '2 \u0111\u01a1n');
    assert.equal((await f.page.$eval('[data-order-status-count="returned"]', el => el.textContent)).trim(), '1 \u0111\u01a1n');
    await button(f.page, '7 ngày qua');
    await f.page.waitForFunction(() => document.querySelector('.kol-performance-metrics')?.textContent.includes('800.000'));
    assert.ok(f.calls.some(call => call.path.endsWith('/kol-orders') && call.query.period === '7d'));
    await button(f.page, 'Trang sau');
    await f.page.waitForFunction(() => document.body.textContent.includes('Trang 2/2'));
    assert.ok(f.calls.some(call => call.path.endsWith('/kol-orders') && call.query.page === '2'));
    await capture(f.page, 'partner-performance-fixture');
    assert.deepEqual(f.errors, []);
  } finally { await f.browser.close(); }
});

test('product identity warning closes only the top dialog and preserves the product draft', options, async () => {
  const f = await fixture();
  try {
    await f.render('identity-warning');
    await f.page.waitForSelector('input[aria-label="Tên đang nhập"]');
    await f.page.type('input[aria-label="Tên đang nhập"]', ' 30ml');
    await button(f.page, 'Kiểm tra tên');
    await f.page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 2);
    await capture(f.page, 'product-identity-warning-fixture');
    await f.page.keyboard.press('Tab');
    assert.equal(await f.page.evaluate(() => document.querySelectorAll('[role="dialog"]')[1].contains(document.activeElement)), true);
    await f.page.keyboard.press('Escape');
    await f.page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 1);
    assert.ok((await f.page.$eval('input[aria-label="Tên đang nhập"]', element => element.value)).includes('30ml'));
    await button(f.page, 'Kiểm tra tên');
    await button(f.page, 'Xác nhận là dòng hàng khác');
    await f.page.waitForFunction(() => window.identityConfirmed === true);
    assert.equal((await f.page.$$('[role="dialog"]')).length, 1);
  } finally { await f.browser.close(); }
});
