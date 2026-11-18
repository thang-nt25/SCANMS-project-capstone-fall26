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
const count=await page.$$('.review-row');
if(!count.length)throw Error('No reviews');
if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Desktop overflow');
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-review-management.png',fullPage:true});
await page.type('.review-search input','no-match-unique-123');
await page.waitForFunction(()=>document.querySelectorAll('.review-row').length===0);
await page.evaluate(()=>document.querySelector('.review-search button').click());
await page.waitForSelector('.review-row');
await page.evaluate(()=>document.querySelector('.review-actions button').click());
await page.waitForSelector('.review-row form textarea');
if(!await page.$eval('.review-row form textarea',el=>el.required && el.minLength===10))throw Error('Missing moderation reason requirement');
await page.setViewport({width:390,height:900});
if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Mobile overflow');
if(writes.length)throw Error('Unexpected writes: '+writes.length);
console.log(role+': review rows, search, required moderation reason and responsive layout passed without writes');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
