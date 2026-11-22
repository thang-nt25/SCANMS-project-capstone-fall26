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
await page.goto('http://localhost:5173/admin/arbitration?tab=returns&group=disputes&query=471A9F05&page=1',{waitUntil:'domcontentloaded'});
await page.waitForSelector('[data-return-case]',{timeout:30000});
await page.evaluate(()=>document.querySelector('.return-row-action').click());
await page.waitForSelector('.return-admin-workspace .return-detail-tabs',{timeout:30000});
await page.waitForSelector('.return-workspace-summary img',{timeout:20000});
await page.waitForSelector('.return-ruling-form');
if(await page.$('[role="dialog"]'))throw Error('Duplicate modal still rendered');
if(!new URL(page.url()).pathname.startsWith('/admin/returns/'))throw Error('Not a direct detail page');
if(!await page.$eval('.return-detail-tabs button[aria-selected="true"]',button=>button.textContent.includes('Xử lý')))throw Error('Ruling did not open handling');
await page.evaluate(()=>document.querySelector('.return-detail-tabs button').click());
await page.waitForSelector('.return-detail-products img');
const facts=await page.evaluate(()=>({tabs:document.querySelectorAll('.return-detail-tabs button').length, outer:document.querySelector('.return-admin-workspace')?.innerText.includes('Vi phạm hàng mẫu'),products:!!document.querySelector('.return-detail-products img'),fits:document.documentElement.scrollWidth<=innerWidth}));
if(await page.$eval('.return-workspace-summary',el=>el.textContent.includes('?')))throw Error('Broken Vietnamese text');
if(facts.tabs!==5||facts.outer||!facts.products||!facts.fits)throw Error(JSON.stringify(facts));
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-return-workspace.png',fullPage:true});
await page.evaluate(()=>document.querySelector('.return-workspace-findings button').click());
await page.waitForSelector('.return-ruling-form');
if(!await page.$eval('.return-ruling-form button[type="submit"]',b=>b.disabled))throw Error('Incomplete ruling enabled');
if(await page.$('.return-processing-history'))throw Error('History still appears in handling');
for(let index=0;index<5;index++){
await page.evaluate(index=>document.querySelectorAll('.return-detail-tabs button')[index].click(),index);
await page.waitForSelector('.return-detail-panel');
}
await page.waitForSelector('.return-history-table');
if(await page.$('.return-case-history details'))throw Error('Nested history disclosure');
await page.setViewport({width:390,height:900});
if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Mobile overflow');
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-return-workspace-mobile.png',fullPage:true});
await page.evaluate(()=>document.querySelector('.return-workspace-toolbar a').click());
await page.waitForSelector('.return-unified-list',{timeout:20000});
if(await page.$eval('#return-case-search',input=>input.value)!=='471A9F05')throw Error('Search not restored');
if(new URL(page.url()).searchParams.get('group')!=='disputes'||new URL(page.url()).searchParams.get('page')!=='1')throw Error('Group or page not restored');
await page.evaluate(()=>document.querySelector('.return-row-action').click());
await page.waitForSelector('.return-ruling-form');
await page.goBack({waitUntil:'domcontentloaded'});
await page.waitForSelector('.return-unified-list',{timeout:20000});
if(await page.$eval('#return-case-search',input=>input.value)!=='471A9F05')throw Error('Browser Back lost search');
if(writes.length)throw Error('Unexpected writes: '+writes.length);
console.log(role+': direct detail navigation without modal, handling tab, product image, four panels, finding links, disabled ruling, mobile, preserved filters and browser Back passed without writes');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
