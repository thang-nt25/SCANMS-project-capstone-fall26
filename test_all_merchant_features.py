import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\Choc\.gemini\antigravity-ide\brain\9b4758d2-4767-4f65-bb13-a764298d075d"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})
        page = await context.new_page()

        print("1. Logging in as Shop Manager...")
        await page.goto("http://localhost:5173/login?role=shop")
        await page.wait_for_selector("#login-identifier", timeout=15000)
        await page.fill("#login-identifier", "shop01@seed.scanms.test")
        await page.fill("#login-password", "Password@123")
        await page.click("button[type='submit']")
        await page.wait_for_url("**/merchant/**", timeout=15000)
        await page.wait_for_timeout(2000)

        # 1. Test Promotions Hub - Coupons Tab
        print("2. Checking /merchant/promotions (Coupons)...")
        await page.goto("http://localhost:5173/merchant/promotions?tab=coupons")
        await page.wait_for_selector("#shop-promotions-hub", timeout=10000)
        await page.wait_for_timeout(1500)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "v2_promotions_coupons_clean.png"))

        # 2. Test Promotions Hub - Campaigns Tab
        print("3. Checking /merchant/promotions (Campaigns)...")
        await page.goto("http://localhost:5173/merchant/promotions?tab=campaigns")
        await page.wait_for_selector("#shop-campaigns-page", timeout=10000)
        try:
            await page.wait_for_selector("div[id^='campaign-']", timeout=8000)
        except Exception:
            pass
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "v2_promotions_campaigns_clean.png"))

        # Test in-place KOL invite modal
        invite_btn = page.locator("button[id^='btn-invite-']").first
        if await invite_btn.is_visible():
            print("   Opening in-place Invite KOL Modal...")
            await invite_btn.click()
            await page.wait_for_selector("#btn-close-invite", timeout=5000)
            await page.wait_for_timeout(1500)
            await page.screenshot(path=os.path.join(ARTIFACT_DIR, "v2_in_place_kol_invite_modal.png"))
            await page.click("#btn-close-invite")
            await page.wait_for_timeout(500)

        # 3. Test Promotions Hub - Exclusive Deals Tab
        print("4. Checking /merchant/promotions (Exclusive Deals)...")
        await page.goto("http://localhost:5173/merchant/promotions?tab=exclusive-deals")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "v2_exclusive_deals_tab.png"))

        # 4. Test Orders Management Page (with both sub-tabs)
        print("5. Checking /merchant/orders...")
        await page.goto("http://localhost:5173/merchant/orders")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "v2_merchant_orders_commercial.png"))

        # Click Samples sub-tab
        samples_tab_btn = page.locator("button:has-text('Hàng mẫu KOL')").first
        if await samples_tab_btn.is_visible():
            print("   Clicking 'Hàng mẫu KOL' sub-tab...")
            await samples_tab_btn.click()
            await page.wait_for_timeout(1500)
            await page.screenshot(path=os.path.join(ARTIFACT_DIR, "v2_merchant_orders_samples.png"))

        # 5. Test Merchant Revenue Wallet Page
        print("6. Checking /merchant/wallet...")
        await page.goto("http://localhost:5173/merchant/wallet")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "v2_merchant_revenue_wallet.png"))

        # Open Withdraw Modal
        withdraw_btn = page.locator("button:has-text('Rút tiền về ngân hàng')").first
        if await withdraw_btn.is_visible():
            print("   Opening Withdrawal Modal...")
            await withdraw_btn.click()
            await page.wait_for_timeout(1000)
            await page.screenshot(path=os.path.join(ARTIFACT_DIR, "v2_merchant_withdraw_modal.png"))
            # Close modal
            close_btn = page.locator("button:has-text('Hủy')").first
            if await close_btn.is_visible():
                await close_btn.click()

        # 6. Test Merchant Payouts Page (Check UUID bug resolved)
        print("7. Checking /merchant/payouts...")
        await page.goto("http://localhost:5173/merchant/payouts")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "v2_merchant_payouts_resolved.png"))

        print("All tests completed successfully!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
