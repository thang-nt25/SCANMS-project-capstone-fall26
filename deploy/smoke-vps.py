"""Read-only HTTP checks through the local production reverse proxy."""
import json
import sys
from urllib.request import urlopen

origin = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'http://127.0.0.1:8080'
def request(path):
    with urlopen(origin + path, timeout=30) as response:
        return response.status, response.read().decode('utf-8')

status, raw = request('/api/health')
health = json.loads(raw)
health = health.get('data', health)
assert health.get('status') == 'UP' and health.get('database') == 'CONNECTED'
print('API health: UP; database: CONNECTED')
for path in ['/', '/customer/returns', '/merchant/products']:
    status, body = request(path)
    assert status == 200 and '<html' in body.lower() and '/assets/' in body
    assert 'localhost:3000' not in body
    print('SPA route: ' + path + ' HTTP 200')
status, raw = request('/socket.io/?EIO=4&transport=polling')
assert status == 200 and raw.startswith('0')
handshake = json.loads(raw[1:])
assert 'websocket' in handshake.get('upgrades', [])
print('Socket.IO polling handshake: OK; websocket upgrade offered')
status, raw = request('/api/public/products?limit=1')
products = json.loads(raw)
products = products.get('data', products)
assert isinstance(products, dict) and isinstance(products.get('items'), list)
print('Public products API: HTTP 200; valid list')
