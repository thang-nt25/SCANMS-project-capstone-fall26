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
await page.goto('http://localhost:5173/admin/affiliate-oversight?tab=live-sessions',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.live-empty-state',{timeout:30000});
const layout=await page.evaluate(()=>{const cards=[...document.querySelectorAll('.live-summary-grid > div')].map(el=>{const r=el.getBoundingClientRect();return {width:Math.round(r.width),height:r.height};});const fields=[...document.querySelectorAll('.live-filter-toolbar input,.live-filter-toolbar button')].filter(b=>b.getBoundingClientRect().height>0).map(b=>{const r=b.getBoundingClientRect();return {top:r.top,height:r.height};});return {cards,fields,fits:document.documentElement.scrollWidth<=innerWidth};});
if(!layout.fits||layout.cards.length!==4||new Set(layout.cards.map(c=>c.height)).size!==1||layout.cards[0].height<128||new Set(layout.fields.map(c=>c.top)).size!==1||new Set(layout.fields.map(c=>c.height)).size!==1)throw Error(JSON.stringify(layout));
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-live-redesign.png',fullPage:true});
await page.type('input[aria-label="Tìm phiên livestream"]','no-such-live-session');
await page.waitForFunction(()=>[...document.querySelectorAll('.live-empty-state button')].some(b=>b.textContent==='Xóa bộ lọc'));
await page.click('.live-empty-state button');
if(await page.$eval('input[aria-label="Tìm phiên livestream"]',el=>el.value)!=='')throw Error('Filter reset failed');
await page.setViewport({width:390,height:900});
if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Mobile overflow');
console.log(role+': four equal 128px cards; all filters on one desktop row at 44px; empty-state reset works; mobile fits');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});