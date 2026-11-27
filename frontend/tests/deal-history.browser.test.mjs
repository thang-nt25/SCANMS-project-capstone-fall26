import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const base=process.env.GHN_UI_TEST_URL;
test('Deal history paginates ten records and opens read-only detail with voucher terms',{skip:!base,timeout:45000},async()=>{
 const origin=new URL(base).origin;assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 let kyc='REJECTED';let writes=0;let confirms=0;
 const channel={platformName:'TikTok',channelName:'profileqa',channelUrl:'https://www.tiktok.com/@profileqa',followerCount:5000,engagementRate:0};
 const kol=()=>({id:'kol-qa',fullName:'Partner QA',email:'',phoneNumber:'0900000000',collaboratorProfile:{tier:{name:'BRONZE'},kycStatus:kyc},socialChannels:[channel,{platformName:'YOUTUBE',channelName:'videoqa',channelUrl:'https://www.youtube.com/@videoqa',followerCount:1200}]});
 const deals=Array.from({length:3},(_,i)=>({id:'deal-'+i,collaboratorId:i===2?'other':'kol-qa',collaboratorName:i===2?'Partner Two':'Partner QA',collaboratorTier:i===2?'Kim Cương':'Vàng',primaryChannel:{platformName:'TIKTOK',channelName:'@partnerqa',followerCount:5000},productId:i===1?'product-0':'product-'+i,productTitle:'Product '+i,productPrice:390000,dealCommissionRate:14+i,targetOrders:i===0?0:30,targetRevenue:i===0?10000000:null,commitmentDays:14,commitmentEndsAt:'2026-12-01T12:00:00Z',isExpired:i===2,progress:{completedOrders:i,validRevenue:i===0?2500000:0,pendingOrders:0,targetOrders:30,status:'ACTIVE'},referralLink:{shortCode:'QA-'+i}}));
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
    if(url.pathname==='/api/affiliate-deals/history-0')return req.respond({headers,contentType:'application/json',body:JSON.stringify({data:{id:'history-0',vipVoucherCode:'QA-VOUCHER',couponTerms:{discountPercent:5,minimumOrderAmount:200000}}})});
    let data=[];
    if(url.pathname==='/api/store-collaborators/shop')data={store:{id:'store-qa',name:'Shop QA'},members:[{collaboratorId:'kol-qa',collaborator:kol(),stats:{totalRevenue:0,totalOrders:0}}]};
    if(url.pathname==='/api/chat/search-collaborators')data=[kol()];
    if(url.pathname==='/api/affiliate-deals/shop/active-partners')data={totalPartners:2,totalActiveDeals:3,averageCommissionRate:15,deals};
    if(url.pathname==='/api/affiliate-deals/shop')data={items:Array.from({length:12},(_,i)=>({id:'history-'+i,status:i===0?'REJECTED':'APPROVED',isCurrentDeal:false,collaborator:{fullName:'History QA'},product:{title:'History Product',price:390000},proposedCommissionRate:16,targetOrders:30,commitmentDays:14,createdAt:'2026-11-01T00:00:00Z',updatedAt:'2026-11-05T00:00:00Z',salesCommitment:'QA Terms'})),total:12,page:1,pageSize:20};
    if(url.pathname.includes('/progress'))data={canTerminate:false};
    if(url.pathname==='/api/stores/my-store')data={id:'store-qa',name:'Shop QA',slug:'shop-qa'};
    return req.respond({headers,contentType:'application/json',body:JSON.stringify({data})});
   }
   if(url.origin!==origin&&!['data:','blob:'].includes(url.protocol))return req.abort();return req.continue();
  });
  await page.goto(origin+'/profile-fixture?view=deals',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.deal-product-row');
  await page.click('.deal-status-tabs button:nth-child(3)');
  await page.waitForSelector('.deal-history-table');
  assert.equal(await page.$$eval('.deal-history-table tbody tr',els=>els.length),10);
  assert.equal(await page.$$eval('.deal-history-table tbody tr:first-child img',els=>els.length),1);
  await page.click('.deal-history-table tbody tr:first-child button');
  await page.waitForFunction(()=>document.querySelector('[role=dialog]')?.textContent.includes('QA-VOUCHER'));
  assert.match(await page.$eval('[role=dialog]',el=>el.textContent),/QA Terms/);
  assert.match(await page.$eval('[role=dialog]',el=>el.textContent),/200.000/);
  await page.keyboard.press('Escape');
  await page.waitForSelector('[role=dialog]',{hidden:true});
  await page.$eval('.shop-active-deals nav button:last-child',el=>el.click());
  assert.equal(await page.$$eval('.deal-history-table tbody tr',els=>els.length),2);
  await page.screenshot({path:join(tmpdir(),'scanms-history-compact.png')});
  assert.equal(writes,0);
 }finally{await browser.close();}
});
