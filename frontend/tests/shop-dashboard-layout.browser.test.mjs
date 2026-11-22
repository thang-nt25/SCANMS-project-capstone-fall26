import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const base=process.env.GHN_UI_TEST_URL;
test('shop overview has one detail panel and counts pending orders independently', {skip:!base,timeout:30000}, async()=>{
  const origin=new URL(base).origin;
  assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try {
    const page=await browser.newPage(); const errors=[]; let pendingRead=false;
    page.on('pageerror',e=>{if(!e.message.includes('WebSocket closed')) errors.push(e.message);});
    await page.setRequestInterception(true);
    page.on('request',req=>{
      const url=new URL(req.url());
      if(url.pathname==='/shop-dashboard-fixture') return req.respond({contentType:'text/html; charset=utf-8',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module">import R from "/@react-refresh";R.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/shop-dashboard.tsx"></script>'});
      if(!url.pathname.startsWith('/api/')) return url.origin===origin?req.continue():req.abort();
      assert.equal(req.method(),'GET');
      let data=[];
      if(url.pathname==='/api/stores/my-store') data={id:'store',name:'Sora Skincare'};
      if(url.pathname==='/api/dashboard/realtime/overview') data={metrics:{grossRevenue:1000000,totalCommission:100000,completedOrders:8,totalOrders:10,growthRevenue:0}};
      if(url.pathname==='/api/dashboard/realtime/timeseries') data=[{label:'14/11',revenue:400000,commission:40000},{label:'15/11',revenue:600000,commission:60000}];
      if(url.pathname==='/api/products') data={items:Array.from({length:5},(_,i)=>({id:'product-'+i,title:'Serum '+i,price:390000,stockQuantity:10,isActive:true,sku:'SKU-'+i}))};
      if(url.pathname==='/api/store-collaborators/shop') data={members:[{id:'member',collaborator:{id:'kol',fullName:'KOL Sora',collaboratorProfile:{tier:{name:'SILVER'}}},stats:{totalRevenue:1000000,totalOrders:3}}]};
      if(url.pathname==='/api/orders/my-store') {
        pendingRead ||= url.searchParams.get('status')==='PENDING';
        data={pagination:{total:url.searchParams.get('status')==='PENDING'?2:228},items:Array.from({length:5},(_,i)=>({id:'order-'+i,externalOrderSn:'DH-'+i,createdAt:'2026-11-15T08:00:00Z',customerName:'Khách hàng',finalAmount:411001,status:'PENDING',items:[{}]}))};
      }
      return req.respond({contentType:'application/json',body:JSON.stringify({success:true,data})});
    });
    await page.setViewport({width:1440,height:1000}); await page.goto(origin+'/shop-dashboard-fixture');
    await page.waitForSelector('#shop-detail-panel-orders');
    assert.equal(pendingRead,true);
    assert.match(await page.$eval('.shop-dashboard-middle',e=>e.textContent),/2 đơn/);
    assert.doesNotMatch(await page.$eval('.shop-dashboard-middle',e=>e.textContent),/228 đơn/);
    assert.equal(await page.$$eval('[role="tabpanel"]',e=>e.length),1);
    assert.ok(await page.$('a[href="/merchant/orders?orderId=order-0"]'));
    const heights=await page.$$eval('.shop-dashboard-kpis > div',els=>els.map(el=>el.getBoundingClientRect().height));
    assert.ok(Math.max(...heights)-Math.min(...heights)<1);
    await page.screenshot({path:process.env.TEMP+'/scanms-shop-dashboard.png',fullPage:true});
    await page.click('#shop-detail-tab-products'); assert.equal(await page.$('#shop-detail-panel-orders'),null);
    assert.equal(await page.$$eval('#shop-detail-panel-products tbody tr',els=>els.length),5);
    await page.click('#shop-detail-tab-kols'); await page.waitForSelector('#shop-detail-panel-kols');
    assert.match(await page.$eval('#shop-detail-panel-kols',e=>e.textContent),/KOL Sora/);
    await page.setViewport({width:390,height:844});
    for(const tab of ['orders','products','kols']) {
      await page.click(`#shop-detail-tab-${tab}`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${tab} stays within the mobile viewport`);
    }
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});
