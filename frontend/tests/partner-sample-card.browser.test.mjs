import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const base=process.env.GHN_UI_TEST_URL;
test('sample card shows one video row, actual state, correct dates, recipient and zero versus missing freight',{skip:!base,timeout:45000},async()=>{
 const origin=new URL(base).origin;assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 let kyc='REJECTED';let writes=0;let confirms=0;
 const channel={platformName:'TikTok',channelName:'profileqa',channelUrl:'https://www.tiktok.com/@profileqa',followerCount:5000,engagementRate:0};
 const kol=()=>({id:'kol-qa',fullName:'Partner QA',email:'',phoneNumber:'0900000000',collaboratorProfile:{tier:{name:'BRONZE'},kycStatus:kyc},socialChannels:[channel,{platformName:'YOUTUBE',channelName:'videoqa',channelUrl:'https://www.youtube.com/@videoqa',followerCount:1200}]});
 let stage='COMPLETED';let cost=null;
 const sample=()=>({id:'sample-qa',status:stage,createdAt:'2026-11-09T08:00:00Z',videoSubmittedAt:stage==='COMPLETED'?'2026-11-04T08:00:00Z':'2026-11-10T08:00:00Z',videoUrl:'https://www.youtube.com/watch?v=abcdefghijk',videoTitle:'Review Serum Vitamin C',videoAssets:stage==='COMPLETED'?[]:[{id:'asset-qa',urlOrContent:'https://www.youtube.com/watch?v=abcdefghijk',title:'Review Serum Vitamin C',status:'PENDING',createdAt:'2026-11-10T08:00:00Z'}],trackingNumber:'GHN-SAMPLE-QA',carrier:'GHN',recipientName:'Partner QA',recipientPhone:'0900000000',shippingAddress:'123 Example street',contentType:'Review 60 giây',collaboratorId:'kol-qa',collaborator:kol(),product:{id:'product-qa',title:'Serum Vitamin C',price:390000,customCommissionRate:10,imageUrl:'/assets/product-placeholder.svg'},shippingCharges:cost===null?[]:[{amount:cost,trackingNumber:'GHN-SAMPLE-QA',status:'PAID',payer:'SHOP',codAmount:0,environment:'PRODUCTION'}]});
 try{
  const page=await browser.newPage();page.setDefaultTimeout(7000);await page.setViewport({width:1440,height:1000});
  await page.evaluateOnNewDocument(()=>{localStorage.setItem('token','fixture-only');localStorage.setItem('user',JSON.stringify({id:'shop-qa',role:'SHOP_MANAGER',stores:[{id:'store-qa',name:'Shop QA'}]}));Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.copiedTestId=value;}}});});
  page.on('dialog',async dialog=>{confirms++;await dialog.dismiss();});
  await page.setRequestInterception(true);page.on('request',req=>{
   const url=new URL(req.url());
   if(url.pathname==='/profile-fixture')return req.respond({contentType:'text/html',body:'<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/kol-workspace.tsx"></script>'});
   if(url.pathname==='/src/services/chat-socket.service.ts')return req.respond({contentType:'application/javascript',body:'const s={connected:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};'});
   if(url.pathname.startsWith('/api/')||url.port==='3000'){
    const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':req.headers()['access-control-request-headers']||'*','Access-Control-Allow-Methods':'GET,OPTIONS'};
    if(req.method()==='OPTIONS')return req.respond({status:204,headers});
    if(req.method()!=='GET')writes++;
    let data=[];
    if(url.pathname==='/api/store-collaborators/shop')data={store:{id:'store-qa',name:'Shop QA'},members:[{collaboratorId:'kol-qa',collaborator:kol(),stats:{totalRevenue:0,totalOrders:0}}]};
    if(url.pathname==='/api/chat/search-collaborators')data=[kol()];
    if(url.pathname==='/api/sample-requests/shop')data=[sample()];
    if(url.pathname==='/api/stores/my-store')data={id:'store-qa',name:'Shop QA',slug:'shop-qa'};
    return req.respond({headers,contentType:'application/json',body:JSON.stringify({data})});
   }
   if(url.origin!==origin&&!['data:','blob:'].includes(url.protocol))return req.abort();return req.continue();
  });
  const open=async()=>{await page.goto(origin+'/profile-fixture?kol=kol-qa&tab=profile',{waitUntil:'domcontentloaded'});await page.waitForSelector('#tab-btn-samples');await page.click('#tab-btn-samples');await page.waitForSelector('.partner-sample-card');};
  await open();
  const card=await page.$eval('.partner-sample-card',el=>el.textContent);
  assert.match(card,/Hoàn tất/);assert.match(card,/Thù lao:/);assert.ok(!card.includes('Hoa hồng'));
  assert.match(card,/Ngày yêu cầu:/);assert.match(card,/Ngày nộp cần đối chiếu/);
  assert.match(card,/Cước Shop trảChưa ghi nhận/);
  assert.equal(await page.$$eval('.partner-sample-card a',els=>els.filter(el=>el.textContent.includes('Xem video')).length),1);
  assert.equal(await page.$eval('.partner-sample-footer',el=>getComputedStyle(el).display),'none');
  assert.equal(await page.$eval('.partner-sample-header > img',el=>el.getBoundingClientRect().width),48);
  assert.equal(await page.$eval('.partner-video-thumbnail',el=>{const r=el.getBoundingClientRect();return r.width===56&&r.height===40;}),true);
  assert.equal(await page.$eval('.partner-video-open',el=>el.getBoundingClientRect().height),36);
  assert.equal(await page.$eval('.partner-sample-columns',el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),2);
  await page.click('[aria-label="Sao chép vận đơn"]');assert.equal(await page.evaluate(()=>window.copiedTestId),'GHN-SAMPLE-QA');
  await page.screenshot({path:join(tmpdir(),'scanms-sample-card-desktop.png')});
  stage='VIDEO_SUBMITTED';cost=0;await open();
  assert.match(await page.$eval('.partner-sample-card',el=>el.textContent),/Chờ duyệt video/);
  assert.ok(!(await page.$eval('.partner-sample-card',el=>el.textContent)).includes('Hoàn tất'));
  assert.match(await page.$eval('.partner-live-waybill dl',el=>el.textContent),/Cước Shop trả0 ₫/);
  assert.match(await page.$eval('.partner-video-info',el=>el.textContent),/Đã nộp: 10\/11\/2026/);
  assert.match(await page.$eval('.partner-sample-footer',el=>el.textContent),/Yêu cầu sửa.*Nghiệm thu video/);
  await page.setViewport({width:390,height:844});
  assert.equal(await page.$eval('.partner-sample-columns',el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),1);
  assert.equal(await page.$eval('.partner-sample-card',el=>el.scrollWidth<=el.clientWidth+1),true);
  await page.screenshot({path:join(tmpdir(),'scanms-sample-card-mobile.png')});
  assert.equal(writes,0);
 }finally{await browser.close();}
});
