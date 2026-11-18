require('dotenv/config');
const fs=require('node:fs');
const jwt=require('jsonwebtoken');
const {PrismaClient}=require('@prisma/client');
const {PrismaPg}=require('@prisma/adapter-pg');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
(async()=>{let browser;try{
const p=await import('../../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
browser=await p.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-first-run','--disable-extensions']});
for(const role of ['CUSTOMER']){
const user=await db.user.findFirst({where:{role,email:'customer.an@scanms.vn',isActive:true,isDeleted:false},select:{id:true,role:true,email:true,fullName:true}});
const token=jwt.sign({sub:user.id,role:user.role,email:user.email},process.env.JWT_SECRET,{expiresIn:'3m'});
const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
await page.evaluateOnNewDocument(({user,token})=>{localStorage.setItem('token',token);localStorage.setItem('user',JSON.stringify(user));localStorage.setItem('scanms-current-role','admin');localStorage.setItem('scanms-active-workspace','admin');},{user,token});
const writes=[];page.on('request',request=>{if(request.url().includes('/api/')&&!['GET','OPTIONS'].includes(request.method()))writes.push(request.url());});
await page.goto('http://localhost:5173/customer/orders',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.customer-orders',{timeout:30000});
await page.waitForSelector('a[href*="/customer/returns/"]',{timeout:30000});
const before=await page.$eval('.workspace-page-column',el=>({left:el.getBoundingClientRect().left,width:el.getBoundingClientRect().width}));
await page.evaluate(()=>document.querySelector('a[href*="/customer/returns/"]').click());
await page.waitForSelector('.customer-return-address',{timeout:30000});
const after=await page.$eval('.workspace-page-column',el=>({left:el.getBoundingClientRect().left,width:el.getBoundingClientRect().width}));
if(Math.abs(before.left-after.left)>1||Math.abs(before.width-after.width)>1)throw Error(JSON.stringify({before,after}));
await page.screenshot({path:'../artifacts/manual-finance/customer-return-aligned.png',fullPage:false});
await page.setViewport({width:390,height:900});
if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Mobile overflow');
if(writes.length)throw Error('Unexpected writes: '+writes.length);
console.log(role+': orders and return detail have identical content width and left position; mobile fits without writes');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
