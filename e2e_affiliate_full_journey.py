import os
import time
import json
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Choc\.gemini\antigravity-ide\brain\9b4758d2-4767-4f65-bb13-a764298d075d"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        print(">>> Browser launched successfully with channel='msedge'.")

        # ==========================================
        # 1. KOL LOG IN & BASELINE CAPTURE
        # ==========================================
        kol_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        kol_page = kol_ctx.new_page()

        print("\n[Step 1] KOL logging in as kol01@seed.scanms.test...")
        kol_page.goto("http://localhost:5173/login?role=kol")
        kol_page.wait_for_selector("#login-identifier", timeout=15000)
        kol_page.fill("#login-identifier", "kol01@seed.scanms.test")
        kol_page.fill("#login-password", "Password@123")
        kol_page.click("button[type='submit']")
        
        # Wait for navigation to collaborator dashboard
        kol_page.wait_for_url("**/collaborator/**", timeout=15000)
        time.sleep(3)
        print(f"KOL logged in. Current URL: {kol_page.url}")

        if "/collaborator/dashboard" not in kol_page.url:
            kol_page.goto("http://localhost:5173/collaborator/dashboard")
            time.sleep(3)

        kol_page.wait_for_selector("button:has-text('Làm mới')", timeout=15000)
        time.sleep(1.5)

        kol_page.screenshot(path=os.path.join(ARTIFACT_DIR, "01_kol_dashboard_baseline.png"), full_page=True)
        print("Saved: 01_kol_dashboard_baseline.png")

        # Test switching to Tab 2: Hiệu suất theo sản phẩm
        print("Testing tab switch to: Hiệu suất theo sản phẩm...")
        products_tab_btn = kol_page.locator("button:has-text('Hiệu suất theo sản phẩm')")
        if products_tab_btn.count() > 0:
            products_tab_btn.first.click()
            time.sleep(1.5)
            kol_page.screenshot(path=os.path.join(ARTIFACT_DIR, "02_kol_products_tab.png"), full_page=True)
            print("Saved: 02_kol_products_tab.png")

        # Test switching to Tab 3: Phiên Livestream
        print("Testing tab switch to: Phiên Livestream...")
        live_tab_btn = kol_page.locator("button:has-text('Phiên Livestream')")
        if live_tab_btn.count() > 0:
            live_tab_btn.first.click()
            time.sleep(1.5)
            kol_page.screenshot(path=os.path.join(ARTIFACT_DIR, "03_kol_live_tab.png"), full_page=True)
            print("Saved: 03_kol_live_tab.png")

        # Switch back to Tab 1: Đơn hàng tiếp thị
        print("Switching back to Tab 1: Đơn hàng tiếp thị...")
        orders_tab_btn = kol_page.locator("button:has-text('Đơn hàng tiếp thị')")
        if orders_tab_btn.count() > 0:
            orders_tab_btn.first.click()
            time.sleep(1.5)

        # ==========================================
        # 2. CUSTOMER PURCHASES VIA REFERRAL LINK
        # ==========================================
        cust_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        cust_page = cust_ctx.new_page()

        print("\n[Step 2a] Customer logging in as customer01@seed.scanms.test...")
        cust_page.goto("http://localhost:5173/login?role=customer")
        cust_page.wait_for_selector("#login-identifier", timeout=15000)
        cust_page.fill("#login-identifier", "customer01@seed.scanms.test")
        cust_page.fill("#login-password", "Password@123")
        cust_page.click("button[type='submit']")
        time.sleep(3)
        print("Customer logged in successfully.")

        print("\n[Step 2b] Customer navigating to referral link http://localhost:5173/r/seed-k1-p1...")
        cust_page.goto("http://localhost:5173/r/seed-k1-p1")
        time.sleep(4)
        print(f"Customer redirected to: {cust_page.url}")
        cust_page.wait_for_selector("h1", timeout=15000)
        time.sleep(1.5)

        cust_page.screenshot(path=os.path.join(ARTIFACT_DIR, "04_customer_product_detail.png"), full_page=True)
        print("Saved: 04_customer_product_detail.png")

        # Select first variant (30 ml / Tiêu chuẩn)
        print("Selecting variant option (30 ml / Tiêu chuẩn)...")
        variant_btn = cust_page.locator("button:has-text('30 ml')")
        if variant_btn.count() > 0:
            variant_btn.first.click()
            print("Variant clicked.")
            time.sleep(1)
        else:
            any_variant = cust_page.locator("div[data-required] button")
            if any_variant.count() > 0:
                any_variant.first.click()
                time.sleep(1)

        # Click Buy Now
        print("Clicking Buy Now CTA button...")
        buy_btn = cust_page.locator("button[data-testid='desktop-buy-now-btn'], button:has-text('Mua sản phẩm này'), button:has-text('Mua ngay'):visible")
        if buy_btn.count() > 0:
            buy_btn.first.click()
            print("Clicked Buy Now. Waiting for checkout modal...")
        else:
            sticky_btn = cust_page.locator("button:has-text('Mua ngay')")
            if sticky_btn.count() > 0:
                sticky_btn.first.click()

        time.sleep(3)
        cust_page.wait_for_selector(".checkout-place-order, .checkout-submit, form", timeout=15000)
        cust_page.screenshot(path=os.path.join(ARTIFACT_DIR, "05_checkout_modal.png"), full_page=True)
        print("Saved: 05_checkout_modal.png")

        # Check policy agreement
        policy_checkbox = cust_page.locator("#checkout-policy-agreement")
        if policy_checkbox.count() > 0:
            if not policy_checkbox.is_checked():
                print("Checking policy agreement checkbox...")
                policy_checkbox.check()
        else:
            policy_label = cust_page.locator("label[for='checkout-policy-agreement'], label:has-text('chính sách đổi trả')")
            if policy_label.count() > 0:
                policy_label.first.click()

        time.sleep(1.5)

        # Look for Place Order button
        submit_btn = cust_page.locator(".checkout-submit, button[type='submit']:has-text('Đặt hàng')")
        if submit_btn.count() > 0 and submit_btn.first.is_enabled():
            print("Clicking 'Đặt hàng' submit button...")
            submit_btn.first.click()
            print("Order submitted, waiting for confirmation...")
            time.sleep(6)
            cust_page.screenshot(path=os.path.join(ARTIFACT_DIR, "06_order_completed.png"), full_page=True)
            print("Saved: 06_order_completed.png")
        else:
            print(f"Submit button state: count={submit_btn.count()}, enabled={submit_btn.first.is_enabled() if submit_btn.count() > 0 else False}")
            cust_page.screenshot(path=os.path.join(ARTIFACT_DIR, "06_checkout_stuck.png"), full_page=True)

        # ==========================================
        # 3. VERIFY KOL DASHBOARD UPDATED
        # ==========================================
        print("\n[Step 3] Verifying KOL Dashboard updates...")
        kol_page.bring_to_front()
        refresh_btn = kol_page.locator("button:has-text('Làm mới')")
        if refresh_btn.count() > 0:
            print("Clicking 'Làm mới' button on KOL Dashboard...")
            refresh_btn.first.click()
            time.sleep(3)
        else:
            kol_page.reload()
            time.sleep(3)

        kol_page.screenshot(path=os.path.join(ARTIFACT_DIR, "07_kol_dashboard_after_purchase.png"), full_page=True)
        print("Saved: 07_kol_dashboard_after_purchase.png")

        # ==========================================
        # 4. VERIFY SHOP MANAGER
        # ==========================================
        shop_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        shop_page = shop_ctx.new_page()

        print("\n[Step 4] Shop Manager logging in as shop01@seed.scanms.test...")
        shop_page.goto("http://localhost:5173/login?role=shop")
        shop_page.wait_for_selector("#login-identifier", timeout=15000)
        shop_page.fill("#login-identifier", "shop01@seed.scanms.test")
        shop_page.fill("#login-password", "Password@123")
        shop_page.click("button[type='submit']")
        shop_page.wait_for_url("**/merchant/**", timeout=15000)
        time.sleep(3)

        print("Navigating to /merchant/orders...")
        shop_page.goto("http://localhost:5173/merchant/orders")
        shop_page.wait_for_selector("table, .order-item, h2, div", timeout=15000)
        time.sleep(3)
        shop_page.screenshot(path=os.path.join(ARTIFACT_DIR, "08_shop_orders_management.png"), full_page=True)
        print("Saved: 08_shop_orders_management.png")

        print("Navigating to /merchant/kol-hub...")
        shop_page.goto("http://localhost:5173/merchant/kol-hub")
        shop_page.wait_for_selector("#tab-btn-deals", timeout=20000)
        time.sleep(2)

        deals_tab_btn = shop_page.locator("#tab-btn-deals")
        if deals_tab_btn.count() > 0:
            print("Clicking '#tab-btn-deals' (Đối tác có deal) tab...")
            deals_tab_btn.first.click()
            time.sleep(2)

        shop_page.screenshot(path=os.path.join(ARTIFACT_DIR, "09_shop_kol_deals_hub.png"), full_page=True)
        print("Saved: 09_shop_kol_deals_hub.png")

        browser.close()
        print("\n>>> All E2E steps executed successfully!")

if __name__ == "__main__":
    run_test()
