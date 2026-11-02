import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = process.env.GHN_UI_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const options = { skip: !base || !existsSync(executablePath), timeout: 60000 };
const storeId = '11111111-1111-4111-8111-111111111111';
const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="scene"></div><script type="module">
import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
try { await import('/tests/fixtures/gap-completion-harness.tsx'); } catch(error) { window.gapSceneError=String(error); }
</script></body></html>`;

async function fixture(role = 'COLLABORATOR') {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  const state = { requests: [], invitations: [], proposals: [], conversations: [], cover: 0, gallery: 0, image: null, invitationFailure: false };
  state.moderation = ['owned', 'independent'].map((id, index) => ({ id, title: `${id} product`, sku: id, price: 200000, stockQuantity: 10, moderationStatus: 'DRAFT', createdById: index ? 'other-maker' : 'fixture-user', submittedById: index ? 'other-maker' : 'fixture-user', store: { name: 'Shop Test' } }));
  const errors = [];
  const loadErrors = [];
  page.on('console', message => { if (message.type() === 'error') loadErrors.push(message.text()); });
  page.on('requestfailed', req => loadErrors.push(`${new URL(req.url()).pathname}: ${req.failure()?.errorText}`));
  // Vite's HMR connection is not part of the isolated page harness. Business
  // Socket.IO is verified by the real PostgreSQL/HTTP integration suite.
  page.on('pageerror', error => { if (error.message !== 'WebSocket closed without opened.') errors.push(error.message); });
  await page.setViewport({ width: 390, height: 900 });
  await page.evaluateOnNewDocument((role, storeId) => {
    localStorage.setItem('token', 'isolated-fixture-token');
    localStorage.setItem('user', JSON.stringify({ id: 'fixture-user', role, fullName: 'Test user' }));
    localStorage.setItem('current_store_id', storeId);
  }, role, storeId);
  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = new URL(req.url());
    if (url.pathname === '/__gap_completion_test__') return req.respond({ status: 200, contentType: 'text/html', body: html });
    if (url.pathname === '/fixture-cover.png') return req.respond({ status: 200, contentType: 'image/png', body: state.image });
    if (url.pathname.startsWith('/api/') || url.port === '3000') {
      const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': new URL(base).origin,
        'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || 'authorization,content-type,x-skip-cache' };
      if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers });
      state.requests.push({ method: req.method(), path: url.pathname });
      const json = data => req.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
      if (url.pathname === '/api/chat/conversations') return json(state.conversations);
      if (url.pathname === '/api/store-collaborators/my-invitations') return state.invitationFailure
        ? req.respond({ status: 503, headers, body: JSON.stringify({ message: 'Invitation lookup unavailable' }) })
        : json(state.invitations);
      if (/^\/api\/store-collaborators\/[^/]+\/(accept|reject)$/.test(url.pathname)) {
        const row = state.invitations.find(item => item.id === url.pathname.split('/')[3]);
        row.status = url.pathname.endsWith('/accept') ? 'APPROVED' : 'REJECTED';
        return json(row);
      }
      if (url.pathname === '/api/store-collaborators/request') {
        const payload = JSON.parse(req.postData()); state.proposals.push(payload);
        state.invitations = [{ ...payload, id: 'new-request', status: 'PENDING', requestedByKol: true }];
        return json(state.invitations[0]);
      }
      if (url.pathname === '/api/stores/my-store') return json({ id: storeId, name: 'Shop Test', categoryName: 'Mỹ phẩm & Chăm sóc da', isVerified: true, onboardingStatus: 'VERIFIED' });
      if (url.pathname === '/api/products') return json({ items: [], pagination: { total: 0 } });
      if (url.pathname === '/api/products/moderation') return json({ items: state.moderation.filter(product => product.moderationStatus === 'DRAFT') });
      if (/^\/api\/products\/[^/]+\/moderation$/.test(url.pathname)) {
        const id = url.pathname.split('/')[3];
        state.moderation.find(product => product.id === id).moderationStatus = JSON.parse(req.postData()).status;
        return json({ id });
      }
      if (url.pathname === '/api/upload/product-cover' || url.pathname === '/api/upload/image') {
        if (url.pathname.endsWith('product-cover')) state.cover++; else state.gallery++;
        return json({ secureUrl: `${base}/fixture-cover.png?upload=${state.cover + state.gallery}` });
      }
      return json([]);
    }
    if (url.origin !== new URL(base).origin && !['blob:', 'data:'].includes(url.protocol)) return req.abort();
    return req.continue();
  });
  await page.goto(base + '/__gap_completion_test__', { waitUntil: 'domcontentloaded' });
  try { await page.waitForFunction(() => window.gapSceneReady || window.gapSceneError); }
  catch (error) { await browser.close(); throw new Error(`${error.message}; ${JSON.stringify({ errors, loadErrors: loadErrors.slice(-8) })}`); }
  assert.equal(await page.evaluate(() => window.gapSceneError), undefined);
  return { browser, page, state, errors, render: name => page.evaluate(name => window.renderGapScene(name), name) };
}

for (const action of ['accept', 'reject']) {
  test(`KOC sees a Shop invitation without a chat and can ${action} it`, options, async () => {
    const f = await fixture();
    try {
      f.state.invitations = [{ id: 'invitation-only', storeId, status: 'PENDING', requestedByKol: false,
        createdAt: '2026-11-02T00:00:00Z', store: { id: storeId, name: 'Aura fixture' } }];
      await f.render('kol-invitations');
      await f.page.waitForSelector('button[aria-label="Mở cuộc trò chuyện với Aura fixture"]');
      await f.page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.startsWith('Lời mời (')).click());
      await f.page.click('button[aria-label="Mở cuộc trò chuyện với Aura fixture"]');
      const label = action === 'accept' ? 'Chấp nhận lời mời' : 'Từ chối lời mời';
      await f.page.waitForFunction(label => [...document.querySelectorAll('button')].some(button => button.textContent === label), {}, label);
      await f.page.evaluate(label => [...document.querySelectorAll('button')].find(button => button.textContent === label).click(), label);
      await f.page.waitForFunction(() => document.body.textContent.includes('Chưa có lời mời hợp tác đang chờ'));
      assert.equal(f.state.invitations[0].status, action === 'accept' ? 'APPROVED' : 'REJECTED');
      assert.equal(f.state.requests.filter(request => request.method === 'PATCH' && request.path.endsWith(`/invitation-only/${action}`)).length, 1);
      assert.equal(f.state.requests.filter(request => request.method === 'POST' && request.path === '/api/chat/conversations').length, 0);
      assert.deepEqual(f.errors, []);
    } finally { await f.browser.close(); }
  });
}

test('opening an invited Shop retains its chat composer after existing conversations refresh', options, async () => {
  const f = await fixture();
  try {
    f.state.conversations = [{ id: '33333333-3333-4333-8333-333333333333', storeId: '22222222-2222-4222-8222-222222222222',
      store: { id: '22222222-2222-4222-8222-222222222222', name: 'Existing partner' },
      messageCount: 1, chatMessages: [{ id: 'old-message', messageText: 'Existing chat', isRead: true }] }];
    f.state.invitations = [{ id: 'new-partner', storeId, status: 'PENDING', requestedByKol: false, store: { id: storeId, name: 'Inviting partner' } }];
    await f.render('kol-invitations');
    await f.page.waitForSelector('button[aria-label="Mở cuộc trò chuyện với Inviting partner"]');
    await f.page.click('button[aria-label="Mở cuộc trò chuyện với Inviting partner"]');
    await f.page.waitForNetworkIdle({ idleTime: 250, timeout: 10000 });
    await f.page.waitForSelector('input[placeholder="Nhập tin nhắn..."], textarea[placeholder="Nhập tin nhắn..."]');
    assert.equal(f.state.requests.filter(request => request.method === 'POST' && request.path === '/api/chat/conversations').length, 0);
    assert.deepEqual(f.errors, []);
  } finally { await f.browser.close(); }
});

test('KOC can refresh new invitations and recover from an explicit invitation-load error', options, async () => {
  const f = await fixture();
  try {
    await f.render('kol-invitations');
    await f.page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Làm mới lời mời'));
    f.state.invitationFailure = true;
    await f.page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Làm mới lời mời').click());
    await f.page.waitForFunction(() => document.body.textContent.includes('Chưa tải được lời mời hợp tác.'));
    f.state.invitationFailure = false;
    f.state.invitations = [{ id: 'new-invite', storeId, status: 'PENDING', requestedByKol: false, store: { id: storeId, name: 'New invited Shop' } }];
    await f.page.evaluate(() => [...document.querySelectorAll('[role="alert"] button')].find(button => button.textContent === 'Thử lại').click());
    await f.page.waitForSelector('button[aria-label="Mở cuộc trò chuyện với New invited Shop"]');
    await f.page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Chấp nhận lời mời'));
    assert.deepEqual(f.errors, []);
  } finally { await f.browser.close(); }
});

test('public cooperation actions share their status query and submit the selected Shop with a content plan', options, async () => {
  const f = await fixture();
  try {
    await f.render('cooperation');
    await f.page.waitForFunction(() => [...document.querySelectorAll('[data-store-cooperation]')].length === 3 && [...document.querySelectorAll('[data-store-cooperation]')].every(b => !b.disabled));
    assert.equal(f.state.requests.filter(r => r.path.endsWith('my-invitations')).length, 1);
    await f.page.click(`[data-store-cooperation="${storeId}"]`);
    await f.page.waitForSelector('textarea[aria-label="Kế hoạch hợp tác với gian hàng"]');
    await f.page.type('textarea', 'Thực hiện hai video hướng dẫn sử dụng sản phẩm mỗi tháng.');
    await f.page.$eval('[role="dialog"] form', form => form.requestSubmit());
    await f.page.waitForFunction(id => [...document.querySelectorAll(`[data-store-cooperation="${id}"]`)].every(b => b.disabled && b.textContent.includes('Đang chờ')), {}, storeId);
    assert.equal(f.state.proposals.length, 1);
    assert.equal(f.state.proposals[0].storeId, storeId);
    assert.match(f.state.proposals[0].note, /hai video/);
    assert.equal(await f.page.$eval('[data-store-cooperation="22222222-2222-4222-8222-222222222222"]', b => b.disabled), false);
    assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.browser.close(); }
});

test('customer accounts cannot see or invoke the KOC cooperation action', options, async () => {
  const f = await fixture('CUSTOMER');
  try {
    await f.render('cooperation');
    await f.page.waitForFunction(() => document.querySelector('#scene').children.length > 0);
    assert.equal(await f.page.$('[data-store-cooperation]'), null);
    assert.equal(f.state.requests.filter(r => r.path.includes('store-collaborators')).length, 0);
    assert.deepEqual(f.errors, []);
  } finally { await f.browser.close(); }
});

test('merchant cover checks pixels before upload and prevents a fifth gallery upload', options, async () => {
  const f = await fixture('SHOP_MANAGER');
  try {
    const temp = mkdtempSync(path.join(tmpdir(), 'scanms-cover-'));
    async function png(width, height, name) {
      const data = await f.page.evaluate((width, height) => {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        canvas.getContext('2d').fillRect(0, 0, width, height);
        return canvas.toDataURL('image/png').split(',')[1];
      }, width, height);
      const buffer = Buffer.from(data, 'base64'); const file = path.join(temp, name); writeFileSync(file, buffer);
      return { file, buffer };
    }
    const valid = await png(800, 800, 'cover.png');
    const small = await png(799, 799, 'small.png');
    f.state.image = valid.buffer;
    await f.render('products');
    await f.page.waitForSelector('#main-image-input');
    await (await f.page.$('#main-image-input')).uploadFile(small.file);
    await f.page.waitForFunction(() => document.body.textContent.includes('Ảnh bìa phải vuông'));
    assert.equal(f.state.cover, 0);
    await (await f.page.$('#main-image-input')).uploadFile(valid.file);
    await f.page.waitForFunction(() => [...document.querySelectorAll('img')].some(img => img.src.includes('/fixture-cover.png')));
    assert.equal(f.state.cover, 1);
    for (let index = 0; index < 4; index++) {
      await f.page.waitForFunction(() => !document.querySelector('#sub-image-new-input').disabled);
      await (await f.page.$('#sub-image-new-input')).uploadFile(valid.file);
      await f.page.waitForFunction(count => document.body.textContent.includes(`Thư viện ảnh phụ (${count})`), {}, index + 1);
    }
    await f.page.waitForFunction(() => !document.querySelector('#sub-image-new-input').disabled);
    await (await f.page.$('#sub-image-new-input')).uploadFile(valid.file);
    await f.page.waitForFunction(() => document.body.textContent.includes('Sản phẩm có tối đa 4 ảnh phụ.'));
    assert.equal(f.state.gallery, 4);
    await f.page.screenshot({ path: path.join(temp, 'product-image-validation.png'), fullPage: true });
    assert.deepEqual(f.errors, []);
  } finally { await f.browser.close(); }
});

test('reviewer UI disables its own submission and still allows independent review', options, async () => {
  const f = await fixture('SYSTEM_ADMIN');
  try {
    await f.render('moderation');
    await f.page.waitForSelector('[data-moderation-product="owned"]');
    const buttons = await f.page.$eval('[data-moderation-product="owned"]', row => [...row.querySelectorAll('button')].filter(b => /Phê duyệt|Từ chối/.test(b.textContent)).map(b => b.disabled));
    assert.deepEqual(buttons, [true, true]);
    assert.equal(await f.page.$eval('[data-moderation-product="owned"]', row => row.textContent.includes('Cần người kiểm duyệt khác.')), true);
    await f.page.$eval('[data-moderation-product="independent"]', row => [...row.querySelectorAll('button')].find(b => b.textContent.includes('Phê duyệt')).click());
    await f.page.waitForFunction(() => !document.querySelector('[data-moderation-product="independent"]'));
    assert.equal(f.state.requests.filter(row => row.method === 'PATCH').length, 1);
    assert.deepEqual(f.errors, []);
  } finally { await f.browser.close(); }
});
