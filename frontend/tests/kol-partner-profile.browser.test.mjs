import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const base=process.env.GHN_UI_TEST_URL;
test('compact partner profile preserves full ID, rejected KYC, zero engagement and guarded termination',{skip:!base,timeout:45000},async()=>{
 const origin=new URL(base).origin;assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 let kyc='REJECTED';let writes=0;let confirms=0;
 const channel={platformName:'TikTok',channelName:'profileqa',channelUrl:'https://www.tiktok.com/@profileqa',followerCount:5000,engagementRate:0};
 const kol=()=>({id:'kol-qa',fullName:'Partner QA',email:'',phoneNumber:'0900000000',collaboratorProfile:{tier:{name:'BRONZE'},kycStatus:kyc},socialChannels:[channel,{platformName:'YOUTUBE',channelName:'videoqa',channelUrl:'https://www.youtube.com/@videoqa',followerCount:1200}]});
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
    if(url.pathname==='/api/stores/my-store')data={id:'store-qa',name:'Shop QA',slug:'shop-qa'};
    return req.respond({headers,contentType:'application/json',body:JSON.stringify({data})});
   }
   if(url.origin!==origin&&!['data:','blob:'].includes(url.protocol))return req.abort();return req.continue();
  });
  const open=async()=>{await page.goto(origin+'/profile-fixture?kol=kol-qa&tab=profile',{waitUntil:'domcontentloaded'});await page.waitForSelector('.kol-profile-columns');};
  await open();
  const text=await page.$eval('.kol-profile-columns',el=>el.textContent);assert.ok(text.includes('Bị từ chối'));assert.ok(text.includes('0900000000'));assert.ok(!text.includes('Họ tên'));assert.ok(text.includes('10%'));
  const channels=await page.$eval('.kol-profile-channel-list',el=>el.textContent);assert.ok(channels.includes('Tương tác: 0%'));assert.ok(channels.includes('Tương tác: —'));assert.ok(channels.includes('5.000'));
  await page.click('[aria-label="Sao chép mã đối tác"]');assert.equal(await page.evaluate(()=>window.copiedTestId),'kol-qa');
  await page.click('#btn-kol-actions-menu');assert.equal(await page.$$eval('#kol-partner-actions button',els=>els.length),1);assert.equal(await page.$('#btn-quick-samples-tab'),null);await page.click('#btn-terminate-collab');assert.equal(confirms,1);assert.equal(writes,0);
  const iconSizes=await page.$$eval('.kol-profile-channel-list > div > div > span',els=>els.map(el=>el.getBoundingClientRect().width));assert.deepEqual(iconSizes,[36,36]);
  await page.screenshot({path:join(tmpdir(),'scanms-partner-profile-desktop.png')});
  await page.setViewport({width:390,height:844});assert.equal(await page.$eval('.kol-channel-panel',el=>el.scrollWidth<=el.clientWidth+1),true);assert.equal(await page.$eval('.kol-profile-columns',el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),1);await page.screenshot({path:join(tmpdir(),'scanms-partner-profile-mobile.png')});
  for(const [status,label] of [['UNVERIFIED','Chưa xác minh'],['VERIFIED','Đã xác minh'],['PENDING','Đang xác minh']]){kyc=status;await open();assert.ok((await page.$eval('.kol-profile-columns',el=>el.textContent)).includes(label));}
  assert.equal(writes,0);
 }finally{await browser.close();}
});
