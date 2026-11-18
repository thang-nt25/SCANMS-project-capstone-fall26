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
await page.waitForSelector('article[data-order-code]',{timeout:30000});
if((await page.$$('article[data-order-code]')).length!==10)throw Error('Expected ten orders');
const first=await page.$$eval('article[data-order-code] time',els=>els.map(el=>Date.parse(el.dateTime)));
if(first.length!==10||first.some((time,index)=>index>0&&time>first[index-1]))throw Error('Orders not newest first');
await page.evaluate(()=>document.querySelectorAll('.customer-orders-pagination button')[1].click());
await page.waitForFunction(()=>document.querySelector('.customer-orders-pagination').textContent.includes('2 /'));
const second=await page.$$eval('article[data-order-code] time',els=>els.map(el=>Date.parse(el.dateTime)));
if(second.length>10||second[0]>first[first.length-1])throw Error('Second page ordering');
await page.screenshot({path:'../artifacts/manual-finance/customer-orders-pagination.png',fullPage:false});
await page.setViewport({width:390,height:900});if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Mobile overflow');
if(writes.length)throw Error('Unexpected writes: '+writes.length);
console.log(role+': ten orders per page, second page, newest-first sorting, order timestamps and mobile verified without writes');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});

