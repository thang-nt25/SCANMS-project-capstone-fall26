import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const base = process.env.GHN_UI_TEST_URL;
test('operator previews only KOL issues and sends supplement request without approving or rejecting', {skip: !base, timeout:30000}, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
  try {
    const page=await browser.newPage(); const writes=[]; let sent=false; let completed=false; let legacyApi=false;
    await page.setRequestInterception(true);
    page.on('request',req=>{
      const url=new URL(req.url());
      if(url.pathname==='/evidence-fixture')return req.respond({contentType:'text/html',body:'<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/payout-evidence.tsx"></script>'});
      if(url.pathname.startsWith('/api/')) {
        if(req.method()==='POST'){writes.push({url:url.pathname,body:JSON.parse(req.postData())});sent=true;}
        const data=req.method()==='POST'?{sentAt:'2026-11-15T08:00:00Z'}:{payoutId:'payout',contact:{email:'kol@example.test',phone:'0900000000',avatarUrl:null},profile:{kycStatus:'VERIFIED',idNumberMasked:'**** 1234',taxCode:null,bankName:'VCB',accountNumber:'123',accountName:'KOL',updatedAt:'2026-11-15T08:00:00Z',verifiedAt:null},payout:{createdAt:'2026-11-15T08:00:00Z',amount:'200000',taxAmount:'10000',netAmount:'190000',bankName:'VCB',accountNumber:'456',accountName:'KOL',hasBill:false},collaboratorId:'kol',name:'KOL',requestStatus:completed?'APPROVED':'PENDING',passedChecks:4,totalChecks:7,checkedAt:'2026-11-15T08:00:00Z',informationRequest:sent?{sentAt:'2026-11-15T08:00:00Z',sentBy:'Operator',codes:['TAX_ID','BENEFICIARY_MATCH']}:null,checks:[{code:'VERIFIED_KYC',label:'KYC',passed:true,blocking:true,missing:null,detail:[],documents:[{label:'Front',url:'https://images.example.test/front.svg'},{label:'Back',url:null}]},...['TAX_ID','BENEFICIARY_MATCH','FUNDED_PAYOUT'].map(code=>({code,label:code,passed:false,blocking:true,missing:code,detail:[],documents:[]}))]};
        if(legacyApi && req.method()==='GET'){delete data.contact;delete data.profile;delete data.payout;}
        return req.respond({contentType:'application/json',body:JSON.stringify({data})});
      }
      if(url.hostname==='images.example.test') return req.respond({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150"><rect width="300" height="150" fill="#EAE4D7"/></svg>'});
      if(url.origin!==origin)return req.abort();return req.continue();
    });
    for(const width of [1200,390]){
      await page.setViewport({width,height:900});await page.goto(origin+'/evidence-fixture');
      await page.waitForSelector('details[data-check-code="TAX_ID"]');
      assert.equal(await page.$eval('#evidence-tab-profile',el=>el.getAttribute('aria-selected')),'true');
      assert.match(await page.$eval('.payout-evidence-person',el=>el.textContent),/kol@example.test/);
      assert.equal(await page.$$eval('.payout-document-empty',els=>els.length),1);
      await page.screenshot({path:process.env.TEMP+'/scanms-payout-profile-'+width+'.png'});
      await page.click('.payout-document-image');
      await page.waitForSelector('.payout-document-preview');
      await page.click('.payout-document-preview button');
      await page.click('#evidence-tab-bank');
      assert.equal(await page.$$eval('.payout-evidence-bank-grid section',els=>els.length),2);
      assert.match(await page.$eval('.payout-evidence-amounts',el=>el.textContent),/190.000/);
      await page.screenshot({path:process.env.TEMP+'/scanms-payout-overview-'+width+'.png'});
      await page.click('#evidence-tab-checks');
      const links=await page.$$eval('details a',els=>els.map(e=>e.getAttribute('href')));
      assert.ok(links.includes('/admin/kyc?userId=kol&section=identity&focus=tax'));
      assert.ok(links.includes('/admin/kyc?userId=kol&section=bank'));
      assert.equal(await page.$$eval('.payout-check-actions button[aria-pressed]',els=>els.length),2);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.ok(await page.$$eval('.payout-check-actions button',els=>els.every(e=>e.getBoundingClientRect().height===36)));
      await page.screenshot({path: process.env.TEMP+'/scanms-payout-actions-'+width+'.png'});
    }
    await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Yêu cầu bổ sung ·')).click());
    assert.equal(writes.length,0);
    await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Xác nhận gửi cho KOL')).click());
    await page.waitForFunction(()=>document.body.textContent.includes('Đã gửi yêu cầu bổ sung ·'));
    assert.deepEqual(writes,[{url:'/api/admin/payouts/payout/request-information',body:{codes:['TAX_ID','BENEFICIARY_MATCH']}}]);
    completed=true;
    await page.goto(origin+'/evidence-fixture');
    await page.waitForSelector('details[data-check-code="TAX_ID"]');
    await page.click('#evidence-tab-checks');
    assert.equal(await page.$$eval('.payout-check-actions button[aria-pressed]',els=>els.length),2);
    assert.ok(await page.evaluate(()=>[...document.querySelectorAll('button')].some(e=>e.textContent.includes('Gửi yêu cầu bổ sung'))));
    legacyApi=true;
    await page.goto(origin+'/evidence-fixture');
    await page.waitForSelector('[role="alert"]');
    assert.equal(await page.$('.payout-evidence-person'),null);
    assert.equal(await page.$('.payout-evidence-bank-grid'),null);
    assert.match(await page.$eval('[role="alert"]',el=>el.textContent),/backend/);
    assert.equal(writes.length,1);
  }finally{await browser.close();}
});
