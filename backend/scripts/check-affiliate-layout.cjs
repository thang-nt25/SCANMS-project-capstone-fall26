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
await page.goto('http://localhost:5173/admin/affiliate-oversight?tab=links',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.referral-links-table td[data-label]',{timeout:30000});
const layout=await page.evaluate(()=>{const tabs=[...document.querySelectorAll('#admin-oversight-hub [role="tablist"] > button')];const table=document.querySelector('.referral-links-table'),region=document.querySelector('.referral-table-region');return {widths:tabs.map(b=>Math.round(b.getBoundingClientRect().width)),heights:tabs.map(b=>Math.round(b.getBoundingClientRect().height)),divider:getComputedStyle(tabs[1],'::before').content,cards:[...document.querySelectorAll('.referral-summary-grid article')].map(a=>Math.round(a.getBoundingClientRect().height)),noHeader:!document.querySelector('#admin-oversight-hub h1'),tableFits:table.scrollWidth<=region.clientWidth+1,pageFits:document.documentElement.scrollWidth<=innerWidth};});
if(!layout.noHeader||!layout.tableFits||!layout.pageFits||new Set(layout.cards).size!==1||new Set(layout.widths).size>1||layout.divider==='none')throw Error(JSON.stringify(layout));
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-affiliate-redesign.png',fullPage:true});
await page.evaluate(()=>[...document.querySelectorAll('.referral-links-table button')].find(b=>b.textContent.includes('Khóa link')).click());
await page.waitForSelector('[role="dialog"]');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));
await page.setViewport({width:390,height:900});
const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.referral-links-table').scrollWidth<=document.querySelector('.referral-table-region').clientWidth+1);
if(!fits)throw Error('Mobile overflow');
console.log(role+': three equal larger tabs with dividers, equal 128px cards, table fits desktop/mobile, block dialog opens and cancels');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});