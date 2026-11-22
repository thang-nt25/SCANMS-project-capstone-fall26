import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';

const base = process.env.MARKETPLACE_READONLY_URL;
const executablePath = process.env.MOBILE_LAYOUT_BROWSER;
test('local mobile marketplace displays products returned by the real API', {
  skip: !base || !executablePath, timeout: 60000,
}, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 344, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on('request', req => {
      // This smoke test must never create an order, click event or other mutation.
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method())) return void req.abort();
      void req.continue();
    });
    const responsePromise = page.waitForResponse(res => res.url().includes('/api/public/products?') && res.request().method() === 'GET');
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    const response = await responsePromise;
    assert.equal(response.status(), 200);
    assert.equal(new URL(response.url()).origin, new URL(base).origin, 'API must use the same-origin dev proxy');
    const body = await response.json();
    const data = body.data ?? body;
    assert.ok(data.items.length > 0, 'requires existing published products');
    await page.waitForFunction(() => document.querySelectorAll('#catalog-section article').length > 0);
    const result = await page.evaluate(() => ({ count: document.querySelectorAll('#catalog-section article').length,
      error: document.body.innerText.includes('Chưa tải được sản phẩm'),
      overflow: document.documentElement.scrollWidth > innerWidth + 1 }));
    assert.equal(result.count, data.items.length);
    assert.equal(result.error, false);
    assert.equal(result.overflow, false);
    for (const width of [320, 344, 390, 412, 1440]) {
      await page.setViewport({width, height:800, isMobile:width<640, hasTouch:width<640});
      await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      await page.waitForSelector('.featured-store-rail');
      await page.$eval('#featured-stores',el=>el.scrollIntoView());
      // Hidden loop duplicates are lazy images and must not be awaited on phones.
      await page.evaluate(async()=>{await document.fonts.ready; await Promise.race([
        Promise.all([...document.querySelectorAll('.featured-store-group:not([aria-hidden]) img')].map(i=>i.decode().catch(()=>{}))),
        new Promise(r=>setTimeout(r,2000)),
      ]);});
      const layout = await page.evaluate(() => {
        const rail = document.querySelector('.featured-store-rail');
        const card = rail?.querySelector('.featured-store-group:not([aria-hidden]) .featured-store-card');
        const form = document.querySelector('#tracking-section form');
        return {overflow:document.documentElement.scrollWidth>innerWidth+1, railWidth:rail?.clientWidth,
          cardWidth:card?.getBoundingClientRect().width, padding:card?getComputedStyle(card).paddingLeft:null,
          formDisplay:getComputedStyle(form).display, formBottom:form.getBoundingClientRect().bottom};
      });
      assert.equal(layout.overflow,false, `${width}px overflow`);
      if(width<640) {
        assert.ok(Math.abs(layout.railWidth-layout.cardWidth)<2, 'store card fills mobile rail');
        assert.equal(layout.formDisplay,'grid');
        const initial=await page.$eval('.featured-store-rail',r=>({left:r.scrollLeft,cycle:r.firstElementChild.getBoundingClientRect().width}));
        await page.click('[aria-label="Gian hàng tiếp theo"]');
        await new Promise(r=>setTimeout(r,350));
        const offset=await page.$eval('.featured-store-rail',r=>({left:r.scrollLeft,width:r.clientWidth}));
        const expected=initial.cycle+((initial.left-initial.cycle+offset.width+12)%initial.cycle);
        assert.ok(Math.abs(offset.left-expected)<3,'next button advances one complete store with looping');
      } else {
        assert.equal(layout.padding,'20px','desktop store spacing preserved');
        assert.equal(layout.formDisplay,'flex','desktop tracking layout preserved');
      }
      if(width===390) {
        for (const [selector,name] of [['#featured-stores','stores'],['#tracking-section','tracking'],['footer','footer']]) {
          const el=await page.$(selector); await el.screenshot({path:`artifacts/mobile-layout/mobile-${name}-390.png`});
        }
      }
    }
    await page.setViewport({width:344,height:800,isMobile:true,hasTouch:true});
    await page.waitForSelector('#catalog-section article');
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
    await page.$eval('#featured-stores',el=>el.scrollIntoView());
    const readRail=()=>page.$eval('.featured-store-rail',r=>r.scrollLeft);
    const start=await readRail();
    await new Promise(r=>setTimeout(r,500));
    assert.ok(Math.abs(await readRail()-start)>3,'mobile store rail moves automatically');
    await page.$eval('.featured-store-rail',r=>r.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true})));
    const paused=await readRail();
    await new Promise(r=>setTimeout(r,250));
    assert.ok(Math.abs(await readRail()-paused)<2,'touch pauses auto movement');
    await page.$eval('.featured-store-rail',r=>r.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',bubbles:true})));
    await new Promise(r=>setTimeout(r,1400));
    assert.ok(Math.abs(await readRail()-paused)>3,'auto movement resumes after touch');
    await page.$eval('#catalog-section', el => el.scrollIntoView());
    await mkdir('artifacts/mobile-layout', { recursive: true });
    await page.screenshot({ path: 'artifacts/mobile-layout/marketplace-products-live-344.png' });
    console.log(`Real API: ${result.count} products rendered at 344px`);
  } finally { await browser.close(); }
});
