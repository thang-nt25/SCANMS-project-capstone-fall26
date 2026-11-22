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
await page.goto('http://localhost:5173/admin/products-pricing?tab=pricing',{waitUntil:'domcontentloaded'});
await page.waitForSelector('#pricing-floor-panel input',{timeout:30000});
if(!await page.$eval('#pricing-promotions-panel',el=>el.hidden)||await page.$eval('#pricing-floor-panel',el=>el.hidden))throw Error('Default MAP panel incorrect');
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-pricing-map-separated.png',fullPage:true});
await page.click('#pricing-promotions-tab');if(!await page.$eval('#pricing-floor-panel',el=>el.hidden))throw Error('Catalog should be hidden in promotion view');
await page.screenshot({path:'../artifacts/manual-finance/'+role+'-pricing-promotions-separated.png',fullPage:true});
const statuses=['PENDING','APPROVED','ACTIVE','REJECTED','CANCELLED','EXPIRED'];
const fixtures=statuses.map((status,i)=>({id:'00000000-0000-4000-8000-00000000000'+i,status,product:{title:'Fixture '+status,listPrice:100000,price:100000},store:{name:'Fixture store'},proposedPrice:90000,budgetUsed:0,budgetTotal:1000000,startsAt:status==='APPROVED'?'2026-12-01T00:00:00Z':'2026-11-01T00:00:00Z',endsAt:'2026-12-31T00:00:00Z'}));
await page.setRequestInterception(true);page.on('request',request=>{if(request.method()==='GET'&&new URL(request.url()).pathname==='/api/pricing/promotions')request.respond({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:fixtures})});else request.continue();});
await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('#pricing-floor-panel input',{timeout:30000});await page.click('#pricing-promotions-tab');
for(const [label,count] of [['Đã duyệt',1],['Đang áp dụng',1],['Lịch sử',3],['Chờ duyệt',1]]){
await page.evaluate(label=>[...document.querySelectorAll('.pricing-promotion-filters button')].find(b=>b.textContent.trim().startsWith(label)).click(),label);
const titles=await page.$$eval('#pricing-promotions-panel article h3',els=>els.map(el=>el.textContent));
if(titles.length!==count)throw Error(label+' incorrect count: '+titles.length);
if(label==='Đã duyệt'&&titles[0]!=='Fixture APPROVED')throw Error('Approved mixed with active');
if(label==='Đang áp dụng'&&titles[0]!=='Fixture ACTIVE')throw Error('Active mixed with approved');
}
await page.setViewport({width:390,height:900});if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Mobile overflow');
console.log(role+': MAP/promotions separated; default MAP has no empty promotion box; approved/active/history filters independently correct; mobile fits');await page.close();
}
}finally{await browser?.close();await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});