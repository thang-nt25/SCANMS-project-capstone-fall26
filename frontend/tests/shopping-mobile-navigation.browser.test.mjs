import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {mkdir} from 'node:fs/promises';
const executablePath=process.env.MOBILE_LAYOUT_BROWSER;
const base=process.env.MOBILE_LAYOUT_TEST_URL;
const nav='nav[aria-label="Điều hướng mua sắm"]';

test('shopping bottom navigation routes, cart exclusion and account tools', {skip:!base||!executablePath,timeout:90000}, async()=>{
 const browser=await puppeteer.launch({executablePath,headless:true});
 try{
 const page=await browser.newPage();
 const user={id:'navigation-fixture',fullName:'Khách kiểm tra',email:'mobile@example.test',role:'CUSTOMER'};
 await page.evaluateOnNewDocument(user=>{localStorage.setItem('user',JSON.stringify(user));localStorage.setItem('token','fixture-only');},user);
 await page.setRequestInterception(true);
 page.on('request',req=>{
  const url=new URL(req.url());
  if(url.pathname==='/src/services/chat-socket.service.ts')return req.respond({status:200,contentType:'application/javascript',body:'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};'});
  if(url.pathname.startsWith('/api/')){
   let data=[];
   if(url.pathname==='/api/auth/me')data=user;
   if(url.pathname==='/api/customer/cart')data={items:[]};
   if(url.pathname==='/api/notifications/unread-count')data={unreadCount:3};
   if(url.pathname==='/api/notifications')data={items:[],total:0,totalPages:1,unreadCount:3};
   if(url.pathname==='/api/public/products')data={items:[],pagination:{totalPages:1}};
   if(url.pathname==='/api/stores/marketplace')data=[{id:'shop-fixture',name:'Gian hàng kiểm tra',category:'Mỹ phẩm',totalProducts:3}];
   return req.respond({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
  }
  if(!['GET','HEAD','OPTIONS'].includes(req.method()))return req.abort();
  req.continue();
 });
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 await page.goto(base+'/marketplace',{waitUntil:'domcontentloaded'});
 await page.waitForSelector(nav);
 await page.waitForFunction(()=>document.querySelector('nav[aria-label="Điều hướng mua sắm"]').innerText.includes('3'));
 await page.tap(`${nav} a:nth-child(2)`);
 await page.waitForFunction(()=>location.pathname==='/stores');
 await page.waitForSelector('main[aria-label="Danh sách gian hàng"] a[href="/shops/shop-fixture"]');
 await page.waitForSelector(`${nav} a:nth-child(2)[aria-current="page"]`);
 assert.equal(await page.$eval(`${nav} a:nth-child(2)`,e=>e.getAttribute('aria-current')),'page');
 await page.tap(`${nav} a:nth-child(3)`);
 await page.waitForFunction(()=>location.pathname==='/discover/live');
 await page.waitForSelector('main[aria-label="Khám phá Live"] #live');
 await page.waitForSelector(`${nav} a:nth-child(3)[aria-current="page"]`);
 assert.equal(await page.$eval(`${nav} a:nth-child(3)`,e=>e.getAttribute('aria-current')),'page');
 await page.tap(`${nav} a:last-child`);
 await page.waitForFunction(()=>location.pathname==='/customer/account');
 await page.waitForSelector('section[aria-label="Tiện ích tài khoản"]');
 const links=await page.$$eval('main a',els=>els.map(e=>e.getAttribute('href')));
 for(const path of ['/customer/orders','/tracking','/customer/wallet','/customer/vouchers','/customer/wishlist','/customer/addresses','/customer/profile','/customer/security','/customer/upgrade'])assert.ok(links.includes(path),path);
 await mkdir('artifacts/mobile-layout',{recursive:true});
 await page.screenshot({path:'artifacts/mobile-layout/shopping-account-390.png'});
 await page.tap(`${nav} a:nth-child(4)`);
 await page.waitForFunction(()=>location.pathname==='/customer/notifications');
 await page.waitForFunction(()=>document.body.innerText.includes('Thông báo'));
 await page.tap(`${nav} a:first-child`);
 await page.waitForFunction(()=>location.pathname==='/marketplace');
 for (const width of [320, 412]) {
  await page.setViewport({width,height:844,isMobile:true,hasTouch:true});
  for (const [index,path] of [[2,'/stores'],[3,'/discover/live'],[4,'/customer/notifications'],[5,'/customer/account'],[1,'/marketplace']]) {
   await page.tap(`${nav} a:nth-child(${index})`);
   await page.waitForFunction(path=>location.pathname===path,{},path);
   await page.waitForSelector(`${nav} a:nth-child(${index})[aria-current="page"]`);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}: ${path} must fit the screen`);
  }
 }
 await page.waitForSelector('.public-commerce-header__cart-slot button');
 await page.tap('.public-commerce-header__cart-slot button');
 await page.waitForFunction(()=>!document.querySelector('nav[aria-label="Điều hướng mua sắm"]'));
 for(const path of ['/cart','/login','/products/fixture?checkout=1']){
  await page.goto(base+path,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!document.querySelector('nav[aria-label="Điều hướng mua sắm"]'));
 }
 }finally{await browser.close()}
});
