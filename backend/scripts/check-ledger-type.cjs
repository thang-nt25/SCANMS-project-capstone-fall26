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
await page.goto('http://localhost:5173/admin/payouts',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.finance-ledger-table .payout-money-cell',{timeout:30000});
const sizes=await page.$$eval('.finance-ledger-table tbody tr:first-child *',els=>[...new Set(els.filter(el=>[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(el=>getComputedStyle(el).fontSize))]);
if(sizes.length!==1||sizes[0]!=='13px')throw Error('Unexpected text sizes: '+sizes.join(','));
await page.screenshot({path:'../artifacts/manual-finance/equal-ledger-type.png',fullPage:true});console.log('All ledger text: '+sizes.join(', '));
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
