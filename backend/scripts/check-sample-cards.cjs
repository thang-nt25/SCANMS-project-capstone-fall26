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
await page.goto('http://localhost:5173/admin/arbitration?tab=samples',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.sample-request-card',{timeout:30000});
const layout=await page.evaluate(()=>({image:document.querySelector('.sample-product-image')?.getBoundingClientRect().width,cols:getComputedStyle(document.querySelector('.sample-card-body')).gridTemplateColumns.split(' ').length,avatar:document.querySelector('.sample-creator-avatar')?.getBoundingClientRect().width,fits:document.documentElement.scrollWidth<=innerWidth}));
if(layout.image!==64||layout.cols!==3||layout.avatar!==36||!layout.fits)throw Error(JSON.stringify(layout));
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-sample-cards.png',fullPage:true});
const cardHeight=await page.$eval('.sample-request-card',el=>el.getBoundingClientRect().height);
await page.evaluate(()=>document.querySelector('.sample-delivery-trigger').click());
await page.waitForSelector('.sample-delivery-modal');
if(await page.$eval('.sample-request-card',el=>el.getBoundingClientRect().height)!==cardHeight)throw Error('Card expanded');
if(await page.$eval('.sample-delivery-modal',el=>el.textContent.includes('?')))throw Error('Broken Vietnamese');
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-sample-delivery-modal.png',fullPage:true});
await page.keyboard.press('Escape');
await page.waitForFunction(()=>!document.querySelector('.sample-delivery-modal'));
await page.evaluate(()=>document.querySelector('.sample-card-actions button').click());
await page.waitForSelector('.sample-history-modal');
await page.evaluate(()=>document.querySelector('.sample-history-modal button').click());
await page.setViewport({width:390,height:900});
if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Mobile overflow');
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-sample-cards-mobile.png',fullPage:true});
if(writes.length)throw Error('Unexpected writes: '+writes.length);
console.log(role+': sample card columns, 64px product image, 36px avatar, delivery details, history and mobile layout passed without writes');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
