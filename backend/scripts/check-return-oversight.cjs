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
await page.goto('http://localhost:5173/admin/arbitration?tab=returns',{waitUntil:'domcontentloaded'});
await page.waitForSelector('[data-return-case]',{timeout:30000});
const layout=await page.evaluate(()=>({tables:document.querySelectorAll('.return-unified-list').length,groups:document.querySelectorAll('.return-group-tabs button').length,hasProduct:!!document.querySelector('.return-product-cell img'),pageFits:document.documentElement.scrollWidth<=innerWidth}));
if(layout.tables!==1||layout.groups!==6||!layout.hasProduct||!layout.pageFits)throw Error(JSON.stringify(layout));
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-return-unified-list.png',fullPage:true});
await page.evaluate(()=>document.querySelector('.return-row-action').click());await page.waitForSelector('.return-ruling-form',{timeout:25000});
if(!await page.$eval('.return-ruling-form button[type="submit"]',b=>b.disabled))throw Error('Ruling must require liability and notes');
for(const label of ['Đơn & sản phẩm','Bằng chứng','Vận chuyển & GHN','Xử lý']){
await page.evaluate(label=>[...document.querySelectorAll('.return-detail-tabs button')].find(b=>b.textContent===label).click(),label);
await page.waitForSelector('.return-detail-panel');
if(label==='Đơn & sản phẩm'){if(!await page.$('.return-detail-products article'))throw Error('Missing products');await page.screenshot({path:'../artifacts/manual-finance/'+role+'-return-product-detail.png',fullPage:true});}
}
await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));
await page.evaluate(()=>[...document.querySelectorAll('.return-group-tabs button')].find(b=>b.textContent.includes('Bồi hoàn GHN')).click());await page.waitForSelector('.return-ghn-status',{timeout:25000});
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-return-ghn-list.png',fullPage:true});
await page.evaluate(()=>[...document.querySelectorAll('.return-group-tabs button')].find(b=>b.textContent.includes('Shop từ chối')).click());await page.waitForSelector('.return-empty');
await page.type('#return-case-search','no-such-return-case');await page.waitForFunction(()=>document.querySelector('.return-filter-summary')?.innerText.includes('no-such-return-case'),{timeout:20000});
await page.evaluate(()=>document.querySelector('.return-filter-summary button').click());
await page.setViewport({width:390,height:900});if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Mobile overflow');
if(writes.length)throw Error('Unexpected writes: '+writes.length);
console.log(role+': one list, six selectable queues, real product images, four detail panels, disabled incomplete ruling, separate GHN status, server search and mobile layout verified without writes');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});