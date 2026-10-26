import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\Choc\.gemini\antigravity-ide\brain\9b4758d2-4767-4f65-bb13-a764298d075d"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})
        page = await context.new_page()

        page.on("console", lambda msg: print(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: print(f"[PAGE ERROR] {err}"))

        # 1. Test Merchant Commission Statement
        print("1. Logging in as Shop Manager (shop01@seed.scanms.test)...")
        await page.goto("http://localhost:5173/login?role=shop")
        await page.wait_for_selector("#login-identifier", timeout=15000)
        await page.fill("#login-identifier", "shop01@seed.scanms.test")
        await page.fill("#login-password", "Password@123")
        await page.click("button[type='submit']")
        await page.wait_for_url("**/merchant/**", timeout=15000)
        await page.wait_for_timeout(1500)

        print("2. Checking /merchant/payouts (Clean Commission Statement)...")
        await page.goto("http://localhost:5173/merchant/payouts")
        await page.wait_for_timeout(3000)
        print("Current page URL:", page.url)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "v3_merchant_commission_statements.png"))

        # 2. Test KOL Consolidated Wallet
        print("3. Logging in as KOL (kol01@seed.scanms.test)...")
        await page.goto("http://localhost:5173/login?role=kol")
        await page.wait_for_selector("#login-identifier", timeout=15000)
        await page.fill("#login-identifier", "kol01@seed.scanms.test")
        await page.fill("#login-password", "Password@123")
        await page.click("button[type='submit']")
        await page.wait_for_url("**/collaborator/**", timeout=15000)
        await page.wait_for_timeout(1500)

        print("4. Checking /collaborator/wallet (Consolidated Single Wallet)...")
        await page.goto("http://localhost:5173/collaborator/wallet")
        await page.wait_for_selector("#kol-wallet-page", timeout=10000)
        await page.wait_for_timeout(1500)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "v3_kol_consolidated_wallet.png"))

        # 3. Test Admin Centralized Financial Clearing Hub
        print("5. Logging in as System Admin (admin@seed.scanms.test)...")
        await page.goto("http://localhost:5173/login?role=admin")
        await page.wait_for_selector("#login-identifier", timeout=15000)
        await page.fill("#login-identifier", "admin@seed.scanms.test")
        await page.fill("#login-password", "Password@123")
        await page.click("button[type='submit']")
        await page.wait_for_url("**/admin/**", timeout=15000)
        await page.wait_for_timeout(1500)

        print("6. Checking /admin/payouts (Centralized Clearing Hub)...")
        await page.goto("http://localhost:5173/admin/payouts")
        await page.wait_for_selector("#admin-finance-payouts-page", timeout=10000)
        await page.wait_for_timeout(1500)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "v3_admin_centralized_payouts.png"))

        # Check Escrow tab in Admin
        print("7. Checking Escrow Tab in /admin/payouts...")
        await page.click("button:has-text('Ký quỹ & Thu phí Sàn')")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "v3_admin_escrow_overview.png"))

        print("All financial flow E2E tests finished successfully!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
