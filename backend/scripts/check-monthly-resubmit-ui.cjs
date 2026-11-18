require('dotenv/config');
const assert=require('node:assert/strict');const {PrismaClient}=require('@prisma/client');const {PrismaPg}=require('@prisma/adapter-pg');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
(async()=>{let browser;try{
 const policy=await db.storeMonthlyRewardPolicy.findFirst({where:{yearMonth:'2026-12',status:'REJECTED'}});assert.ok(policy);
 const store=await db.store.findUniqueOrThrow({where:{id:policy.storeId}});const user=await db.user.findUniqueOrThrow({where:{id:store.ownerId},select:{id:true,role:true,email:true,fullName:true,storeId:true}});
 const token=require('jsonwebtoken').sign({sub:user.id,role:user.role,email:user.email},process.env.JWT_SECRET,{expiresIn:'3m'});
 const response=await fetch(`http://localhost:3000/api/monthly-rewards?month=2026-12&storeId=${store.id}`,{headers:{Authorization:`Bearer ${token}`}});const body=await response.json();let fixture=body.data||body;assert.ok(fixture.policies.length);
 const p=await import('../../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');browser=await p.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-first-run','--disable-extensions']});const page=await browser.newPage();let posted=null;const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:1000});
 await page.evaluateOnNewDocument(({user,token,storeId})=>{localStorage.setItem('user',JSON.stringify(user));localStorage.setItem('token',token);localStorage.setItem('scanms-current-role','shop');localStorage.setItem('scanms-active-workspace','shop');localStorage.setItem('current_store_id',storeId);},{user,token,storeId:store.id});
 await page.setRequestInterception(true);page.on('request',r=>{
 const path=new URL(r.url()).pathname;
 if(path===`/api/monthly-rewards/stores/${store.id}`&&r.method()==='POST'){
 posted=JSON.parse(r.postData());const original=fixture.policies.find(p=>p.id===policy.id);fixture={...fixture,policies:fixture.policies.map(p=>p.id===policy.id?{...p,...posted,status:'PENDING',reviewNote:null,reviewedAt:null,reviewHistory:[{id:'browser-only-audit',resubmittedAt:new Date().toISOString(),name:original.name,targetRevenue:original.targetRevenue,rewardAmount:original.rewardAmount,reviewNote:original.reviewNote,reviewedAt:original.reviewedAt}]}:p)};
 return void r.respond({status:201,contentType:'application/json',body:JSON.stringify({data:{id:policy.id,status:'PENDING',resubmitted:true}})});
 }
 if(path==='/api/monthly-rewards')return void r.respond({status:200,contentType:'application/json',body:JSON.stringify({data:fixture})});
 if(path.startsWith('/api/')&&!['GET','OPTIONS'].includes(r.method()))return void r.abort();return void r.continue();});
 await page.goto('http://localhost:5173/merchant/commissions',{waitUntil:'domcontentloaded'});await page.waitForSelector('.monthly-reward-resubmit button');await page.locator('.monthly-reward-resubmit button').click();await page.waitForSelector('[role="dialog"] form');
 const prefill=await page.$$eval('[role="dialog"] input',els=>els.map(e=>({value:e.value,pattern:e.pattern,inputMode:e.inputMode})));
 await page.focus('[role="dialog"] form label input[inputmode="numeric"]');await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.type('45000000');
 await page.locator('[role="dialog"] form button[type="submit"]').click();
 await page.waitForSelector('.monthly-reward-review-history');assert.equal(posted.yearMonth,'2026-12');assert.equal(posted.targetRevenue,'45000000');
 const history=await page.$eval('.monthly-reward-review-history',e=>e.textContent);assert.ok(history.includes(policy.reviewNote));
 await page.screenshot({path:'../artifacts/manual-finance/monthly-policy-resubmitted.png',fullPage:true});console.log(JSON.stringify({prefill,posted,previousReasonVisible:true,errors,realPostBlocked:true}));
 }finally{if(browser)await browser.close();await db.$disconnect();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
