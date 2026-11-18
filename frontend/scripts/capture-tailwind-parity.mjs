// Opt-in visual audit: NODE_OPTIONS="--import ./scripts/capture-tailwind-parity.mjs"
// Records resolved styles alongside screenshots without changing test behavior.
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
const directory = process.env.TAILWIND_STYLE_CAPTURE;
const isolatedBrowser = process.env.SCANMS_UI_TEST_NO_SANDBOX === '1';
if (directory || isolatedBrowser) {
  if (directory) await mkdir(directory, { recursive: true });
  const launch = puppeteer.launch.bind(puppeteer);
  puppeteer.launch = async (...args) => {
    const [options = {}] = args;
    const browser = await launch(isolatedBrowser ? { ...options, args: [...(options.args || []), '--no-sandbox'] } : options);
    if (!directory) return browser;
    const newPage = browser.newPage.bind(browser);
    browser.newPage = async (...pageArgs) => {
      const page = await newPage(...pageArgs);
      const screenshot = page.screenshot.bind(page);
      page.screenshot = async (options = {}) => {
        if (options.path) {
          await page.evaluate(async () => {
            await document.fonts.ready;
            // Compare settled styles, not different frames of a transition.
            await new Promise(resolve => setTimeout(resolve, 350));
            for (const animation of document.getAnimations()) {
              if (animation.effect?.getTiming().iterations !== Infinity) {
                try { animation.finish(); } catch { /* Pending/zero-length effect. */ }
              }
            }
          });
          const styles = await page.evaluate(() => [...document.body.querySelectorAll('*')].map(element => {
            const style = getComputedStyle(element);
            const values = Object.fromEntries([...style].filter(key => !key.startsWith('--')).map(key => [key, style.getPropertyValue(key)]));
            return { tag: element.tagName, className: element.getAttribute('class'), values };
          }));
          await writeFile(join(directory, `${basename(String(options.path))}.json`), JSON.stringify(styles));
        }
        return screenshot(options);
      };
      return page;
    };
    return browser;
  };
}
