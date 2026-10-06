import asyncio
import json
import urllib.request
from playwright.async_api import async_playwright

def get_auth_token():
    req = urllib.request.Request(
        'http://localhost:3000/api/auth/login',
        data=json.dumps({'email': 'customer@scanms.vn', 'password': 'Password@123'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        return data.get('data') or data

async def snap():
    auth_data = get_auth_token()
    token = auth_data.get('accessToken')
    user = auth_data.get('user')
    print(f"Logged in user: {user.get('email')}, token len: {len(token)}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, channel='chrome')
        context = await browser.new_context(viewport={'width': 1400, 'height': 900})
        page = await context.new_page()
        
        # Navigate to domain first to set localStorage
        await page.goto('http://localhost:5173/login', wait_until='networkidle')
        await page.evaluate(f"""
            localStorage.setItem('token', '{token}');
            localStorage.setItem('user', JSON.stringify({json.dumps(user)}));
            localStorage.setItem('scanms-current-role', 'customer');
            localStorage.setItem('scanms-active-workspace', 'customer');
        """)
        
        # 1. Partner Upgrade Tab
        await page.goto('http://localhost:5173/customer/upgrade', wait_until='networkidle')
        await page.wait_for_timeout(1500)
        await page.screenshot(path='test_screenshots/refined_upgrade_tab.png')
        print('Saved refined_upgrade_tab.png')
        
        # 2. Wallet Tab
        await page.goto('http://localhost:5173/customer/portal?tab=wallet', wait_until='networkidle')
        await page.wait_for_timeout(1500)
        await page.screenshot(path='test_screenshots/refined_wallet_tab.png')
        print('Saved refined_wallet_tab.png')
        
        # 3. Security Tab
        await page.goto('http://localhost:5173/customer/portal?tab=security', wait_until='networkidle')
        await page.wait_for_timeout(1500)
        await page.screenshot(path='test_screenshots/refined_security_tab.png')
        print('Saved refined_security_tab.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(snap())
