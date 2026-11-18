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
await page.goto('http://localhost:5173/admin/security-audit?tab=fraud',{waitUntil:'domcontentloaded'});
await page.waitForSelector('tr[id^="incident-row-"]',{timeout:30000});
if((await page.$$('tr[id^="incident-row-"]')).length!==10)throw Error('Expected 10 rows');
const layout=await page.evaluate(()=>{const buttons=[...document.querySelectorAll('.fraud-filter-toolbar > button')].map(el=>el.getBoundingClientRect());return {fits:document.documentElement.scrollWidth<=innerWidth,widths:buttons.map(b=>Math.round(b.width)),tops:buttons.map(b=>b.top)};});
if(!layout.fits||new Set(layout.widths).size>2||new Set(layout.tops).size!==1)throw Error(JSON.stringify(layout));
await page.evaluate(()=>document.querySelectorAll('.fraud-pagination button')[1].click());
await page.waitForFunction(()=>document.querySelector('.fraud-pagination').textContent.includes('2 /'));
await page.evaluate(()=>document.querySelector('tr[id^="incident-row-"]').click());
await page.waitForSelector('[role="dialog"]');
await page.keyboard.press('Escape');
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-fraud-oversight.png',fullPage:true});
await page.setViewport({width:390,height:900});
if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Mobile overflow');
if(writes.length)throw Error('Unexpected writes: '+writes.length);
console.log(role+': fraud filters, ten rows per page, pagination, details and mobile passed without mitigation writes');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
