require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const jwt = require('jsonwebtoken');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 12000 }) });
(async () => {
  let browser;
  try {
    const puppeteer = await import('../../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
    browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, timeout: 20000, args: ['--no-first-run', '--disable-extensions', '--disable-background-networking'] });
    const policy = await db.storeMonthlyRewardPolicy.findFirst({ where: { isDemo: true } });
    const store = await db.store.findUnique({ where: { id: policy.storeId } });
    const owner = await db.user.findUnique({ where: { id: store.ownerId }, select: { id: true, fullName: true, email: true, role: true, storeId: true } });
    const admin = await db.user.findFirst({ where: { role: 'SYSTEM_ADMIN', isActive: true, isDeleted: false }, select: { id: true, fullName: true, email: true, role: true } });
    const dir = path.resolve(__dirname, '../../artifacts/monthly-rewards'); fs.mkdirSync(dir, { recursive: true });
    for (const [user, url, label] of [[owner, '/merchant/commissions', 'shop'], [admin, '/admin/payouts', 'admin']]) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
      const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '2m' });
      await page.evaluateOnNewDocument(({ user, token, storeId, label }) => {
        localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('token', token);
        localStorage.setItem('scanms-current-role', label); localStorage.setItem('scanms-active-workspace', label);
        if (label === 'shop') localStorage.setItem('current_store_id', storeId);
      }, { user, token, storeId: store.id, label });
      await page.goto(`http://localhost:5173${url}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      if (label === 'admin') {
        await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Thưởng tháng')), { timeout: 25000 });
        await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Thưởng tháng')).click());
      }
      await page.waitForFunction(() => document.body.innerText.includes('53.828.080') && document.body.innerText.includes('Đã đạt KPI'), { timeout: 30000 });
      await page.screenshot({ path: path.join(dir, `${label}.png`), fullPage: true });
      if(label === 'admin') {
        await page.click('.monthly-reward-queue .monthly-reward-action-approve');
        await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"]')].some(el => el.innerText.includes('2.000.000') && el.innerText.includes('Hoàng Thảo Nhi')));
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
        await page.click('.monthly-reward-queue .monthly-reward-action-reject');
        await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"]')].some(el => el.innerText.includes('Từ chối đề nghị thưởng') && el.innerText.includes('Lý do từ chối')));
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
        console.log('admin: queue actions open the correct confirmation; no approval/rejection submitted');
        await page.click('button[aria-label="Chọn kỳ thưởng"]');
        await page.waitForSelector('[role="dialog"]');
        await page.evaluate(() => [...document.querySelector('[role="dialog"]').querySelectorAll('button')].find(b => b.textContent.trim() === 'Tháng 12').click());
        await page.waitForFunction(() => document.querySelector('.monthly-reward-policy-actions') || document.body.innerText.includes('Chưa có chính sách thưởng cho kỳ này.'), {timeout:30000});
        await page.screenshot({path:path.join(dir,'admin-policy-actions.png'),fullPage:true});
      }
      if (label === 'shop') {
        await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Tạo thưởng tháng sau')).click());
        await page.waitForSelector('[role="dialog"] [data-reward-month]');
        const month = await page.$eval('[role="dialog"] [data-reward-month]', el => el.value);
        const now = new Date(); const local = new Date(now.getTime() + 7*3600000); const next = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth()+1, 1)).toISOString().slice(0,7);
        assert.equal(month, `${next.slice(5)}/${next.slice(0,4)}`);
        await page.$eval('[role="dialog"] [data-reward-month]', el => {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          setter.call(el, '06/2028'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
        });
        assert(await page.$eval('[role="dialog"] [data-reward-month]', el => el.value === '06/2028' && el.checkValidity()));
        await page.screenshot({ path: path.join(dir, 'create-next-month.png'), fullPage: true });
        await page.evaluate(() => document.querySelector('button[aria-label="Chọn kỳ áp dụng"]').click());
        await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"]')].some(el => el.innerText.includes('Tháng 12')));
        await page.screenshot({ path: path.join(dir, 'vietnamese-month-picker.png'), fullPage: true });
        await page.evaluate(() => { const dialogs = [...document.querySelectorAll('[role="dialog"]')]; const picker = dialogs.at(-1); [...picker.querySelectorAll('button')].find(b => b.textContent.trim() === 'Tháng 7').click(); });
        assert.equal(await page.$eval('[data-reward-month]', el => el.value), '07/2028');
      }
      console.log(`${label}: KPI panel visible${label === 'shop' ? '; create form defaults to next month' : ''}`);
      await page.goto(`http://localhost:5173${url}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      if (label === 'admin') {
        await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Thưởng tháng')), { timeout: 25000 });
        await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Thưởng tháng')).click());
      }
      await page.waitForSelector('button[aria-label="Chọn kỳ thưởng"]');
      await page.waitForFunction(() => document.body.innerText.includes('53.828.080'), { timeout: 30000 });
      await page.click('button[aria-label="Chọn kỳ thưởng"]');
      await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"]')].some(el => el.innerText.includes('Tháng 10')));
      await page.evaluate(() => [...document.querySelector('[role="dialog"]').querySelectorAll('button')].find(b => b.textContent.trim() === 'Tháng 10').click());
      await page.waitForFunction(() => document.body.innerText.includes('51.871.862') && document.body.innerText.includes('Đã cộng ví'), { timeout: 30000 });
      await page.screenshot({ path: path.join(dir, `${label}-history.png`), fullPage: true });
      await page.click('button[aria-label="Chọn kỳ thưởng"]');
      await page.waitForSelector('[role="dialog"]');
      await page.evaluate(() => [...document.querySelector('[role="dialog"]').querySelectorAll('button')].find(b => b.textContent.trim() === 'Tháng 1').click());
      await page.waitForFunction(() => document.body.innerText.includes('Chưa có chính sách thưởng cho kỳ này.'), { timeout: 30000 });
      console.log(`${label}: October paid history restored; January correctly empty`);
      let monthRequests = 0;
      const track = request => { if (request.method() === 'GET' && request.url().includes('/monthly-rewards?')) monthRequests++; };
      page.on('request', track);
      const returnedAt = performance.now();
      await page.click('button[aria-label="Chọn kỳ thưởng"]');
      await page.waitForSelector('[role="dialog"]');
      await page.evaluate(() => [...document.querySelector('[role="dialog"]').querySelectorAll('button')].find(b => b.textContent.trim() === 'Tháng 11').click());
      await page.waitForFunction(() => document.body.innerText.includes('53.828.080'), { timeout: 30000 });
      assert.equal(monthRequests, 0, 'Recently viewed month should use its session snapshot');
      console.log(`${label}: returning to November ${Math.round(performance.now() - returnedAt)}ms; zero API reloads`);
      page.off('request', track);
      let focusReads = 0;
      const focusTrack = request => { if (request.method() === 'GET' && request.url().includes('/monthly-rewards?')) focusReads++; };
      page.on('request', focusTrack);
      await page.evaluate(() => { for(let i=0;i<4;i++) window.dispatchEvent(new Event('focus')); });
      await new Promise(resolve => setTimeout(resolve, label === 'shop' ? 5000 : 100));
      assert.equal(focusReads,0,'Fresh month data should not reload on repeated window focus or while idle');
      const requestStarted=page.waitForRequest(request=>request.url().includes('/monthly-rewards?'),{timeout:10000});
      const responseDone=page.waitForResponse(response=>response.url().includes('/monthly-rewards?'),{timeout:30000});
      await page.evaluate(()=>{
        const panel=document.querySelector('.monthly-rewards'); window.__rewardBlanked=false;
        window.__rewardObserver=new MutationObserver(()=>{if(!panel.innerText.includes('53.828.080')||panel.innerText.includes('Đang đối soát dữ liệu thưởng')) window.__rewardBlanked=true;});
        window.__rewardObserver.observe(panel,{childList:true,subtree:true,characterData:true});
        window.__rewardOriginalNow=Date.now; Date.now=()=>window.__rewardOriginalNow()+16000; window.dispatchEvent(new Event('focus'));
      });
      await requestStarted;
      const refreshResponse=await responseDone; assert([200,304].includes(refreshResponse.status()),`Refresh status ${refreshResponse.status()}`);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.equal(await page.evaluate(()=>window.__rewardBlanked),false,'Background refresh must never blank the rows');
      await page.evaluate(()=>{window.__rewardObserver.disconnect(); Date.now=window.__rewardOriginalNow; delete window.__rewardOriginalNow;});
      page.off('request',focusTrack);
      console.log(`${label}: no repeated focus/idle reload; expired data refresh keeps rows visible`);
      await page.close();
    }
  } catch (err) { console.error(err.message?.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]')); process.exitCode = 1; }
  finally { if (browser) await browser.close(); await db.$disconnect(); }
})();
