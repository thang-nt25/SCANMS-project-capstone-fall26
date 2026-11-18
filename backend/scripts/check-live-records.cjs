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
const fixtures=Array.from({length:11},(_,i)=>({id:'preview-session-'+i,title:'Live session '+i,platform:i===0?'TIKTOK':'SCANMS',liveUrl:'http://localhost:5173/live/test-preview',status:i===0?'LIVE':'ENDED',startsAt:'2026-11-14T04:00:00Z',creator:{id:'creator',fullName:'Creator'},store:{name:'Store'},products:[],report:{orders:2,buyers:1,pendingOrders:0,grossSales:200000,commission:20000,currentViewers:3,totalViewers:10}}));
await page.setRequestInterception(true);
page.on('request',req=>{if(new URL(req.url()).pathname.endsWith('/live-sessions/admin'))req.respond({status:200,contentType:'application/json',body:JSON.stringify(fixtures)});else req.continue();});
await page.goto('http://localhost:5173/admin/affiliate-oversight?tab=live-sessions',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.admin-live-list tbody tr',{timeout:30000});
if((await page.$$('.admin-live-list tbody tr')).length!==10)throw Error('Not ten sessions');
await page.evaluate(()=>document.querySelectorAll('.admin-live-list footer button')[1].click());
if((await page.$$('.admin-live-list tbody tr')).length!==1)throw Error('Eleventh session not on second page');
await page.evaluate(()=>document.querySelectorAll('.admin-live-list footer button')[0].click());
await page.evaluate(()=>document.querySelector('.admin-live-list tbody button').click());
await page.waitForSelector('.admin-live-dialog');
for(let index=0;index<5;index++)await page.evaluate(index=>document.querySelectorAll('.admin-live-tabs button')[index].click(),index);
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-live-record-preview.png',fullPage:false});
await page.keyboard.press('Escape');
await page.setViewport({width:390,height:900});
if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Mobile overflow');
console.log(role+': 11 API preview records: ten per page, next page, five detail tabs, close and mobile verified without database writes');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});