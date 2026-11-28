import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = process.env.GHN_UI_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
test('KOL hub: selected partner chat, scoped cooperation, performance ranges, links and layout',
  { skip: !base || !existsSync(executablePath), timeout: 45000 }, async () => {
    assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
    const browser = await puppeteer.launch({ executablePath, headless: true });
    const storeId = '00000000-0000-4000-8000-000000000010';
    const sample = { id: '00000000-0000-4000-8000-000000000020', status: 'SHIPPED', createdAt: new Date().toISOString(),
      collaboratorId: '11111111-1111-4111-8111-111111111111', collaborator: { id: '11111111-1111-4111-8111-111111111111', fullName: 'KOL test', email: 'audit@example.test' },
      recipientName: 'Test', recipientPhone: '0912345678', shippingAddress: '88 A, Phường A, Quận B, Tỉnh C',
      carrier: 'GHN', trackingNumber: 'LIVE-ORIGINAL', shippingCharges: [],
      product: { id: 'audit-product', title: 'Sample test', storeId, price: 250000 }, events: [], videoAssets: [] };
    const ranges = [], errors = [];
    let cooperationPending = true;
    async function open(route, role) {
      const page = await browser.newPage(); page.setDefaultTimeout(10000);
      await page.setViewport({ width: 1440, height: 1000 });
      await page.evaluateOnNewDocument(role => {
        localStorage.setItem('token', 'fixture-only-no-server');
        localStorage.setItem('user', JSON.stringify({ id: role === 'COLLABORATOR' ? 'audit-kol' : 'audit-shop', role, fullName: 'Test' }));
      }, role);
      page.on('pageerror',error=>errors.push(error.message));
      await page.setRequestInterception(true);
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/') || url.port === '3000') {
          const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': new URL(base).origin,
            'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,authorization,x-skip-cache',
            'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
          if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
          let data = [];
          if (['/api/sample-requests/shop', '/api/sample-requests/my'].includes(url.pathname)) data = [sample];
          if (url.pathname === '/api/store-collaborators/shop') data = { store: { id: storeId, name: 'Test Shop' }, members: [] };
          if (url.pathname === '/api/store-collaborators/my') data = [];
          if (url.pathname === '/api/stores') data = [{ id: storeId, name: 'Test Shop' }];
          if (url.pathname === '/api/stores/marketplace') data = [{ id: storeId, name: 'Test Shop', slug: 'test-shop' }];
          if (url.pathname === `/api/stores/${storeId}`) data = { id: storeId, name: 'Test Shop' };
          if (url.pathname === '/api/sample-requests/my/eligibility') data = { canRequest: true, isBlocked: false, channels: [] };
          if (url.pathname === '/api/kyc/profile') data = { kycStatus: 'VERIFIED' };
          if (url.pathname === '/api/products' || url.pathname === '/api/media') data = { items: [], pagination: { total: 0 } };
          if (url.pathname === '/api/dashboard/shop/kol-orders') {
            ranges.push(url.searchParams.get('period'));
            data = { items: [{ id: 'order-1', orderCode: 'ORDER-1', createdAt: '2026-10-27T01:00:00Z', finalAmount: 250000, commissionAmount: 17000, status: 'DELIVERED', productTitle: 'Product' }], totalPages: 1, summary: { totalOrders: 4, totalRevenue: 500000, accruedCommission: 34000 } };
          }
          if (url.pathname === '/api/store-collaborators/shop') data = {store:{id:storeId,name:'Test Shop'},members:[],pendingRequests:[{id:'request-other',collaboratorId:'other-kol',requestedByKol:true,status:'PENDING',createdAt:new Date().toISOString(),collaborator:{id:'other-kol',fullName:'Other Creator'}}]};
          if (url.pathname === '/api/store-collaborators/request-current/shop-approve' && request.method() === 'PATCH') cooperationPending = false;
          if (url.pathname === '/api/store-collaborators/shop' && cooperationPending) data.pendingRequests.push({id:'request-current',collaboratorId:'11111111-1111-4111-8111-111111111111',requestedByKol:true,status:'PENDING',createdAt:new Date().toISOString(),collaborator:{id:'11111111-1111-4111-8111-111111111111',fullName:'KOL test'}});
          if (url.pathname === '/api/chat/conversations') data = [{id:'22222222-2222-4222-8222-222222222222',storeId,store:{id:storeId,name:'Test Shop'},collaboratorId:'11111111-1111-4111-8111-111111111111',collaborator:{id:'11111111-1111-4111-8111-111111111111',fullName:'KOL test',role:'COLLABORATOR'},chatMessages:[],createdAt:new Date().toISOString()}];
          if (url.pathname.endsWith('/messages')) data = [{id:'msg-1',conversationId:'22222222-2222-4222-8222-222222222222',senderId:'11111111-1111-4111-8111-111111111111',sender:{id:'11111111-1111-4111-8111-111111111111',fullName:'KOL test',role:'COLLABORATOR'},messageText:'Correct partner message',createdAt:new Date().toISOString(),isRead:true}];
          return request.respond({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
        }
        if (url.origin !== new URL(base).origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
        return request.continue();
      });
      await page.goto(base + route); return page;
    }
    try {
      const page = await open('/merchant/kol-hub?kol=11111111-1111-4111-8111-111111111111&tab=messages','SHOP_MANAGER');
      await page.waitForFunction(()=>document.querySelector('.chat-message-list')?.textContent.includes('Correct partner message'));
      assert.equal(await page.$eval('.shop-kol-detail',el=>el.textContent.includes('Other Creator')),false,'Do not show other creator cooperation requests');
      await page.waitForSelector('#tab-btn-profile .kol-cooperation-badge');
      assert.equal(await page.$eval('#tab-btn-profile .kol-cooperation-badge',el=>el.textContent),'1');
      assert.equal(await page.$('.kol-cooperation-request'),null,'Keep the request out of the chat');
      await page.click('#tab-btn-profile');
      await page.waitForSelector('.kol-cooperation-request button');
      assert.equal(await page.$eval('.kol-cooperation-request',el=>el.textContent.includes('Other Creator')),false);
      await page.$eval('.kol-cooperation-request button:last-child',el=>el.click());
      await page.waitForSelector('#tab-btn-profile .kol-cooperation-badge',{hidden:true});
      assert.equal(cooperationPending,false,'Approving clears the pending indicator');
      await page.click('#tab-btn-performance');
      await page.waitForSelector('.kol-performance-orders table');
      assert.ok(ranges.includes('30d'));
      await Promise.all([
        page.waitForResponse(response => response.url().includes('/kol-orders') && new URL(response.url()).searchParams.get('period') === '7d'),
        page.select('select[aria-label="Kỳ báo cáo"]', '7d'),
      ]);
      await page.waitForSelector('.kol-performance-orders table');
      assert.ok(ranges.includes('7d'));
      const text = await page.$eval('.shop-kol-detail',el=>el.textContent);
      assert.ok(text.includes('34.000'));
      assert.ok(!text.includes('3.8%'));
      assert.ok((await page.$eval('.kol-performance-orders table', el => el.textContent)).includes('ORDER-1'));
      for (const tab of ['samples','profile','messages']) {
        await page.click('#tab-btn-'+tab);
        assert.equal(await page.$eval('#tab-btn-'+tab,el=>el.getAttribute('aria-pressed')),'true');
      }
      await page.click('button[aria-label="Thu gon danh sach"]'.replace('Thu gon danh sach','Thu g'+String.fromCharCode(7885)+'n danh s'+String.fromCharCode(225)+'ch'));
      assert.ok(await page.$('.shop-kol-sidebar.w-\\[72px\\]'));
      await page.setViewport({width:390,height:844});
      assert.equal(await page.$eval('.shop-kol-shell',el=>el.scrollWidth<=el.clientWidth+1),true);
      assert.deepEqual(errors,[]);
    } finally {await browser.close();}
  });
