import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const base = process.env.GHN_UI_TEST_URL;
test('return progress has equal desktop steps, vertical mobile steps and actual event time', { skip: !base, timeout: 30000 }, async () => {
  const origin = new URL(base).origin;
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname === '/timeline-fixture') return req.respond({ contentType: 'text/html', body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/tests/fixtures/return-timeline.tsx"></script>' });
      if (url.origin !== origin || url.pathname.startsWith('/api/')) return req.abort();
      return req.continue();
    });
    for (const width of [1200, 390]) {
      await page.setViewport({ width, height: 850 });
      await page.goto(origin + '/timeline-fixture');
      await page.waitForSelector('.return-icon-progress > li:nth-child(5)');
      const positions = await page.$$eval('.return-icon-progress > li', els => els.map(el => { const r = el.getBoundingClientRect(); return { top: r.top, width: r.width }; }));
      assert.ok(Math.max(...positions.map(p => p.width)) - Math.min(...positions.map(p => p.width)) < 1);
      assert.equal(positions[0].top === positions[1].top, width > 639);
      assert.match(await page.$eval('.return-icon-progress', el => el.textContent), /Giao hàng đổi/);
      assert.equal(await page.$$eval('.return-icon-progress time', els => els.length), 1);
      assert.equal(await page.$$eval('.return-processing-history li', els => els.length), 0);
      await page.click('.return-processing-history button');
      await page.waitForSelector('dialog.return-history-drawer[open]');
      const drawer = await page.$eval('.return-history-drawer', el => { const r=el.getBoundingClientRect(); return {right:r.right,width:r.width,height:r.height,events:el.querySelectorAll('li').length,groups:el.querySelectorAll('.return-drawer-events section').length,locked:document.body.style.overflow}; });
      assert.ok(Math.abs(drawer.right - (width + drawer.width) / 2) <= 8, JSON.stringify(drawer));
      assert.equal(drawer.width, Math.min(720, width - 32));
      assert.equal(drawer.events,10);
      assert.ok(drawer.height <= 850 * (width < 640 ? .85 : .70) + 1);
      assert.equal(drawer.locked,'hidden');
      await page.$eval('.return-drawer-events',el=>{el.scrollTop=el.scrollHeight;});
      await page.click('.return-history-footer nav button:last-child');
      assert.equal(await page.$$eval('.return-drawer-events li', els => els.length),3);
      await page.screenshot({ path: join(tmpdir(), `scanms-return-history-${width}.png`) });
      await page.keyboard.press('Escape');
      await page.waitForFunction(()=>!document.querySelector('.return-history-drawer'));
      assert.notEqual(await page.$eval('body',el=>el.style.overflow),'hidden');
      assert.equal(await page.$eval('.return-processing-history button',el=>el===document.activeElement),true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: join(tmpdir(), `scanms-return-progress-${width}.png`) });
    }
  } finally { await browser.close(); }
});
