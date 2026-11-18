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
await page.goto('http://localhost:5173/admin/products-pricing?tab=pricing',{waitUntil:'domcontentloaded'});await page.waitForSelector('.pricing-section-tabs');
const rects=await page.evaluate(()=>{const hub=document.querySelector('#admin-product-pricing-hub');const tab=hub.children[0].querySelector('[role="tab"]');const group=document.querySelector('.pricing-section-tabs');const r=group.getBoundingClientRect(),t=tab.getBoundingClientRect();return {left:r.left,tabLeft:t.left,width:r.width,tabWidth:t.width,buttons:[...group.children].map(b=>b.getBoundingClientRect().width)};});
if(Math.abs(rects.left-rects.tabLeft)>1||Math.abs(rects.width-rects.tabWidth)>1||Math.abs(rects.buttons[0]-rects.buttons[1])>1)throw Error(JSON.stringify(rects));
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-pricing-compact-tabs.png',fullPage:true});console.log(role+': two equal tabs align exactly to the left and width of the upper moderation tab');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});