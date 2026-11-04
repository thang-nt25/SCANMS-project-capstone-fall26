import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
const base=process.env.MOBILE_LAYOUT_TEST_URL;
const executablePath=process.env.MOBILE_LAYOUT_BROWSER;
const nav='nav[aria-label="Điều hướng không gian làm việc"]';
const fixtures=[
 {role:'COLLABORATOR',path:'/collaborator/dashboard',labels:['Tổng quan','Tiếp thị','Hợp tác','Ví thù lao','Tôi'],links:['/collaborator/dashboard','/collaborator/marketing','/collaborator/collaboration','/collaborator/wallet'],extra:'/collaborator/live-sessions'},
 {role:'SHOP_MANAGER',path:'/merchant/dashboard',labels:['Tổng quan','Đơn hàng','Sản phẩm','Đối tác','Thêm'],links:['/merchant/dashboard','/merchant/orders','/merchant/products','/merchant/kol-hub'],extra:'/merchant/promotions'},
 {role:'SYSTEM_MANAGER',path:'/admin/analytics',labels:['Tổng quan','Duyệt rút','Kiểm duyệt','Khiếu nại','Tôi'],links:['/admin/analytics','/admin/finance/payouts'],extra:'/admin/audit-logs'},
 {role:'SYSTEM_ADMIN',path:'/admin/analytics',labels:['Báo cáo','Quyết toán','Nhân sự','Kiểm soát','Thêm'],links:['/admin/analytics','/admin/finance/payouts','/admin/personnel'],extra:'/admin/audit-logs'},
];
test('role-specific mobile navigation, grouped menus, permissions and desktop preservation',{skip:!base||!executablePath,timeout:90000},async()=>{
 const browser=await puppeteer.launch({executablePath,headless:true});
 try {
  await mkdir('artifacts/mobile-layout',{recursive:true});
  for(const fixture of fixtures){
   const page=await browser.newPage();
   const user={id:'workspace-fixture',role:fixture.role,email:'fixture@example.test',fullName:'Người kiểm tra',stores:[{id:'fixture-store',name:'Gian hàng kiểm tra',isActive:true}]};
   await page.evaluateOnNewDocument(user=>{localStorage.setItem('user',JSON.stringify(user));localStorage.setItem('token','fixture-only');},user);
   await page.setRequestInterception(true);
   page.on('request',req=>{
    const url=new URL(req.url());
    if(url.pathname==='/src/services/chat-socket.service.ts')return req.respond({status:200,contentType:'application/javascript',body:'const s={connected:false,active:false,on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};'});
    // Isolate navigation from page-specific data while retaining MainLayout, router and RoleGuard.
    if(/^\/src\/pages\/(admin|merchant|collaborator)\/.+\.tsx$/.test(url.pathname))return req.respond({status:200,contentType:'application/javascript',body:`export default function Page(){return ${JSON.stringify('Screen: '+url.pathname)}};export const AuditLogsPage=Page;`});
    if(url.pathname.startsWith('/api/')){
     let data=[];
     if(url.pathname==='/api/auth/me')data=user;
     if(url.pathname==='/api/customer/cart')data={items:[]};
     if(url.pathname==='/api/notifications/unread-count')data={unreadCount:0};
     return req.respond({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
    }
    if(!['GET','HEAD','OPTIONS'].includes(req.method()))return req.abort();
    req.continue();
   });
   await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
   await page.goto(base+fixture.path,{waitUntil:'domcontentloaded'});
   await page.waitForSelector(nav);
   assert.deepEqual(await page.$$eval(`${nav}>a,${nav}>button`,els=>els.map(e=>e.innerText.trim())),fixture.labels);
   assert.equal(await page.$('nav[aria-label="Điều hướng mua sắm"]'),null);
   for(const [index,path] of fixture.links.entries()){
    await page.tap(`${nav}>:nth-child(${index+1})`);
    await page.waitForFunction(path=>location.pathname===path,{},path);
    await page.waitForSelector(`${nav}>:nth-child(${index+1})[aria-current="page"]`);
   }
   if(fixture.role==='SYSTEM_MANAGER'||fixture.role==='SYSTEM_ADMIN'){
    const index=fixture.role==='SYSTEM_MANAGER'?3:4;
    await page.tap(`${nav}>:nth-child(${index})`);
    await page.waitForSelector('dialog[open][data-workspace-menu]');
    await page.tap('dialog[open] a[href="/admin/product-moderation"]');
    await page.waitForFunction(()=>location.pathname==='/admin/product-moderation');
    await page.waitForSelector(`${nav}>:nth-child(${index})[aria-current="page"]`);
   }
   for(const width of [320,390,412]){
    await page.setViewport({width,height:844,isMobile:true,hasTouch:true});
    await page.tap(`${nav}>:last-child`);
    await page.waitForSelector('dialog[open][data-workspace-menu]');
    const hrefs=await page.$$eval('dialog[open] a',els=>els.map(e=>e.getAttribute('href')));
    assert.ok(hrefs.includes(fixture.extra));
    assert.ok(hrefs.includes('/marketplace'));
    if(fixture.role==='SYSTEM_MANAGER')assert.ok(!hrefs.includes('/admin/personnel')&&!hrefs.includes('/admin/vip-exceptions'));
    const geometry=await page.$eval('dialog[open]',e=>({width:e.getBoundingClientRect().width,scroll:e.scrollWidth,client:e.clientWidth}));
    assert.ok(geometry.width<=width+1&&geometry.scroll<=geometry.client+1);
    await page.tap('dialog[open] button[aria-label="Đóng menu"]');
    await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
   }
   await page.screenshot({path:`artifacts/mobile-layout/workspace-${fixture.role}.png`});
   await page.tap(`${nav}>:last-child`);
   await page.waitForSelector('dialog[open]');
   await page.tap(`dialog[open] a[href="${fixture.extra}"]`);
   await page.waitForFunction(path=>location.pathname===path,{},fixture.extra);
   await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
   assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
   await page.setViewport({width:1440,height:900});
   await page.waitForFunction(()=>!document.querySelector('nav[aria-label="Điều hướng không gian làm việc"]'));
   await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
   await page.waitForSelector(nav);
   await page.tap(`${nav}>:last-child`);
   await page.waitForSelector('dialog[open]');
   await page.tap('dialog[open] a[href="/marketplace"]');
   await page.waitForSelector('nav[aria-label="Điều hướng mua sắm"]');
   assert.equal(await page.$(nav),null);
   await page.close();
  }
 } finally {await browser.close();}
});
