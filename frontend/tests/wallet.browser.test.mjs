import test from "node:test";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";

const testUrl = process.env.WITHDRAWAL_UI_TEST_URL;
const browserPath = process.env.WITHDRAWAL_UI_BROWSER_PATH;

test(
  "wallet UI validates money, prevents duplicate clicks and shows withdrawal history",
  {
    skip: !testUrl || !browserPath,
  },
  async () => {
    const url = new URL(testUrl);
    assert.ok(
      ["127.0.0.1", "localhost"].includes(url.hostname),
      "Only test a local frontend",
    );
    const browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: true,
    });
    try {
      const page = await browser.newPage();
      await page.setCacheEnabled(false);
      await page.setViewport({ width: 1365, height: 1000 });
      await page.evaluateOnNewDocument(() => {
        localStorage.setItem("token", "isolated-browser-test-token");
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: "test-kol",
            role: "COLLABORATOR",
            fullName: "Test KOL",
          }),
        );
        localStorage.setItem("scanms-current-role", "kol");
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.qaCopied = value; } } });
        const nativeInterval = window.setInterval.bind(window);
        window.setInterval = (callback, delay, ...args) => {
          if (delay === 30000) window.qaWalletPoll = () => callback(...args);
          return nativeInterval(callback, delay, ...args);
        };
      });
      const summary = {
        stores: [
          {
            storeId: "38b2b124-12d2-47f8-881f-c3107ee71084",
            storeName: "Test Shop",
            availableBalance: "500000.31",
            pendingBalance: "900000.00",
            isActive: true,
          },
        ],
        unallocatedAvailableBalance: "0.00",
        unallocatedPendingBalance: "0.00",
        availableBalance: "500000.31",
        pendingBalance: "900000.00",
        minimumWithdrawalAmount: "200000.00",
        withdrawalTaxPolicy: { threshold: "2000000.00", rate: "0.10" },
        kycStatus: "VERIFIED",
        canWithdraw: true,
        bankAccount: {
          bankName: "Test Bank",
          maskedAccountNumber: "••••6789",
          accountName: "TEST KOL",
        },
      };
      let withdrawals = [];
      let postCount = 0;
      let ledgerPaging = false;
      let ledgerReads = 0;
      let failSync = false;
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        void (async () => {
          const requestUrl = new URL(request.url());
          if (requestUrl.pathname === '/src/services/chat-socket.service.ts') {
            await request.respond({ status: 200, contentType: 'application/javascript', body: 'const s={on(){return this},off(){return this},emit(){},connect(){return this}};export const getChatSocket=()=>s;export const isChatSocketAuthenticated=()=>false;export const disconnectChatSocket=()=>{};' });
            return;
          }
          if (requestUrl.pathname.startsWith("/api/")) {
            const headers = {
              "Access-Control-Allow-Origin": url.origin,
              "Access-Control-Allow-Credentials": "true",
              "Access-Control-Allow-Headers": "Authorization, Content-Type, x-skip-cache",
              "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            };
            if (request.method() === "OPTIONS") {
              await request.respond({ status: 204, headers });
              return;
            }
            let data = {};
            if (requestUrl.pathname === "/api/auth/me") {
              data = {
                id: "test-kol",
                role: "COLLABORATOR",
                fullName: "Test KOL",
              };
            } else if (requestUrl.pathname === "/api/wallets/me") {
              data = summary;
            } else if (
              requestUrl.pathname === "/api/wallets/withdrawals" &&
              request.method() === "POST"
            ) {
              const body = JSON.parse(request.postData());
              assert.equal(body.amount, "200000.10");
              assert.deepEqual(Object.keys(body), ["amount", "storeId"]);
              assert.equal(body.storeId, summary.stores[0].storeId);
              postCount++;
              summary.availableBalance = "300000.21";
              summary.stores[0].availableBalance = "300000.21";
              const withdrawal = {
                id: "ui-test-request",
                storeId: body.storeId,
                store: { name: "Test Shop" },
                batchId: null,
                amount: body.amount,
                taxAmount: "0.00",
                netAmount: body.amount,
                taxCalculated: true,
                status: "PENDING",
                createdAt: new Date().toISOString(),
                processedAt: null,
              };
              withdrawals = [withdrawal];
              data = {
                message: "Tạo yêu cầu rút tiền thành công, đang chờ xử lý",
                request: withdrawal,
                availableBalance: summary.availableBalance,
              };
            } else if (requestUrl.pathname === "/api/wallets/me/ledger") {
              ledgerReads++;
              if (failSync) {
                await request.respond({ status: 503, contentType: 'application/json', headers, body: JSON.stringify({ message: 'Mock sync unavailable' }) });
                return;
              }
              const requestedPage = Number(requestUrl.searchParams.get('page') || 1);
              data = {
                entries: withdrawals.map((withdrawal) => ({
                  id: ledgerPaging && requestedPage === 2 ? 'ledger-older-page' : "ledger-" + withdrawal.id,
                  transactionType: "PAYOUT_WITHDRAW",
                  balanceBucket: "AVAILABLE",
                  amount: "-200000.10",
                  balanceBefore: "500000.31",
                  balanceAfter: "300000.21",
                  referenceId: ledgerPaging && requestedPage === 2 ? 'older-page-reference' : withdrawal.id,
                  referenceType: ledgerPaging && requestedPage === 2 ? 'COMMISSION' : 'PAYOUT_REQUEST',
                  referenceDetails: { storeName: 'Test Shop', orderId: ledgerPaging && requestedPage === 2 ? 'order-full-id' : null, orderCode: ledgerPaging && requestedPage === 2 ? 'SCANMS-ORDER-123' : null, period: null },
                  createdAt: withdrawal.createdAt,
                })),
                total: ledgerPaging ? 11 : withdrawals.length,
                page: requestedPage,
                limit: 10,
              };
            } else if (requestUrl.pathname === "/api/wallets/withdrawals") {
              data = {
                requests: withdrawals,
                total: withdrawals.length,
                page: 1,
                limit: 10,
              };
            }
            await request.respond({
              status: 200,
              contentType: "application/json",
              headers,
              body: JSON.stringify({ success: true, data }),
            });
            return;
          }
          // Do not contact external services or the actual project backend.
          if (requestUrl.origin === url.origin) await request.continue();
          else await request.abort();
        })();
      });

      await page.goto(`${url.origin}/collaborator/wallet`, {
        waitUntil: "networkidle0",
      });
      await page.waitForFunction(() => {
        const input = document.querySelector("#withdrawal-amount");
        return input && !input.disabled;
      });
      await page.type("#withdrawal-amount", "100000");
      await page.click('form button[type="submit"]');
      await page.waitForFunction(() =>
        document
          .querySelector('[role="alert"]')
          ?.textContent.includes("tối thiểu"),
      );
      assert.equal(postCount, 0);

      await page.focus("#withdrawal-amount");
      await page.keyboard.down("Control");
      await page.keyboard.press("KeyA");
      await page.keyboard.up("Control");
      await page.type("#withdrawal-amount", "2000000");
      assert.ok(
        (
          await page.$eval(
            '[data-testid="withdrawal-tax-preview"]',
            (element) => element.textContent,
          )
        ).includes("200.000"),
      );
      assert.ok(
        (
          await page.$eval(
            '[data-testid="withdrawal-net-preview"]',
            (element) => element.textContent,
          )
        ).includes("1.800.000"),
      );

      await page.focus("#withdrawal-amount");
      await page.keyboard.down("Control");
      await page.keyboard.press("KeyA");
      await page.keyboard.up("Control");
      await page.type("#withdrawal-amount", "200000.10");
      assert.equal(
        await page.$eval("#withdrawal-amount", (input) => input.value),
        "200000.10",
      );
      await page.$eval("form", (form) => {
        form.requestSubmit();
        form.requestSubmit();
      });
      try {
        await page.waitForFunction(
          () =>
            document
              .querySelector(".wallet-history-section tbody")
              ?.textContent.includes("ui-test-"),
          { timeout: 5000 },
        );
      } catch (error) {
        const alert = await page
          .$eval('[role="alert"]', (element) => element.textContent)
          .catch(() => "No alert");
        throw new Error(
          `Withdrawal UI did not update: postCount=${postCount}, alert=${alert}`,
          { cause: error },
        );
      }
      assert.equal(postCount, 1);
      const ledgerText = await page.$eval(
        'table[aria-label="Sổ cái tài chính"] tbody',
        (element) => element.textContent,
      );
      assert.ok(ledgerText.includes("-200.000,1"));
      assert.ok(ledgerText.includes("300.000,21"));
      assert.ok(ledgerText.includes("Yêu cầu rút tiền"));
      assert.ok(ledgerText.includes('Test Shop'));
      await page.click('button[title="Sao chép toàn bộ mã tham chiếu"]');
      assert.equal(await page.evaluate(() => window.qaCopied), 'ui-test-request');
      assert.ok(
        (
          await page.$eval('#kol-wallet-page [role="status"]', (element) => element.textContent)
        ).includes("thành công"),
      );
      assert.ok(
        (await page.$eval(".wallet-history-section tbody", (element) => element.textContent)).includes(
          "Chờ xử lý",
        ),
      );
      // Layout changes may place the pointer over the button. Check its resting
      // brand color only after leaving hover and completing the transition.
      await page.mouse.move(0, 0);
      await page.waitForFunction(
        () =>
          getComputedStyle(document.querySelector('form button[type="submit"]'))
            .backgroundColor === "rgb(197, 155, 88)",
        { timeout: 5000 },
      ).catch(async error => { throw new Error(`Unexpected withdrawal CTA: ${await page.$eval('form button[type="submit"]', el => JSON.stringify({ disabled: el.disabled, color: getComputedStyle(el).backgroundColor, className: el.className }))}`, { cause: error }); });
      assert.equal(
        await page.$eval(
          'form button[type="submit"]',
          (element) => getComputedStyle(element).backgroundColor,
        ),
        "rgb(197, 155, 88)",
      );

      ledgerPaging = true;
      await page.reload();
      await page.waitForFunction(() => document.querySelector('button[aria-label="Trang giao dịch sau"]')?.disabled === false, { timeout: 5000 }).catch(async error => {
        throw new Error(`Ledger pagination not ready: ${await page.$eval('#kol-wallet-page', el => el.textContent)}`, { cause: error });
      });
      await page.click('button[aria-label="Trang giao dịch sau"]');
      await page.waitForFunction(() => document.querySelector('table[aria-label="Sổ cái tài chính"] tbody')?.textContent.includes('older-pa'));
      assert.ok((await page.$eval('table[aria-label="Sổ cái tài chính"] tbody', el => el.textContent)).includes('Hoa hồng'));
      assert.ok((await page.$eval('table[aria-label="Sổ cái tài chính"] tbody', el => el.textContent)).includes('SCANMS-ORDER-123'));
      assert.ok(await page.$('span[title="older-page-reference"]'));

      // External changes update the current page without interrupting input or making writes.
      await page.type('#withdrawal-amount', '250000');
      const beforeFocus = ledgerReads;
      summary.pendingBalance = '950000.00';
      await page.evaluate(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('focus')); });
      await page.waitForFunction(() => document.querySelector('.kol-wallet-balances')?.textContent.includes('950.000'));
      assert.equal(ledgerReads, beforeFocus + 1, 'overlapping focus refreshes are coalesced');
      assert.equal(await page.$eval('#withdrawal-amount', el => el.value), '250000');
      assert.equal(await page.$eval('#withdrawal-amount', el => el.disabled), false);
      assert.ok(await page.$('span[title="older-page-reference"]'), 'refresh preserves ledger page two');
      assert.equal(postCount, 1);

      summary.pendingBalance = '960000.00';
      await page.evaluate(() => window.qaWalletPoll());
      await page.waitForFunction(() => document.querySelector('.kol-wallet-balances')?.textContent.includes('960.000'));
      failSync = true;
      await page.evaluate(() => window.qaWalletPoll());
      await page.waitForSelector('[data-testid="wallet-sync-error"]');
      assert.ok((await page.$eval('.kol-wallet-balances', el => el.textContent)).includes('960.000'));
      assert.equal(await page.$eval('#withdrawal-amount', el => el.value), '250000');
      failSync = false;
      await page.click('[data-testid="wallet-sync-error"] button');
      await page.waitForFunction(() => !document.querySelector('[data-testid="wallet-sync-error"]'));

      const beforeHidden = ledgerReads;
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); window.qaWalletPoll(); });
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.equal(ledgerReads, beforeHidden, 'hidden pages do not poll');
      await page.evaluate(() => { delete document.hidden; });

      // The total wallet can have money while the selected store cannot pay it.
      summary.stores[0].availableBalance = '0.00';
      summary.unallocatedAvailableBalance = summary.availableBalance;
      summary.canWithdraw = false;
      await page.reload();
      await page.waitForFunction(() => document.querySelector('form button[type="submit"]')?.disabled);
      assert.ok((await page.$eval('.kol-wallet-notice', element => element.textContent)).includes('chưa thể rút'));
      assert.ok(!(await page.$eval('.kol-wallet-balances', element => element.textContent)).includes('Đủ điều kiện rút'));
      assert.equal(postCount, 1);

      if (process.env.WALLET_SCREENSHOT_DIR) {
        await page.screenshot({path: `${process.env.WALLET_SCREENSHOT_DIR}/wallet-desktop.png`, fullPage: true});
        await page.setViewport({width: 390, height: 844});
        await page.screenshot({path: `${process.env.WALLET_SCREENSHOT_DIR}/wallet-mobile.png`, fullPage: true});
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Mobile must not overflow horizontally');
      }

      summary.kycStatus = "UNVERIFIED";
      summary.canWithdraw = false;
      await page.reload();
      await page.waitForFunction(
        () => document.querySelector('form button[type="submit"]')?.disabled && document.querySelector('.kol-wallet-transfer')?.textContent.includes('Mở hồ sơ KYC'),
      );
      await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Mở hồ sơ KYC').click());
      await page.waitForFunction(() => new URL(location.href).searchParams.get('tab') === 'kyc');
    } finally {
      await browser.close();
    }
  },
);
