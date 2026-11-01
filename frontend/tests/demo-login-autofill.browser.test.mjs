import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { loadEnv } from 'vite';
import puppeteer from 'puppeteer-core';

const base = process.env.GHN_UI_TEST_URL;
const executablePath = process.env.GHN_UI_BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const env = loadEnv('development', process.cwd(), 'VITE_');

test('local login fills five roles from the actual Vite environment without submitting', {
  skip: !base || !existsSync(executablePath) || env.VITE_ENABLE_DEMO_LOGIN !== 'true', timeout: 60000,
}, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900 });
    await page.setRequestInterception(true);
    let loginCalls = 0;
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/') || url.port === '3000') {
        if (url.pathname.includes('/auth/login')) loginCalls++;
        return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
      }
      if (url.origin !== new URL(base).origin && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    await page.goto(`${base}/login?role=customer`);
    await page.waitForSelector('#login-identifier');
    for (const [role, label] of [['admin', 'Quản trị'], ['kol', 'KOL/KOC'], ['shop', 'Chủ Shop'], ['manager', 'Vận hành'], ['customer', 'Khách mua']]) {
      await page.click('button[aria-controls="login-role-options"]');
      await page.waitForSelector('#login-role-options');
      await page.evaluate(label => [...document.querySelectorAll('#login-role-options button')]
        .find(button => button.textContent.includes(label)).click(), label);
      // Use boolean assertions to keep passwords out of test output on failure.
      assert.ok(await page.$eval('#login-identifier', (el, expected) => el.value === expected, env[`VITE_DEMO_${role.toUpperCase()}_IDENTIFIER`]), `${role}: identifier mismatch`);
      assert.ok(await page.$eval('#login-password', (el, expected) => el.value === expected, env[`VITE_DEMO_${role.toUpperCase()}_PASSWORD`]), `${role}: password mismatch`);
      assert.equal(await page.$eval('#login-password', el => el.type), 'password');
    }
    await page.goto(`${base}/login?registered=email&email=new%40example.test`);
    await page.waitForSelector('#login-identifier');
    assert.equal(await page.$eval('#login-identifier', el => el.value), 'new@example.test');
    assert.equal(await page.$eval('#login-password', el => el.value), '');
    assert.equal(loginCalls, 0, 'autofill must not submit credentials automatically');
  } finally { await browser.close(); }
});
