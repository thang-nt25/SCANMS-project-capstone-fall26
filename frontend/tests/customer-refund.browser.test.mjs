import test from 'node:test';import assert from 'node:assert/strict';import puppeteer from 'puppeteer-core';
const base=process.env.GHN_UI_TEST_URL;
test('customer refund shows authoritative payment outcome and preserves retry without duplicate confirmation',{skip:!base,timeout:20000},async()=>{
 const origin=new URL(base).origin;assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
 const browser=await puppeteer.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true,args:['--no-sandbox'],timeout:10000});let writes=0;
 try{const page=await browser.newPage();page.setDefaultTimeout(7000);await page.setViewport({width:1200,height:800});await page.setRequestInterception(true);
 page.on('request',req=>{const url=new URL(req.url());
 if(url.pathname==='/customer-refund-fixture')return req.respond({contentType:'text/html',body:'<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/customer-refund.tsx"></script>'});
 if(url.pathname.endsWith('/returns/refund-fixture/confirmation')){const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':req.headers()['access-control-request-headers']||'*','Access-Control-Allow-Methods':'POST,OPTIONS'};if(req.method()==='OPTIONS')return req.respond({status:204,headers});writes++;return setTimeout(()=>void req.respond({status:writes===1?500:200,headers,contentType:'application/json',body:JSON.stringify(writes===1?{message:'Chưa hoàn tiền được.'}:{data:{id:'refund-fixture',status:'COMPLETED',resolution:'REFUND',events:[],refund:{amount:179001,method:'WALLET',status:'SUCCEEDED',processedAt:'2026-11-17T08:00:00Z'}}})}),200);}
 if(url.origin!==origin)return req.abort();return req.continue();});
 await page.goto(origin+'/customer-refund-fixture',{waitUntil:'domcontentloaded'});await page.waitForSelector('.customer-refund-confirm');
 assert.match(await page.$eval('.customer-refund-result',el=>el.textContent),/179.001.*Chưa chuyển tiền/);
 assert.equal(await page.$('details.customer-refund-previous'),null);
 assert.match(await page.$eval('.customer-refund-previous',el=>el.textContent),/Phản hồi trước đó của Shop.*Sản phẩm không khớp đơn hàng/);
 assert.equal(await page.$eval('.customer-refund-grid > section + section',el=>getComputedStyle(el).borderLeftWidth),'1px');
 await page.$eval('.customer-refund-confirm',el=>{el.click();el.click();});await page.waitForSelector('.customer-refund-error');assert.equal(writes,1);
 assert.ok(!(await page.$eval('.customer-refund-result',el=>el.textContent)).includes('Đã hoàn vào'));
 await page.waitForFunction(()=>!document.querySelector('.customer-refund-confirm').disabled);await page.setViewport({width:390,height:844});
 assert.equal(await page.$eval('.customer-refund-result',el=>el.scrollWidth<=el.clientWidth),true);
 await page.click('.customer-refund-confirm');await page.waitForSelector('.customer-refund-wallet');assert.equal(writes,2);
 assert.equal(await page.$('.customer-refund-confirm'),null);assert.match(await page.$eval('.customer-refund-result',el=>el.textContent),/Đã hoàn vào Ví SCANMS.*17\/11\/2026/);
 assert.equal(await page.$eval('.customer-refund-wallet',el=>el.getAttribute('href')),'/customer/wallet');
 }finally{await browser.close();}
});
