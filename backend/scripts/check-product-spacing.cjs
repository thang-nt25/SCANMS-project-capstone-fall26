require('dotenv/config');
const fs=require('node:fs');
const jwt=require('jsonwebtoken');
const {PrismaClient}=require('@prisma/client');
const {PrismaPg}=require('@prisma/adapter-pg');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
(async()=>{let browser;try{
const p=await import('../../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
browser=await p.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-first-run','--disable-extensions']});
for(const role of ['SYSTEM_MANAGER','SYSTEM_ADMIN']){
const user=await db.user.findFirst({where:{role,isActive:true,isDeleted:false},select:{id:true,role:true,email:true,fullName:true}});
const token=jwt.sign({sub:user.id,role:user.role,email:user.email},process.env.JWT_SECRET,{expiresIn:'2m'});
const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
await page.evaluateOnNewDocument(({user,token})=>{localStorage.setItem('token',token);localStorage.setItem('user',JSON.stringify(user));localStorage.setItem('scanms-current-role','admin');localStorage.setItem('scanms-active-workspace','admin');},{user,token});
await page.goto('http://localhost:5173/admin/products-pricing?tab=moderation',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.moderation-toolbar',{timeout:30000});
const moderation=await page.evaluate(()=>{const hub=document.querySelector('#admin-product-pricing-hub');return {gap:document.querySelector('.moderation-toolbar').getBoundingClientRect().top-hub.children[0].getBoundingClientRect().bottom,refresh:!!document.querySelector('.moderation-refresh')};});
if(moderation.gap>13||moderation.refresh)throw Error(JSON.stringify(moderation));
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-moderation-spacing.png',fullPage:true});
await page.evaluate(()=>[...document.querySelectorAll('#admin-product-pricing-hub [role="tab"]')].find(b=>b.textContent.includes('Giá sàn')).click());
await page.waitForSelector('input[aria-label="Tìm tên sản phẩm"]',{timeout:30000});
const pricing=await page.evaluate(()=>{const hub=document.querySelector('#admin-product-pricing-hub');const catalog=document.querySelector('input[aria-label="Tìm tên sản phẩm"]').closest('section');const tabs=document.querySelector('.pricing-section-tabs');return {topGap:tabs.getBoundingClientRect().top-hub.children[0].getBoundingClientRect().bottom,catalogGap:catalog.getBoundingClientRect().top-tabs.getBoundingClientRect().bottom};});
if(pricing.topGap>13||pricing.catalogGap>13)throw Error(JSON.stringify(pricing));
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-pricing-spacing.png',fullPage:true});
console.log(role+': refresh removed; both tabs have 12px content gap; catalog pulled up to 12px gap');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});