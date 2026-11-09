// Local compiled backend with bounded recovery; never retries an HTTP mutation.
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
if (process.env.NODE_ENV === 'production') throw new Error('Use start:prod with your service manager in production.');
if (!fs.existsSync(path.join(root, 'dist/main.js'))) throw new Error('Run npm run build before npm run start:local.');
const port = Number(process.env.PORT || 3000);
let child;
let timer;
let stopping = false;
let failures = 0;
const stop = () => { stopping = true; clearTimeout(timer); if (child) child.kill(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
function start() {
  if (stopping) return;
  const probe = net.connect({ port, host: 'localhost' });
  probe.once('connect', () => {
    probe.destroy();
    console.error(`Port ${port} already has a server; refusing to start a duplicate backend.`);
    process.exitCode = 1;
  });
  probe.once('error', () => {
    probe.destroy();
    if (stopping) return;
    const startedAt = Date.now();
    child = spawn(process.execPath, ['--enable-source-maps', 'dist/main.js'], { cwd: root, stdio: 'inherit', windowsHide: true });
    child.on('error', () => { console.error('Cannot start backend Node process.'); });
    child.once('exit', (code) => {
      child = null;
      if (stopping || code === 0) return;
      if (Date.now() - startedAt > 60000) failures = 0;
      failures++;
      if (failures > 5) { console.error('Backend failed repeatedly. Inspect the preceding error and restart after fixing it.'); process.exitCode = 1; return; }
      const delay = Math.min(30000, 1000 * 2 ** (failures - 1));
      console.error(`Backend stopped unexpectedly; restart ${failures}/5 in ${delay / 1000}s.`);
      timer = setTimeout(start, delay);
    });
  });
}
start();
