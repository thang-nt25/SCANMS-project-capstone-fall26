import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {mkdir} from 'node:fs/promises';
const executablePath=process.env.MOBILE_LAYOUT_BROWSER;
const base=process.env.SEARCH_READONLY_URL;
test('mobile search geometry and sorting',{skip:!executablePath||!base,timeout:60000},async()=>{
const browser=await puppeteer.launch({executablePath,headless:true});
try{
const page=await browser.newPage();
await page.setRequestInterception(true);
page.on('request',r=>['GET','HEAD','OPTIONS'].includes(r.method())?r.continue():r.abort());
for(const query of ['', '?q=serum'])for(const width of [320,344,390,412,1440]){
await page.setViewport({width,height:850,isMobile:width<640,hasTouch:width<640});
await page.goto(base+query,{waitUntil:'domcontentloaded'});
await page.waitForSelector('[data-search-sort-bar]');
const g=await page.evaluate(()=>{
const b=document.querySelector('[data-search-sort-bar]');
const rect=e=>{const r=e.getBoundingClientRect();return {y:r.y,w:r.width,h:r.height}};
return {sorts:[...b.querySelectorAll('button[aria-pressed]')].map(rect),filter:rect(b.querySelector('button')),price:rect(b.querySelector('[aria-controls="price-sort-options"]')),overflow:document.documentElement.scrollWidth>innerWidth+1,header:[...document.querySelectorAll('.public-commerce-header__brand,.public-commerce-header__actions,.public-commerce-header__cart-slot')].map(rect).filter(r=>r.h>0)};
});
assert.equal(g.overflow,false,JSON.stringify({width,query,g}));
if(width<640){assert.ok(g.sorts.every(r=>Math.abs(r.y-g.sorts[0].y)<2&&Math.abs(r.w-g.sorts[0].w)<2));assert.ok(Math.abs(g.filter.y-g.price.y)<2);assert.ok(g.sorts[0].y>g.price.y);assert.ok(g.header.every(r=>Math.abs(r.y+r.h/2-g.header[0].y-g.header[0].h/2)<4),JSON.stringify(g.header));}
}
await page.setViewport({width:390,height:850,isMobile:true,hasTouch:true});
await page.goto(base,{waitUntil:'domcontentloaded'});
await page.waitForSelector('[data-search-sort-bar]');
await page.$$eval('[data-search-sort-bar] button[aria-pressed]',els=>els[1].click());
await page.waitForFunction(()=>new URL(location.href).searchParams.get('sort')==='newest');
await page.click('[aria-controls="price-sort-options"]');
await page.waitForSelector('#price-sort-options button');
await page.click('#price-sort-options button');
await page.waitForFunction(()=>new URL(location.href).searchParams.get('sort')==='price_asc');
await mkdir('artifacts/mobile-layout',{recursive:true});
await page.$eval('[data-search-sort-bar]',e=>e.scrollIntoView({block:'center'}));
await page.screenshot({path:'artifacts/mobile-layout/search-toolbar-390.png'});
}finally{await browser.close()}
});
