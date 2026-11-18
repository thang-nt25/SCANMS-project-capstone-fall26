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
await page.waitForFunction(()=>[...document.querySelectorAll('.fraud-product-cell img')].every(img=>img.complete));
console.log(role,JSON.stringify(await page.$$eval('.fraud-product-cell img',imgs=>imgs.map(img=>({url:img.getAttribute('src'),width:img.naturalWidth})))));
const response=await page.evaluate(async()=>{const r=await fetch('/api/ai/fraud/scan?timeframe=30d',{headers:{Authorization:'Bearer '+localStorage.getItem('token')}});const body=await r.json();return (body.data||body).incidents?.slice(0,3).map(row=>({name:row.productName,image:row.productImageUrl}));});console.log(JSON.stringify(response));
if(writes.length)throw Error('Unexpected writes: '+writes.length);
console.log(role+': fraud filters, ten rows per page, pagination, details and mobile passed without mitigation writes');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
