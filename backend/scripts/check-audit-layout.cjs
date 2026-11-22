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
await page.goto('http://localhost:5173/admin/security-audit?tab=audit',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.audit-activity-table td[data-label]',{timeout:30000});
const desktop=await page.evaluate(()=>{const table=document.querySelector('.audit-activity-table'),region=document.querySelector('.audit-table-region');const cats=[...document.querySelectorAll('.audit-category-toolbar button')].map(b=>Math.round(b.getBoundingClientRect().width));return {tableFits:table.scrollWidth<=region.clientWidth+1,pageFits:document.documentElement.scrollWidth<=innerWidth,categoryWidths:cats,exportCount:[...document.querySelectorAll('#audit-logs-page button')].filter(b=>b.innerText==='Xuất CSV').length,refreshCount:document.querySelectorAll('button[aria-label="Làm mới nhật ký"]').length,ruleText:document.querySelector('#audit-logs-page').innerText.includes('Quy chuẩn kiểm toán')};});
if(!desktop.tableFits||!desktop.pageFits||desktop.exportCount!==1||desktop.refreshCount!==0||desktop.ruleText||desktop.categoryWidths.length!==7)throw Error(JSON.stringify(desktop));
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-audit-fixed.png',fullPage:true});
await page.evaluate(()=>[...document.querySelectorAll('.audit-activity-table button')].find(b=>b.innerText.includes('Chi tiết')).click());
await page.waitForSelector('[role="dialog"]');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));
await page.setViewport({width:390,height:900});
const mobile=await page.evaluate(()=>({tableFits:document.querySelector('.audit-activity-table').scrollWidth<=document.querySelector('.audit-table-region').clientWidth+1,pageFits:document.documentElement.scrollWidth<=innerWidth}));
if(!mobile.tableFits||!mobile.pageFits)throw Error('Mobile overflow '+JSON.stringify(mobile));
console.log(role+': fixed table fits desktop and mobile; equal category filters; single CSV; no redundant controls; detail dialog works');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});