// Generate a local webhook credential without printing or replacing an existing secret.
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const dotenv = require('dotenv');
const file = path.join(__dirname, '..', '.env');
let contents = fs.readFileSync(file, 'utf8');
const current = dotenv.parse(contents).GHN_WEBHOOK_SECRET;
if (current && current.length >= 32) {
  console.log(JSON.stringify({ webhookSecretConfigured: true, changed: false }));
} else {
  const line = `GHN_WEBHOOK_SECRET=${randomBytes(32).toString('hex')}`;
  contents = /^GHN_WEBHOOK_SECRET\s*=.*$/m.test(contents)
    ? contents.replace(/^GHN_WEBHOOK_SECRET\s*=.*$/gm, line)
    : `${contents.trimEnd()}\n\n# GHN callback: set the same value in the x-ghn-webhook-secret custom header\n${line}\n`;
  fs.writeFileSync(file, contents, 'utf8');
  console.log(JSON.stringify({ webhookSecretConfigured: true, changed: true, secretPrinted: false }));
}
