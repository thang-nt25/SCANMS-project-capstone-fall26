require('dotenv/config');
const fs=require('node:fs');
const jwt=require('jsonwebtoken');
const {PrismaClient}=require('@prisma/client');
const {PrismaPg}=require('@prisma/adapter-pg');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
(async()=>{let browser;try{
const p=await import('../../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
browser=await p.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-first-run','--disable-extensions']});
const user=await db.user.findFirst({where:{role:'SYSTEM_ADMIN',isActive:true,isDeleted:false},select:{id:true,role:true,email:true,fullName:true}});
const token=jwt.sign({sub:user.id,role:user.role,email:user.email},process.env.JWT_SECRET,{expiresIn:'2m'});
const page=await browser.newPage();await page.setViewport({width:1920,height:1080});
await page.evaluateOnNewDocument(({user,token})=>{localStorage.setItem('token',token);localStorage.setItem('user',JSON.stringify(user));localStorage.setItem('scanms-current-role','admin');localStorage.setItem('scanms-active-workspace','admin');localStorage.setItem('scanms-cookie-consent','accepted');},{user,token});
await page.goto('http://localhost:5173/admin/analytics',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.analytics-report-toolbar',{timeout:30000});
for(const width of [1920,1440,390]){
await page.setViewport({width,height:1000});
const rects=await page.$eval('.analytics-report-toolbar',el=>[...el.querySelectorAll(':scope > div button, :scope > button')].slice(0,2).map(b=>{const r=b.getBoundingClientRect();return {width:r.width,height:r.height,top:r.top};}));
if(rects.length!==2||Math.abs(rects[0].width-rects[1].width)>1||rects[0].height!==rects[1].height||rects[0].top!==rects[1].top)throw Error('Unequal toolbar: '+JSON.stringify(rects));
if(width>=1280){const aligned=await page.evaluate(()=>{const tab=[...document.querySelectorAll('#admin-analytics-hub button')].find(b=>b.textContent.includes('Tổng quan hệ thống')).getBoundingClientRect();const toolbar=document.querySelector('.analytics-report-toolbar').getBoundingClientRect();return Math.abs(tab.left-toolbar.left)<1&&Math.abs(tab.width-toolbar.width)<1;});if(!aligned)throw Error('Controls do not align with the overview tab');}
console.log(width+': equal width, equal height, same row');
if(width===1440)await page.screenshot({path:'../artifacts/manual-finance/analytics-equal-toolbar.png',fullPage:true});
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
