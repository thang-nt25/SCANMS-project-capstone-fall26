import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const base = process.env.GHN_UI_TEST_URL;
test('exchange shipment resolves saved localities, edits in a modal and reconciles a pending booking without duplicate writes', { skip: !base, timeout: 30000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, timeout: 10000, args: ['--no-sandbox'] });
  const warehouse = {name:'Bộ phận kho vận – Vela Store',phone:'0901234567',address:'Đường số 2',provinceName:'Thành phố Hà Nội',districtName:'Quận Ba Đình',wardName:'Phường Phúc Xá'};
  const request = {id:'exchange-fixture',status:'EXCHANGE_PENDING',pickupProviderMode:'mock',pickupSimulationEnabled:true,events:[],imageUrls:[],
    order:{customerName:'Trần An',customerPhone:'0903000001',shippingAddress:'15 Lê Duẩn, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh',storeName:'Vela Store',products:[{id:'other',title:'Unselected product'}]},
    exchangeRecipient:{name:'Trần An',phone:'0903000001',address:'15 Lê Duẩn, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh',provinceName:'',districtName:'',wardName:''},
    exchangePackage:{weight:250,length:15,width:10,height:5},returnWarehouse:warehouse,
    items:[{id:'line-1',quantity:1,orderItem:{product:{title:'Kem dưỡng',imageUrl:'/assets/product-placeholder.svg'},variant:{name:'Dịu nhẹ · 50 ml'}}}],
  };
  const writes = [];
  const quotes = [];
  let failQuote = false;
  let savedRecipient;
  const errors = [];
  try {
    const page = await browser.newPage();page.setDefaultTimeout(8000);
    page.on('pageerror', error=>{if(!error.message.includes('WebSocket closed without opened')) errors.push(error.message);});
    await page.setViewport({width:1440,height:1000});
    await page.setRequestInterception(true);
    page.on('request', req=>{
      const url=new URL(req.url());
      if(url.pathname==='/exchange-fixture') return req.respond({contentType:'text/html',body:'<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/exchange-shipment.tsx"></script>'});
      if(url.hostname==='provinces.open-api.vn') {
        const data=url.pathname.includes('/p/79')?{districts:[{code:760,name:'Quận 1'}]}:url.pathname.includes('/d/760')?{wards:[{code:26734,name:'Phường Bến Nghé'}]}:url.pathname.includes('/p/1')?{districts:[{code:1,name:'Quận Ba Đình'}]}:url.pathname.includes('/d/1')?{wards:[{code:1,name:'Phường Phúc Xá'}]}:[{code:1,name:'Thành phố Hà Nội'},{code:79,name:'Thành phố Hồ Chí Minh'}];
        return req.respond({headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify(data)});
      }
      if(url.pathname.includes('/returns/exchange-fixture')) {
        const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':req.headers()['access-control-request-headers']||'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
        if(req.method()==='OPTIONS') return req.respond({status:204,headers});
        if(req.method()==='GET') return req.respond({headers,contentType:'application/json',body:JSON.stringify({data:request})});
        if(url.pathname.endsWith('/exchange-quote')) {
          const input=JSON.parse(req.postData()); quotes.push(input);
          if(failQuote) return req.respond({status:502,headers,contentType:'application/json',body:JSON.stringify({message:'GHN unavailable'})});
          return setTimeout(()=>void req.respond({headers,contentType:'application/json',body:JSON.stringify({data:{amount:input.weight===750?42500:32500,currency:'VND',source:'GHN_TEST',estimated:true,charged:false,quotedAt:new Date().toISOString(),validUntil:new Date(Date.now()+300000).toISOString()}})}),150);
        }
        writes.push({path:url.pathname,body:JSON.parse(req.postData())});
        if(writes.length===1) {
          savedRecipient=writes[0].body;request.exchangeBooking={pending:true,recipient:savedRecipient,warehouse};
          return setTimeout(()=>void req.respond({status:502,headers,contentType:'application/json',body:JSON.stringify({message:'Đang đối chiếu vận đơn đã gửi'})}),200);
        }
        request.status='EXCHANGE_SHIPPED';request.exchangeBooking=null;request.exchangeDelivery={recipient:savedRecipient,warehouse};
        request.exchangeShipment={carrierName:'SCANMS Demo',trackingNumber:'SIMX-QA-001',provider:'MOCK',providerStatus:'ready_to_pick',feeAmount:null};
        return setTimeout(()=>void req.respond({headers,contentType:'application/json',body:JSON.stringify({data:request})}),200);
      }
      if(url.origin!==origin) return req.abort();
      return req.continue();
    });
    await page.goto(origin+'/exchange-fixture',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!document.querySelector('.exchange-create-shipment')?.disabled);
    assert.equal(await page.$('.exchange-card select'),null);
    await page.waitForFunction(()=>document.querySelector('.exchange-freight')?.textContent.includes('32.500'));
    assert.match(await page.$eval('.exchange-freight',el=>el.textContent),/Cước tạm tính.*32.500.*GHN/);
    assert.equal(await page.$eval('.exchange-freight small',el=>el.textContent),'GHN');
    await page.$eval('.exchange-parcel input',el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'750');el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.waitForFunction(()=>!document.querySelector('.exchange-freight')?.textContent.includes('32.500'));
    await page.waitForFunction(()=>document.querySelector('.exchange-freight')?.textContent.includes('42.500'));
    failQuote=true;
    await page.$eval('.exchange-parcel input',el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'751');el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.waitForFunction(()=>document.querySelector('.exchange-freight')?.textContent.includes('Chưa lấy được cước'));
    assert.ok(!(await page.$eval('.exchange-freight',el=>el.textContent)).includes('42.500'));
    failQuote=false;
    await page.click('.exchange-freight button');
    await page.waitForFunction(()=>document.querySelector('.exchange-freight')?.textContent.includes('32.500'));
    await page.$eval('.exchange-parcel input',el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'250');el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.waitForFunction(()=>document.querySelector('.exchange-freight')?.textContent.includes('32.500'));
    assert.match(await page.$eval('.exchange-products',el=>el.textContent),/Kem dưỡng.*50 ml.*Số lượng: 1/);
    assert.ok(!(await page.$eval('.exchange-products',el=>el.textContent)).includes('Unselected product'));
    assert.ok(!(await page.$eval('.exchange-card',el=>el.textContent)).includes('Ghi nhận vận đơn có sẵn'));
    const positions=await page.$$eval('.exchange-addresses > fieldset',els=>els.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,width:r.width};}));
    assert.equal(positions[0].top,positions[1].top);assert.ok(Math.abs(positions[0].width-positions[1].width)<1);
    assert.equal(await page.$eval('.exchange-create-shipment',el=>getComputedStyle(el).backgroundColor),'rgb(197, 155, 88)');
    await page.screenshot({path:join(tmpdir(),'scanms-exchange-shipment-desktop.png')});
    await page.click('.exchange-addresses > fieldset:last-child button');
    await page.waitForFunction(()=>document.querySelector('[data-address-ward]')?.value==='26734');
    assert.equal(await page.$eval('[role="dialog"]',el=>el.getBoundingClientRect().width),640);
    await page.$eval('input[autocomplete="street-address"]',el=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(el,'25 Lê Duẩn');el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.keyboard.press('Escape');
    assert.match(await page.$eval('.exchange-addresses',el=>el.textContent),/15 Lê Duẩn/);
    await page.click('.exchange-addresses > fieldset:last-child button');
    await page.waitForFunction(()=>!document.querySelector('.modal-footer .pickup-primary').disabled);
    await page.$eval('input[autocomplete="street-address"]',el=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(el,'25 Lê Duẩn');el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.click('.modal-footer .pickup-primary');
    assert.match(await page.$eval('.exchange-addresses',el=>el.textContent),/25 Lê Duẩn/);
    await page.setViewport({width:390,height:844});
    assert.equal(await page.$eval('.exchange-card',el=>el.scrollWidth<=el.clientWidth),true);
    await page.screenshot({path:join(tmpdir(),'scanms-exchange-shipment-mobile.png')});
    await page.$eval('.exchange-create-shipment',el=>{el.click();el.click();});
    await page.waitForFunction(()=>document.querySelector('.exchange-create-shipment')?.textContent==='Thử lại vận đơn hàng đổi');
    assert.equal(writes.length,1);
    assert.equal(writes[0].body.provinceName,'Thành phố Hồ Chí Minh');
    assert.equal(writes[0].body.districtName,'Quận 1');
    assert.equal(writes[0].body.wardName,'Phường Bến Nghé');
    assert.equal(writes[0].body.weight,250);
    assert.equal(writes[0].body.address,'25 Lê Duẩn, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh');
    assert.equal(await page.$eval('.exchange-addresses > fieldset:last-child button',el=>el.matches(':disabled')),true);
    await page.$eval('.exchange-create-shipment',el=>{el.click();el.click();});
    await page.waitForSelector('[aria-label="Vận đơn giao hàng đổi"]');
    assert.equal(writes.length,2);assert.deepEqual(writes[0].body,writes[1].body);
    assert.equal(await page.$('[aria-label="Tạo vận đơn hàng thay thế"]'),null);
    assert.match(await page.$eval('.pickup-waybill',el=>el.textContent),/Vận chuyển SCANMS.*SIMX-QA-001/);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForSelector('[aria-label="Vận đơn giao hàng đổi"]');
    assert.match(await page.$eval('.pickup-success-addresses',el=>el.textContent),/25 Lê Duẩn/);
    await page.waitForFunction(()=>document.querySelector('.exchange-freight')?.textContent.includes('32.500'));
    assert.match(await page.$eval('.exchange-shipment-summary',el=>el.textContent),/250 g.*15 × 10 × 5 cm.*Cước tạm tính.*32.500/);
    assert.ok(quotes.some(input=>input.weight===750));
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
