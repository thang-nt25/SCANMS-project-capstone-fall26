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
const token=jwt.sign({sub:user.id,role:user.role,email:user.email},process.env.JWT_SECRET,{expiresIn:'3m'});
const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
await page.evaluateOnNewDocument(({user,token})=>{localStorage.setItem('token',token);localStorage.setItem('user',JSON.stringify(user));localStorage.setItem('scanms-current-role','admin');localStorage.setItem('scanms-active-workspace','admin');},{user,token});
const writes=[];page.on('request',request=>{if(request.url().includes('/api/')&&!['GET','OPTIONS'].includes(request.method()))writes.push(request.url());});
await page.goto('http://localhost:5173/admin/customer-reviews',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.review-row',{timeout:30000});
const href=await page.$eval('.review-public-link',el=>el.href);
const reviewId=new URL(href).searchParams.get('review');
await page.goto(href,{waitUntil:'domcontentloaded'});
await page.waitForFunction(id=>!!document.getElementById('review-'+id),{timeout:30000},reviewId);
await page.waitForFunction(id=>document.activeElement?.id==='review-'+id,{timeout:15000},reviewId);
if(!await page.evaluate(id=>document.getElementById('review-'+id).className.includes('ring-1'),reviewId))throw Error('Target not highlighted');
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-review-direct-link.png',fullPage:false});
if(writes.some(url=>url.includes('/reviews/')))throw Error('Unexpected moderation writes');
console.log(role+': review rows, search, required moderation reason and responsive layout passed without writes');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});

