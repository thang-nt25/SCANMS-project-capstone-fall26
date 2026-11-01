import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ids = ['d4e5f6a1-b2c3-4d4e-8f5a-6b7c8d9e0f1a', 'a7b8c9d0-e1f2-4a3b-8c4d-5e6f7a8b9c0d'];
const customerIds = ['c3d4e5f6-a1b2-4c3d-8e4f-5a6b7c8d9e0f', 'e5f6a1b2-c3d4-4e5f-8a6b-7c8d9e0f1a2b'];
const shopId = 'b2c3d4e5-f6a1-4b2c-8d3e-4f5a6b7c8d9e';
const storeId = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';
const productId = 'f6a1b2c3-d4e5-4f6a-8b7c-8d9e0f1a2b3c';
const conversations = ids.map((id, index) => ({ id, storeId, store: { id: storeId, name: 'Shop kiểm thử', owner: { id: shopId } }, customerId: customerIds[index], customer: { id: customerIds[index], role: 'CUSTOMER', fullName: index ? 'Trịnh Hải Đăng' : 'Phan Thanh Hà' }, chatMessages: [], _count: { chatMessages: 0 }, lastMessageAt: '2026-10-24T06:00:00Z' }));
const socketSource = `
const listeners=new Map();
const s={connected:true,active:true,on(e,f){if(!listeners.has(e))listeners.set(e,new Set());listeners.get(e).add(f);return this},off(e,f){listeners.get(e)?.delete(f);return this},timeout(){return this},connect(){return this},emit(e,p,ack){
  window.qaEvents.push({event:e,payload:p});
  if(e!=='send_message')return this;
  const failed=window.qaFailSend;window.qaFailSend=false;
  setTimeout(()=>{if(failed){ack?.(null,{ok:false,error:'Gửi thất bại kiểm thử'});return;}
    let text=p.messageText;
    try{const c=JSON.parse(text);if(c.type==='COUPON_VOUCHER')text=JSON.stringify({...c,couponCode:'SHOP10',discountType:'PERCENTAGE',discountValue:10,storeName:'Shop kiểm thử'});}catch{}
    const m={...p,id:p.messageId,senderId:'${shopId}',sender:{id:'${shopId}',role:'SHOP_MANAGER',fullName:'Shop kiểm thử'},messageText:text,isRead:false,createdAt:new Date().toISOString()};
    window.qaSocketEvent('new_message',m);ack?.(null,{ok:true,messageId:m.id});
  },60);return this;}};
window.qaEvents=[];window.qaSocketEvent=(e,p)=>{if(e==='disconnect')s.connected=false;if(e==='connect')s.connected=true;for(const f of listeners.get(e)||[])f(p)};
export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>s.connected;export const disconnectChatSocket=()=>{};`;

test('Shop customer messaging routes each action correctly and preserves data on failures', { skip: !base || !existsSync(executablePath), timeout: 60000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const errors = [], requests = [], creations = [];
  let failProducts = true, failCoupons = true, failOrders = true, failCreate = true, uploads = 0;
  let failList = false, failHistory = false, failOlder = false, historyRows = 1;
  const product = { id: productId, storeId, sku: 'QA-SKU', title: 'Mặt nạ kiểm thử', price: 90000, isActive: true, moderationStatus: 'APPROVED' };
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument(userId => {
      localStorage.setItem('token', 'fixture-no-server-access');
      localStorage.setItem('user', JSON.stringify({ id: userId, role: 'SHOP_MANAGER', fullName: 'Shop kiểm thử' }));
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async value => { window.qaCopied = value; } } });
    }, shopId);
    await page.setRequestInterception(true);
    page.on('request', request => void (async () => {
      const url = new URL(request.url());
      if (url.pathname === '/src/main.tsx') return request.respond({ status: 200, contentType: 'application/javascript', body: "import '/tests/fixtures/chat-explorer-audit.tsx';" });
      if (url.pathname === '/src/services/chat-socket.service.ts') return request.respond({ status: 200, contentType: 'application/javascript', body: socketSource });
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] || 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS' };
        const respond = (data, status = 200) => request.respond({ status, headers, contentType: 'application/json', body: JSON.stringify({ data, ...(status >= 400 ? { message: 'Lỗi kiểm thử' } : {}) }) });
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        requests.push({ path: url.pathname, method: request.method(), query: Object.fromEntries(url.searchParams) });
        if (url.pathname === '/api/chat/conversations' && request.method() === 'POST') {
          const body = JSON.parse(request.postData()); creations.push(body);
          if (failCreate) return respond(null, 400);
          return respond(conversations.find(item => item.customerId === body.customerId));
        }
        if (url.pathname === '/api/chat/conversations' && failList) return respond(null, 500);
        if (url.pathname === '/api/chat/conversations') return respond([...conversations, { id: 'kol-conversation', collaboratorId: 'kol-user', collaborator: { id: 'kol-user', fullName: 'KOL không thuộc CSKH' }, storeId, store: conversations[0].store, chatMessages: [] }]);
        if (url.pathname === '/api/chat/search-customers') return respond(conversations.filter(item => !url.searchParams.get('q') || item.customer.fullName.includes(url.searchParams.get('q'))).map(item => item.customer));
        if (url.pathname.endsWith('/messages')) {
          if (failHistory || (url.searchParams.get('cursor') && failOlder)) return respond(null, 500);
          const conv = conversations.find(item => url.pathname.includes(item.id));
          const count = url.searchParams.get('cursor') ? 1 : historyRows;
          return respond(Array.from({ length: count }, (_, index) => ({ id: (url.searchParams.get('cursor') ? 'older-' : 'initial-') + conv.id + '-' + index, conversationId: conv.id, senderId: conv.customerId, sender: conv.customer, messageText: 'Xin chào Shop ' + index, isRead: true, createdAt: '2026-10-24T06:00:00Z' })));
        }
        if (url.pathname.endsWith('/read')) return respond({ count: 0 });
        if (url.pathname === '/api/products') {
          if (failProducts) return respond(null, 500);
          return respond({ items: [{ ...product, title: url.searchParams.get('page') === '2' ? 'Sản phẩm trang hai' : product.title }], pagination: { page: Number(url.searchParams.get('page') || 1), totalPages: 2 } });
        }
        if (url.pathname.endsWith('/available')) return failCoupons ? respond(null, 500) : respond([{ id: 'qa-coupon', displayCode: 'SHOP10', discountType: 'PERCENTAGE', discountValue: 10 }]);
        if (url.pathname === '/api/orders/my-store') {
          if (failOrders) return respond(null, 500);
          const suffix = url.searchParams.get('page') === '2' ? '2' : '1';
          return respond({ items: [{ id: 'qa-order-' + suffix, externalOrderSn: 'QA-ORDER-' + suffix, storeId, customerId: url.searchParams.get('customerId'), status: 'SHIPPING', trackingNumber: 'GHN123', finalAmount: 90000, createdAt: '2026-10-24T06:00:00Z', items: [] }], pagination: { totalPages: 2 } });
        }
        if (url.pathname.endsWith('/attachments')) { uploads++; return respond({ url: 'https://res.cloudinary.com/qa/raw/upload/bao-gia.pdf', fileName: 'bao-gia.pdf', type: 'DOCUMENT' }); }
        return respond([]);
      }
      if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    })().catch(error => errors.push(error.message)));
    const clickText = async (selector, text) => page.$$eval(selector, (buttons, text) => { const button = buttons.find(button => button.textContent.trim() === text); if (!button) throw new Error('Missing button ' + text); button.click(); }, text);
    const messagesSent = () => page.evaluate(() => window.qaEvents.filter(item => item.event === 'send_message'));
    const input = '#chat-message-input';
    const replaceInput = async text => { await page.focus(input); await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control'); await page.keyboard.type(text); };
    const closeWithEscape = async selector => { await page.keyboard.press('Escape'); await page.waitForSelector(selector, { hidden: true }); };

    await page.goto(origin + '/merchant/customer-messages');
    await page.waitForSelector(input);
    assert.equal(await page.$$eval('[id^="conv-item-"]', elements => elements.length), 2, 'KOL threads do not appear in customer support');
    assert.match(await page.$eval('.chat-person-status', el => el.textContent), /Hội thoại khách hàng/);
    assert.equal(await page.$('#btn-composer-voucher'), null, 'voucher action is not duplicated');
    assert.equal(await page.$('#btn-composer-product'), null, 'product action is not duplicated');
    assert.equal(await page.$eval('button[aria-label="Xem hồ sơ Phan Thanh Hà"]', button => button.disabled), true, 'a customer avatar does not redirect into KOL management');
    await page.type('#chat-search-input', 'thanh ha');
    assert.equal(await page.$$eval('[id^="conv-item-"]', elements => elements.length), 1, 'customer search accepts Vietnamese names without accents');
    await page.$eval('#chat-search-input', el => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(el, 'Shop kiểm thử'); el.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(await page.$$eval('[id^="conv-item-"]', elements => elements.length), 0, 'searching the shop name does not match every customer');
    await page.focus('#chat-search-input'); await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace');

    await page.click('#btn-new-conversation');
    await page.waitForSelector('#new-chat-' + customerIds[0]);
    assert.match(await page.$eval('[aria-labelledby="new-chat-title"]', el => el.textContent), /khách đã mua hàng/);
    assert.equal(requests.some(item => item.path.endsWith('/search-collaborators')), false);
    await page.click('#new-chat-' + customerIds[1] + ' button');
    await page.waitForSelector('[aria-labelledby="new-chat-title"] [role="alert"]');
    assert.deepEqual(creations.at(-1), { customerId: customerIds[1] });
    failCreate = false;
    await page.click('#new-chat-' + customerIds[1] + ' button');
    await page.waitForSelector('[aria-labelledby="new-chat-title"]', { hidden: true });
    await page.waitForFunction(() => document.querySelector('.chat-person-name')?.textContent === 'Trịnh Hải Đăng');
    await page.click('#conv-item-' + ids[0]);

    await page.type(input, 'Bản nháp Hà');
    await page.click('#conv-item-' + ids[1]);
    assert.equal(await page.$eval(input, el => el.value), '');
    await page.type(input, 'Bản nháp Đăng');
    await page.click('#conv-item-' + ids[0]);
    assert.equal(await page.$eval(input, el => el.value), 'Bản nháp Hà');
    await page.keyboard.down('Shift'); await page.keyboard.press('Enter'); await page.keyboard.up('Shift');
    assert.equal((await messagesSent()).length, 0, 'Shift+Enter does not send');
    await page.evaluate(() => { window.qaFailSend = true; });
    await page.click('#chat-send-btn');
    await page.waitForFunction(() => !document.querySelector('#chat-send-btn').disabled);
    assert.match(await page.$eval(input, el => el.value), /Bản nháp Hà/);
    await page.focus(input); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#chat-message-input').value === '');
    assert.equal((await messagesSent()).length, 2);
    assert.equal((await messagesSent())[0].payload.messageId, (await messagesSent())[1].payload.messageId, 'retry preserves the text message id to prevent duplicate delivery');

    await page.click('#btn-customer-send-product');
    const productModal = '[aria-labelledby="customer-product-title"]';
    await page.waitForSelector(productModal + ' [role="alert"]');
    failProducts = false;
    await clickText(productModal + ' button', 'Thử lại');
    await page.waitForFunction(selector => document.querySelector(selector).textContent.includes('Mặt nạ kiểm thử'), {}, productModal);
    assert.equal(requests.filter(item => item.path === '/api/products').at(-1).query.scope, 'chat-share');
    assert.equal(requests.filter(item => item.path === '/api/products').at(-1).query.storeId, storeId);
    await clickText(productModal + ' button', 'Trang sau');
    await page.waitForFunction(selector => document.querySelector(selector).textContent.includes('Sản phẩm trang hai'), {}, productModal);
    await page.evaluate(() => { window.qaFailSend = true; });
    await clickText(productModal + ' button', 'Gửi thẻ');
    await page.waitForSelector(productModal + ' [role="alert"]');
    assert.ok(await page.$(productModal), 'a failed send keeps the product dialog open');
    await clickText(productModal + ' button', 'Thử lại');
    await page.waitForFunction(selector => [...document.querySelectorAll(selector + ' button')].some(button => button.textContent.trim() === 'Gửi thẻ'), {}, productModal);
    await clickText(productModal + ' button', 'Gửi thẻ');
    await page.waitForSelector(productModal, { hidden: true });
    const sentProduct = (await messagesSent()).at(-1);
    assert.equal(sentProduct.payload.conversationId, ids[0]);
    assert.equal(JSON.parse(sentProduct.payload.messageText).productId, productId);
    assert.equal(await page.$eval('.product-inquiry-card a', el => el.getAttribute('href')), '/products/QA-SKU');

    await page.click('#btn-customer-send-voucher');
    const couponModal = '[aria-labelledby="customer-coupon-title"]';
    await page.waitForSelector(couponModal + ' [role="alert"]');
    failCoupons = false;
    await clickText(couponModal + ' button', 'Thử lại');
    await page.waitForFunction(selector => document.querySelector(selector).textContent.includes('SHOP10'), {}, couponModal);
    await clickText(couponModal + ' button', 'Gửi mã');
    await page.waitForSelector(couponModal, { hidden: true });
    assert.deepEqual(JSON.parse((await messagesSent()).at(-1).payload.messageText), { type: 'COUPON_VOUCHER', couponId: 'qa-coupon' });
    await clickText('.chat-message-content button', 'Sao chép');
    await page.waitForFunction(() => window.qaCopied === 'SHOP10');

    await page.click('#btn-cskh-tools-menu');
    await clickText('#btn-cskh-tools-menu + div button', 'Tra cứu đơn của khách');
    const orderModal = '[aria-labelledby="customer-orders-title"]';
    await page.waitForFunction(selector => document.querySelector(selector).textContent.includes('Thử tải lại'), {}, orderModal);
    failOrders = false;
    await clickText(orderModal + ' button', 'Thử tải lại');
    await page.waitForFunction(selector => document.querySelector(selector).textContent.includes('QA-ORDER-1'), {}, orderModal);
    await clickText(orderModal + ' button', 'Trang sau');
    await page.waitForFunction(selector => document.querySelector(selector).textContent.includes('QA-ORDER-2'), {}, orderModal);
    const orderQuery = requests.filter(item => item.path === '/api/orders/my-store').at(-1).query;
    assert.equal(orderQuery.customerId, customerIds[0]); assert.equal(orderQuery.storeId, storeId); assert.equal(orderQuery.page, '2');
    const beforeDraft = (await messagesSent()).length;
    await clickText(orderModal + ' button', 'Soạn tin nhắn trạng thái');
    await page.waitForSelector(orderModal, { hidden: true });
    assert.match(await page.$eval(input, el => el.value), /QA-ORDER-2.*Đang giao hàng.*GHN123/);
    assert.equal((await messagesSent()).length, beforeDraft, 'order information is a draft until explicitly sent');
    await page.click('#btn-cskh-tools-menu');
    await clickText('#btn-cskh-tools-menu + div button', 'Tin nhắn mẫu CSKH');
    const replyModal = '[aria-labelledby="customer-quick-replies-title"]';
    await page.waitForSelector(replyModal);
    await page.$eval(replyModal + ' section button', button => button.click());
    await page.waitForSelector(replyModal, { hidden: true });
    assert.match(await page.$eval(input, el => el.value), /Dạ chào bạn!/);
    assert.equal((await messagesSent()).length, beforeDraft);

    await page.click('#chat-attach-btn');
    await page.evaluate(() => {
      const transfer = new DataTransfer(); transfer.items.add(new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'too-large.pdf', { type: 'application/pdf' }));
      const input = document.querySelector('#chat-attach-btn + input'); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const attachment = 'dialog[aria-labelledby="attachment-title"]';
    await page.waitForSelector(attachment + ' [role="alert"]');
    assert.equal(uploads, 0);
    assert.equal(await page.$$eval(attachment + ' button', buttons => buttons.find(button => button.textContent.includes('Gửi tệp')).disabled), true);
    await closeWithEscape(attachment);
    await page.evaluate(() => {
      const transfer = new DataTransfer(); transfer.items.add(new File(['%PDF-1.7 test'], 'bao-gia.pdf', { type: 'application/pdf' }));
      const input = document.querySelector('#chat-attach-btn + input'); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true })); window.qaFailSend = true;
    });
    await page.waitForSelector(attachment);
    await clickText(attachment + ' button', 'Gửi tệp');
    await page.waitForSelector(attachment + ' [role="alert"]');
    const failedAttachment = (await messagesSent()).at(-1);
    await clickText(attachment + ' button', 'Thử gửi lại');
    await page.waitForSelector(attachment, { hidden: true });
    assert.equal(uploads, 1, 'retry reuses the uploaded attachment');
    assert.equal((await messagesSent()).at(-1).payload.messageId, failedAttachment.payload.messageId, 'attachment retry cannot duplicate the message');
    assert.equal((await messagesSent()).at(-1).payload.conversationId, ids[0]);

    await page.evaluate(() => window.qaSocketEvent('disconnect'));
    await page.waitForFunction(() => document.querySelector('#chat-send-btn').disabled);
    assert.match(await page.$eval('.chat-person-status', el => el.textContent), /Chat đang mất kết nối/);
    await page.evaluate(() => window.qaSocketEvent('connect'));
    await page.waitForFunction(() => document.querySelector('.chat-person-status').textContent.includes('Hội thoại khách hàng'));
    await page.click('[aria-label="Thu gọn danh sách"]');
    await page.waitForFunction(() => Math.round(document.querySelector('#chat-page > aside').getBoundingClientRect().width) === 72);
    assert.equal(await page.$eval('#chat-page > aside', el => Math.round(el.getBoundingClientRect().width)), 72);
    await page.click('[aria-label="Mở rộng danh sách hội thoại"]');
    await page.waitForFunction(() => Math.round(document.querySelector('#chat-page > aside').getBoundingClientRect().width) === 325);
    const artifactDirectory = new URL('../../artifacts/customer-messages-audit/', import.meta.url);
    await mkdir(artifactDirectory, { recursive: true });
    await page.screenshot({ path: fileURLToPath(new URL('desktop.png', artifactDirectory)), fullPage: false });
    await page.setViewport({ width: 390, height: 844 });
    await page.click('[aria-label="Về danh sách hội thoại"]');
    assert.equal(await page.$eval('#chat-page > aside', el => getComputedStyle(el).display), 'flex');
    await page.click('#conv-item-' + ids[1]);
    assert.match(await page.$eval('.chat-person-name', el => el.textContent), /Trịnh Hải Đăng/);
    assert.equal(await page.$eval(input, el => el.value), 'Bản nháp Đăng');
    await page.screenshot({ path: fileURLToPath(new URL('mobile.png', artifactDirectory)), fullPage: false });
    assert.ok(await page.$eval('#chat-page', el => el.scrollWidth <= el.clientWidth));
    await page.setViewport({ width: 1440, height: 1000 });
    failList = true;
    await page.reload();
    await page.waitForSelector('[role="list"] [role="alert"]');
    failList = false; failHistory = true;
    await page.click('[role="list"] [role="alert"] button');
    await page.waitForSelector('.chat-message-list [role="alert"]');
    failHistory = false;
    await page.click('.chat-message-list [role="alert"] button');
    await page.waitForSelector('.chat-message-bubble');
    assert.equal(await page.$('.chat-message-list [role="alert"]'), null);
    historyRows = 50; failOlder = true;
    await page.click('#conv-item-' + ids[1]);
    await page.waitForFunction(() => [...document.querySelectorAll('.chat-message-list button')].some(button => button.textContent.includes('Tải thêm tin nhắn cũ hơn')));
    await clickText('.chat-message-list button', 'Tải thêm tin nhắn cũ hơn');
    await page.waitForSelector('.chat-message-list [role="alert"]');
    failOlder = false;
    await page.click('.chat-message-list [role="alert"] button');
    await page.waitForSelector('.chat-message-list [role="alert"]', { hidden: true });
    assert.ok(requests.some(item => item.path.endsWith('/messages') && item.query.cursor));
    await page.click('#conv-item-' + ids[0]);
    await page.evaluate(({ conversationId, customerId }) => {
      const message = { id: 'duplicate-realtime', conversationId, senderId: customerId, sender: { id: customerId, fullName: 'Trịnh Hải Đăng', role: 'CUSTOMER' }, messageText: 'Tin mới', isRead: false, createdAt: new Date().toISOString() };
      window.qaSocketEvent('new_message', message); window.qaSocketEvent('new_message', message);
    }, { conversationId: ids[1], customerId: customerIds[1] });
    await page.waitForFunction(selector => document.querySelector(selector).textContent.includes('Tin mới'), {}, '#conv-item-' + ids[1]);
    await page.click('#conv-item-' + ids[1]);
    await page.waitForFunction(() => [...document.querySelectorAll('.chat-message-bubble')].filter(el => el.textContent === 'Tin mới').length === 1);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
