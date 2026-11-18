import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const base = process.env.GHN_UI_TEST_URL;
test('inspection presents selected products, accurate decision copy and a guarded footer without losing manager liability', { skip: !base, timeout: 30000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, timeout: 10000, args: ['--no-sandbox'] });
  const request = { id:'inspection-fixture', status:'INSPECTING', reason:'WRONG_ITEM', preferredResolution:'EXCHANGE', imageUrls:[],
    order:{ externalOrderSn:'DH-QA-001', products:[{id:'wrong',title:'Unselected original product'}] },
    items:[{id:'line-1',quantity:1,orderItem:{product:{title:'Kem dưỡng',imageUrl:'/assets/product-placeholder.svg'},variant:{name:'Dịu nhẹ · 50 ml'}}}], events:[] };
  const writes = [];
  let failNext = false;
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(8000);
    await page.setViewport({ width:1200,height:900 });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname === '/inspection-fixture') return req.respond({contentType:'text/html',body:'<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/return-inspection.tsx"></script>'});
      if (url.pathname.includes('/returns/inspection-fixture')) {
        const headers = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':req.headers()['access-control-request-headers']||'*','Access-Control-Allow-Methods':'GET,PATCH,OPTIONS'};
        if(req.method()==='OPTIONS') return req.respond({status:204,headers});
        if(req.method()==='GET') return req.respond({headers,contentType:'application/json',body:JSON.stringify({data:request})});
        writes.push(JSON.parse(req.postData()));
        if(failNext) {failNext=false;return req.respond({status:500,headers,contentType:'application/json',body:JSON.stringify({message:'Không lưu được kết quả kiểm tra'})});}
        request.status = writes.at(-1).resolution === 'EXCHANGE' ? 'EXCHANGE_PENDING' : writes.at(-1).resolution === 'REFUND' ? 'AWAITING_CUSTOMER_CONFIRMATION' : 'INSPECTION_REJECTED';
        return setTimeout(()=>void req.respond({headers,contentType:'application/json',body:JSON.stringify({data:request})}),250);
      }
      if(url.origin!==origin) return req.abort();
      return req.continue();
    });
    await page.goto(origin+'/inspection-fixture',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('[role="group"] button');
    await page.click('[role="group"] button:nth-child(2)');
    await page.waitForSelector('[role="dialog"]');
    assert.equal(await page.$eval('[role="dialog"]',el=>el.getBoundingClientRect().width),640);
    const text = await page.$eval('[role="dialog"]',el=>el.textContent);
    assert.match(text,/Chấp thuận đổi sản phẩm.*DH-QA-001/);
    assert.match(text,/Kem dưỡng.*50 ml.*Số lượng: 1/);
    assert.ok(!text.includes('Unselected original product'));
    assert.ok(!text.includes('Kiểm tra thông tin trước khi xác nhận'));
    assert.ok(!text.includes('Hoàn tiền chỉ chuyển'));
    assert.equal(await page.$eval('textarea',el=>el.getBoundingClientRect().height),88);
    assert.equal(await page.$eval('.modal-footer button[type="submit"]',el=>el.disabled),true);
    assert.equal(await page.$$eval('select option[value="LOGISTICS_FAULT"]',els=>els.length),0);
    await page.type('textarea','          ');
    assert.equal(await page.$eval('.modal-footer button[type="submit"]',el=>el.disabled),true);
    await page.type('textarea','Shop đã kiểm tra và xác nhận giao sai sản phẩm.');
    await page.screenshot({path:join(tmpdir(),'scanms-return-inspection-desktop.png')});
    await page.setViewport({width:390,height:844});
    assert.equal(await page.$eval('[role="dialog"]',el=>el.scrollWidth<=el.clientWidth),true);
    await page.screenshot({path:join(tmpdir(),'scanms-return-inspection-mobile.png')});
    failNext=true;
    await page.click('.modal-footer button[type="submit"]');
    await page.waitForSelector('.return-inspection-form [role="alert"]');
    assert.match(await page.$eval('textarea',el=>el.value),/giao sai sản phẩm/);
    await page.$eval('.modal-footer button[type="submit"]',el=>{el.click();el.click();});
    await page.waitForSelector('[role="dialog"]',{hidden:true});
    assert.equal(writes.length,2);
    assert.deepEqual(writes[1],{resolution:'EXCHANGE',liability:'SHOP_FAULT',notes:'Shop đã kiểm tra và xác nhận giao sai sản phẩm.'});
    assert.match(await page.$eval('[role="status"]',el=>el.textContent),/Shop chuẩn bị hàng đổi/);
    request.status='INSPECTING'; request.events=[{type:'LIABILITY_ASSESSED',data:{source:'SYSTEM_MANAGER_REVIEW',liability:'LOGISTICS_FAULT'}}];
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForSelector('[role="group"] button');
    await page.click('[role="group"] button:first-child');
    await page.waitForSelector('.return-inspection-reviewed');
    assert.match(await page.$eval('.return-inspection-reviewed',el=>el.textContent),/Lỗi vận chuyển.*System Manager đã xác minh/);
    assert.equal(await page.$('select'),null);
    assert.match(await page.$eval('.return-inspection-info',el=>el.textContent),/Khách cần xác nhận đồng ý.*Ví SCANMS/);
    assert.match(await page.$eval('.return-inspection-note-meta',el=>el.textContent),/Ghi rõ lý do thay đổi phương án/);
    await page.type('textarea','Manager đã xác minh lỗi vận chuyển trong hồ sơ.');
    await page.click('.modal-footer button[type="submit"]');
    await page.waitForSelector('[role="dialog"]',{hidden:true});
    assert.equal(writes.at(-1).liability,'LOGISTICS_FAULT');
    assert.equal(writes.at(-1).resolution,'REFUND');
  } finally {await browser.close();}
});
