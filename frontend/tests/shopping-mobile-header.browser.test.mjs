import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {mkdir} from 'node:fs/promises';
const executablePath=process.env.MOBILE_LAYOUT_BROWSER;
const base=process.env.MOBILE_LAYOUT_TEST_URL;
test('shopping mobile header has aligned touch targets and accessible tracking',{skip:!base||!executablePath,timeout:60000},async()=>{
 const browser=await puppeteer.launch({executablePath,headless:true});
 try{
 const page=await browser.newPage();
 await page.setRequestInterception(true);
 page.on('request',r=>['GET','HEAD','OPTIONS'].includes(r.method())?r.continue():r.abort());
 await mkdir('artifacts/mobile-layout',{recursive:true});
 for(const width of [320,344,390,412,1440]){
 await page.setViewport({width,height:850,isMobile:width<640,hasTouch:width<640});
 await page.goto(base+'/marketplace',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('.public-commerce-header__mobile-search');
 const g=await page.evaluate(()=>{
 const h=document.querySelector('.public-commerce-header');
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
 const visible=selector=>[...h.querySelectorAll(selector)].filter(e=>e.getBoundingClientRect().height>0);
 return {overflow:document.documentElement.scrollWidth>innerWidth+1,brand:rect(h.querySelector('.public-commerce-header__brand')),targets:visible('button[aria-controls="scanms-notification-panel"],button[aria-label="Giỏ hàng"],button[aria-label="Tài khoản"]').map(rect).sort((a,b)=>a.x-b.x),shortcuts:visible('.marketplace-shortcuts__item').map(rect),filter:visible('.product-search-filter').length,tracking:visible('.public-commerce-header__tracking').length};
 });
 assert.equal(g.overflow,false,JSON.stringify({width,g}));
 if(width<640){
 assert.equal(g.targets.length,1);assert.equal(g.tracking,0);assert.equal(g.filter,0);
 assert.ok(g.targets.every(r=>r.w>=48&&r.h>=48&&Math.abs(r.y+r.h/2-g.brand.y-g.brand.h/2)<3),JSON.stringify(g));

 assert.equal(g.shortcuts.length,0);
 assert.equal(await page.$$eval('nav[aria-label="Điều hướng mua sắm"] a',els=>els.length),5);
 const account=await page.$eval('nav[aria-label="Điều hướng mua sắm"] a:last-child',e=>e.getAttribute('href'));
 assert.ok(account.startsWith('/login?'));
 }else{assert.equal(g.tracking,1);assert.equal(await page.$eval('.public-commerce-header__mobile-cart',e=>getComputedStyle(e).display),'none')}
 if(width===390)await page.screenshot({path:'artifacts/mobile-layout/shopping-header-390.png'});
 }
 }finally{await browser.close()}
});
