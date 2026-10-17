const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
(async () => {
  const candidates = [];
  let configured = false;
  for (const relative of ['.env', '../frontend/.env', '../frontend/.env.local', '../frontend/.env.development']) {
    const file = path.join(__dirname, '..', relative);
    if (!fs.existsSync(file)) continue;
    const values = dotenv.parse(fs.readFileSync(file, 'utf8'));
    configured ||= Boolean(values.GHN_WEBHOOK_SECRET && values.GHN_WEBHOOK_SECRET.length >= 32);
    for (const [key, value] of Object.entries(values)) {
      if (!/^(?:VITE_API_URL|BACKEND_URL|PUBLIC_API_URL|API_URL|APP_URL|SERVER_URL|BASE_URL|FRONTEND_URL|GHN_(?:CALLBACK|WEBHOOK)_URL|NGROK_URL|TUNNEL_URL)$/.test(key)) continue;
      try {
        const url = new URL(value);
        candidates.push({ file: relative, key, origin: url.origin, local: ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(url.hostname) });
      } catch { candidates.push({ file: relative, key, validUrl: false }); }
    }
  }
  const tunnels = [];
  for (const port of [4040, 4041]) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/tunnels`, { signal: AbortSignal.timeout(2000) });
      const data = await response.json();
      for (const tunnel of data.tunnels || []) {
        if (tunnel.public_url?.startsWith('https://')) tunnels.push({ origin: new URL(tunnel.public_url).origin });
      }
    } catch {}
  }
  console.log(JSON.stringify({ webhookSecretConfigured: configured, configuredUrls: candidates, localNgrokTunnels: tunnels, secretsPrinted: false }, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
