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
await page.goto('http://localhost:5173/admin/affiliate-oversight?tab=coupons',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.kol-coupon-filters input',{timeout:30000});
const rects=await page.$$eval('.kol-coupon-filters input,.kol-coupon-filters > select',els=>els.map(el=>{const r=el.getBoundingClientRect();return {width:Math.round(r.width),height:r.height,top:r.top};}));
if(rects.length!==2||rects[0].width<=rects[1].width||rects[1].width!==220||rects[0].height!==rects[1].height||rects[0].top!==rects[1].top)throw Error(JSON.stringify(rects));
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-coupon-filters.png',fullPage:true});console.log(role+': status is 220px on the right; search expands; equal height on the same row');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});