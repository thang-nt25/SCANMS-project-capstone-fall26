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
await page.goto('http://localhost:5173/admin/products-pricing?tab=moderation',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.moderation-card-actions.has-review-actions',{timeout:30000});
const layout=await page.evaluate(()=>{const card=document.querySelector('.moderation-product-card');return {buttons:[...card.querySelectorAll('.moderation-card-actions > button')].map(b=>{const r=b.getBoundingClientRect();return {width:Math.round(r.width),height:r.height,top:r.top};}),image:card.querySelector('.moderation-card-image').getBoundingClientRect().width,cards:[...document.querySelectorAll('.moderation-product-card')].slice(0,2).map(c=>c.getBoundingClientRect().height),fits:document.documentElement.scrollWidth<=innerWidth};});
if(!layout.fits||layout.image!==64||layout.buttons.length!==3||new Set(layout.buttons.map(b=>b.width)).size>1||new Set(layout.buttons.map(b=>b.top)).size>1||layout.buttons.some(b=>b.height!==38)||new Set(layout.cards).size>1)throw Error(JSON.stringify(layout));
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-product-card-redesign.png',fullPage:true});
await page.evaluate(()=>document.querySelector('.moderation-card-actions button').click());
await page.waitForSelector('.moderation-review-modal[role="dialog"]');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));
const canReject=await page.$eval('.moderation-card-reject',b=>!b.disabled);
if(canReject){await page.evaluate(()=>document.querySelector('.moderation-card-reject').click());await page.waitForSelector('[role="dialog"] textarea');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));}
await page.setViewport({width:390,height:900});if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Mobile overflow');
console.log(role+': equal card heights; 64px images; three equal 38px buttons; review and reject dialogs work without submitting; mobile fits');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});