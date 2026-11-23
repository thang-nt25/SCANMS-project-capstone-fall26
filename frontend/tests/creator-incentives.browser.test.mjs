import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const base=process.env.GHN_UI_TEST_URL;
test('creator incentives preserve coupon data and distinguish unknown revenue from paid rewards', {skip:!base,timeout:45000}, async()=>{
 const origin=new URL(base).origin;
 assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 let writes=0;
 try {
  const page=await browser.newPage(); page.setDefaultTimeout(8000);await page.setViewport({width:1440,height:1000});
  await page.evaluateOnNewDocument(()=>{localStorage.setItem('token','fixture-only');localStorage.setItem('user',JSON.stringify({id:'qa',role:'SHOP_MANAGER'}));});
  const coupons=Array.from({length:12},(_,i)=>({id:`coupon-${i}`,displayCode:`QA${i}`,codeNormalized:`QA${i}`,status:i===1?'BLOCKED':i===2?'EXPIRED':'ACTIVE',blockedReason:i===1?'Đã thay thế bởi mã định danh mới: QA0':null,discountType:i===0?'FIXED_AMOUNT':'PERCENTAGE',discountValue:i===0?50000:5,usageCount:i===0?1:0,usageLimitTotal:20,minimumOrderAmount:200000,maximumDiscountAmount:50000,budgetTotal:1000000,scopeType:'STORE_WIDE',collaboratorId:'kol-qa',collaborator:{id:'kol-qa',fullName:'Partner QA'},createdAt:'2026-01-01'}));
  const member=(id, revenue,grant=null)=>({collaboratorId:id,name:id,validRevenue:revenue,validOrdersCount:0,eligible:revenue!==null&&Number(revenue)>=50000000,estimatedReward:revenue===null?'0':'2000000',error:revenue===null?'Revenue unavailable':undefined,grant});
  const policies=[{id:'policy',storeId:'store-qa',storeName:'Shop QA',yearMonth:'2026-11',name:'Thưởng doanh số tháng',targetRevenue:'50000000',rewardAmount:'2000000',status:'APPROVED',isDemo:false,members:[member('Unknown QA',null),member('Paid QA',null,{id:'grant',status:'PAID',amount:'2000000',reviewNote:'đủ điều kiện',paidAt:'2026-11-15'}),member('Tracked QA','0')]}];
  policies[0].reviewHistory=[
    {id:'old-review',resubmittedAt:'2026-11-12T01:00:00Z',reviewedAt:null,reviewNote:'Earlier rejection QA',name:null,targetRevenue:'50000000',rewardAmount:'1000000'},
    {id:'new-review',resubmittedAt:'2026-11-14T15:41:58Z',reviewedAt:'2026-11-13T03:12:00Z',reviewNote:'Keep full rejection note QA',name:'Previous monthly rule',targetRevenue:'55000000',rewardAmount:'2000000'},
  ];
  await page.setRequestInterception(true);page.on('request',req=>{
   const u=new URL(req.url());
   if(u.pathname==='/incentives-fixture')return req.respond({contentType:'text/html',body:'<div id="root"></div><script type="module">import R from "/@react-refresh";R.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/creator-incentives.tsx"></script>'});
   if(u.pathname.startsWith('/api/')||u.port==='3000'){
    const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':req.headers()['access-control-request-headers']||'*','Access-Control-Allow-Methods':'GET,OPTIONS'};
    if(req.method()==='OPTIONS')return req.respond({status:204,headers});
    if(req.method()!=='GET')writes++;
    if(req.method()==='POST' && u.pathname==='/api/monthly-rewards/stores/store-qa'){
      const body=JSON.parse(req.postData());policies.push({...body,id:'created-policy',storeId:'store-qa',storeName:'Shop QA',status:'PENDING',isDemo:false,createdAt:'2026-11-19T00:00:00Z',members:[]});
      return req.respond({headers,contentType:'application/json',body:JSON.stringify({data:{id:'created-policy',status:'PENDING'}})});
    }
    const data=u.pathname==='/api/stores/my-store'?{id:'store-qa'}:u.pathname.includes('/coupons')?coupons:u.pathname.endsWith('/policies')?{items:policies.map(p=>({...p,createdAt:p.createdAt||'2026-11-19T00:00:00Z'})),total:policies.length,page:1,pageSize:5}:u.pathname.includes('/monthly-rewards')?{policies:policies.filter(p=>p.yearMonth===(u.searchParams.get('month')||'2026-11')),stores:[]}:[];
    return req.respond({headers,contentType:'application/json',body:JSON.stringify({data})});
   }
   if(u.origin!==origin&&!['data:','blob:'].includes(u.protocol))return req.abort();req.continue();
  });
  await page.goto(origin+'/incentives-fixture',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[aria-label="Chi tiết mã QA0"]');
  assert.equal(await page.$$eval('tbody tr',els=>els.length),10);
  const first=await page.$eval('tbody tr',el=>el.textContent);
  assert.ok(first.includes('50.000'));assert.ok(!first.includes('50000%'));assert.ok(first.includes('1/20'));assert.ok(first.includes('Toàn Shop'));
  assert.ok((await page.$eval('tbody',el=>el.textContent)).includes('Đã thay thế'));
  await page.select('[aria-label="Lọc trạng thái mã ưu đãi"]','EXPIRED');assert.equal(await page.$$eval('tbody tr',els=>els.length),1);
  await page.select('[aria-label="Lọc trạng thái mã ưu đãi"]','ALL');
  await page.click('[aria-label="Chi tiết mã QA0"]');await page.waitForSelector('[role="dialog"]');assert.ok((await page.$eval('[role="dialog"]',el=>el.textContent)).includes('1.000.000'));
  await page.keyboard.press('Escape');
  await page.screenshot({path:join(tmpdir(),'scanms-incentives-coupons.png')});
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(el=>el.textContent.includes('Thưởng mốc tháng')).click());
  await page.waitForSelector('.monthly-reward-team-table');
  const rows=await page.$$eval('.monthly-reward-team-table tbody tr',els=>els.map(el=>el.textContent));
  assert.ok(rows[0].includes('Chưa đối soát'));assert.ok(!rows[0].includes('0 ₫'));assert.ok(rows[1].includes('2.000.000'));assert.ok(rows[1].includes('Đã cộng ví'));
  assert.equal(await page.$$eval('.monthly-reward-team-table th',els=>els.length),5);
  assert.equal(await page.$('[aria-label="Lịch sử gửi lại chính sách"]'),null);
  await page.click('[aria-label="Lịch sử xét duyệt tháng 2026-11"]');
  await page.waitForSelector('[aria-label="Lịch sử gửi lại chính sách"]');
  const reviewText=await page.$eval('[aria-label="Lịch sử gửi lại chính sách"]',el=>el.textContent);
  assert.ok(reviewText.includes('55.000.000'));assert.ok(reviewText.includes('2.000.000'));assert.ok(reviewText.includes('Keep full rejection note QA'));
  assert.ok(reviewText.indexOf('Keep full rejection note QA')<reviewText.indexOf('Earlier rejection QA'));
  assert.equal(await page.$eval('[role="dialog"]',el=>el.getBoundingClientRect().width),560);
  assert.equal(await page.$$eval('[aria-label="Lịch sử gửi lại chính sách"] li:last-child time',els=>els.length),1);
  await page.screenshot({path:join(tmpdir(),'scanms-reward-review-history.png')});
  await page.setViewport({width:390,height:844});assert.equal(await page.$eval('[role="dialog"]',el=>el.scrollWidth<=el.clientWidth+1),true);
  await page.keyboard.press('Escape');assert.equal(await page.$('[aria-label="Lịch sử gửi lại chính sách"]'),null);
  await page.setViewport({width:1440,height:1000});
  await page.screenshot({path:join(tmpdir(),'scanms-incentives-rewards.png')});
  await page.setViewport({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await page.setViewport({width:1440,height:1000});
  await page.goto(origin+'/incentives-fixture?hub=1&tab=creator-incentives&section=milestones',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.monthly-reward-team-table');
  const nav='.promotion-primary-nav';
  assert.equal(await page.$$eval(nav+' > button',els=>els.length),3);
  assert.equal(await page.$('[aria-label="Chức năng đãi ngộ KOL"]'),null);
  assert.ok((await page.$eval(nav+' > button[aria-pressed=true]',el=>el.textContent)).includes('Thưởng mốc tháng'));
  const widths=await page.$$eval(nav+' > button',els=>els.map(el=>el.getBoundingClientRect().width));
  assert.ok(Math.max(...widths)-Math.min(...widths)<1);
  await page.click(nav+' > button:nth-child(2)');await page.waitForSelector('[aria-label="Chi tiết mã QA0"]');
  await page.type('[aria-label="Tìm theo mã coupon hoặc tên KOC"]','QA0');
  await page.click(nav+' > button:nth-child(3)');await page.waitForSelector('.monthly-reward-team-table');
  await page.click(nav+' > button:nth-child(2)');
  assert.equal(await page.$eval('[aria-label="Tìm theo mã coupon hoặc tên KOC"]',el=>el.value),'QA0');
  await page.screenshot({path:join(tmpdir(),'scanms-incentives-three-tabs.png')});
  await page.setViewport({width:390,height:844});
  const positions=await page.$$eval(nav+' > button',els=>els.map(el=>({top:el.getBoundingClientRect().top,width:el.getBoundingClientRect().width})));
  assert.equal(new Set(positions.map(el=>el.top)).size,1);
  assert.ok(Math.max(...positions.map(el=>el.width))-Math.min(...positions.map(el=>el.width))<1);
  assert.equal(writes,0);
  await page.setViewport({width:1440,height:1000});
  await page.click(nav+' > button:nth-child(3)');
  await page.waitForSelector('[aria-label="Mốc thưởng đã tạo"]');
  assert.equal(await page.$('[aria-label="Các mốc thưởng đã tạo"]'),null);
  await page.evaluate(()=>[...document.querySelectorAll('.monthly-rewards-toolbar button')].find(el=>el.textContent.includes('Tạo thưởng tháng sau')).click());
  await page.waitForSelector('[role="dialog"]');
  const numeric=await page.$$('[role="dialog"] input[pattern="[1-9][0-9]{0,11}"]');
  for(const [index,value] of ['45000000','1500000'].entries()){await numeric[index].focus();await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await numeric[index].type(value);}
  await page.click('[role="dialog"] button[type="submit"]');
  await page.waitForFunction(()=>[...document.querySelectorAll('[role="status"]')].some(el=>el.textContent.includes('Đã tạo mốc thưởng tháng')));
  await page.click('[aria-label="Mốc thưởng đã tạo"]');
  await page.waitForFunction(()=>document.querySelector('[aria-label="Các mốc thưởng đã tạo"]')?.textContent.includes('45.000.000'));
  assert.equal(writes,1);
  const history=await page.$eval('[aria-label="Các mốc thưởng đã tạo"]',el=>el.textContent);
  assert.ok(history.includes('Chờ kiểm duyệt'));assert.ok(history.includes('1.500.000'));assert.ok(history.includes('50.000.000'));
  const modalBounds=await page.$eval('[role="dialog"]',el=>{const r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return {width:r.width,left:r.left,parentWidth:p.width,parentLeft:p.left};});
  assert.equal(modalBounds.width,760);assert.ok(Math.abs(modalBounds.left-modalBounds.parentLeft-(modalBounds.parentWidth-760)/2)<1);
  assert.equal(await page.$eval('[aria-label="Xem mốc thưởng tháng 2026-11"]',el=>el.tagName),'BUTTON');
  await page.screenshot({path:join(tmpdir(),'scanms-reward-policy-history-modal.png')});
  await page.setViewport({width:390,height:844});
  assert.equal(await page.$eval('[role="dialog"]',el=>el.scrollWidth<=el.clientWidth+1),true);
  await page.setViewport({width:1440,height:1000});
  await page.click('[aria-label="Xem mốc thưởng tháng 2026-11"]');await page.waitForSelector('.monthly-reward-team-table');
  assert.equal(await page.$('[aria-label="Các mốc thưởng đã tạo"]'),null);
  await page.screenshot({path:join(tmpdir(),'scanms-reward-policy-history.png')});
 }finally{await browser.close();}
});
