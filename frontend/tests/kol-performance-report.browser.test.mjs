import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const base=process.env.GHN_UI_TEST_URL;
test('partner performance filters whole-period data, resets pagination, preserves totals and handles empty/error states',{skip:!base,timeout:45000},async()=>{
 const origin=new URL(base).origin;
 assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 const kol={id:'kol-qa',fullName:'KOL QA',email:'qa@example.test',collaboratorProfile:{tier:{name:'BRONZE'},kycStatus:'VERIFIED'},socialChannels:[]};
 const queries=[];let fail=false;const errors=[];
 try{
  const page=await browser.newPage();page.setDefaultTimeout(8000);await page.setViewport({width:1440,height:1000});
  page.on('pageerror',error=>{if(!error.message.includes('WebSocket closed'))errors.push(error.message);});
  await page.evaluateOnNewDocument(()=>{localStorage.setItem('token','fixture-only');localStorage.setItem('user',JSON.stringify({id:'shop-qa',role:'SHOP_MANAGER',stores:[{id:'store-qa',name:'Shop QA'}]}));});
  await page.setRequestInterception(true);page.on('request',req=>{
   const url=new URL(req.url());
   if(url.pathname==='/performance-fixture')return req.respond({contentType:'text/html',body:'<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/kol-workspace.tsx"></script>'});
   if(url.pathname==='/src/services/chat-socket.service.ts')return req.respond({contentType:'application/javascript',body:'const s={connected:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};'});
   if(url.pathname.startsWith('/api/')||url.port==='3000'){
    const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':req.headers()['access-control-request-headers']||'*','Access-Control-Allow-Methods':'GET,OPTIONS'};
    const respond=(data,status=200)=>req.respond({status,headers,contentType:'application/json',body:JSON.stringify(status===200?{data}:{message:data})});
    if(req.method()==='OPTIONS')return req.respond({status:204,headers});
    assert.equal(req.method(),'GET');
    if(url.pathname==='/api/stores/my-store')return respond({id:'store-qa',name:'Shop QA'});
    if(url.pathname==='/api/chat/search-collaborators')return respond([kol]);
    if(url.pathname==='/api/store-collaborators/shop')return respond({store:{id:'store-qa',name:'Shop QA'},members:[{collaboratorId:kol.id,collaborator:kol,stats:{totalRevenue:500000,totalOrders:2}}]});
    if(url.pathname==='/api/dashboard/shop/kol-orders'){
     const query=Object.fromEntries(url.searchParams);queries.push(query);
     if(fail)return respond('Fixture report unavailable',503);
     const empty=query.status==='RETURNS_GROUP';const status=query.status==='CANCELLED'?'CANCELLED':query.status==='SHIPPING'?'SHIPPING':'COMPLETED';
     assert.equal(query.limit,'10');
     return respond({items:empty?[]:Array.from({length:query.page==='2'?1:10},(_,i)=>({id:'order-'+query.page+'-'+i,orderCode:'QA-'+query.page+'-'+i,createdAt:'2026-11-17T01:00:00Z',customerName:'Customer QA',productTitle:'Product QA',productImage:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',finalAmount:250000,commissionAmount:25000,status})),total:empty?0:11,totalPages:empty?0:2,summary:{totalOrders:2,totalRevenue:500000,accruedCommission:50000}});
    }
    return respond([]);
   }
   if(url.origin!==origin&&!['data:','blob:'].includes(url.protocol))return req.abort();return req.continue();
  });
  await page.goto(origin+'/performance-fixture?view=hub&kol=kol-qa&tab=profile',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#tab-btn-performance');await page.click('#tab-btn-performance');await page.waitForSelector('.kol-performance-orders tbody tr');
  await page.screenshot({path:join(tmpdir(),'scanms-performance-orders-desktop.png')});
  assert.ok((await page.$eval('.kol-performance-metrics',el=>el.textContent)).includes('500.000'));
  assert.equal(await page.$('.kol-performance-toolbar .kol-copy-link'),null);
  assert.equal(await page.$('.kol-performance-funnel'),null);
  assert.equal(await page.$$eval('.kol-order-filters > button',els=>{const r=els.map(el=>el.getBoundingClientRect());return r.length===6&&r.every(x=>x.height===38&&Math.abs(x.width-r[0].width)<1&&x.top===r[0].top);}),true);
  assert.equal(await page.$eval('.kol-performance-orders tbody img',el=>el.getBoundingClientRect().width),24);
  assert.equal(await page.$$eval('.kol-performance-orders tbody tr',els=>els.length),10);
  assert.equal(await page.$$eval('.kol-order-filters > button',els=>els.slice(1).every(el=>getComputedStyle(el,'::before').width==='1px')),true);
  assert.notEqual(await page.$eval('.kol-order-filters [aria-pressed="true"]',el=>getComputedStyle(el).borderRadius),'0px');
  assert.equal(await page.$eval('.kol-performance-toolbar', el => {
   const period = el.querySelector('select');
   const metrics = [...el.querySelector('.kol-performance-metrics').children].map(item => item.getBoundingClientRect());
   return period.options.length === 4 && metrics.length === 4 && metrics.every(item => item.top === metrics[0].top && Math.abs(item.width - metrics[0].width) < 1) && period.getBoundingClientRect().right < metrics[0].left;
  }),true);
  await page.$$eval('.kol-performance-pagination button',els=>els.at(-1).click());await page.waitForFunction(()=>document.querySelector('.kol-performance-orders tbody')?.textContent.includes('QA-2'));
  assert.equal(await page.$$eval('.kol-performance-orders tbody tr',els=>els.length),1);
  await page.$$eval('.kol-order-filters > button',els=>els.find(el=>el.textContent==='Đang giao').click());await page.waitForFunction(()=>document.querySelector('.kol-performance-orders tbody')?.textContent.includes('Đang giao'));
  assert.equal(queries.at(-1).page,'1');assert.equal(queries.at(-1).status,'SHIPPING');
  assert.ok((await page.$eval('.kol-performance-metrics',el=>el.textContent)).includes('500.000'));
  await page.click('.kol-order-filters [aria-label="Đã hủy"]');await page.waitForFunction(()=>document.querySelector('.kol-performance-orders tbody')?.textContent.includes('Đã hủy'));
  assert.equal(queries.at(-1).status,'CANCELLED');
  await page.click('.kol-order-filters [aria-label="Đổi trả / Khiếu nại"]');await page.waitForSelector('.kol-orders-empty');assert.equal(await page.$('.kol-performance-pagination'),null);assert.equal(queries.at(-1).status,'RETURNS_GROUP');
  await page.screenshot({path:join(tmpdir(),'scanms-performance-compact-desktop.png')});
  await page.setViewport({width:390,height:844});assert.equal(await page.$eval('.kol-performance',el=>el.scrollWidth<=el.clientWidth+1),true);assert.equal(await page.$eval('.kol-performance-metrics',el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),2);await page.screenshot({path:join(tmpdir(),'scanms-performance-compact-mobile.png')});
  fail=true;await page.select('[aria-label="Kỳ báo cáo"]','7d');await page.waitForSelector('.kol-performance [role="alert"]');assert.equal(await page.$('.kol-orders-empty'),null);
  fail=false;await page.click('.kol-performance [role="alert"] button');await page.waitForSelector('.kol-orders-empty');assert.equal(queries.at(-1).period,'7d');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
