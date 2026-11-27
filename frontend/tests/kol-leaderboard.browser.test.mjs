import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const base=process.env.GHN_UI_TEST_URL;
test('KOL leaderboard paginates ten rows, resets filters and preserves tier icons and measured zeros',{skip:!base,timeout:45000},async()=>{
 const origin=new URL(base).origin;assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 let kyc='REJECTED';let writes=0;let confirms=0;
 const channel={platformName:'TikTok',channelName:'profileqa',channelUrl:'https://www.tiktok.com/@profileqa',followerCount:5000,engagementRate:0};
 const kol=()=>({id:'kol-qa',fullName:'Partner QA',email:'',phoneNumber:'0900000000',collaboratorProfile:{tier:{name:'BRONZE'},kycStatus:kyc},socialChannels:[channel,{platformName:'YOUTUBE',channelName:'videoqa',channelUrl:'https://www.youtube.com/@videoqa',followerCount:1200}]});
 const creators=Array.from({length:21},(_,i)=>({...kol(),id:i===0?'kol-qa':'kol-'+i,fullName:'Creator '+String(i).padStart(2,'0'),collaboratorProfile:{tier:{name:['BRONZE','SILVER','GOLD','DIAMOND'][i%4]},kycStatus:i%2?'VERIFIED':'REJECTED'}}));
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
    if(url.pathname==='/api/store-collaborators/shop')data={store:{id:'store-qa',name:'Shop QA'},members:creators.slice(0,20).map((c,i)=>({collaboratorId:c.id,collaborator:c,stats:{totalRevenue:100000*(20-i),totalOrders:20-i,completedVideosCount:0}}))};
    if(url.pathname==='/api/chat/search-collaborators')data=creators;
    if(url.pathname==='/api/stores/my-store')data={id:'store-qa',name:'Shop QA',slug:'shop-qa'};
    return req.respond({headers,contentType:'application/json',body:JSON.stringify({data})});
   }
   if(url.origin!==origin&&!['data:','blob:'].includes(url.protocol))return req.abort();return req.continue();
  });
  await page.goto(origin+'/profile-fixture?kol=kol-qa&tab=profile',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#shop-kol-hub-workspace');
  await page.waitForFunction(()=>document.querySelector('.kol-leader-pagination')?.textContent.includes('21 KOL'));
  await page.$$eval('#shop-kol-hub-workspace > div:first-child button',els=>els.find(el=>el.textContent.includes('Xếp hạng')).click());
  await page.waitForSelector('.kol-leaderboard:not(.hidden) tbody tr');
  const rows=()=>page.$$eval('.kol-leaderboard tbody tr',els=>els.length);
  assert.equal(await rows(),10);
  assert.equal(await page.$('.kol-leader-toolbar > span'),null);
  assert.equal(await page.$eval('.kol-leader-toolbar',el=>el.getBoundingClientRect().height),56);
  assert.equal(await page.$eval('[aria-label="Lọc bậc KOL"]',el=>el.getBoundingClientRect().height),38);
  assert.equal(await page.$$eval('.kol-tier-badge svg',els=>els.length),10);
  assert.equal(await page.$eval('.kol-leaderboard tbody tr',el=>el.getBoundingClientRect().height),72);
  assert.match(await page.$eval('.kol-leaderboard thead',el=>el.textContent),/Video đã nghiệm thu/);
  assert.match(await page.$eval('.kol-leaderboard tbody',el=>el.textContent),/Đề xuất Deal/);
  await page.$$eval('.kol-leader-pagination button',els=>els[1].click());
  assert.match(await page.$eval('.kol-leader-pagination',el=>el.textContent),/2\/3/);
  await page.$$eval('.kol-leader-pagination button',els=>els[1].click());
  assert.equal(await rows(),1);
  assert.match(await page.$eval('.kol-leaderboard tbody',el=>el.textContent),/—/);
  await page.select('[aria-label="Lọc bậc KOL"]','GOLD');
  assert.equal(await rows(),5);assert.equal(await page.$$eval('.kol-leader-pagination button',els=>els.length),0);
  assert.match(await page.$eval('.kol-leader-pagination',el=>el.textContent),/5 KOL/);
  assert.equal(await page.$$eval('.kol-tier-badge',els=>els.every(el=>el.textContent==='Vàng'&&el.querySelector('svg'))),true);
  await page.select('[aria-label="Lọc bậc KOL"]','ALL');
  await page.select('[aria-label="Sắp xếp KOL"]','ORDERS');
  assert.match(await page.$eval('.kol-leaderboard thead',el=>el.textContent),/Hạng/);
  await page.screenshot({path:join(tmpdir(),'scanms-kol-leaderboard-desktop.png')});
  await page.type('[aria-label="Tìm KOL trong bảng xếp hạng"]','not-found');
  assert.match(await page.$eval('.kol-leaderboard tbody',el=>el.textContent),/Không có KOL/);
  assert.equal(writes,0);
 }finally{await browser.close();}
});
