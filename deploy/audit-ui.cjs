// Opens an isolated headless browser; local test credentials stay in memory.
const fs=require('node:fs');
const path=require('node:path');
const dotenv=require('../backend/node_modules/dotenv');
const puppeteer=require('../frontend/node_modules/puppeteer-core');
const env=dotenv.parse(fs.readFileSync(path.join(__dirname,'../frontend/.env')));
const origin='https://scanms.io.vn';
const plans={
 CUSTOMER:['/customer/orders','/customer/wallet','/customer/addresses'],
 KOL:['/collaborator/dashboard','/collaborator/marketing','/collaborator/collaboration','/collaborator/wallet'],
 SHOP:['/merchant/products','/merchant/orders','/merchant/returns','/merchant/kol-hub'],
 MANAGER:['/admin/arbitration?tab=returns','/admin/products-pricing?tab=moderation','/admin/payouts'],
 ADMIN:['/admin/analytics','/admin/personnel','/admin/arbitration?tab=returns'],
};
(async()=>{
 const browser=await puppeteer.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true,args:['--no-sandbox']});
 const results=[];
 try{
  for(const [role,routes]of Object.entries(plans)){
   const identifier=env[`VITE_DEMO_${role}_IDENTIFIER`],password=env[`VITE_DEMO_${role}_PASSWORD`];
   const response=await fetch(origin+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier,password}),signal:AbortSignal.timeout(20000)});
   const raw=await response.json();const auth=raw.data||raw;if(!auth.accessToken)throw Error('role login failed: '+role);
   const context=await browser.createBrowserContext();const page=await context.newPage();await page.setViewport({width:1440,height:960});
   const failures=[];let errors=0;
   page.on('pageerror',()=>errors++);
   page.on('response',res=>{if(res.status()>=500){const u=new URL(res.url());if(u.origin===origin)failures.push({path:u.pathname,status:res.status()});}});
   await page.evaluateOnNewDocument((auth,role)=>{
    localStorage.setItem('token',auth.accessToken);localStorage.setItem('user',JSON.stringify(auth.user));
    const workspace=role==='SHOP'?'shop':['ADMIN','MANAGER'].includes(role)?'admin':role==='CUSTOMER'?'customer':'kol';
    localStorage.setItem('scanms-current-role',workspace);localStorage.setItem('scanms-active-workspace',workspace);
    const store=auth.user.storeId||auth.user.stores?.[0]?.id;if(store)localStorage.setItem('current_store_id',store);
   },auth,role);
   for(const route of routes){
    const before=errors,offset=failures.length;
    await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:30000});
    await new Promise(resolve=>setTimeout(resolve,1600));
    const ui=await page.evaluate(()=>({textLength:document.body.innerText.length,login:location.pathname==='/login',topupDemo:!!document.querySelector('[aria-label="Phương thức nạp tiền"]'),tabs:document.querySelectorAll('.shop-kol-tabs button').length}));
    const result={role,route,rendered:ui.textLength>100&&!ui.login,pageErrors:errors-before,serverErrors:failures.slice(offset)};
    if(role==='CUSTOMER'&&route.includes('wallet'))result.demoTopupSelector=ui.topupDemo;
    if(route.includes('kol-hub'))result.partnerTabs=ui.tabs;
    results.push(result);console.log(JSON.stringify(result));
   }
   await context.close();
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(__dirname,'ui-audit.local.json'),JSON.stringify({at:new Date().toISOString(),results},null,2));
 if(results.some(r=>!r.rendered||r.pageErrors||r.serverErrors.length||r.demoTopupSelector))process.exitCode=1;
})().catch(error=>{console.error('UI audit interrupted: '+error.name);process.exitCode=1;});
