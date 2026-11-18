import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const base = process.env.GHN_UI_TEST_URL;
test('supplementary evidence opens compact form and sends only one request before closing', { skip: !base, timeout: 20000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'], timeout: 10000 });
  let writes = 0;
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(7000);
    await page.setViewport({ width: 1100, height: 900 });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname === '/evidence-fixture') return req.respond({ contentType:'text/html', body:'<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/shop-evidence.tsx"></script>' });
      const headers = { 'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':req.headers()['access-control-request-headers']||'*','Access-Control-Allow-Methods':'POST,OPTIONS' };
      if (url.pathname.includes('/upload/image') || url.pathname.includes('/returns/evidence-fixture/shop-escalation')) {
        if (req.method() === 'OPTIONS') return req.respond({ status:204,headers });
        if (url.pathname.includes('/shop-escalation')) writes++;
        return setTimeout(() => void req.respond({ headers, contentType:'application/json', body:JSON.stringify({data:url.pathname.includes('/upload/')?{url:'https://example.test/evidence.png'}:{id:'evidence-fixture'}}) }),150);
      }
      if (url.origin !== origin) return req.abort();
      return req.continue();
    });
    await page.goto(origin+'/evidence-fixture',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.shop-evidence-panel button');
    await page.click('.shop-evidence-panel button');
    await page.waitForSelector('.shop-rejection-form');
    assert.equal(await page.$eval('[role="dialog"]', el=>el.getBoundingClientRect().width),640);
    assert.equal(await page.$eval('.modal-footer button[type="submit"]',el=>el.disabled),true);
    await page.type('textarea','Bổ sung thông tin đóng gói và bàn giao để vận hành đối chiếu.');
    await page.$eval('input[type="file"]',input=>{const data=new DataTransfer();data.items.add(new File(['evidence'],'photo.png',{type:'image/png'}));input.files=data.files;input.dispatchEvent(new Event('change',{bubbles:true}));});
    await page.waitForFunction(()=>!document.querySelector('.modal-footer button[type="submit"]').disabled);
    await page.setViewport({width:390,height:844});
    assert.equal(await page.$eval('[role="dialog"]',el=>el.scrollWidth<=el.clientWidth),true);
    await page.$eval('.modal-footer button[type="submit"]',el=>{el.click();el.click();});
    await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));
    assert.equal(writes,1);
    assert.match(await page.$eval('.shop-evidence-summary',el=>el.textContent),/Đã gửi 1 tệp/);
    assert.equal(await page.$eval('.shop-evidence-panel button',el=>el.textContent),'Gửi bổ sung');
  } finally { await browser.close(); }
});
