import requests

emails = [
    'customer01@seed.scanms.test', 'customer@gmail.com', 
    'shop01@seed.scanms.test', 'shop@techstore.vn', 
    'kol01@seed.scanms.test', 'kol1@scanms.vn', 
    'manager@scanms.vn', 
    'admin@seed.scanms.test', 'admin@scanms.vn'
]
passes = ['Password@123', 'SeedTestPassword2026!', 'MatKhauDemoTuChon2026!', 'admin123', '123456']

found = []
for e in emails:
    for p in passes:
        try:
            r = requests.post('http://localhost:3000/api/auth/login', json={'username': e, 'password': p}, timeout=3)
            if r.status_code in [200, 201]:
                res = r.json()
                user = res.get('data', {}).get('user', {}) or res.get('user', {})
                found.append((e, p, user.get('role'), user.get('fullName')))
                break
        except Exception as ex:
            pass

for f in found:
    print("MATCH:", f)
