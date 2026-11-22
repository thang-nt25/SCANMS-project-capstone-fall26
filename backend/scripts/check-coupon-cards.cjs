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
await page.waitForSelector('.kol-coupon-card',{timeout:30000});
const sizes=await page.$$eval('.kol-coupon-card',els=>els.slice(0,2).map(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,top:r.top};}));
if(sizes.length!==2||sizes[0].width!==sizes[1].width||sizes[0].height!==sizes[1].height||sizes[0].top!==sizes[1].top)throw Error('Unequal coupon cards');
await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copiedCoupon=text;}}});});
const code=await page.$eval('.kol-coupon-code strong',el=>el.textContent);
await page.click('.kol-coupon-code button');await page.waitForFunction(code=>window.__copiedCoupon===code,{},code);
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-coupon-cards.png',fullPage:true});
await page.evaluate(()=>document.querySelector('.kol-coupon-card-actions button').click());await page.waitForSelector('.coupon-detail-grid',{timeout:25000}).catch(async error=>{await page.screenshot({path:'../artifacts/manual-finance/coupon-detail-failure.png',fullPage:true});console.log('Detail state: '+await page.$eval('.coupon-action-dialog',el=>el.innerText));throw error;});
const detail=await page.$eval('.coupon-oversight-details',el=>el.innerText);
if(!detail.includes('Ngân sách còn lại')||!detail.includes('Lịch sử sử dụng')||!detail.includes('Phê duyệt')||detail.includes('STORE_WIDE'))throw Error('Incomplete detail');
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-coupon-detail.png',fullPage:true});
await page.click('.coupon-action-dialog button[aria-label="Đóng"]');
await page.setViewport({width:390,height:900});
if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Mobile overflow');
await page.evaluate(()=>document.querySelector('.kol-coupon-card-actions button').click());await page.waitForSelector('.coupon-detail-grid',{timeout:25000}).catch(async error=>{await page.screenshot({path:'../artifacts/manual-finance/coupon-detail-failure.png',fullPage:true});console.log('Detail state: '+await page.$eval('.coupon-action-dialog',el=>el.innerText));throw error;});
if(!await page.evaluate(()=>document.querySelector('.coupon-action-dialog').scrollWidth<=document.querySelector('.coupon-action-dialog').clientWidth+1))throw Error('Detail overflow');
console.log(role+': equal two-column cards, copy action, limits, approval and real history shown; mobile fits');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});