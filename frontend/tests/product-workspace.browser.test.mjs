import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const base=process.env.GHN_UI_TEST_URL;
test('compact product actions, video filters and review empty/error states',{skip:!base,timeout:45000},async()=>{
 const origin=new URL(base).origin;assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
 const browser=await puppeteer.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true,args:['--no-sandbox'],timeout:10000});
 let videos=[];let failVideos=false;let failReviews=false;const errors=[];
 const product={id:'qa-product',sku:'QA-001',title:'Kem dưỡng kiểm thử',price:150000,floorPrice:100000,stockQuantity:197,isActive:true,moderationStatus:'APPROVED',storeId:'qa-store',imageUrl:'/scanms-placeholder.svg'};
 try {const page=await browser.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>{if(e.message!=='WebSocket closed without opened.')errors.push(e.message);});await page.setViewport({width:1440,height:1000});
 await page.evaluateOnNewDocument(()=>{localStorage.setItem('token','fixture-only');localStorage.setItem('user',JSON.stringify({id:'qa-shop',role:'SHOP_MANAGER',fullName:'QA',stores:[{id:'qa-store',name:'QA',isVerified:true,onboardingStatus:'VERIFIED'}]}));});
 await page.setRequestInterception(true);page.on('request',req=>{const url=new URL(req.url());
 if(url.pathname==='/src/services/chat-socket.service.ts')return req.respond({contentType:'application/javascript',body:'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};'});
 if(url.pathname==='/product-fixture')return req.respond({contentType:'text/html',body:'<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/product-management.tsx"></script>'});
 if(url.pathname.startsWith('/api/')||url.port==='3000'){const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,OPTIONS'};const respond=(data,status=200)=>req.respond({status,headers,contentType:'application/json',body:JSON.stringify(status===200?{data}:{message:data})});if(req.method()==='OPTIONS')return req.respond({status:204,headers});assert.equal(req.method(),'GET','This fixture never writes backend data');
 if(url.pathname==='/api/products')return respond({items:[product],pagination:{totalPages:1}});
 if(url.pathname==='/api/stores/my-store')return respond({id:'qa-store',name:'QA',isVerified:true,onboardingStatus:'VERIFIED'});
 if(url.pathname==='/api/media')return failVideos?respond('Load failed',500):respond({items:videos});
 if(url.pathname==='/api/products/reviews/moderation')return failReviews?respond('Load failed',500):respond([]);
 return respond([]);}
 if(url.origin!==origin)return req.abort();return req.continue();});
 const clickText=text=>page.evaluate(text=>[...document.querySelectorAll('.product-toolbar button')].find(el=>el.textContent.trim().startsWith(text)).click(),text);
 await page.goto(origin+'/product-fixture',{waitUntil:'domcontentloaded'});await page.waitForSelector('.product-row-actions');
 assert.match(await page.$eval('.product-table',el=>el.textContent),/Giá sàn:.*100.000/);assert.equal(await page.$$eval('.product-row-actions > button',els=>els.length),2);
 const heights=await page.$$eval('.product-toolbar-actions button',els=>els.map(el=>el.getBoundingClientRect().height));assert.ok(heights.every(height=>height===42));
 await page.click('.product-row-actions > button:last-child');await page.waitForSelector('.product-row-menu');assert.equal(await page.$$eval('.product-row-menu button',els=>els.length),4);await page.keyboard.press('Escape');await page.waitForSelector('.product-row-menu',{hidden:true});
 await page.screenshot({path:join(tmpdir(),'scanms-product-toolbar.png')});
 await clickText('Video KOL');await page.waitForFunction(()=>Math.abs(document.querySelector('.kol-video-review-modal')?.getBoundingClientRect().width-640)<1);assert.match(await page.$eval('.kol-video-review-modal',el=>el.textContent),/Chưa có video trong mục này/);await page.click('[aria-label="Đóng cửa sổ duyệt video"]');
 videos=['PENDING','APPROVED'].map((status,index)=>({id:'video-'+index,status,title:'Video '+index,productId:product.id,product,collaborator:{fullName:'KOL '+index},createdAt:'2026-11-17T01:00:00Z'}));
 await clickText('Video KOL');await page.waitForSelector('.kol-video-picker-item');assert.equal(await page.$$eval('.kol-video-picker-item',els=>els.length),2);assert.equal(await page.$eval('.kol-video-review-modal',el=>el.getBoundingClientRect().width),960);
 await page.type('[aria-label="Tìm video KOL"]','KOL 1');await page.waitForFunction(()=>document.querySelectorAll('.kol-video-picker-item').length===1);assert.match(await page.$eval('.kol-video-picker',el=>el.textContent),/KOL 1/);await page.screenshot({path:join(tmpdir(),'scanms-video-workspace.png')});
 await page.click('[aria-label="Đóng cửa sổ duyệt video"]');failVideos=true;await clickText('Video KOL');await page.waitForSelector('.kol-video-empty[role=alert]');failVideos=false;await page.click('.kol-video-empty button');await page.waitForSelector('.kol-video-picker-item');await page.click('[aria-label="Đóng cửa sổ duyệt video"]');
 await clickText('Đánh giá');await page.waitForSelector('.review-empty');assert.match(await page.$eval('.review-management-dialog',el=>el.textContent),/— \/ 5/);assert.equal(await page.$eval('.review-management-dialog',el=>el.getBoundingClientRect().width),1040);await page.screenshot({path:join(tmpdir(),'scanms-review-workspace.png')});
 await page.setViewport({width:390,height:844});assert.equal(await page.$eval('.review-management-dialog',el=>el.scrollWidth<=el.clientWidth),true);await page.keyboard.press('Escape');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.product-toolbar');failReviews=true;await clickText('Đánh giá');await page.waitForSelector('.review-empty[role=alert]');failReviews=false;await page.click('.review-empty button');await page.waitForSelector('.review-empty:not([role=alert])');assert.deepEqual(errors,[]);
 } finally {await browser.close();}
});
