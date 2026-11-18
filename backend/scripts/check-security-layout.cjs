require('dotenv/config');
const fs=require('node:fs');
const jwt=require('jsonwebtoken');
const {PrismaClient}=require('@prisma/client');
const {PrismaPg}=require('@prisma/adapter-pg');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
(async()=>{let browser;try{
const p=await import('../../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
browser=await p.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-first-run','--disable-extensions']});
const user=await db.user.findFirst({where:{role:'SYSTEM_ADMIN',isActive:true,isDeleted:false},select:{id:true,role:true,email:true,fullName:true}});
const token=jwt.sign({sub:user.id,role:user.role,email:user.email},process.env.JWT_SECRET,{expiresIn:'2m'});
const page=await browser.newPage();await page.setViewport({width:1920,height:1080});
await page.evaluateOnNewDocument(({user,token})=>{localStorage.setItem('token',token);localStorage.setItem('user',JSON.stringify(user));localStorage.setItem('scanms-current-role','admin');localStorage.setItem('scanms-active-workspace','admin');localStorage.setItem('scanms-cookie-consent','accepted');},{user,token});
await page.setViewport({width:1440,height:1000});
await page.goto('http://localhost:5173/admin/security-audit?tab=fraud',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.fraud-filter-toolbar',{timeout:30000});
const result=await page.evaluate(()=>{
const toolbar=document.querySelector('.fraud-filter-toolbar');
const tabs=[...document.querySelectorAll('#admin-security-audit-hub [role="tablist"] > button')].map(b=>Math.round(b.getBoundingClientRect().width));
const controls=[...toolbar.children].map(b=>{const r=b.getBoundingClientRect();return {width:Math.round(r.width),top:Math.round(r.top)};});
return {tabs,controls,hasOldHeader:!!document.querySelector('#admin-security-audit-hub h1'),hasScan:[...document.querySelectorAll('button')].some(b=>b.innerText.includes('Quét toàn hệ thống'))};});
if(Math.max(...result.tabs)-Math.min(...result.tabs)>1||result.hasOldHeader||result.hasScan||new Set(result.controls.map(c=>c.top)).size!==1)throw Error(JSON.stringify(result));
await page.screenshot({path:'../artifacts/manual-finance/security-audit-redesign.png',fullPage:true});console.log(JSON.stringify(result));
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});